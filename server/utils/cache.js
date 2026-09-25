const cache = new Map();
const MAX_ENTRIES = 256;

function remove(key) {
  const hit = cache.get(key);
  if (hit) clearTimeout(hit.timer);
  cache.delete(key);
}

export function getCache(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() >= hit.expiresAt) {
    remove(key);
    return null;
  }
  return hit.value;
}

export function setCache(key, value, ttlMs) {
  remove(key);
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) return;
  if (cache.size >= MAX_ENTRIES) remove(cache.keys().next().value);
  const timer = setTimeout(() => remove(key), ttlMs);
  timer.unref?.();
  cache.set(key, { value, expiresAt: Date.now() + ttlMs, timer });
}

export function clearEmpresaCache(empresaId) {
  for (const key of cache.keys()) {
    if (key.startsWith(`titulos:${empresaId}:`)) remove(key);
  }
}
