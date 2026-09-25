import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAuthPool } from './authPool.js';
import { getAuthSchemaName } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultMigrationsDir = path.resolve(__dirname, 'migrations');

function migrationVersion(fileName) {
  return fileName.split('_')[0];
}

export async function assertAuthMigrations(options = {}) {
  const pool = options.pool || getAuthPool();
  const schema = getAuthSchemaName(options.schema);
  const files = (await fs.readdir(options.migrationsDir || defaultMigrationsDir))
    .filter(file => /^\d+_.+\.sql$/.test(file));
  let result;
  try {
    result = await pool.query(`SELECT version FROM ${schema}.schema_migrations`);
  } catch {
    throw new Error('Banco de autenticacao indisponivel ou nao preparado. Verifique a conexao e execute db:migrate somente apos autorizacao.');
  }
  const applied = new Set(result.rows.map(row => row.version));
  if (files.some(file => !applied.has(migrationVersion(file)))) {
    throw new Error('Migrations de autenticacao pendentes. Execute db:migrate somente apos autorizacao.');
  }
}

export async function runAuthMigrations(options = {}) {
  const pool = options.pool || getAuthPool();
  const schema = getAuthSchemaName(options.schema);
  const migrationsDir = options.migrationsDir || defaultMigrationsDir;

  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.schema_migrations (
      version VARCHAR(32) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const files = (await fs.readdir(migrationsDir))
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();

  const appliedResult = await pool.query(`SELECT version FROM ${schema}.schema_migrations`);
  const applied = new Set(appliedResult.rows.map((row) => row.version));
  const appliedNow = [];

  for (const file of files) {
    const version = migrationVersion(file);
    if (applied.has(version)) continue;

    const sql = (await fs.readFile(path.join(migrationsDir, file), 'utf8')).replaceAll('__SCHEMA__', schema);
    const client = typeof pool.connect === 'function' ? await pool.connect() : pool;

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        `INSERT INTO ${schema}.schema_migrations (version, name) VALUES ($1, $2)`,
        [version, file],
      );
      await client.query('COMMIT');
      appliedNow.push(file);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      if (typeof client.release === 'function') client.release();
    }
  }

  return { schema, applied: appliedNow, total: files.length };
}
