import request from 'supertest';
import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), sqlPool: vi.fn(), financial: vi.fn() }));
vi.mock('../server/db/authPool.js', () => ({ getAuthPool: () => ({ query: mocks.query, connect: async () => ({ query: mocks.query, release() {} }) }) }));
vi.mock('../server/db/pool.js', async importOriginal => ({ ...await importOriginal(), getPoolForEmpresa: mocks.sqlPool }));
vi.mock('bcryptjs', () => ({ default: {
  compare: async (plain, hash) => `hash:${plain}` === hash,
  hash: async plain => `hash:${plain}`,
} }));
import { createApp } from '../server/app.js';
import { signUser } from '../server/auth/middleware.js';
import { assertAuthMigrations } from '../server/db/migrations.js';
import { decryptCredential } from '../server/security/credentials.js';

let users, companies, revoked, app, sequence = 0;
const rows = values => ({ rows: values, rowCount: values.length });
const joined = user => user && ({ ...user, empresa_ativa: companies.get(user.empresa_id)?.ativo,
  empresa_nome: companies.get(user.empresa_id)?.nome, empresa_logo: '/logo.png' });
const token = id => signUser(users.get(id));
const get = (url, bearer, tenant) => {
  const call = request(app).get(url).set('Authorization', `Bearer ${bearer}`);
  return tenant === undefined ? call : call.set('X-Empresa-Id', tenant);
};
const kpis = () => `/api/titulos/kpis?case=${++sequence}`;
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('TENANT_CREDENTIAL_ACTIVE_KEY', 'test');
  vi.stubEnv('TENANT_CREDENTIAL_KEYS', JSON.stringify({ test: Buffer.alloc(32, 7).toString('base64') }));
  companies = new Map([[1, { id: 1, nome: 'A', ativo: true, connection_version: 0 }], [2, { id: 2, nome: 'B', ativo: true, connection_version: 0 }]]);
  users = new Map([
    [1, { id: 1, nome: 'Cliente A', email: 'a@example.test', perfil: 'cliente', empresa_id: 1, ativo: true, session_version: 0, senha_hash: 'hash:password-A' }],
    [2, { id: 2, nome: 'Cliente B', email: 'b@example.test', perfil: 'cliente', empresa_id: 2, ativo: true, session_version: 0, senha_hash: 'hash:password-B' }],
    [3, { id: 3, nome: 'Admin', email: 'admin@example.test', perfil: 'admin', empresa_id: null, ativo: true, session_version: 0, senha_hash: 'hash:password-admin' }],
  ]);
  revoked = new Set();
  mocks.query.mockImplementation(async (sql, params = []) => {
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql) || sql.includes('INSERT INTO') && sql.includes('.audit_events')) return rows([]);
    if (sql.includes('nextval(')) return rows([{ id: 1 }]);
    if (sql.includes('NOT EXISTS')) return rows(revoked.has(params[1]) ? [] : [joined(users.get(params[0]))].filter(Boolean));
    if (sql.includes('INSERT INTO') && sql.includes('sessoes_revogadas')) { revoked.add(params[0]); return rows([]); }
    if (sql.includes('DELETE FROM') && sql.includes('sessoes_revogadas')) return rows([]);
    if (sql.includes('WHERE lower(u.email)')) return rows([...users.values()].filter(u => u.email === params[0] && u.ativo).map(joined));
    if (sql.includes('SELECT id, senha_hash')) return rows([users.get(params[0])].filter(Boolean));
    if (sql.includes('SELECT id') && sql.includes('.empresas') && sql.includes('WHERE id')) return rows([companies.get(params[0])].filter(c => c?.ativo));
    if (sql.includes('ultimo_login_em')) return rows([]);
    if (sql.includes('SELECT id FROM') && sql.includes('.usuarios')) return rows([]);
    if (sql.includes('UPDATE') && sql.includes('senha_hash')) {
      const user = users.get(params[1]);
      if (!user || (params.length === 4 && (user.senha_hash !== params[2] || user.session_version !== params[3]))) return rows([]);
      user.senha_hash = params[0]; user.session_version++;
      return rows([{ id: user.id }]);
    }
    if (sql.includes('UPDATE') && sql.includes('.usuarios SET nome')) {
      const user = users.get(params[5]);
      Object.assign(user, { nome: params[0], email: params[1], perfil: params[2], empresa_id: params[3], ativo: params[4] ?? user.ativo, session_version: user.session_version + 1 });
      return rows([{ id: user.id, nome: user.nome, perfil: user.perfil }]);
    }
    if (sql.includes('.empresas') && (sql.includes('INSERT INTO') || sql.startsWith('SELECT'))) {
      return rows([{ id: 1, nome: 'A', db_password: 'must-never-be-returned', unexpected_secret: 'hidden' }]);
    }
    throw new Error(`Unexpected test query: ${sql}`);
  });
  mocks.sqlPool.mockImplementation(async id => ({ request: () => ({ input() { return this; }, query: async () => {
    mocks.financial(id); return { recordset: [{ totalFinanceiro: id * 100 }] };
  } }) }));
  app = createApp({ isProduction: true });
});

