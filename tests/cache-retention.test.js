import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
let cache;
beforeEach(async () => { vi.useFakeTimers(); vi.resetModules(); cache = await import('../server/utils/cache.js'); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
describe('retencao limitada do cache em memoria', () => {
  it('expira mesmo sem nova consulta da chave', () => {
    cache.setCache('financeiro', { total: 100 }, 100);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(100);
    expect(vi.getTimerCount()).toBe(0);
    expect(cache.getCache('financeiro')).toBeNull();
  });
  it('substituir valor nao deixa timer antigo apagar dado novo', () => {
    cache.setCache('a', 1, 100);
    vi.advanceTimersByTime(50);
    cache.setCache('a', 2, 100);
    vi.advanceTimersByTime(50);
    expect(cache.getCache('a')).toBe(2);
    expect(vi.getTimerCount()).toBe(1);
  });
  it('limita numero de entradas e remove timers de itens expulsos', () => {
    for (let i = 0; i < 257; i++) cache.setCache(String(i), i, 1000);
    expect(cache.getCache('0')).toBeNull();
    expect(cache.getCache('256')).toBe(256);
    expect(vi.getTimerCount()).toBe(256);
  });
  it('nao armazena dados com prazo invalido', () => {
    for (const ttl of [0, -1, Infinity, NaN]) cache.setCache('a', 'private', ttl);
    expect(cache.getCache('a')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
