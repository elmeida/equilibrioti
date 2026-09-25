import { describe, expect, it, vi } from 'vitest';
import { baseSubquery } from '../server/sql/titulosBase.js';
import { inspectCatalog, inspectRm, inspectSources, inspectionSucceeded, parseOptions, safeFailure } from '../scripts/lib/source-inspection.mjs';
import { encryptCredential } from '../server/security/credentials.js';

const env = {
  AUTH_DB_HOST: 'auth.invalid', AUTH_DB_DATABASE: 'auth', AUTH_DB_USER: 'reader', AUTH_DB_PASSWORD: 'auth-secret',
  DB_HOST: 'rm.invalid', DB_DATABASE: 'rm', DB_USER: 'reader', DB_PASSWORD: 'rm-secret',
  TENANT_CREDENTIAL_ACTIVE_KEY: 'test', TENANT_CREDENTIAL_KEYS: JSON.stringify({ test: Buffer.alloc(32, 7).toString('base64') }),
};
const connection = {
  db_host: 'tenant.invalid', db_database: 'tenant-db', db_user: 'tenant-reader', db_password: 'tenant-secret',
  db_encrypt: true, db_trust_cert: false,
};

function fakePg({ error, selected = { ...connection, db_password: encryptCredential(connection.db_password, 7, env) } } = {}) {
  const state = { queries: [], end: vi.fn(async () => {}) };
  class Client {
    constructor(config) { state.config = config; }
    async connect() { if (error) throw error; }
    async query(text, args) {
      state.queries.push({ text, args });
      if (text.includes('WHERE id = $1')) return { rows: selected ? [selected] : [] };
      if (text.includes('ORDER BY id')) return { rows: [{ id: 7, nome: 'Cliente teste', connection_configured: true }] };
      return { rows: [] };
    }
    end = state.end;
  }
  return { Client, state };
}

function fakeSql({ error, contractError } = {}) {
  const state = { queries: [], close: vi.fn(async () => {}), created: 0 };
  class Pool {
    constructor(config) { state.config = config; state.created++; }
    async connect() { if (error) throw error; }
    request() {
      return { query: async text => {
        state.queries.push(text);
        if (text.startsWith('SELECT TOP (0)') && contractError) throw contractError;
        return { recordset: [{ objectName: 'PBI_TITULOSFINANCEIRO', columnName: 'REF', dataType: 'varchar' }] };
      } };
    }
    close = state.close;
  }
  return { Pool, state };
}

describe('source inspection options', () => {
  it('defaults to catalog only and selects one explicit source', () => {
    expect(parseOptions([])).toEqual({ legacyEnv: false });
    expect(parseOptions(['--tenant', '7'])).toEqual({ legacyEnv: false, tenantId: 7 });
    expect(parseOptions(['--legacy-env'])).toEqual({ legacyEnv: true });
  });
  it.each([
    ['--tenant'], ['--tenant', '0'], ['--tenant', '-1'], ['--tenant', '1;DELETE'],
    ['--tenant', '1.2'], ['--tenant', '9007199254740992'], ['--sql', 'SELECT 1'],
    ['--tenant', '1', '--tenant', '2'], ['--legacy-env', '--tenant', '1'],
  ])('rejects invalid/ambiguous options %j', (...args) => {
    expect(() => parseOptions(args)).toThrow();
  });
});

