import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build, preview } from 'vite';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_PATH || 'playwright');
// Exercise the deploy-style same-origin API, never the workstation's legacy .env URL.
await build({ define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('') } });
const manifest = JSON.parse(await fs.readFile('dist/.vite/manifest.json', 'utf8'));
const asset = name => '/' + Object.values(manifest).find(chunk => chunk.name === name).file;
const files = Object.fromEntries(['AdminApp', 'BIDashboard', 'Charts', 'DataTables', 'AdminAudit'].map(name => [name, asset(name)]));
const output = path.resolve('tmp/lazy-loading-qa');
await fs.mkdir(output, { recursive: true });
const server = await preview({ configFile: false, preview: { host: '127.0.0.1', port: 0, strictPort: true } });
const url = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const checks = [], contexts = [], gates = [], runs = [];
const companies = [1, 2].map(id => ({ id, nome: `Empresa QA ${id}`, logo_url: '/logo_equilibrioti.png', ativo: true }));
const client = { id: 2, nome: 'QA', perfil: 'cliente', empresa_id: 2, empresa: companies[1] };
const admin = { id: 1, nome: 'QA', perfil: 'admin' };

function gate() {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  gates.push(release);
  return { promise, release };
}
async function scenario(token = '', intercept) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  contexts.push(context);
  await context.addInitScript(token => {
    if (!localStorage.getItem('qa-initialized')) {
      localStorage.setItem('qa-initialized', 'yes');
      if (token) localStorage.setItem('equilibrioti:auth-token', token);
    }
  }, token);
  const calls = [], scripts = [], errors = [];
  await context.route('**/*', async route => {
    const request = route.request(), target = new URL(request.url());
    if (target.origin !== url) return route.abort();
    if (!target.pathname.startsWith('/api/')) {
      if (target.pathname.endsWith('.js')) scripts.push(target.pathname);
      if (intercept && await intercept(route, target.pathname)) return;
      return route.continue();
    }
    const endpoint = target.pathname;
    const tenant = request.headers()['x-empresa-id'] || '2';
    calls.push({ endpoint, tenant });
    const json = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (endpoint === '/api/auth/me') return json({ user: token === 'qa-admin' ? admin : client });
    if (endpoint === '/api/auth/logout') return json({ ok: true });
    if (endpoint === '/api/admin/empresas') return json(companies);
    if (endpoint === '/api/admin/usuarios') return json([client]);
    if (endpoint === '/api/admin/auditoria') return json({ rows: [], next: null });
    if (endpoint === '/api/titulos/kpis') return json({ totalFinanceiro: Number(tenant) * 1000, quantidadeTitulos: 1 });
    if (endpoint === '/api/titulos/graficos/coligadas') return json([{ nome: `Empresa QA ${tenant}`, valor: Number(tenant) * 1000, quantidade: 1 }]);
    if (endpoint === '/api/titulos/analises') return json({});
    if (endpoint === '/api/titulos/tabela') return json({ total: 0, page: 1, pageSize: 25, rows: [] });
    if (endpoint.startsWith('/api/titulos/')) return json([]);
    throw new Error(`Unexpected API ${endpoint}`);
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const run = { page, context, calls, scripts, errors };
  runs.push(run);
  return run;
}
async function enterCompany(page, id) {
  await page.locator('nav a[title="Empresas"]').click();
  await page.getByRole('row').filter({ hasText: `Empresa QA ${id}` }).getByRole('button', { name: 'Acessar', exact: true }).click();
  await page.getByRole('button', { name: 'Visão Geral', exact: true }).waitFor();
}
try {
  {
    const run = await scenario();
    await run.page.getByRole('button', { name: 'Entrar', exact: true }).waitFor();
    await run.page.waitForLoadState('networkidle');
    for (const file of Object.values(files)) assert(!run.scripts.includes(file));
    assert.equal(run.calls.length, 0);
    const scripts = run.scripts.filter(file => file.startsWith('/assets/'));
    const bytes = (await fs.stat(path.join('dist', scripts[0]))).size;
    assert.equal(scripts.length, 1);
    assert(bytes < 260000);
    await run.page.screenshot({ path: path.join(output, 'login-built.png') });
    checks.push(`Login compilado solicita somente ${bytes} bytes de JS; sem painel/graficos/admin/API`);
    assert.deepEqual(run.errors, []);
    await run.context.close();
  }
  {
    const run = await scenario('qa-client');
    await run.page.locator('[data-block="coligadas"] .chart-card').waitFor();
    assert(run.scripts.includes(files.BIDashboard));
    assert(run.scripts.includes(files.Charts));
    for (const name of ['AdminApp', 'AdminAudit', 'DataTables']) assert(!run.scripts.includes(files[name]));
    await run.page.getByRole('button', { name: 'Tabela Analítica', exact: true }).click();
    await run.page.locator('.table-card').waitFor();
    assert(run.scripts.includes(files.DataTables));
    assert(!run.calls.some(call => call.endpoint.startsWith('/api/admin/')));
    checks.push('Cliente carrega painel e graficos apos autenticar; tabela somente na primeira aba que a utiliza');
    assert.deepEqual(run.errors, []);
    await run.context.close();
  }
  {
    const run = await scenario('qa-admin');
    await run.page.getByRole('heading', { name: 'Painel do Administrador' }).waitFor();
    assert(run.scripts.includes(files.AdminApp));
    for (const name of ['BIDashboard', 'Charts', 'DataTables', 'AdminAudit']) assert(!run.scripts.includes(files[name]));
    await run.page.locator('nav a[title="Auditoria"]').click();
    await run.page.getByText('Nenhum evento encontrado.', { exact: true }).waitFor();
    assert(run.scripts.includes(files.AdminAudit));
    assert(!run.calls.some(call => call.endpoint.startsWith('/api/titulos/')));
    checks.push('Administracao e auditoria independentes do painel financeiro e do motor de graficos');
    assert.deepEqual(run.errors, []);
    await run.context.close();
  }
  {
    let fail = true;
    const run = await scenario('qa-client', async (route, file) => {
      if (file !== files.Charts || !fail) return false;
      await route.abort(); return true;
    });
    await run.page.getByRole('alert', { name: 'Gráficos', exact: true }).waitFor();
    await run.page.locator('.kpi-card').filter({ hasText: 'Total financeiro' }).getByText(/2\.000,00/).waitFor();
    await run.page.setViewportSize({ width: 320, height: 740 });
    if (await run.page.locator('.sidebar.open').count()) await run.page.getByRole('button', { name: 'Fechar menu', exact: true }).click();
    const retry = run.page.getByRole('button', { name: 'Recarregar página', exact: true });
    await retry.focus();
    await run.page.screenshot({ path: path.join(output, 'module-failure-mobile.png'), animations: 'disabled' });
    assert.equal(await run.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    fail = false;
    await run.page.keyboard.press('Enter');
    await run.page.locator('[data-block="coligadas"] .chart-card').waitFor();
    assert.equal(await run.page.getByRole('alert', { name: 'Gráficos', exact: true }).count(), 0);
    checks.push('Falha de modulo preserva KPIs e oferece recuperacao explicita por teclado em 320 px');
    await run.context.close();
  }
  {
    const pending = gate();
    const run = await scenario('qa-client', async (route, file) => {
      if (file !== files.BIDashboard) return false;
      await pending.promise; await route.continue(); return true;
    });
    await run.page.getByRole('status', { name: 'Painel financeiro', exact: true }).waitFor();
    const other = await run.context.newPage();
    await other.goto(url, { waitUntil: 'domcontentloaded' });
    await other.evaluate(() => localStorage.removeItem('equilibrioti:auth-token'));
    await run.page.getByRole('button', { name: 'Entrar', exact: true }).waitFor();
    pending.release();
    await run.page.waitForLoadState('networkidle');
    assert(!run.calls.some(call => call.endpoint.startsWith('/api/titulos/')));
    assert.equal(await run.page.locator('.kpi-card').count(), 0);
    checks.push('Logout em outra aba durante importacao descarta a tela e nao inicia consultas financeiras tardias');
    assert.deepEqual(run.errors, []);
    await run.context.close();
  }
  {
    const pending = gate();
    const run = await scenario('qa-admin', async (route, file) => {
      if (file !== files.Charts) return false;
      await pending.promise; await route.continue(); return true;
    });
    await run.page.getByRole('heading', { name: 'Painel do Administrador' }).waitFor();
    await enterCompany(run.page, 1);
    await run.page.getByRole('status', { name: 'Gráficos', exact: true }).waitFor();
    await run.page.getByRole('button', { name: 'Voltar ao Painel Admin', exact: true }).click();
    await enterCompany(run.page, 2);
    pending.release();
    const company = run.page.locator('[data-block="coligadas"]');
    await company.locator('summary').click();
    await company.getByRole('rowheader', { name: 'Empresa QA 2', exact: true }).waitFor();
    assert.equal(await company.getByRole('rowheader', { name: 'Empresa QA 1', exact: true }).count(), 0);
    checks.push('Troca de empresa durante importacao reutiliza somente codigo, nunca dados da empresa anterior');
    assert.deepEqual(run.errors, []);
    await run.context.close();
  }
  console.log(JSON.stringify({ passed: checks.length, checks, output }, null, 2));
} catch (error) {
  const run = runs[runs.length - 1];
  if (run && !run.page.isClosed()) {
    await run.page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true });
    console.error(JSON.stringify({ checks, calls: run.calls, scripts: run.scripts, errors: run.errors, text: await run.page.locator('body').innerText() }, null, 2));
  }
  throw error;
} finally {
  for (const release of gates) release();
  for (const context of contexts) await context.close();
  await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
