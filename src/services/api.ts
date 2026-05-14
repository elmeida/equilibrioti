export type Filters = {
  dateField: 'vencimento' | 'emissao' | 'baixa' | 'criacao';
  startDate: string;
  endDate: string;
  coligada: string;
  tipo: string;
  statusFin: string;
  statusBaixa: string;
  clientes: string[];
  centrosCusto: string[];
  naturezas: string[];
  tiposDocumento: string[];
  contas: string[];
  origens: string[];
  search?: string;
};

const API = import.meta.env.VITE_API_BASE_URL || '';
const TOKEN_KEY = 'equilibrioti:auth-token';
const memoryCache = new Map<string, { data: unknown; time: number }>();
const inFlight = new Map<string, Promise<unknown>>();
const DEFAULT_TTL = 4 * 60 * 1000;

export const defaultFilters: Filters = {
  dateField: 'vencimento',
  startDate: '',
  endDate: '',
  coligada: 'Todas',
  tipo: 'Todos',
  statusFin: '',
  statusBaixa: '',
  clientes: [],
  centrosCusto: [],
  naturezas: [],
  tiposDocumento: [],
  contas: [],
  origens: [],
  search: '',
};

export function params(filters: Partial<Filters>, extra: Record<string, string | number | undefined> = {}) {
  const query = new URLSearchParams();
  Object.entries({ ...filters, ...extra }).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length) query.set(key, value.join(','));
    else if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

export function cacheKey(path: string, filters?: Partial<Filters>, extra?: Record<string, string | number | undefined>) {
  return `${path}?${filters ? params(filters, extra) : params({}, extra)}`;
}

export function clearApiCache(prefix = '') {
  for (const key of memoryCache.keys()) {
    if (!prefix || key.includes(prefix)) memoryCache.delete(key);
  }
}

export async function apiGet<T>(
  path: string,
  filters?: Partial<Filters>,
  extra?: Record<string, string | number | undefined>,
  options: { signal?: AbortSignal; cache?: boolean; ttl?: number; refresh?: boolean; storage?: boolean } = {},
): Promise<T> {
  const query = filters ? `?${params(filters, extra)}` : '';
  const key = cacheKey(path, filters, extra);
  const useCache = options.cache !== false;
  const ttl = options.ttl ?? DEFAULT_TTL;

  if (useCache && !options.refresh) {
    const hit = memoryCache.get(key);
    if (hit && Date.now() - hit.time < ttl) return hit.data as T;
    if (options.storage) {
      const stored = sessionStorage.getItem(`titulos:${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.time < ttl) {
          memoryCache.set(key, parsed);
          return parsed.data as T;
        }
      }
    }
    const pending = inFlight.get(key);
    if (pending) return pending as Promise<T>;
  }

  const request = fetch(`${API}${path}${query}${query ? '&' : '?'}${options.refresh ? 'refresh=1' : ''}`, {
    signal: options.signal,
    headers: authHeaders(),
  })
    .then(async (response) => {
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        const payload = contentType.includes('application/json') ? await response.json() : {};
        throw new Error(payload.error || 'Não foi possível carregar este bloco agora. Verifique a conexão com o banco ou tente atualizar novamente.');
      }
      return response.json();
    })
    .then((data) => {
      if (useCache) {
        const item = { data, time: Date.now() };
        memoryCache.set(key, item);
        if (options.storage) sessionStorage.setItem(`titulos:${key}`, JSON.stringify(item));
      }
      return data as T;
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, request);
  return request;
}

export function exportUrl(filters: Filters) {
  const token = getAuthToken();
  const query = params(filters, token ? { token } : {});
  return `${API}/api/titulos/export?${query}`;
}

export type AuthUser = {
  id: number;
  nome: string;
  email: string;
  perfil: string;
};

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  clearApiCache();
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a operação.');
  return payload as T;
}

export async function login(email: string, password: string) {
  const payload = await apiPost<{ token: string; user: AuthUser }>('/api/auth/login', { email, password });
  setAuthToken(payload.token);
  return payload.user;
}

export async function loadMe() {
  return apiGet<{ user: AuthUser }>('/api/auth/me', undefined, undefined, { cache: false });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return apiPost<{ ok: true }>('/api/auth/change-password', { currentPassword, newPassword });
}
