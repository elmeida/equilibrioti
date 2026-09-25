import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const { Pool } = pg;

let authPool;

export function getAuthPool() {
  if (!authPool) {
    authPool = new Pool({
      host: process.env.AUTH_DB_HOST,
      port: Number(process.env.AUTH_DB_PORT || 5432),
      database: process.env.AUTH_DB_DATABASE,
      user: process.env.AUTH_DB_USER,
      password: process.env.AUTH_DB_PASSWORD,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });
  }

  return authPool;
}

export async function closeAuthPool() {
  if (!authPool) return;
  await authPool.end();
  authPool = undefined;
}
