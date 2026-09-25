import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parse } from 'dotenv';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const localDir = path.join(root, '.local', 'equilibrio-bi');
export const localTarget = Object.freeze({ host: '127.0.0.1', port: 5432, database: 'equilibrio_auth' });

export function assertLocalTarget(env, expectedRole) {
  if (env.AUTH_DB_HOST !== localTarget.host || String(env.AUTH_DB_PORT) !== String(localTarget.port)
    || env.AUTH_DB_DATABASE !== localTarget.database || (expectedRole && env.AUTH_DB_USER !== expectedRole)
    || !/^equilibrio_(ti|test_[a-f0-9]{16})$/.test(env.AUTH_DB_SCHEMA || '')) {
    throw new Error('Destino recusado: este comando opera somente no PostgreSQL local isolado do Equilibrio BI.');
  }
  if (!env.AUTH_DB_PASSWORD || env.AUTH_DB_PASSWORD.length < 32) throw new Error('Configuracao local incompleta.');
}

export function poolConfig(env) {
  assertLocalTarget(env);
  return {
    host: env.AUTH_DB_HOST, port: Number(env.AUTH_DB_PORT), database: env.AUTH_DB_DATABASE,
    user: env.AUTH_DB_USER, password: env.AUTH_DB_PASSWORD,
    max: 5, connectionTimeoutMillis: 5000, statement_timeout: 10000,
  };
}

export async function readLocalEnvironment(kind = 'runtime') {
  if (kind !== 'runtime') throw new Error('Configuracao invalida.');
  const env = parse(await fs.readFile(path.join(localDir, `${kind}.env`)));
  assertLocalTarget(env, 'equilibrio_app');
  return env;
}

export async function prepareLocalFiles() {
  // Refuse any partially existing setup rather than rotating credentials silently.
  try { await fs.access(localDir); throw new Error('Configuracao local ja existe. Nenhum segredo foi substituido.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const secret = () => randomBytes(32).toString('hex');
  const common = {
    NODE_ENV: 'development', SERVER_HOST: '127.0.0.1', SERVER_PORT: '3001',
    CORS_ORIGIN: 'http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:5175',
    VITE_API_BASE_URL: '', AUTH_DB_HOST: localTarget.host, AUTH_DB_PORT: String(localTarget.port),
    AUTH_DB_DATABASE: localTarget.database, AUTH_DB_SCHEMA: 'equilibrio_ti',
    JWT_SECRET: secret(), TENANT_CREDENTIAL_ACTIVE_KEY: 'local-v1',
    TENANT_CREDENTIAL_KEYS: JSON.stringify({ 'local-v1': randomBytes(32).toString('base64') }),
    AUTH_ADMIN_EMAIL: '', AUTH_ADMIN_PASSWORD: '',
    SEED_DEMO_TENANT: 'false', SEED_DEMO_USER_PASSWORD: '',
    DB_HOST: '', DB_PORT: '', DB_DATABASE: '', DB_USER: '', DB_PASSWORD: '',
  };
  await fs.mkdir(localDir, { recursive: true, mode: 0o700 });
  if (process.platform === 'win32') {
    const account = spawnSync('whoami', [], { encoding: 'utf8', windowsHide: true });
    if (account.status !== 0) throw new Error('Nao foi possivel proteger o diretorio local.');
    const acl = spawnSync('icacls', [localDir, '/inheritance:r', '/grant:r', `${account.stdout.trim()}:(OI)(CI)F`], { windowsHide: true });
    if (acl.status !== 0) throw new Error('Nao foi possivel proteger o diretorio local.');
  }
  const serialize = env => Object.entries(env).map(([key, value]) => `${key}='${value}'`).join('\n') + '\n';
  await fs.writeFile(path.join(localDir, 'runtime.env'), serialize({ ...common, AUTH_DB_USER: 'equilibrio_app', AUTH_DB_PASSWORD: secret() }), { flag: 'wx', mode: 0o600 });
  await fs.writeFile(path.join(localDir, 'admin.json'), JSON.stringify({ email: 'admin@equilibrio.local', password: secret() }, null, 2), { flag: 'wx', mode: 0o600 });
}

export function isolatedProcessEnvironment(local) {
  const base = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(AUTH_|DB_|TENANT_|JWT_|PG|VITE_|NODE_ENV$|SERVER_|CORS_|SEED_|DOTENV_)/.test(key)));
  return { ...base, ...local, DOTENV_CONFIG_QUIET: 'true', DOTENV_CONFIG_PATH: path.join(localDir, 'runtime.env') };
}