describe('read-only source inspection', () => {
  it('lists catalog in a read-only transaction without selecting passwords', async () => {
    const pg = fakePg();
    const result = await inspectCatalog(env, pg.Client);
    expect(result.status).toBe('ok');
    expect(result.connection).toBeUndefined();
    expect(pg.state.config.options).toBe('-c default_transaction_read_only=on');
    expect(pg.state.queries[0].text).toBe('BEGIN READ ONLY');
    expect(pg.state.queries.at(-1).text).toBe('ROLLBACK');
    expect(pg.state.queries).toHaveLength(3);
    expect(pg.state.queries[1].text).not.toContain('db_user, db_password');
    expect(pg.state.end).toHaveBeenCalledOnce();
  });
  it('parameterizes selected tenant and keeps its credentials out of the report', async () => {
    const pg = fakePg(); const sql = fakeSql();
    const report = await inspectSources({ env, PgClient: pg.Client, SqlPool: sql.Pool, options: { tenantId: 7 } });
    expect(pg.state.queries.find(q => q.args)?.args).toEqual([7]);
    expect(sql.state.config.server).toBe(connection.db_host);
    expect(sql.state.config.options).toEqual({ encrypt: true, trustServerCertificate: false, readOnlyIntent: true });
    for (const secret of Object.values(connection).filter(v => typeof v === 'string')) {
      expect(JSON.stringify(report)).not.toContain(secret);
    }
    expect(inspectionSucceeded(report)).toBe(true);
    expect(report.financialValuesValidated).toBe(false);
  });
  it('does not connect to RM during catalog-only inspection', async () => {
    const pg = fakePg(); const sql = fakeSql();
    const result = await inspectSources({ env, PgClient: pg.Client, SqlPool: sql.Pool, options: {} });
    expect(result.rm.status).toBe('not_requested');
    expect(sql.state.created).toBe(0);
  });
  it('does not fall back to another company when selected company is absent', async () => {
    const pg = fakePg({ selected: null }); const sql = fakeSql();
    const result = await inspectSources({ env, PgClient: pg.Client, SqlPool: sql.Pool, options: { tenantId: 8 } });
    expect(result.rm.status).toBe('tenant_not_found');
    expect(sql.state.created).toBe(0);
    expect(inspectionSucceeded(result)).toBe(false);
  });
  it('blocks tenant inspection when catalog is inaccessible and closes client', async () => {
    const pg = fakePg({ error: Object.assign(new Error('contains secrets'), { code: 'ECONNREFUSED' }) });
    const sql = fakeSql();
    const result = await inspectSources({ env, PgClient: pg.Client, SqlPool: sql.Pool, options: { tenantId: 7 } });
    expect(result.rm.status).toBe('blocked_by_catalog');
    expect(sql.state.created).toBe(0);
    expect(pg.state.end).toHaveBeenCalledOnce();
    expect(JSON.stringify(result)).not.toContain('contains secrets');
  });
  it('can inspect legacy env independently but never asserts its tenant association', async () => {
    const pg = fakePg({ error: new Error('offline') }); const sql = fakeSql();
    const result = await inspectSources({ env, PgClient: pg.Client, SqlPool: sql.Pool, options: { legacyEnv: true } });
    expect(result.rm.status).toBe('ok');
    expect(result.rm.tenantAssociation).toBe('not_verified');
    expect(sql.state.config.server).toBe(env.DB_HOST);
    expect(inspectionSucceeded(result)).toBe(false);
  });
  it('runs only fixed metadata and the actual application query with zero rows', async () => {
    const sql = fakeSql();
    const result = await inspectRm(connection, sql.Pool);
    expect(sql.state.queries).toHaveLength(2);
    expect(sql.state.queries[0]).toMatch(/^\s*SELECT/);
    expect(sql.state.queries[1]).toBe(`SELECT TOP (0) * FROM ${baseSubquery()}`);
    expect(result.contract.financialValuesValidated).toBe(false);
    expect(sql.state.close).toHaveBeenCalledOnce();
  });
  it('reports source-contract failure separately from metadata access', async () => {
    const sql = fakeSql({ contractError: Object.assign(new Error('private query'), { code: 'EREQUEST' }) });
    const result = await inspectRm(connection, sql.Pool);
    expect(result.status).toBe('ok');
    expect(result.contract).toEqual({ status: 'unavailable', code: 'EREQUEST' });
    expect(JSON.stringify(result)).not.toContain('private query');
    expect(sql.state.close).toHaveBeenCalledOnce();
  });
  it('closes failed SQL connection and returns no raw error details', async () => {
    const sql = fakeSql({ error: Object.assign(new Error('password=secret'), { code: 'ELOGIN' }) });
    expect(await inspectRm(connection, sql.Pool)).toEqual({ status: 'unavailable', code: 'ELOGIN' });
    expect(sql.state.close).toHaveBeenCalledOnce();
  });
  it('rejects invalid schema before making any connection', async () => {
    const pg = fakePg();
    expect((await inspectCatalog({ ...env, AUTH_DB_SCHEMA: 'x; DROP TABLE empresas' }, pg.Client)).code).toBe('INVALID_SCHEMA');
    expect(pg.state.config).toBeUndefined();
  });
  it('fails closed when configuration is missing', async () => {
    const pg = fakePg(); const sql = fakeSql();
    expect((await inspectCatalog({}, pg.Client)).code).toBe('MISSING_AUTH_CONFIGURATION');
    expect((await inspectRm({}, sql.Pool)).code).toBe('MISSING_RM_CONFIGURATION');
    expect(pg.state.config).toBeUndefined();
    expect(sql.state.created).toBe(0);
  });
  it('redacts unknown error codes as well as error messages', () => {
    expect(safeFailure({ code: 'secret-host', message: 'secret-password' })).toEqual({ status: 'unavailable', code: 'CONNECTION_OR_QUERY_FAILED' });
  });
});
