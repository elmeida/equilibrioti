import { safeLogoReference } from '../../server/security/logo-reference.js';
const TOKEN_KEY = 'equilibrioti:auth-token';
const EMPRESA_KEY = 'equilibrioti:active-empresa';
const EMPRESA_DATA_KEY = 'equilibrioti:active-empresa-data';
const contextKeys = new Set([TOKEN_KEY, EMPRESA_KEY, EMPRESA_DATA_KEY]);
const listeners = new Set<() => void>();
const controllers = new Set<AbortController>();
let fingerprint: string | undefined;
let revision = 0;
let requestEpoch = 0;

export type ActiveEmpresa = { id: number; nome: string; logo_url: string };

function stored(key: string) {
  try { return localStorage.getItem(key) || ''; } catch { return ''; }
}

export function getAuthToken() { return stored(TOKEN_KEY); }

export function clearLegacyDataCache() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('titulos:')) keys.push(key);
    }
    keys.forEach(key => sessionStorage.removeItem(key));
  } catch { /* Financial reads must not depend on browser storage availability. */ }
}

export function cancelApiRequests() {
  requestEpoch++;
  for (const controller of controllers) controller.abort();
  controllers.clear();
}

function syncContext(force = false) {
  const next = JSON.stringify([getAuthToken(), stored(EMPRESA_KEY), stored(EMPRESA_DATA_KEY)]);
  if (fingerprint === undefined || force || fingerprint !== next) {
    fingerprint = next;
    revision++;
    cancelApiRequests();
    clearLegacyDataCache();
    listeners.forEach(listener => listener());
  }
  return revision;
}

export function getApiContextRevision() { return syncContext(); }
export function subscribeApiContext(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.storageArea === localStorage && (!event.key || contextKeys.has(event.key))) syncContext();
  });
}

export function getActiveEmpresa(): ActiveEmpresa | null {
  try {
    const value = JSON.parse(stored(EMPRESA_DATA_KEY));
    if (!getAuthToken() || !Number.isSafeInteger(value.id) || value.id <= 0
      || String(value.id) !== stored(EMPRESA_KEY) || typeof value.nome !== 'string') return null;
    return { id: value.id, nome: value.nome, logo_url: safeLogoReference(value.logo_url) };
  } catch { return null; }
}

export function setActiveEmpresa(empresa: ActiveEmpresa | null) {
  if (empresa) {
    if (!Number.isSafeInteger(empresa.id) || empresa.id <= 0 || typeof empresa.nome !== 'string') {
      throw new Error('Empresa inválida.');
    }
    localStorage.setItem(EMPRESA_KEY, String(empresa.id));
    localStorage.setItem(EMPRESA_DATA_KEY, JSON.stringify({ id: empresa.id, nome: empresa.nome, logo_url: safeLogoReference(empresa.logo_url) }));
  } else {
    localStorage.removeItem(EMPRESA_KEY);
    localStorage.removeItem(EMPRESA_DATA_KEY);
  }
  syncContext(true);
}

export function setAuthToken(token: string) {
  localStorage.removeItem(EMPRESA_KEY);
  localStorage.removeItem(EMPRESA_DATA_KEY);
  localStorage.setItem(TOKEN_KEY, token);
  syncContext(true);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMPRESA_KEY);
  localStorage.removeItem(EMPRESA_DATA_KEY);
  syncContext(true);
}

export function beginApiRequest(signal?: AbortSignal) {
  const context = syncContext();
  const epoch = requestEpoch;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  controllers.add(controller);
  const token = getAuthToken();
  const empresaId = token ? stored(EMPRESA_KEY) : '';
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (empresaId) headers['X-Empresa-Id'] = empresaId;
  return {
    context, headers, signal: controller.signal,
    assertCurrent() {
      if (controller.signal.aborted || syncContext() !== context || requestEpoch !== epoch) {
        throw new DOMException('Solicitação cancelada ou contexto alterado.', 'AbortError');
      }
    },
    finish() {
      controllers.delete(controller);
      signal?.removeEventListener('abort', abort);
    },
  };
}
