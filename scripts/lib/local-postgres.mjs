import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { localDir, localTarget, root, assertLocalTarget, poolConfig } from './local-environment.mjs';
import pg from 'pg';

const container = 'atenza-postgres-local';
const owner = 'equilibrio_auth_user';

function docker(args, input) {
  const result = spawnSync('docker', ['--context', 'desktop-linux', ...args], {
    input, maxBuffer: 128 * 1024 * 1024, timeout: 120000, windowsHide: true,
  });
  // PostgreSQL errors can contain statement values. Never forward stderr.
  if (result.status !== 0) throw new Error('Operacao Docker/PostgreSQL local falhou; detalhes sensiveis omitidos.');
  return result.stdout;
}

export function assertLocalDocker(host, info) {
  if (host !== 'npipe:////./pipe/dockerDesktopLinuxEngine'
    || info.Name !== `/${container}` || !info.State?.Running
    || info.Config?.Labels?.['com.docker.compose.project'] !== 'local-postgres') {
    throw new Error('Docker compartilhado local nao confirmado.');
  }
  const ports = info.NetworkSettings?.Ports?.['5432/tcp'];
  if (ports?.length !== 1 || ports[0].HostIp !== '127.0.0.1' || ports[0].HostPort !== '5432') {
    throw new Error('Porta local nao confirmada.');
  }
}

export function verifyLocalDocker() {
  const host = JSON.parse(docker(['context', 'inspect', 'desktop-linux']).toString())[0].Endpoints.docker.Host;
  const info = JSON.parse(docker(['inspect', container]).toString())[0];
  assertLocalDocker(host, info);
}

export function localSql(sql) {
  return docker(['exec', '-i', container, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
    '-U', 'postgres', '-d', localTarget.database], sql).toString().trim();
}

export function assertSchema(schema) {
  if (!/^equilibrio_(ti|test_[a-f0-9]{16})$/.test(schema)) throw new Error('Schema local recusado.');
  return schema;
}

export async function backupLocalDatabase() {
  verifyLocalDocker();
  const directory = path.join(localDir, 'backups');
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const data = docker(['exec', container, 'pg_dump', '-U', 'postgres', '-d', localTarget.database, '-Fc']);
  if (data.subarray(0, 5).toString() !== 'PGDMP') throw new Error('Backup invalido.');
  const catalog = docker(['exec', '-i', container, 'pg_restore', '--list'], data).toString();
  if (!catalog.includes('equilibrio_ti') || !catalog.includes('schema_migrations')) throw new Error('Catalogo de backup incompleto.');
  const name = `equilibrio_auth-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}.dump`;
  await fs.writeFile(path.join(directory, name), data, { flag: 'wx', mode: 0o600 });
  const evidence = { name, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex'), catalogVerified: true, restoreTested: false };
  await fs.writeFile(path.join(directory, `${name}.json`), JSON.stringify(evidence, null, 2), { flag: 'wx', mode: 0o600 });
  return evidence;
}

export async function migrationSql(schema = 'equilibrio_ti') {
  assertSchema(schema);
  const directory = path.join(root, 'server/db/migrations');
  const files = (await fs.readdir(directory)).filter(name => /^\d+_[a-z_]+\.sql$/.test(name)).sort();
  const statements = [`BEGIN; SET LOCAL ROLE ${owner}; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s';
    SELECT pg_advisory_xact_lock(hashtext(current_database()), hashtext('${schema}'));
    CREATE SCHEMA IF NOT EXISTS ${schema};
    CREATE TABLE IF NOT EXISTS ${schema}.schema_migrations (version VARCHAR(32) PRIMARY KEY, name VARCHAR(255) NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());`];
  for (const name of files) {
    const version = name.split('_')[0];
    const sql = (await fs.readFile(path.join(directory, name), 'utf8')).replaceAll('__SCHEMA__', schema);
    statements.push(`DO $migration$ BEGIN IF NOT EXISTS (SELECT 1 FROM ${schema}.schema_migrations WHERE version='${version}') THEN
      ${sql}
      INSERT INTO ${schema}.schema_migrations(version,name) VALUES ('${version}','${name}');
      END IF; END $migration$;`);
  }
  statements.push('COMMIT;');
  return statements.join('\n');
}

export function runtimeGrants(schema = 'equilibrio_ti') {
  assertSchema(schema);
  return `GRANT CONNECT ON DATABASE equilibrio_auth TO equilibrio_app;
    GRANT USAGE ON SCHEMA ${schema} TO equilibrio_app;
    GRANT SELECT ON ${schema}.schema_migrations TO equilibrio_app;
    GRANT SELECT, INSERT, UPDATE ON ${schema}.empresas, ${schema}.usuarios TO equilibrio_app;
    GRANT SELECT, INSERT, DELETE ON ${schema}.sessoes_revogadas TO equilibrio_app;
    GRANT SELECT, INSERT ON ${schema}.audit_events TO equilibrio_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${schema} TO equilibrio_app;`;
}

export async function provisionRuntime(env) {
  assertLocalTarget(env, 'equilibrio_app');
  if (!/^[a-f0-9]{64}$/.test(env.AUTH_DB_PASSWORD)) throw new Error('Senha local fora do formato gerado.');
  const exists = localSql("SELECT count(*) FROM pg_roles WHERE rolname='equilibrio_app'") === '1';
  if (exists) {
    // Existing role must authenticate with this project's secret; never reset it.
    const pool = new pg.Pool(poolConfig(env));
    try { await pool.query('SELECT 1'); } finally { await pool.end(); }
    const restricted = localSql("SELECT NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls AND NOT EXISTS (SELECT 1 FROM pg_auth_members WHERE member=pg_roles.oid) FROM pg_roles WHERE rolname='equilibrio_app'");
    if (restricted !== 't') throw new Error('Perfil existente possui privilegios inesperados.');
  } else {
    localSql(`BEGIN; SET LOCAL log_statement='none'; SET LOCAL log_min_error_statement='panic';
      CREATE ROLE equilibrio_app LOGIN PASSWORD '${env.AUTH_DB_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
      COMMIT;`);
  }
  localSql(`BEGIN; SET LOCAL ROLE ${owner}; ${runtimeGrants()} COMMIT;`);
}

export function assertExistingDatabase() {
  verifyLocalDocker();
  const actual = localSql("SELECT current_database() || '|' || pg_get_userbyid(datdba) FROM pg_database WHERE datname=current_database()");
  if (actual !== `equilibrio_auth|${owner}`) throw new Error('Banco/proprietario inesperado.');
  const unexpected = localSql("SELECT count(*) FROM pg_tables WHERE schemaname='equilibrio_ti' AND tableowner <> 'equilibrio_auth_user'");
  if (unexpected !== '0') throw new Error('Proprietario de tabela inesperado.');
}
