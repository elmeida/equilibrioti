import sql from 'mssql';
import dotenv from 'dotenv';
import { getAuthPool } from './authPool.js';
import { decryptCredential } from '../security/credentials.js';
import { clearEmpresaCache } from '../utils/cache.js';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const schemaName = process.env.AUTH_DB_SCHEMA || 'equilibrio_ti';
const schema = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaName) ? schemaName : 'equilibrio_ti';

const pools = new Map();

export function invalidateEmpresaPool(empresaId) {
  const entry = pools.get(empresaId);
  pools.delete(empresaId);
  clearEmpresaCache(empresaId);
  if (entry) void entry.promise.then(pool => pool.close()).catch(() => undefined);
}

export async function getPoolForEmpresa(empresaId, version) {
  if (!Number.isSafeInteger(empresaId) || empresaId < 1 || !Number.isSafeInteger(version) || version < 0) {
    throw new Error('Contexto de conexao invalido.');
  }
  const existing = pools.get(empresaId);
  if (existing?.version === version) return existing.promise;
  if (existing && existing.version > version) throw new Error('Contexto de conexao desatualizado.');
  if (existing) invalidateEmpresaPool(empresaId);
  const entry = { version, promise: null };
  pools.set(empresaId, entry);
  entry.promise = (async () => {
    let connection;
    try {
      const res = await getAuthPool().query(
        `SELECT db_host, db_port, db_database, db_user, db_password, db_encrypt, db_trust_cert, connection_version
         FROM ${schema}.empresas WHERE id = $1 AND ativo = true LIMIT 1`, [empresaId],
      );
      const empresa = res.rows[0];
      if (!empresa || empresa.connection_version !== version || pools.get(empresaId) !== entry) {
        throw new Error('Configuracao de conexao alterada ou indisponivel. Atualize os dados.');
      }
      connection = new sql.ConnectionPool({
        server: empresa.db_host,
        port: empresa.db_port || 1433,
        database: empresa.db_database,
        user: empresa.db_user,
        password: decryptCredential(empresa.db_password, empresaId),
        options: {
          encrypt: empresa.db_encrypt,
          trustServerCertificate: empresa.db_trust_cert,
        },
        pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
        requestTimeout: 60000,
        connectionTimeout: 20000,
      });
      await connection.connect();
      if (pools.get(empresaId) !== entry) throw new Error('Configuracao de conexao alterada.');
      return connection;
    } catch (error) {
      if (pools.get(empresaId) === entry) pools.delete(empresaId);
      if (connection) await connection.close().catch(() => undefined);
      throw error;
    }
  })();
  return entry.promise;
}

export { sql };

