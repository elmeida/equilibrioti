import { beginApiRequest, cancelApiRequests, clearAuthToken, clearLegacyDataCache, getAuthToken, getApiContextRevision, setAuthToken, subscribeApiContext } from './apiContext';
export { clearAuthToken, getAuthToken, setAuthToken, getActiveEmpresa, setActiveEmpresa, getApiContextRevision, subscribeApiContext } from './apiContext';

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
const memoryCache = new Map<string, { data: unknown; time: number }>();
const inFlight = new Map<string, Promise<unknown>>();
const latestRequest = new Map<string, number>();
let requestId = 0;
const DEFAULT_TTL = 4 * 60 * 1000;

function checkSession(response: Response, path: string) {
  if (response.status === 401 && path !== '/api/auth/login' && path !== '/api/auth/change-password') {
    clearAuthToken();
    throw new DOMException('Sessão encerrada. Faça login novamente.', 'AbortError');
  }
}

subscribeApiContext(() => {
  memoryCache.clear();
  inFlight.clear();
  latestRequest.clear();
});

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
    if (Array.isArray(value)) { value.forEach(item => query.append(`${key}[]`, item)); }
    else if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

export function cacheKey(path: string, filters?: Partial<Filters>, extra?: Record<string, string | number | undefined>) {
  return `${getApiContextRevision()}:${path}?${params(filters || {}, extra)}`;
}

export function clearApiCache(prefix = '') {
  cancelApiRequests();
  inFlight.clear();
  latestRequest.clear();
  for (const key of memoryCache.keys()) {
    if (!prefix || key.includes(prefix)) memoryCache.delete(key);
  }
  clearLegacyDataCache();
}

export async function apiGet<T>(
  path: string,
  filters?: Partial<Filters>,
  extra?: Record<string, string | number | undefined>,
  options: { signal?: AbortSignal; cache?: boolean; ttl?: number; refresh?: boolean; storage?: boolean } = {},
): Promise<T> {
  const query = params(filters || {}, { ...extra, ...(options.refresh ? { refresh: '1' } : {}) });
  const key = cacheKey(path, filters, extra);
  const useCache = options.cache !== false;
  const ttl = options.ttl ?? DEFAULT_TTL;
  if (options.signal?.aborted) throw new DOMException('Solicitação cancelada.', 'AbortError');

  if (useCache && !options.refresh) {
    const hit = memoryCache.get(key);
    if (hit && Date.now() - hit.time < ttl) return hit.data as T;
    if (hit) memoryCache.delete(key);
    const pending = inFlight.get(key);
    if (pending && !options.signal) return pending as Promise<T>;
  }

  const scope = beginApiRequest(options.signal);
  const id = ++requestId;
  latestRequest.set(key, id);
  // AbortSignals belong to callers; only requests without caller signals are shared.
  const request = (async () => {
    scope.assertCurrent();
    const response = await fetch(`${API}${path}${query ? `?${query}` : ''}`, {
      signal: scope.signal, headers: scope.headers,
    });
    scope.assertCurrent();
    checkSession(response, path);
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      const payload = contentType.includes('application/json') ? await response.json() : {};
      scope.assertCurrent();
      throw new Error(payload.error || 'Não foi possível carregar este bloco agora. Verifique a conexão com o banco ou tente atualizar novamente.');
    }
    const data = await response.json();
    scope.assertCurrent();
    if (useCache && latestRequest.get(key) === id) {
      const item = { data, time: Date.now() };
      memoryCache.set(key, item);
    }
    return data as T;
  })().finally(() => {
    scope.finish();
    if (inFlight.get(key) === request) inFlight.delete(key);
    if (latestRequest.get(key) === id) latestRequest.delete(key);
  });

  if (useCache && !options.signal) inFlight.set(key, request);
  return request;
}

export async function downloadTitulosExport(filters: Filters, options: { sortBy?: string; sortDir?: 'ASC' | 'DESC'; signal?: AbortSignal } = {}) {
  const scope = beginApiRequest(options.signal);
  try {
    scope.assertCurrent();
    const query = params(filters, { sortBy: options.sortBy, sortDir: options.sortDir });
    const response = await fetch(`${API}/api/titulos/export${query ? `?${query}` : ''}`, {
      headers: scope.headers, signal: scope.signal,
    });
    scope.assertCurrent();
    checkSession(response, '/api/titulos/export');
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      const payload = contentType.includes('application/json') ? await response.json().catch(() => ({})) : {};
      scope.assertCurrent();
      throw new Error(payload.error || 'Não foi possível exportar os dados.');
    }

    const blob = await response.blob();
    scope.assertCurrent();
    const disposition = response.headers.get('content-disposition') || '';
    const filename = disposition.match(/filename="?([^"]+)"?/i)?.[1] || 'titulos-financeiros.xlsx';
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } finally { scope.finish(); }
}

