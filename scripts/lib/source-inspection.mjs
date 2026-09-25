import { baseSubquery } from '../../server/sql/titulosBase.js';
import { decryptCredential } from '../../server/security/credentials.js';

const knownErrorCodes = new Set([
  'ETIMEOUT', 'ESOCKET', 'ELOGIN', 'EREQUEST', 'ECONNREFUSED', 'ENOTFOUND',
  'ETIMEDOUT', 'ECONNRESET', '28P01', '3D000', '42P01', '42501', '57014',
]);

export function safeFailure(error) {
  return { status: 'unavailable', code: knownErrorCodes.has(error?.code) ? error.code : 'CONNECTION_OR_QUERY_FAILED' };
}

export function parseOptions(args) {
  const options = { legacyEnv: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--legacy-env' && !options.legacyEnv) options.legacyEnv = true;
    else if (args[i] === '--tenant' && options.tenantId === undefined) {
      const value = args[++i];
      if (!/^[1-9]\d*$/.test(value || '') || !Number.isSafeInteger(Number(value))) {
        throw new Error('Informe um ID de empresa inteiro positivo.');
      }
      options.tenantId = Number(value);
    } else throw new Error('Opcao invalida. Use --tenant ID ou --legacy-env.');
  }
  if (options.legacyEnv && options.tenantId !== undefined) {
    throw new Error('Selecione uma origem por execucao: tenant ou configuracao legada.');
  }
  return options;
}

export async function inspectCatalog(env, PgClient, tenantId) {
  const schema = env.AUTH_DB_SCHEMA || 'equilibrio_ti';
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) return { status: 'invalid_configuration', code: 'INVALID_SCHEMA' };
  if (['AUTH_DB_HOST', 'AUTH_DB_DATABASE', 'AUTH_DB_USER', 'AUTH_DB_PASSWORD'].some(key => !env[key])) {
    return { status: 'invalid_configuration', code: 'MISSING_AUTH_CONFIGURATION' };
  }
  let client;
  try {
    client = new PgClient({
      host: env.AUTH_DB_HOST, port: Number(env.AUTH_DB_PORT || 5432),
      database: env.AUTH_DB_DATABASE, user: env.AUTH_DB_USER, password: env.AUTH_DB_PASSWORD,
      connectionTimeoutMillis: 8000, statement_timeout: 8000,
      query_timeout: 10000, options: '-c default_transaction_read_only=on',
    });
    await client.connect();
    await client.query('BEGIN READ ONLY');
    const result = await client.query(`
      SELECT id, nome,
        (NULLIF(db_host, '') IS NOT NULL AND NULLIF(db_database, '') IS NOT NULL
         AND NULLIF(db_user, '') IS NOT NULL AND NULLIF(db_password, '') IS NOT NULL) AS connection_configured
      FROM "${schema}".empresas ORDER BY id
    `);
    let connection;
    if (tenantId !== undefined) {
      const selected = await client.query(`
        SELECT db_host, db_port, db_database, db_user, db_password, db_encrypt, db_trust_cert
        FROM "${schema}".empresas WHERE id = $1 LIMIT 1
      `, [tenantId]);
      connection = selected.rows[0];
      if (connection) connection = { ...connection, db_password: decryptCredential(connection.db_password, tenantId, env) };
    }
    return { status: 'ok', tenants: result.rows, connection };
  } catch (error) {
    return safeFailure(error);
  } finally {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
      await client.end().catch(() => {});
    }
  }
}

export const metadataSql = `
  SELECT S.name AS schemaName, O.name AS objectName, O.type_desc AS objectType,
         C.name AS columnName, T.name AS dataType, C.precision AS precision,
         C.scale AS scale, C.is_nullable AS nullable
  FROM sys.objects O
  JOIN sys.schemas S ON S.schema_id = O.schema_id
  JOIN sys.columns C ON C.object_id = O.object_id
  JOIN sys.types T ON T.user_type_id = C.user_type_id
  WHERE S.name = 'dbo'
    AND O.name IN ('PBI_TITULOSFINANCEIRO', 'PBI_TITULOSFINANCEIRO_COL2', 'GCOLIGADA')
  ORDER BY O.name, C.column_id
`;

export async function inspectRm(connection, SqlPool) {
  if (!connection || ['db_host', 'db_database', 'db_user', 'db_password'].some(key => !connection[key])) {
    return { status: 'invalid_configuration', code: 'MISSING_RM_CONFIGURATION' };
  }
  let pool;
  try {
    pool = new SqlPool({
      server: connection.db_host, port: connection.db_port || 1433,
      database: connection.db_database, user: connection.db_user, password: connection.db_password,
      options: {
        encrypt: connection.db_encrypt === true,
        trustServerCertificate: connection.db_trust_cert === true,
        readOnlyIntent: true,
      },
      connectionTimeout: 8000, requestTimeout: 8000,
      pool: { max: 1, min: 0, idleTimeoutMillis: 1000 },
    });
    await pool.connect();
    const metadata = await pool.request().query(metadataSql);
    let contract;
    try {
      // Compile the application's actual source query, returning no customer rows.
      await pool.request().query(`SELECT TOP (0) * FROM ${baseSubquery()}`);
      contract = { status: 'compatible_query', financialValuesValidated: false };
    } catch (error) {
      contract = safeFailure(error);
    }
    return { status: 'ok', columns: metadata.recordset, contract };
  } catch (error) {
    return safeFailure(error);
  } finally {
    if (pool) await pool.close().catch(() => {});
  }
}

export async function inspectSources({ env, PgClient, SqlPool, options }) {
  const catalog = await inspectCatalog(env, PgClient, options.tenantId);
  // Credentials only travel in memory to the selected connector, never to the report.
  const { connection, ...publicCatalog } = catalog;
  const report = {
    generatedAt: new Date().toISOString(), mode: 'metadata-only',
    financialValuesValidated: false, catalog: publicCatalog,
    rm: { status: 'not_requested' },
  };
  if (options.legacyEnv) {
    report.rm = {
      source: 'legacy-env', tenantAssociation: 'not_verified',
      ...await inspectRm({
        db_host: env.DB_HOST, db_port: Number(env.DB_PORT || 1433),
        db_database: env.DB_DATABASE, db_user: env.DB_USER, db_password: env.DB_PASSWORD,
        db_encrypt: env.DB_ENCRYPT === 'true', db_trust_cert: env.DB_TRUST_CERT === 'true',
      }, SqlPool),
    };
  } else if (options.tenantId !== undefined) {
    report.rm = catalog.status !== 'ok'
      ? { status: 'blocked_by_catalog', tenantId: options.tenantId }
      : connection
        ? { tenantId: options.tenantId, ...await inspectRm(connection, SqlPool) }
        : { status: 'tenant_not_found', tenantId: options.tenantId };
  }
  return report;
}

export function inspectionSucceeded(report) {
  return report.catalog.status === 'ok'
    && (report.rm.status === 'not_requested'
      || (report.rm.status === 'ok' && report.rm.contract?.status === 'compatible_query'));
}
