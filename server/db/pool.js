import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

let poolPromise;

export function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect({
      server: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 1433),
      database: process.env.DB_DATABASE || 'Servdrill',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      options: {
        encrypt: String(process.env.DB_ENCRYPT).toLowerCase() === 'true',
        trustServerCertificate: String(process.env.DB_TRUST_CERT ?? 'true').toLowerCase() === 'true',
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
      requestTimeout: 60000,
      connectionTimeout: 20000,
    });
  }

  return poolPromise;
}

export { sql };
