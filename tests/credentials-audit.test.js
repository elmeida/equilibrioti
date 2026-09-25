import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn(), connect: vi.fn(), sqlConnect: vi.fn(), instances: [] }));
vi.mock('../server/db/authPool.js', () => ({ getAuthPool: () => ({ query: mocks.query, connect: mocks.connect }) }));
vi.mock('mssql', () => ({ default: { ConnectionPool: class {
  constructor(config) { this.config = config; this.close = vi.fn(async () => {}); mocks.instances.push(this); }
  async connect() { await mocks.sqlConnect(this); return this; }
} } }));
import { credentialKeys, encryptCredential, decryptCredential } from '../server/security/credentials.js';
import { maintainCredentials, assertStoredCredentials } from '../server/security/credential-maintenance.js';
import { auditedMutation, recordAudit } from '../server/security/audit.js';
import { getPoolForEmpresa, invalidateEmpresaPool } from '../server/db/pool.js';
import { getCache, setCache } from '../server/utils/cache.js';

const key = Buffer.alloc(32, 11).toString('base64');
const key2 = Buffer.alloc(32, 22).toString('base64');
const env = { TENANT_CREDENTIAL_ACTIVE_KEY: 'one', TENANT_CREDENTIAL_KEYS: JSON.stringify({ one: key }) };
const request = { user: { sub: 3, perfil: 'admin' }, auditRequestId: '11111111-1111-4111-8111-111111111111', body: { password: 'never-log-this' } };
const result = rows => ({ rows, rowCount: rows.length });
beforeEach(async () => {
  invalidateEmpresaPool(10); invalidateEmpresaPool(20);
  await Promise.resolve();
  vi.clearAllMocks(); mocks.instances.length = 0;
  mocks.sqlConnect.mockResolvedValue(undefined);
  mocks.query.mockResolvedValue(result([]));
  mocks.connect.mockResolvedValue({ query: mocks.query, release: mocks.release });
  vi.stubEnv('TENANT_CREDENTIAL_ACTIVE_KEY', env.TENANT_CREDENTIAL_ACTIVE_KEY);
  vi.stubEnv('TENANT_CREDENTIAL_KEYS', env.TENANT_CREDENTIAL_KEYS);
});
afterEach(() => vi.unstubAllEnvs());

describe('credenciais autenticadas por empresa', () => {
  it('cifra com IV distinto e recupera senha original apenas para o tenant correto', () => {
    const a = encryptCredential('secret-password', 10, env), b = encryptCredential('secret-password', 10, env);
    expect(a).not.toBe(b);
    expect(a).not.toContain('secret-password');
    expect(decryptCredential(a, 10, env)).toBe('secret-password');
    expect(() => decryptCredential(a, 20, env)).toThrow('indisponivel');
  });
  it.each([3, 4, 5])('detecta adulteracao do componente %s', index => {
    const parts = encryptCredential('secret', 10, env).split(':');
    parts[index] = (parts[index][0] === 'A' ? 'B' : 'A') + parts[index].slice(1);
    expect(() => decryptCredential(parts.join(':'), 10, env)).toThrow('indisponivel');
  });
  it.each(['plain-secret', 'enc:v2:unknown', '', 'enc:v1:one:AA:AA:AA'])('nao aceita senha legada ou envelope invalido: %s', value => {
    expect(() => decryptCredential(value, 10, env)).toThrow('indisponivel');
  });
  it('preserva leitura da chave antiga durante rotacao e escreve com a ativa', () => {
    const old = encryptCredential('password', 10, env);
    const rotated = { TENANT_CREDENTIAL_ACTIVE_KEY: 'two', TENANT_CREDENTIAL_KEYS: JSON.stringify({ one: key, two: key2 }) };
    expect(decryptCredential(old, 10, rotated)).toBe('password');
    expect(encryptCredential('password', 10, rotated)).toMatch(/^enc:v1:two:/);
    expect(() => decryptCredential(old, 10, { ...rotated, TENANT_CREDENTIAL_KEYS: JSON.stringify({ two: key2 }) })).toThrow();
  });
  it.each([{}, { TENANT_CREDENTIAL_ACTIVE_KEY: 'one', TENANT_CREDENTIAL_KEYS: '{broken' },
    { TENANT_CREDENTIAL_ACTIVE_KEY: 'one', TENANT_CREDENTIAL_KEYS: '{"one":"short"}' }])('rejeita configuracao sem chave adequada', config => {
    expect(() => credentialKeys(config)).toThrow('indisponivel');
  });
  it('chave incorreta nao devolve detalhes sensiveis', () => {
    const encrypted = encryptCredential('secret-password', 10, env);
    try { decryptCredential(encrypted, 10, { ...env, TENANT_CREDENTIAL_KEYS: JSON.stringify({ one: key2 }) }); }
    catch (error) { expect(error.message).not.toMatch(/secret-password|auth tag|decrypt/i); return; }
    throw new Error('Expected authentication failure');
  });
});