describe('autorizacao multiempresa nas rotas reais, com bancos simulados', () => {
  it.each(['kpis', 'tabela', 'export', 'graficos/evolucao-vencimento', 'filtros/clientes'])('recusa datas invalidas na rota %s antes de cache/SQL financeiro', async endpoint => {
    for (const query of ['startDate=2026-02-30', 'startDate=2026-02-02&endDate=2026-02-01', 'dateField=toString', 'startDate=2026-01-01&startDate=2026-01-02', 'endDate=9999-12-31', 'dateField=baixa&dateField=emissao']) {
      await get(`/api/titulos/${endpoint}?${query}`, token(1)).expect(400);
    }
    expect(mocks.sqlPool).not.toHaveBeenCalled();
    expect(mocks.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO') && sql.includes('.audit_events'))).toBe(false);
  });
  it.each([['2026-10-15', '2026-11-15', '10'], ['2026-10-15', '2026-11-16', '7']])('agrupa vencimentos com limite civil independente de horario de verao %s/%s', async (start, end, width) => {
    const query = vi.fn().mockResolvedValue({ recordset: [] });
    mocks.sqlPool.mockResolvedValue({ request: () => ({ input() {}, query }) });
    await get(`/api/titulos/graficos/evolucao-vencimento?startDate=${start}&endDate=${end}&refresh=1`, token(1)).expect(200);
    expect(query.mock.calls[0][0]).toContain(`CONVERT(char(${width}), DTVENC, 120)`);
  });
  it('auditoria fica restrita ao administrador geral e usa paginacao limitada', async () => {
    await get('/api/admin/auditoria', token(1)).expect(403);
    const original = mocks.query.getMockImplementation();
    mocks.query.mockImplementation(async (sql, params) => sql.includes('FROM equilibrio_ti.audit_events') ? rows([{ id: '5', action: 'user.update' }, { id: '4', action: 'user.update' }]) : original(sql, params));
    const response = await get('/api/admin/auditoria?limit=1&before=7&empresa_id=2', token(3)).expect(200);
    expect(response.body.next).toBe('5');
    expect(mocks.query.mock.calls.find(([sql]) => sql.includes('FROM equilibrio_ti.audit_events'))[1]).toEqual(['7', 2, 2, null, null, null, null, null]);
    await get('/api/admin/auditoria?limit=1000', token(3)).expect(400);
  });
  it('exportacao bloqueia antes de ler dados quando auditoria falha', async () => {
    const original = mocks.query.getMockImplementation();
    mocks.query.mockImplementation(async (sql, params) => {
      if (sql.includes('INSERT INTO') && sql.includes('.audit_events')) throw new Error('audit offline');
      return original(sql, params);
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await get('/api/titulos/export', token(1)).expect(500);
    expect(mocks.sqlPool).not.toHaveBeenCalled();
  });
  it('exportacao acima do limite retorna aviso sem anexo nem linhas pessoais', async () => {
    const query = vi.fn().mockResolvedValue({ recordset: Array(5001).fill({ CLIFOR: 'private-name' }) });
    mocks.sqlPool.mockResolvedValue({ request: () => ({ input() { return this; }, query }) });
    const result = await get('/api/titulos/export', token(1)).expect(422);
    expect(result.body).toMatchObject({ code: 'EXPORT_LIMIT_EXCEEDED', limit: 5000 });
    expect(result.headers['content-disposition']).toBeUndefined();
    expect(result.headers['cache-control']).toContain('no-store');
    expect(JSON.stringify(result.body)).not.toContain('private-name');
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][0]).toContain('SELECT TOP (5001)');
    expect(mocks.sqlPool).toHaveBeenCalledWith(1, 0);
  });
  it('exportacao e tabela compartilham filtros parametrizados e ordenacao', async () => {
    const input = vi.fn().mockReturnThis();
    const query = vi.fn().mockResolvedValue({ recordset: [], recordsets: [[{ total: 0 }], []] });
    mocks.sqlPool.mockResolvedValue({ request: () => ({ input, query }) });
    const filters = '?search=private-name&tipo=A%20Pagar&startDate=2026-09-01&endDate=2026-09-18&sortBy=VLRRATEIO&sortDir=ASC&clientes%5B%5D=Nome%2C%20Matriz&clientes%5B%5D=Outra';
    await get(`/api/titulos/tabela${filters}`, token(1)).expect(200);
    const tableInputs = input.mock.calls.filter(([name]) => name.startsWith('f'));
    input.mockClear();
    const result = await get(`/api/titulos/export${filters}`, token(1)).expect(200);
    expect(input.mock.calls).toEqual(tableInputs);
    expect(input.mock.calls.map(call => call[2])).toContain('Nome, Matriz');
    expect(input.mock.calls.map(call => call[2])).not.toContain('Matriz');
    expect(query.mock.calls[1][0].match(/ORDER BY [^\r\n]+/)[0]).toBe(query.mock.calls[0][0].match(/ORDER BY [^\r\n]+/)[0]);
    expect(query.mock.calls[1][0]).toContain('ORDER BY VLRRATEIO ASC');
    expect(query.mock.calls[1][0]).not.toContain('private-name');
    expect(result.headers['x-export-row-count']).toBe('0');
    expect(result.headers['content-disposition']).toContain('titulos-financeiros.xlsx');
    expect(result.headers['cache-control']).toContain('no-store');
  });
  it.each(['page=NaN', 'page=1.5', 'page=-1', 'pageSize=1000', 'page=999999999999', 'page=1&page=2'])('recusa paginacao invalida antes de abrir SQL financeiro: %s', async query => {
    await get(`/api/titulos/tabela?${query}`, token(1)).expect(400);
    expect(mocks.sqlPool).not.toHaveBeenCalled();
  });
  it.each(['kpis', 'tabela', 'export'])('rota %s preserva filtro com uma unica opcao contendo virgula', async endpoint => {
    const input = vi.fn();
    const query = vi.fn().mockResolvedValue({ recordset: [], recordsets: [[{ total: 0 }], []] });
    mocks.sqlPool.mockResolvedValue({ request: () => ({ input, query }) });
    await get(`/api/titulos/${endpoint}?clientes%5B%5D=Unico%2C%20Nome`, token(1)).expect(200);
    expect(input.mock.calls.filter(([name]) => name.startsWith('f')).map(call => call[2])).toEqual(['Unico, Nome']);
    expect(query.mock.calls[0][0]).toContain('CLIFOR IN (@f0)');
  });
  it('recusa mistura de lista antiga/canonica sem executar consulta financeira', async () => {
    const query = vi.fn();
    mocks.sqlPool.mockResolvedValue({ request: () => ({ input() {}, query }) });
    await get('/api/titulos/tabela?clientes=A&clientes%5B%5D=B', token(1)).expect(400);
    expect(query).not.toHaveBeenCalled();
  });
  it.each(['VLRRATEIO; DROP TABLE x', 'toString'])('exportacao ignora ordenacao fora da lista: %s', async sort => {
    const query = vi.fn().mockResolvedValue({ recordset: [] });
    mocks.sqlPool.mockResolvedValue({ request: () => ({ input() { return this; }, query }) });
    await get(`/api/titulos/export?sortBy=${encodeURIComponent(sort)}&sortDir=DESC;--`, token(1)).expect(200);
    expect(query.mock.calls[0][0]).toContain('ORDER BY DTVENC DESC');
    expect(query.mock.calls[0][0]).not.toContain(sort);
  });
  it('exportacao recusa outro tenant antes da auditoria e consulta financeira', async () => {
    await get('/api/titulos/export', token(1), '2').expect(403);
    expect(mocks.sqlPool).not.toHaveBeenCalled();
    expect(mocks.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO') && sql.includes('.audit_events'))).toBe(false);
  });
  it('nova versao da conexao nao reutiliza resultado financeiro antigo', async () => {
    const url = kpis(), bearer = token(1);
    await get(url, bearer).expect(200);
    companies.get(1).connection_version++;
    await get(url, bearer).expect(200);
    expect(mocks.financial).toHaveBeenCalledTimes(2);
    expect(mocks.sqlPool.mock.calls).toEqual([[1, 0], [1, 1]]);
  });
  it('consulta KPI conserva fracao na media e null quando razao nao tem base', async () => {
    const query = vi.fn().mockResolvedValue({ recordset: [{ mediaDiasAtraso: 1.5, percentualBaixado: null, quantidadeTitulos: 2 }] });
    mocks.sqlPool.mockResolvedValue({ request: () => ({ input() {}, query }) });
    const result = await get(kpis(), token(1)).expect(200);
    expect(result.body).toMatchObject({ mediaDiasAtraso: 1.5, percentualBaixado: null, quantidadeTitulos: 2 });
    const statement = query.mock.calls[0][0];
    expect(statement).toContain('CAST(DATEDIFF(day, DTVENC, GETDATE()) AS decimal(19, 4))');
    expect(statement).toContain('CASE WHEN SUM(VLRRATEIO) > 0 THEN SUM(VLRBAIXA) / NULLIF(SUM(VLRRATEIO), 0) END AS percentualBaixado');
    expect(statement).toContain('COUNT_BIG(*) AS quantidadeTitulos');
    expect(statement).toContain('COUNT_BIG(CASE WHEN VLRRATEIO = 0 OR VLRRATEIO IS NULL THEN 1 END) AS titulosValorZerado');
    expect(statement).not.toMatch(/SUM\(CASE[^\n]+THEN 1 ELSE 0 END\) AS titulos/);
    expect(statement).toContain("STATUS_FIN = 'Em Aberto'");
  });
  it('analises usa media decimal antes de agregar, sem substituir falta de amostra por zero', async () => {
    const query = vi.fn().mockResolvedValue({ recordset: [{ mediaAtraso: null, maiorAtrasoMedio: null }] });
    mocks.sqlPool.mockResolvedValue({ request: () => ({ input() {}, query }) });
    const result = await get(`/api/titulos/analises?case=${++sequence}`, token(1)).expect(200);
    expect(result.body).toEqual({ mediaAtraso: null, maiorAtrasoMedio: null });
    expect(query.mock.calls[0][0].match(/AVG\(CAST\(DATEDIFF\(day, DTVENC, DTBAIXA\) AS decimal\(19, 4\)\)\)/g)).toHaveLength(2);
  });
  it('acesso administrativo registra autor real e empresa sem query pessoal', async () => {
    await get(`${kpis()}&search=private-name`, token(3), '2').expect(200);
    const audit = mocks.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO') && sql.includes('.audit_events'));
    expect(audit[1]).toEqual([3, 'user', 2, 'admin.tenant_access', null, 'authorized', expect.any(String)]);
    expect(JSON.stringify(audit)).not.toContain('private-name');
  });
  it('erro financeiro nao expoe dados em resposta ou log, inclusive em desenvolvimento', async () => {
    app = createApp({ isProduction: false });
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.sqlPool.mockRejectedValueOnce(new Error('CPF=private-password=secret-SQL=query'));
    const result = await get(kpis(), token(1)).expect(500);
    expect(JSON.stringify(result.body)).not.toContain('private');
    expect(result.body).not.toHaveProperty('detail');
    expect(logger).toHaveBeenCalledWith({ event: 'request_failed', requestId: result.body.requestId, status: 500 });
    expect(result.headers['x-request-id']).toBe(result.body.requestId);
  });
  it('json invalido nao devolve o conteudo recebido', async () => {
    const result = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"private":secret').expect(400);
    expect(JSON.stringify(result.body)).not.toContain('private');
    expect(result.headers['cache-control']).toContain('no-store');
  });
  it('rejeita token legado ou adulterado antes de consultar o cadastro', async () => {
    const legacy = signUser({ id: 1 });
    await get(kpis(), legacy).expect(401);
    const parts = token(1).split('.'); parts[1] = Buffer.from(JSON.stringify({ sub: '3', sv: 0 })).toString('base64url');
    await get(kpis(), parts.join('.')).expect(401);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it('nao coloca dados pessoais ou permissoes antigas no token', () => {
    const claims = jwt.decode(token(1));
    expect(Object.keys(claims).sort()).toEqual(['exp', 'iat', 'jti', 'sub', 'sv']);
  });
  it('bloqueia cliente tentando selecionar outra empresa antes do SQL financeiro', async () => {
    await get(kpis(), token(1), '2').expect(403);
    expect(mocks.sqlPool).not.toHaveBeenCalled();
  });
  it('isola os dados e o cache das empresas A/B/A', async () => {
    const url = kpis();
    expect((await get(url, token(1)).expect(200)).body.totalFinanceiro).toBe(100);
    expect((await get(url, token(2)).expect(200)).body.totalFinanceiro).toBe(200);
    expect((await get(url, token(1)).expect(200)).body.totalFinanceiro).toBe(100);
    expect(mocks.financial.mock.calls).toEqual([[1], [2]]);
  });
  it('ignora selecao por query string para cliente', async () => {
    const result = await get(`${kpis()}&empresa_id=2&tenant=2`, token(1)).expect(200);
    expect(result.body.totalFinanceiro).toBe(100);
  });
  it('administrador precisa selecionar empresa valida explicitamente', async () => {
    await get(kpis(), token(3)).expect(400);
    await get(kpis(), token(3), '999').expect(403);
    const result = await get(kpis(), token(3), '2').expect(200);
    expect(result.body.totalFinanceiro).toBe(200);
  });
  it.each(['0', '-1', '1.5', '1e0', '1,2', '2147483648', 'abc'])('rejeita identificador %s', async value => {
    await get(kpis(), token(3), value).expect(400);
    expect(mocks.sqlPool).not.toHaveBeenCalled();
  });
  it.each(['inactive', 'removed', 'unlinked', 'unknown-role', 'company-inactive', 'version'])('bloqueia sessao apos mudanca %s mesmo com cache preenchido', async change => {
    const bearer = token(1), url = kpis();
    await get(url, bearer).expect(200);
    const user = users.get(1);
    if (change === 'inactive') user.ativo = false;
    if (change === 'removed') users.delete(1);
    if (change === 'unlinked') user.empresa_id = null;
    if (change === 'unknown-role') user.perfil = 'manager';
    if (change === 'company-inactive') companies.get(1).ativo = false;
    if (change === 'version') user.session_version++;
    await get(url, bearer).expect(401);
    expect(mocks.financial).toHaveBeenCalledTimes(1);
  });
  it('empresa desativada bloqueia tambem selecao administrativa e cache', async () => {
    const url = kpis(), bearer = token(3);
    await get(url, bearer, '2').expect(200);
    companies.get(2).ativo = false;
    await get(url, bearer, '2').expect(403);
    expect(mocks.financial).toHaveBeenCalledTimes(1);
  });
  it('permissao administrativa e lida do cadastro atual', async () => {
    const bearer = token(3);
    Object.assign(users.get(3), { perfil: 'cliente', empresa_id: 1 });
    await get('/api/admin/empresas', bearer).expect(403);
  });
  it('falha fechada quando cadastro fica indisponivel, sem expor erro interno', async () => {
    mocks.query.mockRejectedValueOnce(new Error('host=secret password=secret'));
    const result = await get(kpis(), token(1)).expect(503);
    expect(JSON.stringify(result.body)).not.toContain('secret');
    expect(mocks.sqlPool).not.toHaveBeenCalled();
  });
  it('logout revoga somente o token apresentado', async () => {
    const first = token(1), second = token(1);
    await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${first}`).expect(200);
    await get('/api/auth/me', first).expect(401);
    await get('/api/auth/me', second).expect(200);
  });
  it('me devolve marca da empresa sem senha ou versao interna', async () => {
    const result = await get('/api/auth/me', token(1)).expect(200);
    expect(result.body.user.empresa).toEqual({ id: 1, nome: 'A', logo_url: '/logo.png' });
    expect(result.body.user).not.toHaveProperty('session_version');
    expect(result.body.user).not.toHaveProperty('senha_hash');
    expect(result.headers['cache-control']).toContain('no-store');
  });
  it('login usa versao corrente e nao devolve hash', async () => {
    const result = await request(app).post('/api/auth/login').send({ email: 'a@example.test', password: 'password-A' }).expect(200);
    expect(jwt.decode(result.body.token).sv).toBe(0);
    expect(result.body.user).not.toHaveProperty('senha_hash');
    await get('/api/auth/me', result.body.token).expect(200);
  });
  it('login bloqueia empresa inativa', async () => {
    companies.get(1).ativo = false;
    await request(app).post('/api/auth/login').send({ email: 'a@example.test', password: 'password-A' }).expect(401);
  });
  it('troca de senha invalida todas as sessoes antigas', async () => {
    const first = token(1), second = token(1);
    await request(app).post('/api/auth/change-password').set('Authorization', `Bearer ${first}`)
      .send({ currentPassword: 'password-A', newPassword: 'password-new' }).expect(200);
    await get('/api/auth/me', first).expect(401);
    await get('/api/auth/me', second).expect(401);
    expect(mocks.query.mock.calls.some(([sql]) => sql.includes('AND senha_hash = $3 AND session_version = $4'))).toBe(true);
  });
  it('senha atual incorreta nao altera versao', async () => {
    await request(app).post('/api/auth/change-password').set('Authorization', `Bearer ${token(1)}`)
      .send({ currentPassword: 'wrong', newPassword: 'password-new' }).expect(401);
    expect(users.get(1).session_version).toBe(0);
  });
  it('reset administrativo revoga acesso antigo', async () => {
    const old = token(1);
    await request(app).post('/api/admin/usuarios/1/reset-password').set('Authorization', `Bearer ${token(3)}`)
      .send({ novaSenha: 'password-new' }).expect(200);
    await get('/api/auth/me', old).expect(401);
  });
  it('mudanca de vinculo revoga token antigo e novo login recebe empresa atual', async () => {
    const old = token(1);
    await request(app).put('/api/admin/usuarios/1').set('Authorization', `Bearer ${token(3)}`)
      .send({ nome: 'Cliente', email: 'a@example.test', perfil: 'cliente', empresa_id: 2, ativo: true }).expect(200);
    await get(kpis(), old).expect(401);
    expect((await get(kpis(), token(1)).expect(200)).body.totalFinanceiro).toBe(200);
  });
  it.each([{ perfil: 'root', empresa_id: 1 }, { perfil: 'cliente', empresa_id: null }, { perfil: 'cliente', empresa_id: 999 }])('rejeita cadastro com papel ou vinculo invalido: %j', async payload => {
    await request(app).post('/api/admin/usuarios').set('Authorization', `Bearer ${token(3)}`)
      .send({ nome: 'Nome', email: 'new@example.test', senha: 'password-new', ...payload }).expect(400);
    expect(mocks.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO') && sql.includes('.usuarios'))).toBe(false);
  });
  it('cadastro e listagem de empresas nao expoem segredos', async () => {
    const bearer = token(3);
    const result = await request(app).post('/api/admin/empresas').set('Authorization', `Bearer ${bearer}`)
      .send({ nome: 'A', db_host: 'localhost', db_database: 'rm', db_user: 'readonly', db_password: 'must-never-be-returned' }).expect(200);
    expect(result.body).not.toHaveProperty('db_password');
    expect(result.body).not.toHaveProperty('unexpected_secret');
    const insertion = mocks.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO') && sql.includes('.empresas'));
    expect(insertion[1][7]).toMatch(/^enc:v1:test:/);
    expect(decryptCredential(insertion[1][7], 1)).toBe('must-never-be-returned');
    const list = await get('/api/admin/empresas', bearer).expect(200);
    expect(JSON.stringify(list.body)).not.toContain('must-never-be-returned');
    expect(mocks.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO'))[0]).not.toContain('RETURNING *');
  });
});

describe('inicializacao somente verifica migrations', () => {
  it('nao grava no banco quando todas as versoes estao aplicadas', async () => {
    const query = vi.fn().mockResolvedValue(rows([{ version: '001' }, { version: '002' }, { version: '003' }]));
    await assertAuthMigrations({ pool: { query } });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toMatch(/^SELECT version/);
  });
  it('impede inicializacao com migrations pendentes, sem executar SQL de alteracao', async () => {
    const query = vi.fn().mockResolvedValue(rows([{ version: '001' }]));
    await expect(assertAuthMigrations({ pool: { query } })).rejects.toThrow('pendentes');
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('nao expoe dados de conexao ao falhar', async () => {
    const query = vi.fn().mockRejectedValue(new Error('secret'));
    await expect(assertAuthMigrations({ pool: { query } })).rejects.toThrow('indisponivel');
  });
});
