import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountStaticApp } from '../server/web/staticApp.js';

const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
function worker({ offline = false, status = 200 } = {}) {
  const handlers = {};
  const caches = { keys: vi.fn(async () => ['equilibrioti-financeiro-v1', 'equilibrioti-financeiro-v0', 'outro-projeto']), delete: vi.fn(async () => true), open: vi.fn(), match: vi.fn() };
  const self = { location: { origin: 'https://bi.example.test' }, addEventListener: (event, callback) => { handlers[event] = callback; }, skipWaiting: vi.fn(async () => {}), clients: { claim: vi.fn(async () => {}) } };
  const fetch = vi.fn(async () => { if (offline) throw new Error('offline'); return new Response('network', { status }); });
  vm.runInNewContext(source, { self, caches, fetch, URL, Response });
  function get(url = '/', overrides = {}) {
    const event = { request: { url: new URL(url, self.location.origin).href, method: 'GET', mode: 'navigate', ...overrides }, respondWith: vi.fn() };
    handlers.fetch(event);
    return event;
  }
  return { handlers, caches, self, fetch, get };
}

describe('network-only service worker', () => {
  it('installs without precaching data or executable files', async () => {
    const w = worker();
    let task;
    w.handlers.install({ waitUntil: value => { task = value; } });
    await task;
    expect(w.self.skipWaiting).toHaveBeenCalledOnce();
    expect(w.caches.open).not.toHaveBeenCalled();
    expect(w.fetch).not.toHaveBeenCalled();
  });
  it('purges only owned legacy caches before claiming clients', async () => {
    const w = worker();
    let task;
    w.handlers.activate({ waitUntil: value => { task = value; } });
    await task;
    expect(w.caches.delete.mock.calls).toEqual([['equilibrioti-financeiro-v1'], ['equilibrioti-financeiro-v0']]);
    expect(w.self.clients.claim).toHaveBeenCalledOnce();
  });
  it.each(['/api', '/api/titulos/kpis', '/uploads/empresas/logo.png', '/assets/a-abcdefgh.js', '/style.css', '/sw.js', 'https://other.example.test/'])('does not intercept %s', url => {
    const w = worker({ offline: true });
    expect(w.get(url).respondWith).not.toHaveBeenCalled();
    expect(w.fetch).not.toHaveBeenCalled();
  });
  it.each([{ method: 'POST' }, { mode: 'cors' }, { mode: 'same-origin' }])('does not intercept non-document requests %s', overrides => {
    expect(worker().get('/', overrides).respondWith).not.toHaveBeenCalled();
  });
  it.each(['/', '/index.html', '/?search=private'])('requests fresh navigation without persistence: %s', async url => {
    const w = worker();
    const event = w.get(url);
    const result = await event.respondWith.mock.calls[0][0];
    expect(await result.text()).toBe('network');
    expect(w.fetch.mock.calls[0][1]).toEqual({ cache: 'no-store' });
    expect(w.caches.open).not.toHaveBeenCalled();
    expect(w.caches.match).not.toHaveBeenCalled();
  });
  it('returns a neutral offline document without reflecting URL or cached data', async () => {
    const w = worker({ offline: true });
    const result = await w.get('/?client=private').respondWith.mock.calls[0][0];
    expect(result.status).toBe(503);
    expect(result.headers.get('cache-control')).toBe('no-store');
    expect(result.headers.get('content-type')).toContain('text/html');
    const body = await result.text();
    expect(body).toContain('Sem conexão');
    expect(body).not.toContain('private');
    expect(body).not.toContain('<script');
    expect(w.caches.match).not.toHaveBeenCalled();
  });
  it('preserves server HTTP errors instead of treating them as offline success', async () => {
    const w = worker({ status: 503 });
    const result = await w.get().respondWith.mock.calls[0][0];
    expect(result.status).toBe(503);
    expect(await result.text()).toBe('network');
  });
});

const directories = [];
function staticApp() {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'equilibrio-web-test-'));
  directories.push(directory);
  mkdirSync(path.join(directory, 'assets'));
  for (const [file, text] of Object.entries({ 'index.html': '<html>APP-SHELL</html>', 'sw.js': source, 'manifest.webmanifest': '{}', 'assets/index-AbCd1234.js': 'export const version = 1;', 'assets/index-AbCd1234.css': 'body{}', 'assets/plain.js': 'void 0;' })) writeFileSync(path.join(directory, file), text);
  const app = express();
  mountStaticApp(app, directory);
  app.use((err, _req, res, _next) => res.status(err.status || 500).end());
  return app;
}
afterEach(() => {
  for (const directory of directories.splice(0)) {
    if (path.dirname(path.resolve(directory)) !== path.resolve(os.tmpdir()) || !path.basename(directory).startsWith('equilibrio-web-test-')) throw new Error('Unsafe test cleanup');
    rmSync(directory, { recursive: true, force: true });
  }
});
describe('static delivery', () => {
  it.each(['/', '/index.html', '/financeiro'])('never persists the HTML shell: %s', async url => {
    const result = await request(staticApp()).get(url).set('Accept', 'text/html').expect(200);
    expect(result.text).toContain('APP-SHELL');
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.headers['x-content-type-options']).toBe('nosniff');
  });
  it.each(['/sw.js', '/manifest.webmanifest', '/assets/plain.js'])('revalidates mutable public resources: %s', async url => {
    const result = await request(staticApp()).get(url).expect(200);
    expect(result.headers['cache-control']).toBe('no-cache');
  });
  it.each(['/assets/index-AbCd1234.js', '/assets/index-AbCd1234.css'])('allows immutable versioned code only: %s', async url => {
    const result = await request(staticApp()).get(url).expect(200);
    expect(result.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });
  it.each(['/assets/old-12345678.js', '/assets/old-12345678.css', '/missing.png', '/missing.js', '/sw-old.js', '/api/unknown', '/api', '/uploads/unknown', '/assets'])('never substitutes HTML for a missing resource: %s', async url => {
    const result = await request(staticApp()).get(url).set('Accept', 'text/html').expect(404);
    expect(result.text || '').not.toContain('APP-SHELL');
    expect(result.headers['cache-control']).toBe('no-store');
  });
  it('does not return the shell for an extensionless fetch expecting JSON', async () => {
    await request(staticApp()).get('/unknown').set('Accept', 'application/json').expect(404);
  });
});
