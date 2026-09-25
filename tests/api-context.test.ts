import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function storage() {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, String(value)); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const response = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
const empresa = (id: number) => ({ id, nome: `Empresa ${id}`, logo_url: '' });
let api: typeof import('../src/services/api');
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal('localStorage', storage());
  vi.stubGlobal('sessionStorage', storage());
  vi.stubGlobal('window', new EventTarget());
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  api = await import('../src/services/api');
  api.setAuthToken('session-one');
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('isolamento do contexto da API', () => {
  it('bloqueia logos externas inclusive em copias antigas do navegador', () => {
    api.setActiveEmpresa({ ...empresa(1), logo_url: 'https://tracking.invalid/logo.png' });
    expect(api.getActiveEmpresa()?.logo_url).toBe('');
    localStorage.setItem('equilibrioti:active-empresa-data', JSON.stringify({ ...empresa(1), logo_url: '//tracking.invalid/logo.png' }));
    expect(api.getActiveEmpresa()?.logo_url).toBe('');
  });
  it('consulta auditoria sem cache e encaminha filtros e cancelamento', async () => {
    fetchMock.mockImplementation(async () => response({ rows: [], next: null }));
    const controller = new AbortController();
    await api.adminGetAudit({ empresa_id: 2, action: 'company.create' }, '40', controller.signal);
    await api.adminGetAudit({ empresa_id: 2, action: 'company.create' }, '40', controller.signal);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const url = new URL(fetchMock.mock.calls[0][0], 'http://local');
    expect(url.searchParams.get('empresa_id')).toBe('2');
    expect(url.searchParams.get('before')).toBe('40');
    expect(url.searchParams.get('action')).toBe('company.create');
  });
  it('401 em dados descarta sessao e cache, mas nao erro de senha atual', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 401 }));
    await expect(api.apiGet('/api/titulos/kpis')).rejects.toMatchObject({ name: 'AbortError' });
    expect(api.getAuthToken()).toBe('');
    api.setAuthToken('still-valid');
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Senha atual incorreta' }), { status: 401 }));
    await expect(api.changePassword('wrong', 'new-password')).rejects.toThrow('Senha atual incorreta');
    expect(api.getAuthToken()).toBe('still-valid');
  });
  it('logout limpa imediatamente e revoga token capturado sem apagar novo login', async () => {
    const delayed = deferred<Response>(); fetchMock.mockReturnValue(delayed.promise);
    const pending = api.logoutSession();
    expect(api.getAuthToken()).toBe('');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer session-one');
    api.setAuthToken('new-session');
    delayed.resolve(response({ ok: true }));
    expect(await pending).toBe(true);
    expect(api.getAuthToken()).toBe('new-session');
  });
  it('logout informa falta de confirmacao remota sem manter sessao local', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    expect(await api.logoutSession()).toBe(false);
    expect(api.getAuthToken()).toBe('');
  });
  it('troca de senha bem sucedida exige novo login', async () => {
    fetchMock.mockResolvedValue(response({ ok: true }));
    await api.changePassword('old', 'new-password');
    expect(api.getAuthToken()).toBe('');
  });
  it('separa A/B/A e captura os headers corretos', async () => {
    fetchMock.mockImplementation(async (_url, options) => response(options.headers['X-Empresa-Id']));
    api.setActiveEmpresa(empresa(1));
    expect(await api.apiGet('/api/titulos/kpis')).toBe('1');
    expect(await api.apiGet('/api/titulos/kpis')).toBe('1');
    api.setActiveEmpresa(empresa(2));
    expect(await api.apiGet('/api/titulos/kpis')).toBe('2');
    api.setActiveEmpresa(empresa(1));
    expect(await api.apiGet('/api/titulos/kpis')).toBe('1');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer session-one');
    expect(api.cacheKey('/api/titulos/kpis')).not.toContain('session-one');
  });
  it('nao reutiliza cache entre usuarios da mesma empresa', async () => {
    fetchMock.mockImplementation(async () => response('ok'));
    api.setActiveEmpresa(empresa(1));
    await api.apiGet('/api/titulos/kpis');
    api.setAuthToken('session-two');
    api.setActiveEmpresa(empresa(1));
    await api.apiGet('/api/titulos/kpis');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('rejeita resposta tardia mesmo se transporte ignorar cancelamento e voltar a A', async () => {
    const delayed = deferred<Response>();
    fetchMock.mockReturnValueOnce(delayed.promise).mockResolvedValue(response('new-A'));
    api.setActiveEmpresa(empresa(1));
    const pending = api.apiGet('/api/titulos/kpis');
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    const signal = fetchMock.mock.calls[0][1].signal;
    api.setActiveEmpresa(empresa(2));
    api.setActiveEmpresa(empresa(1));
    expect(signal.aborted).toBe(true);
    delayed.resolve(response('old-A'));
    await rejected;
    expect(await api.apiGet('/api/titulos/kpis')).toBe('new-A');
  });
  it('descarta dados do armazenamento antigo e nao persiste respostas financeiras', async () => {
    sessionStorage.setItem('titulos:/api/titulos/kpis?', '{corrupted');
    sessionStorage.setItem('unrelated', 'keep');
    api.setActiveEmpresa(empresa(1));
    fetchMock.mockResolvedValue(response({ amount: 123 }));
    await api.apiGet('/api/titulos/kpis', undefined, undefined, { storage: true });
    expect(sessionStorage.length).toBe(1);
    expect(sessionStorage.getItem('unrelated')).toBe('keep');
  });
  it('funciona se sessionStorage estiver bloqueado', async () => {
    vi.stubGlobal('sessionStorage', { get length() { throw new Error('storage blocked'); } });
    api.setActiveEmpresa(empresa(2));
    fetchMock.mockResolvedValue(response('ok'));
    expect(await api.apiGet('/api/titulos/kpis', undefined, undefined, { storage: true })).toBe('ok');
  });
  it('compartilha chamadas identicas sem sinais individuais', async () => {
    const delayed = deferred<Response>();
    fetchMock.mockReturnValue(delayed.promise);
    const first = api.apiGet('/api/titulos/kpis');
    const second = api.apiGet('/api/titulos/kpis');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    delayed.resolve(response('shared'));
    expect(await first).toBe('shared');
    expect(await second).toBe('shared');
  });
  it('cancelamento de um consumidor nao afeta outro', async () => {
    const firstResponse = deferred<Response>();
    const secondResponse = deferred<Response>();
    fetchMock.mockReturnValueOnce(firstResponse.promise).mockReturnValueOnce(secondResponse.promise);
    const firstController = new AbortController();
    const secondController = new AbortController();
    const first = api.apiGet('/api/titulos/kpis', undefined, undefined, { signal: firstController.signal });
    const rejected = expect(first).rejects.toMatchObject({ name: 'AbortError' });
    const second = api.apiGet('/api/titulos/kpis', undefined, undefined, { signal: secondController.signal });
    firstController.abort();
    firstResponse.resolve(response('cancelled'));
    secondResponse.resolve(response('current'));
    await rejected;
    expect(await second).toBe('current');
    expect(fetchMock.mock.calls[1][1].signal.aborted).toBe(false);
  });
  it('limpeza invalida requisicao antiga sem remover nova requisicao pendente', async () => {
    const old = deferred<Response>(); const fresh = deferred<Response>();
    fetchMock.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    const oldRequest = api.apiGet('/api/titulos/kpis');
    const rejected = expect(oldRequest).rejects.toMatchObject({ name: 'AbortError' });
    api.clearApiCache();
    const current = api.apiGet('/api/titulos/kpis');
    old.resolve(response('old'));
    await rejected;
    const shared = api.apiGet('/api/titulos/kpis');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fresh.resolve(response('new'));
    expect(await current).toBe('new');
    expect(await shared).toBe('new');
  });
  it('refresh mais recente nao e sobrescrito por resposta antiga', async () => {
    const old = deferred<Response>(); const fresh = deferred<Response>();
    fetchMock.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    const first = api.apiGet('/api/titulos/kpis');
    const second = api.apiGet('/api/titulos/kpis', undefined, undefined, { refresh: true });
    fresh.resolve(response('new')); await second;
    old.resolve(response('old')); await first;
    expect(await api.apiGet('/api/titulos/kpis')).toBe('new');
    expect(fetchMock.mock.calls[1][0]).toContain('refresh=1');
  });
  it('envia q mesmo sem filtros globais e omite arrays vazios', async () => {
    fetchMock.mockResolvedValue(response([]));
    await api.apiGet('/api/titulos/filtros/clientes', undefined, { q: 'A & B' });
    expect(fetchMock.mock.calls[0][0]).toContain('?q=A+%26+B');
    expect(api.params({ clientes: [], contas: [] })).toBe('');
  });
  it('serializa listas sem dividir virgulas e diferencia chaves de cache', () => {
    const query = new URLSearchParams(api.params({ clientes: ['Silva, Souza & Cia', 'A+B'], contas: [' Caixa '] }));
    expect(query.getAll('clientes[]')).toEqual(['Silva, Souza & Cia', 'A+B']);
    expect(query.getAll('contas[]')).toEqual([' Caixa ']);
    expect(query.has('clientes')).toBe(false);
    expect(api.cacheKey('/api/titulos/kpis', { clientes: ['A,B'] })).not.toBe(api.cacheKey('/api/titulos/kpis', { clientes: ['A', 'B'] }));
  });
  it('respeita TTL e opcao sem cache', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    fetchMock.mockResolvedValue(response('ok'));
    fetchMock.mockImplementation(async () => response('ok'));
    await api.apiGet('/api/titulos/kpis', undefined, undefined, { ttl: 10 });
    now.mockReturnValue(1005);
    await api.apiGet('/api/titulos/kpis', undefined, undefined, { ttl: 10 });
    now.mockReturnValue(1011);
    await api.apiGet('/api/titulos/kpis', undefined, undefined, { ttl: 10 });
    await api.apiGet('/api/titulos/kpis', undefined, undefined, { cache: false });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it('sinal ja cancelado nao recebe cache nem inicia rede', async () => {
    fetchMock.mockResolvedValue(response('ok'));
    await api.apiGet('/api/titulos/kpis');
    const controller = new AbortController(); controller.abort();
    await expect(api.apiGet('/api/titulos/kpis', undefined, undefined, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('logout durante leitura do arquivo impede iniciar download', async () => {
    const blob = deferred<Blob>();
    fetchMock.mockResolvedValue({ ok: true, headers: new Headers(), blob: () => blob.promise });
    const download = api.downloadTitulosExport(api.defaultFilters);
    const rejected = expect(download).rejects.toMatchObject({ name: 'AbortError' });
    await Promise.resolve();
    api.clearAuthToken();
    blob.resolve(new Blob(['old-data']));
    await rejected;
  });
  it('exportacao repassa busca e ordem e apresenta limite sem baixar arquivo', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'Recorte acima de 5.000 registros.' }), { status: 422, headers: { 'content-type': 'application/json' } }));
    await expect(api.downloadTitulosExport({ ...api.defaultFilters, search: 'busca atual' }, { sortBy: 'VLRRATEIO', sortDir: 'ASC' })).rejects.toThrow('5.000');
    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost');
    expect(url.searchParams.get('search')).toBe('busca atual');
    expect(url.searchParams.get('sortBy')).toBe('VLRRATEIO');
    expect(url.searchParams.get('sortDir')).toBe('ASC');
  });
  it('mudanca do recorte durante leitura do arquivo impede download antigo', async () => {
    const blob = deferred<Blob>();
    const controller = new AbortController();
    fetchMock.mockResolvedValue({ ok: true, headers: new Headers(), blob: () => blob.promise });
    const download = api.downloadTitulosExport(api.defaultFilters, { signal: controller.signal });
    const rejected = expect(download).rejects.toMatchObject({ name: 'AbortError' });
    await Promise.resolve();
    controller.abort();
    blob.resolve(new Blob(['old-data']));
    await rejected;
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });
  it('mudanca em outra aba invalida requisicoes e notifica a interface', async () => {
    const changed = vi.fn(); api.subscribeApiContext(changed);
    const version = api.getApiContextRevision();
    localStorage.setItem('equilibrioti:auth-token', 'another-tab-session');
    const event = new Event('storage');
    Object.defineProperties(event, { key: { value: 'equilibrioti:auth-token' }, storageArea: { value: localStorage } });
    window.dispatchEvent(event);
    expect(api.getApiContextRevision()).toBeGreaterThan(version);
    expect(changed).toHaveBeenCalledOnce();
  });
  it('ignora metadados invalidos e remove marca da empresa ao sair/entrar', () => {
    localStorage.setItem('equilibrioti:active-empresa-data', '{broken');
    expect(api.getActiveEmpresa()).toBeNull();
    api.setActiveEmpresa({ ...empresa(1), db_password: 'not-to-persist' } as any);
    expect(localStorage.getItem('equilibrioti:active-empresa-data')).not.toContain('not-to-persist');
    api.clearAuthToken();
    expect(localStorage.getItem('equilibrioti:active-empresa-data')).toBeNull();
    api.setActiveEmpresa(empresa(2));
    api.setAuthToken('new-login');
    expect(api.getActiveEmpresa()).toBeNull();
    expect(localStorage.getItem('equilibrioti:active-empresa')).toBeNull();
  });
  it('resposta administrativa antiga nao retorna ao novo contexto', async () => {
    const delayed = deferred<Response>(); fetchMock.mockReturnValue(delayed.promise);
    const pending = api.adminSaveUsuario({ nome: 'User' }, 1);
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    api.clearAuthToken(); delayed.resolve(response({ id: 1 }));
    await rejected;
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT');
  });
  it('login atrasado nao restaura uma sessao encerrada', async () => {
    api.clearAuthToken();
    const delayed = deferred<Response>(); fetchMock.mockReturnValue(delayed.promise);
    const pending = api.login('test@example.com', 'test');
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    api.clearAuthToken(); delayed.resolve(response({ token: 'late-token', user: {} }));
    await rejected;
    expect(api.getAuthToken()).toBe('');
  });
});
