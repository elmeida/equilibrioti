import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertLocalTarget, isolatedProcessEnvironment, localDir } from '../scripts/lib/local-environment.mjs';
import { assertLocalDocker, migrationSql, runtimeGrants } from '../scripts/lib/local-postgres.mjs';

const env = { AUTH_DB_HOST: '127.0.0.1', AUTH_DB_PORT: '5432', AUTH_DB_DATABASE: 'equilibrio_auth', AUTH_DB_SCHEMA: 'equilibrio_ti', AUTH_DB_USER: 'equilibrio_app', AUTH_DB_PASSWORD: 'a'.repeat(64) };
const docker = { Name: '/atenza-postgres-local', State: { Running: true }, Config: { Labels: { 'com.docker.compose.project': 'local-postgres' } }, NetworkSettings: { Ports: { '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '5432' }] } } };
const pipe = 'npipe:////./pipe/dockerDesktopLinuxEngine';
afterEach(() => vi.unstubAllEnvs());

describe('ambiente local compartilhado', () => {
  it('aceita apenas o banco existente e o papel da aplicacao', () => {
    expect(() => assertLocalTarget(env, 'equilibrio_app')).not.toThrow();
  });
  it.each([
    { AUTH_DB_HOST: 'remote.example' }, { AUTH_DB_PORT: '55433' }, { AUTH_DB_DATABASE: 'atenza' },
    { AUTH_DB_SCHEMA: 'public' }, { AUTH_DB_USER: 'postgres' }, { AUTH_DB_PASSWORD: '' },
  ])('recusa destino/credencial incorreto: %j', override => {
    expect(() => assertLocalTarget({ ...env, ...override }, 'equilibrio_app')).toThrow();
  });
  it('nao herda variaveis remotas e fixa o arquivo dotenv local', () => {
    vi.stubEnv('AUTH_DB_HOST', 'remote.example'); vi.stubEnv('PGSERVICE', 'remote');
    vi.stubEnv('DB_PASSWORD', 'remote-secret'); vi.stubEnv('DOTENV_CONFIG_PATH', '.env');
    const clean = isolatedProcessEnvironment({ ...env, DB_PASSWORD: '' });
    expect(clean.AUTH_DB_HOST).toBe('127.0.0.1');
    expect(clean.DB_PASSWORD).toBe('');
    expect(clean.PGSERVICE).toBeUndefined();
    expect(clean.DOTENV_CONFIG_PATH).toContain(localDir);
  });
  it('confirma o Docker Desktop local e porta exclusivamente loopback', () => {
    expect(() => assertLocalDocker(pipe, docker)).not.toThrow();
    expect(() => assertLocalDocker('ssh://host', docker)).toThrow();
    expect(() => assertLocalDocker(pipe, { ...docker, Name: '/other-project' })).toThrow();
    const exposed = structuredClone(docker); exposed.NetworkSettings.Ports['5432/tcp'][0].HostIp = '0.0.0.0';
    expect(() => assertLocalDocker(pipe, exposed)).toThrow();
  });
  it('gera migrations transacionais e idempotentes com proprietario preservado', async () => {
    const sql = await migrationSql();
    expect(sql).toContain('SET LOCAL ROLE equilibrio_auth_user');
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain("version='003'");
    expect(sql).not.toContain('__SCHEMA__');
    expect(sql.trim().endsWith('COMMIT;')).toBe(true);
    await expect(migrationSql('public; DROP DATABASE postgres')).rejects.toThrow();
  });
  it('nao concede alteracao/exclusao da auditoria nem criacao de estruturas', () => {
    const sql = runtimeGrants();
    expect(sql).toContain('GRANT SELECT, INSERT ON equilibrio_ti.audit_events');
    expect(sql).not.toMatch(/GRANT (ALL|CREATE)|TRUNCATE|UPDATE ON equilibrio_ti.audit_events/);
    expect(() => runtimeGrants('public')).toThrow();
  });
});
