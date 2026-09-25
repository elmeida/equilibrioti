import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import express from 'express';
import { build } from 'vite';
import { mountStaticApp } from '../server/web/staticApp.js';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_PATH || 'playwright');
await build({ define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('') } });
const directory = path.resolve('dist'), output = path.resolve('tmp/web-cache-qa');
await fs.mkdir(output, { recursive: true });
const currentWorker = await fs.readFile(path.join(directory, 'sw.js'), 'utf8');
const html = await fs.readFile(path.join(directory, 'index.html'), 'utf8');
const manifest = JSON.parse(await fs.readFile(path.join(directory, '.vite/manifest.json'), 'utf8'));
const tableAsset = '/' + manifest['src/components/DataTables.tsx'].file;
const legacyWorker = `self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open('equilibrioti-financeiro-v1');
  await cache.put('/', new Response('LEGACY-HTML-QA'));
  await cache.put('/uploads/empresas/logo-qa.webp', new Response('LEGACY-CLIENT-QA'));
  await self.skipWaiting();
})())); self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));`;
let legacy = true, release = 1, missingTable = false;
const calls = [], checks = [], workerRequests = [];
const app = express();
app.get('/qa', (_req, res) => res.set('Cache-Control', 'no-store').type('html').send('<!doctype html><title>Cache QA</title>Cache QA'));
app.get('/sw.js', (_req, res) => { workerRequests.push(legacy ? 'legacy' : `current-${release}`); res.set('Cache-Control', 'no-cache').type('js').send(legacy ? legacyWorker : `${currentWorker}\n// QA release ${release}`); });
app.get('/', (_req, res) => res.set('Cache-Control', 'no-store').type('html').send(html.replace('<head>', `<head><meta name="qa-release" content="${release}">`)));
app.use('/api', (req, res) => {
  calls.push(req.path);
  res.set('Cache-Control', 'private, no-store');
  if (req.path === '/auth/me') return res.json({ user: { id: 1, nome: 'QA', perfil: 'cliente', empresa_id: 1, empresa: { id: 1, nome: 'Empresa QA', logo_url: '/logo_equilibrioti.png' } } });
  if (req.path === '/auth/logout') return res.json({ ok: true });
  if (req.path === '/titulos/kpis') return res.json({ totalFinanceiro: 1234, quantidadeTitulos: 1 });
  if (req.path === '/titulos/analises') return res.json({});
  if (req.path === '/titulos/tabela') return res.json({ rows: [], total: 0, page: 1, pageSize: 25 });
  if (req.path === '/qa-error') return res.status(503).json({ error: 'QA' });
  return res.json([]);
});
app.get('/uploads/empresas/logo-qa.webp', (_req, res) => res.set('Cache-Control', 'no-store').type('image/webp').send('SYNTHETIC-ONLY'));
app.use((req, res, next) => missingTable && req.path === tableAsset ? res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }).status(404).end() : next());
mountStaticApp(app, directory);
app.use((err, _req, res, _next) => res.status(err.status || 500).end());
const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'allow' });
await context.route('**/*', route => new URL(route.request().url()).origin === url ? route.continue() : route.abort());
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(`${url}/qa`);
  await page.evaluate(async () => {
    const unrelated = await caches.open('qa-other-project');
    await unrelated.put('/qa', new Response('UNRELATED'));
    await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
  assert((await page.evaluate(() => caches.keys())).includes('equilibrioti-financeiro-v1'));
  legacy = false;
  await page.evaluate(async () => {
    const changed = new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    await (await navigator.serviceWorker.getRegistration()).update();
    await changed;
  });
  await page.evaluate(async () => {
    const worker = (await navigator.serviceWorker.getRegistration()).active;
    if (worker.state !== 'activated') await new Promise(resolve => worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') resolve();
    }));
  });
  assert.deepEqual(await page.evaluate(() => caches.keys()), ['qa-other-project']);
  assert.equal(await page.evaluate(async () => (await caches.open('qa-other-project')).match('/qa').then(response => response.text())), 'UNRELATED');
  checks.push('Atualizacao real do worker remove cache legado do projeto e preserva cache de outra aplicacao');

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Entrar', exact: true }).waitFor();
  await page.getByLabel('E-mail', { exact: true }).fill('draft@example.test');
  release = 2;
  await page.evaluate(async () => {
    const changed = new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    await (await navigator.serviceWorker.getRegistration()).update();
    await changed;
    const worker = (await navigator.serviceWorker.getRegistration()).active;
    if (worker.state !== 'activated') await new Promise(resolve => worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') resolve();
    }));
  });
  assert.equal(await page.getByLabel('E-mail', { exact: true }).inputValue(), 'draft@example.test');
  assert.equal(await page.locator('meta[name="qa-release"]').getAttribute('content'), '1');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('meta[name="qa-release"]').getAttribute('content'), '2');
  assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).updateViaCache), 'none');
  checks.push('HTML vem da rede na recarga; nova versao do worker nao recarrega nem apaga rascunho espontaneamente');

  await page.evaluate(() => localStorage.setItem('equilibrioti:auth-token', 'qa-worker'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.kpi-card').filter({ hasText: 'Total financeiro' }).getByText(/1\.234,00/).waitFor();
  const responses = await page.evaluate(async () => {
    const values = [];
    for (const endpoint of ['/api/titulos/kpis', '/api/qa-error', '/api/titulos/export', '/uploads/empresas/logo-qa.webp', '/assets/obsolete-12345678.js']) {
      const response = await fetch(endpoint);
      values.push({ endpoint, status: response.status, cache: response.headers.get('cache-control'), type: response.headers.get('content-type'), body: await response.text() });
    }
    return values;
  });
  assert(responses.slice(0, 4).every(response => response.cache.includes('no-store')));
  assert.equal(responses[4].status, 404);
  assert(!responses[4].body.includes('<html'));
  assert.deepEqual(await page.evaluate(() => caches.keys()), ['qa-other-project']);
  checks.push('Consultas, exportacao simulada, logos e erros nao geram cache; JavaScript ausente retorna 404 sem HTML');

  missingTable = true;
  await page.getByRole('button', { name: 'Tabela Analítica', exact: true }).click();
  await page.getByRole('alert', { name: 'Tabelas', exact: true }).waitFor();
  await page.screenshot({ path: path.join(output, 'missing-chunk.png'), fullPage: true });
  missingTable = false;
  await page.getByRole('button', { name: 'Recarregar página', exact: true }).click();
  await page.getByRole('button', { name: 'Tabela Analítica', exact: true }).click();
  await page.locator('.table-card').waitFor();
  assert.equal(await page.getByRole('alert', { name: 'Tabelas', exact: true }).count(), 0);
  checks.push('Modulo indisponivel com worker ativo falha explicitamente e recupera por recarga, sem substituir por outra versao');

  await context.setOffline(true);
  const offlineRequests = await page.evaluate(async () => {
    const failures = [];
    for (const endpoint of ['/api/titulos/kpis', '/uploads/empresas/logo-qa.webp', '/assets/obsolete-12345678.js']) {
      try { await fetch(endpoint); failures.push(false); } catch { failures.push(true); }
    }
    return failures;
  });
  assert.deepEqual(offlineRequests, [true, true, true]);
  const offline = await page.goto(url, { waitUntil: 'domcontentloaded' });
  assert.equal(offline.status(), 503);
  assert.equal(offline.headers()['cache-control'], 'no-store');
  await page.getByRole('heading', { name: 'Sem conexão', exact: true }).waitFor();
  assert(!/1\.234|Empresa QA|LEGACY/.test(await page.locator('body').innerText()));
  await page.screenshot({ path: path.join(output, 'offline-desktop.png') });
  await page.setViewportSize({ width: 320, height: 740 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const retry = page.getByRole('link', { name: 'Tentar novamente', exact: true });
  await retry.focus();
  await page.screenshot({ path: path.join(output, 'offline-mobile.png') });
  checks.push('Offline nao retorna dados antigos nem HTML para API/arquivos; mostra aviso neutro e acessivel em desktop/320 px');

  await context.setOffline(false);
  await page.keyboard.press('Enter');
  await page.locator('.kpi-card').filter({ hasText: 'Total financeiro' }).getByText(/1\.234,00/).waitFor();
  if (await page.locator('.sidebar.open').count()) await page.getByRole('button', { name: 'Fechar menu', exact: true }).click();
  assert(calls.filter(endpoint => endpoint === '/auth/me').length >= 2);
  assert.deepEqual(await page.evaluate(() => caches.keys()), ['qa-other-project']);
  checks.push('Retorno online por teclado revalida sessao e consulta dados; nenhum cache financeiro novo');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: checks.length, checks, output }, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true });
  for (const worker of context.serviceWorkers()) {
    console.error(await worker.evaluate(async () => ({ prefix: typeof LEGACY_CACHE_PREFIX === 'undefined' ? 'legacy' : LEGACY_CACHE_PREFIX, keys: (await caches.keys()).map(key => [key, key.startsWith(LEGACY_CACHE_PREFIX)]), state: self.registration.active?.state })).catch(error => error.message));
  }
  console.error(JSON.stringify({ checks, errors, workerRequests, cache: await page.evaluate(async () => ({ keys: await caches.keys(), matches: await caches.match('/uploads/empresas/logo-qa.webp').then(response => response?.text()) })), body: await page.locator('body').innerText() }, null, 2));
  throw error;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