describe('auditoria minima e atomica', () => {
  it('registra apenas campos permitidos e ator real', async () => {
    await recordAudit({ query: mocks.query }, request, 'company.update', { tenantId: 10, resourceId: 10, password: 'forbidden', ip: 'private', sql: 'private' });
    expect(mocks.query.mock.calls[0][1]).toEqual([3, 'user', 10, 'company.update', 10, 'success', request.auditRequestId]);
    expect(JSON.stringify(mocks.query.mock.calls)).not.toMatch(/never-log-this|forbidden|private/);
  });
  it('nao aceita acao arbitraria nem usuario sem identificacao', async () => {
    await expect(recordAudit({ query: mocks.query }, request, 'password=secret')).rejects.toThrow();
    await expect(recordAudit({ query: mocks.query }, {}, 'user.update')).rejects.toThrow();
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it('confirma operacao somente depois do registro de auditoria', async () => {
    const value = await auditedMutation(request, 'user.update', async client => {
      await client.query('MUTATION'); return { value: { id: 2 }, tenantId: 10, resourceId: 2 };
    });
    expect(value).toEqual({ id: 2 });
    expect(mocks.query.mock.calls.map(([sql]) => sql.startsWith('INSERT INTO') ? 'AUDIT' : sql)).toEqual(['BEGIN', 'MUTATION', 'AUDIT', 'COMMIT']);
    expect(mocks.release).toHaveBeenCalledOnce();
  });
  it('falha na auditoria reverte alteracao sem confirmar sucesso', async () => {
    mocks.query.mockImplementation(async sql => { if (sql.includes('audit_events')) throw new Error('offline'); return result([]); });
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(auditedMutation(request, 'user.update', async client => {
      await client.query('MUTATION'); return { value: true, tenantId: 10 };
    })).rejects.toThrow('offline');
    const queries = mocks.query.mock.calls.map(([sql]) => sql);
    expect(queries).toContain('ROLLBACK'); expect(queries).not.toContain('COMMIT');
    expect(mocks.release).toHaveBeenCalledOnce();
    expect(logger).toHaveBeenCalledWith({ event: 'audit_unavailable', requestId: request.auditRequestId });
    logger.mockRestore();
  });
  it('falha da operacao gera evento failed sem mensagem ou payload', async () => {
    mocks.query.mockImplementation(async sql => {
      if (sql.includes('audit_events')) expect(mocks.release).toHaveBeenCalledOnce();
      return result([]);
    });
    await expect(auditedMutation(request, 'user.update', async () => { throw new Error('private SQL'); })).rejects.toThrow();
    const audit = mocks.query.mock.calls.find(([sql]) => sql.includes('audit_events'));
    expect(audit[1][5]).toBe('failed');
    expect(JSON.stringify(audit)).not.toContain('private');
  });
});

describe('conversao explicita e verificacao em leitura', () => {
  it('modo padrao apenas inventaria sem gravar e nao imprime credencial', async () => {
    mocks.query.mockImplementation(async sql => sql.startsWith('SELECT id, db_password') ? result([{ id: 10, db_password: 'legacy-secret' }]) : result([]));
    const report = await maintainCredentials({ connect: mocks.connect }, { env });
    expect(report).toMatchObject({ total: 1, legacy: 1, changed: 0 });
    expect(JSON.stringify(report)).not.toContain('legacy-secret');
    expect(mocks.query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN READ ONLY', expect.stringContaining('SELECT id, db_password'), 'ROLLBACK']);
    await expect(assertStoredCredentials({ connect: mocks.connect })).rejects.toThrow('legadas');
  });
  it('converte e audita cada senha na mesma transacao', async () => {
    mocks.query.mockImplementation(async sql => sql.startsWith('SELECT id, db_password') ? result([{ id: 10, db_password: 'legacy-secret' }]) : result([]));
    const report = await maintainCredentials({ connect: mocks.connect }, { env, apply: true });
    expect(report.changed).toBe(1);
    const update = mocks.query.mock.calls.find(([sql]) => sql.startsWith('UPDATE'));
    expect(decryptCredential(update[1][0], 10, env)).toBe('legacy-secret');
    expect(update[0]).toContain('connection_version=connection_version+1');
    expect(mocks.query.mock.calls.some(([sql]) => sql.includes('audit_events'))).toBe(true);
    expect(mocks.query.mock.calls.at(-1)[0]).toBe('COMMIT');
  });
  it('credencial corrompida impede confirmacao de todo o lote', async () => {
    mocks.query.mockImplementation(async sql => sql.startsWith('SELECT id, db_password') ? result([{ id: 10, db_password: 'legacy' }, { id: 20, db_password: 'enc:v1:broken' }]) : result([]));
    await expect(maintainCredentials({ connect: mocks.connect }, { env, apply: true })).rejects.toThrow('Nenhuma conversao parcial');
    expect(mocks.query.mock.calls.at(-1)[0]).toBe('ROLLBACK');
    expect(mocks.query.mock.calls.some(([sql]) => sql === 'COMMIT')).toBe(false);
  });
  it('conversao repetida nao altera envelopes ja na chave ativa', async () => {
    mocks.query.mockImplementation(async sql => sql.startsWith('SELECT id, db_password') ? result([{ id: 10, db_password: encryptCredential('protected', 10, env) }]) : result([]));
    expect((await maintainCredentials({ connect: mocks.connect }, { env, apply: true })).changed).toBe(0);
    expect(mocks.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false);
  });
});

function setupCompany(version = 0) {
  mocks.query.mockResolvedValue(result([{ db_host: 'test.invalid', db_user: 'reader', db_database: 'test', db_password: encryptCredential('runtime-secret', 10, env), connection_version: version, db_encrypt: true, db_trust_cert: false }]));
}
describe('ciclo de vida de conexoes por empresa', () => {
  it('compartilha apenas conexoes da mesma empresa e versao', async () => {
    setupCompany();
    const [a, b] = await Promise.all([getPoolForEmpresa(10, 0), getPoolForEmpresa(10, 0)]);
    expect(a).toBe(b); expect(mocks.instances).toHaveLength(1);
    expect(a.config.password).toBe('runtime-secret');
    expect(a.config.options).toEqual({ encrypt: true, trustServerCertificate: false });
  });
  it('rotacao fecha conexao anterior e limpa somente cache da empresa', async () => {
    setupCompany(); const old = await getPoolForEmpresa(10, 0);
    setCache('titulos:10:0:query', 'old', 10000); setCache('titulos:20:0:query', 'other', 10000);
    setupCompany(1); const current = await getPoolForEmpresa(10, 1);
    expect(current).not.toBe(old); expect(old.close).toHaveBeenCalled();
    expect(getCache('titulos:10:0:query')).toBeNull(); expect(getCache('titulos:20:0:query')).toBe('other');
    await expect(getPoolForEmpresa(10, 0)).rejects.toThrow('desatualizado');
    expect(current.close).not.toHaveBeenCalled();
  });
  it('falha de conexao nao deixa pool preso no cache', async () => {
    setupCompany(); mocks.sqlConnect.mockRejectedValueOnce(new Error('offline'));
    await expect(getPoolForEmpresa(10, 0)).rejects.toThrow('offline');
    expect(mocks.instances[0].close).toHaveBeenCalled();
    await getPoolForEmpresa(10, 0); expect(mocks.instances).toHaveLength(2);
  });
  it('nao abre SQL quando versao do cadastro mudou ou senha esta em texto', async () => {
    setupCompany(1);
    await expect(getPoolForEmpresa(10, 0)).rejects.toThrow('alterada');
    mocks.query.mockResolvedValue(result([{ connection_version: 0, db_password: 'legacy' }]));
    await expect(getPoolForEmpresa(10, 0)).rejects.toThrow('indisponivel');
    expect(mocks.instances).toHaveLength(0);
  });
  it('conexao atrasada invalidada e fechada sem substituir a nova', async () => {
    setupCompany(); let release;
    mocks.sqlConnect.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const old = getPoolForEmpresa(10, 0);
    const rejection = expect(old).rejects.toThrow('alterada');
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    setupCompany(1); const current = await getPoolForEmpresa(10, 1);
    release(); await rejection;
    expect(mocks.instances[0].close).toHaveBeenCalled();
    expect(await getPoolForEmpresa(10, 1)).toBe(current);
    expect(current.close).not.toHaveBeenCalled();
  });
});
