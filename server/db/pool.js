import sql from 'mssql';
import dotenv from 'dotenv';
import { getAuthPool } from './authPool.js';

dotenv.config();

const schemaName = process.env.AUTH_DB_SCHEMA || 'equilibrio_ti';
const schema = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaName) ? schemaName : 'equilibrio_ti';

const pools = new Map();

export async function getPoolForEmpresa(empresaId) {
  if (!empresaId) {
    throw new Error('empresaId não fornecido para conexão com o banco de dados.');
  }

  if (pools.has(empresaId)) {
    return pools.get(empresaId);
  }

  const authPool = getAuthPool();
  const res = await authPool.query(
    `SELECT db_host, db_port, db_database, db_user, db_password, db_encrypt, db_trust_cert 
     FROM ${schema}.empresas WHERE id = $1 LIMIT 1`,
    [empresaId]
  );

  const empresa = res.rows[0];
  if (!empresa) {
    throw new Error(`Empresa com ID ${empresaId} não encontrada.`);
  }

  const poolPromise = new sql.ConnectionPool({
    server: empresa.db_host,
    port: empresa.db_port || 1433,
    database: empresa.db_database,
    user: empresa.db_user,
    password: empresa.db_password,
    options: {
      encrypt: empresa.db_encrypt,
      trustServerCertificate: empresa.db_trust_cert,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    requestTimeout: 60000,
    connectionTimeout: 20000,
  }).connect().catch(err => {
    pools.delete(empresaId);
    throw err;
  });

  pools.set(empresaId, poolPromise);
  return poolPromise;
}

export { sql };