export type AuthUser = {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  empresa_id?: number | null;
  empresa?: {
    id: number;
    nome: string;
    logo_url: string;
  } | null;
};

async function apiWrite<T>(path: string, method: 'POST' | 'PUT', body: unknown): Promise<T> {
  const scope = beginApiRequest();
  try {
    const isForm = body instanceof FormData;
    const response = await fetch(`${API}${path}`, {
      method, signal: scope.signal,
      headers: { ...(!isForm ? { 'Content-Type': 'application/json' } : {}), ...scope.headers },
      body: isForm ? body : JSON.stringify(body),
    });
    scope.assertCurrent();
    checkSession(response, path);
    const payload = await response.json().catch(() => ({}));
    scope.assertCurrent();
    if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a operação.');
    return payload as T;
  } finally { scope.finish(); }
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiWrite<T>(path, 'POST', body);
}

export async function login(email: string, password: string) {
  const context = getApiContextRevision();
  const payload = await apiPost<{ token: string; user: AuthUser }>('/api/auth/login', { email, password });
  if (getApiContextRevision() !== context) throw new DOMException('Sessão alterada.', 'AbortError');
  setAuthToken(payload.token);
  return payload.user;
}

export async function loadMe(signal?: AbortSignal) {
  return apiGet<{ user: AuthUser }>('/api/auth/me', undefined, undefined, { cache: false, signal });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const result = await apiPost<{ ok: true }>('/api/auth/change-password', { currentPassword, newPassword });
  clearAuthToken();
  return result;
}

export async function logoutSession(): Promise<boolean> {
  const token = getAuthToken();
  clearAuthToken();
  if (!token) return true;
  // This request outlives local cleanup, and revokes only the captured session.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${API}/api/auth/logout`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
    });
    return response.ok || response.status === 401;
  } catch {
    return false;
  } finally { clearTimeout(timeout); }
}

// --- Admin APIs ---

export type AuditEvent = {
  id: string; occurred_at: string; actor_id: number | null; actor_kind: 'user' | 'maintenance';
  empresa_id: number | null; action: string; resource_id: number | null;
  outcome: 'success' | 'failed' | 'authorized'; request_id: string;
};
export type AuditFilters = { empresa_id?: number; action?: string; outcome?: string; from?: string; to?: string; request_id?: string };
export function adminGetAudit(filters: AuditFilters, before?: string, signal?: AbortSignal) {
  return apiGet<{ rows: AuditEvent[]; next: string | null }>('/api/admin/auditoria', undefined,
    { ...filters, before, limit: 25 }, { cache: false, signal });
}

export async function adminGetEmpresas() {
  return apiGet<any[]>('/api/admin/empresas', undefined, undefined, { cache: false });
}

export async function adminSaveEmpresa(data: any, id?: number) {
  if (id) {
    return apiWrite<any>(`/api/admin/empresas/${id}`, 'PUT', data);
  } else {
    return apiPost<any>('/api/admin/empresas', data);
  }
}

export async function adminTestConnection(data: any) {
  return apiPost<{ ok: boolean; message: string }>('/api/admin/empresas/test-connection', data);
}

export async function adminUploadLogo(file: File) {
  const formData = new FormData();
  formData.append('logo', file);
  return apiPost<{ url: string }>('/api/admin/empresas/upload-logo', formData);
}

export async function adminGetUsuarios() {
  return apiGet<any[]>('/api/admin/usuarios', undefined, undefined, { cache: false });
}

export async function adminSaveUsuario(data: any, id?: number) {
  if (id) {
    return apiWrite<any>(`/api/admin/usuarios/${id}`, 'PUT', data);
  } else {
    return apiPost<any>('/api/admin/usuarios', data);
  }
}

export async function adminResetPassword(id: number, novaSenha: string) {
  return apiPost<{ ok: true; message: string }>(`/api/admin/usuarios/${id}/reset-password`, { novaSenha });
}
