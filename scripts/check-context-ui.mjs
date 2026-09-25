import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_PATH || 'playwright');
const url = process.env.CONTEXT_QA_URL || 'http://127.0.0.1:5175';
const output = path.resolve('tmp/context-qa');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(30000);
const errors = [];
const checks = [];
const calls = [];
const tenants = [1, 2].map(id => ({ id, nome: `Contexto de teste ${id}`, logo_url: '/logo_equilibrioti.png' }));
const admin = { id: 1, nome: 'Administrador QA', email: 'admin@example.test', perfil: 'admin' };
const client = { id: 2, nome: 'Cliente QA', email: 'client@example.test', perfil: 'cliente', empresa_id: 2, empresa: tenants[1] };
let failTable = true;
let tableShrunk = false;
let releaseSlow;
const slow = new Promise(resolve => { releaseSlow = resolve; });
let releaseExport;
const slowExport = new Promise(resolve => { releaseExport = resolve; });
let downloads = 0;
page.on('download', () => { downloads++; });
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error' && /Cannot update|Maximum update|uncaught/i.test(message.text())) errors.push(message.text());
});

// All API traffic is intercepted. No real backend or customer database is contacted.
await context.route('**/*', route => new URL(route.request().url()).origin === new URL(url).origin ? route.continue() : route.abort());
await context.route('**/api/**', async route => {
  const request = route.request();
  const target = new URL(request.url());
  const endpoint = target.pathname;
  const tenant = request.headers()['x-empresa-id'] || (request.headers().authorization === 'Bearer qa-client' ? '2' : '0');
  calls.push({ endpoint, tenant, query: target.searchParams.toString() });
  const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  if (endpoint === '/api/auth/me') return json({ user: request.headers().authorization === 'Bearer qa-client' ? client : admin });
  if (endpoint === '/api/auth/login') return json({ token: 'qa-client', user: client });
  if (endpoint === '/api/auth/logout') return json({ ok: true });
  if (endpoint === '/api/admin/empresas') return json(tenants);
  if (endpoint === '/api/admin/usuarios') return json([client]);
  if (endpoint === '/api/titulos/kpis') return json({ totalFinanceiro: Number(tenant) * 1000, totalReceber: Number(tenant) * 1000, quantidadeTitulos: 1 });
  if (endpoint === '/api/titulos/analises') return json({});
  if (endpoint === '/api/titulos/tabela') {
    const search = target.searchParams.get('search') || '';
    if (search === 'paginacao') {
      const requestedPage = Number(target.searchParams.get('page') || 1);
      if (requestedPage === 3) tableShrunk = true;
      return json({ total: tableShrunk ? 26 : 51, page: requestedPage, pageSize: 25,
        rows: requestedPage === 3 ? [] : [{ EMPRESA: `CONTEXTO-${tenant}`, REF: `pagina-${requestedPage}`, CLIFOR: `pagina-${requestedPage}` }] });
    }
    if (search === 'lento') await slow;
    if (search === 'falha' && failTable) {
      failTable = false;
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Falha controlada na consulta.' }) });
    }
    return json({ total: 1, page: 1, pageSize: 25, rows: [{ EMPRESA: `CONTEXTO-${tenant}`, REF: tenant, CLIFOR: search || target.searchParams.get('clientes[]') || `CONTEXTO-${tenant}`, NUMERODOC: `DOC-${tenant}`, VLRRATEIO: Number(tenant) * 1000 }] }).catch(() => {});
  }
  if (endpoint === '/api/titulos/export') {
    if ((!target.searchParams.get('search') && !target.searchParams.has('clientes[]')) || target.searchParams.get('search') === 'limite') return route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ code: 'EXPORT_LIMIT_EXCEEDED', error: 'O recorte ultrapassa 5.000 registros. Reduza o período ou refine os filtros para exportar todos os registros, sem cortes.' }) });
    if (target.searchParams.get('search') === 'exportacao lenta') await slowExport;
    return route.fulfill({ status: 200, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', headers: { 'content-disposition': 'attachment; filename="qa.xlsx"' }, body: 'controlled-export' }).catch(() => {});
  }
  if (endpoint.startsWith('/api/titulos/filtros/')) return json([{ value: `CONTEXTO-${tenant}`, total: 1 }, { value: 'Nome, Matriz & Filial', total: 2 }]);
  if (endpoint.startsWith('/api/titulos/')) return json([]);
  throw new Error(`API inesperada no teste: ${endpoint}`);
});

async function openTenant(id) {
  await page.locator('nav a[title="Empresas"]').click();
  await page.getByRole('row').filter({ hasText: `Contexto de teste ${id}` }).getByRole('button', { name: 'Acessar', exact: true }).click();
  await page.getByRole('button', { name: 'Tabela Analítica', exact: true }).click();
  await page.getByRole('cell', { name: `CONTEXTO-${id}`, exact: true }).first().waitFor();
}

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  await page.evaluate(() => {
    localStorage.setItem('equilibrioti:auth-token', 'qa-admin');
    localStorage.setItem('equilibrioti:active-empresa-data', '{invalid');
    sessionStorage.setItem('titulos:legacy', '{invalid');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Painel do Administrador' }).waitFor();
  checks.push('Metadados antigos invalidos nao quebram a abertura');
  await openTenant(1);
  await page.getByRole('button', { name: 'Voltar ao Painel Admin' }).click();
  await openTenant(2);
  assert.equal(await page.getByRole('cell', { name: 'CONTEXTO-1', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Voltar ao Painel Admin' }).click();
  await openTenant(1);
  assert.equal(calls.filter(call => call.endpoint === '/api/titulos/kpis' && call.tenant === '1').length >= 2, true);
  checks.push('Troca A/B/A na interface normal sem reutilizar dados de outra empresa');

  const search = page.getByPlaceholder('Buscar na tabela');
  await search.fill('lento');
  await page.waitForRequest(request => new URL(request.url()).searchParams.get('search') === 'lento');
  await search.fill('atual');
  await page.getByRole('cell', { name: 'atual', exact: true }).waitFor();
  releaseSlow();
  await page.waitForTimeout(300);
  assert.equal(await page.getByRole('cell', { name: 'lento', exact: true }).count(), 0);
  checks.push('Resposta atrasada da tabela nao substitui pesquisa mais recente');

  await search.fill('falha');
  await page.getByRole('alert').filter({ hasText: 'Falha controlada' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Exportar dados filtrados' }).isDisabled(), true);
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await page.getByRole('cell', { name: 'falha', exact: true }).waitFor();
  checks.push('Falha de consulta encerra carregamento e permite tentar novamente');

  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar dados filtrados' }).click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), 'qa.xlsx');
  assert.equal(calls.some(call => call.endpoint === '/api/titulos/export' && new URLSearchParams(call.query).get('search') === 'falha'), true);
  checks.push('Exportacao recebe a pesquisa atual da tabela');

  await search.fill('limite');
  await page.getByRole('cell', { name: 'limite', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Exportar dados filtrados' }).click();
  await page.getByRole('alert').filter({ hasText: '5.000' }).waitFor();
  assert.equal(downloads, 1);
  await page.screenshot({ path: path.join(output, 'export-limit-desktop.png'), fullPage: true });
  checks.push('Acima do limite mostra alerta acessivel sem baixar arquivo parcial');

  await search.fill('exportacao lenta');
  await page.getByRole('cell', { name: 'exportacao lenta', exact: true }).waitFor();
  assert.equal(await page.getByRole('alert').count(), 0);
  const exportStarted = page.waitForRequest(request => new URL(request.url()).pathname === '/api/titulos/export');
  await page.getByRole('button', { name: 'Exportar dados filtrados' }).click();
  await exportStarted;
  await search.fill('recorte novo');
  await page.getByRole('cell', { name: 'recorte novo', exact: true }).waitFor();
  releaseExport();
  await page.waitForTimeout(500);
  assert.equal(downloads, 1);
  assert.equal(await page.getByRole('button', { name: 'Exportar dados filtrados' }).isEnabled(), true);
  checks.push('Mudanca de pesquisa cancela exportacao antiga sem download tardio');

  await page.locator('[data-filter="clientes"] .multi-summary').click();
  await page.getByPlaceholder('Pesquisar cliente/fornecedor').fill('Termo especial');
  await page.waitForRequest(request => new URL(request.url()).searchParams.get('q') === 'Termo especial');
  await page.locator('[data-filter="clientes"] .multi-summary').click();
  checks.push('Busca de opcoes envia o parametro q');

  await search.fill('paginacao');
  await page.getByRole('cell', { name: 'pagina-1', exact: true }).first().waitFor();
  await page.getByRole('button', { name: 'Próxima página', exact: true }).click();
  await page.getByRole('cell', { name: 'pagina-2', exact: true }).first().waitFor();
  await page.getByRole('button', { name: 'Próxima página', exact: true }).click();
  await page.getByText('Página 2 de 2', { exact: true }).waitFor();
  await page.getByRole('cell', { name: 'pagina-2', exact: true }).first().waitFor();
  const requestedPages = calls.filter(call => call.endpoint === '/api/titulos/tabela' && new URLSearchParams(call.query).get('search') === 'paginacao').map(call => new URLSearchParams(call.query).get('page'));
  assert.deepEqual(requestedPages, ['1', '2', '3', '2']);
  await page.getByRole('button', { name: 'VLRDESCONTO', exact: true }).click();
  await page.getByRole('cell', { name: 'pagina-1', exact: true }).first().waitFor();
  assert.equal(await page.getByRole('columnheader').filter({ has: page.getByRole('button', { name: 'VLRDESCONTO', exact: true }) }).getAttribute('aria-sort'), 'descending');
  checks.push('Ultima pagina removida recua automaticamente e nova ordenacao volta a primeira');

  await page.locator('[data-filter="clientes"] .multi-summary').click();
  await page.getByPlaceholder('Pesquisar cliente/fornecedor').fill('Nome, Matriz');
  await page.getByRole('checkbox', { name: 'Nome, Matriz & Filial', exact: true }).check();
  await page.locator('[data-filter="clientes"] .multi-summary').click();
  await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  await page.getByRole('cell', { name: 'Nome, Matriz & Filial', exact: true }).waitFor();
  const filteredDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar dados filtrados' }).click();
  await filteredDownload;
  for (const endpoint of ['/api/titulos/tabela', '/api/titulos/export']) {
    const call = calls.filter(call => call.endpoint === endpoint).at(-1);
    assert.deepEqual(new URLSearchParams(call.query).getAll('clientes[]'), ['Nome, Matriz & Filial']);
    assert.equal(new URLSearchParams(call.query).has('clientes'), false);
  }
  checks.push('Selecao de nome com virgula chega inteira a tabela e exportacao');
  await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });

  const otherPage = await context.newPage();
  await otherPage.goto(url, { waitUntil: 'networkidle' });
  await otherPage.getByRole('button', { name: 'Sair', exact: true }).click();
  await page.getByRole('button', { name: 'Entrar', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('equilibrioti:active-empresa-data')), null);
  await otherPage.close();
  await page.getByLabel('E-mail').fill('client@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('controlled-test');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('button', { name: 'Tabela Analítica', exact: true }).click();
  await page.getByRole('cell', { name: 'CONTEXTO-2', exact: true }).first().waitFor();
  assert.equal(await page.getByRole('button', { name: 'Voltar ao Painel Admin' }).count(), 0);
  assert.equal(await page.getByRole('cell', { name: 'CONTEXTO-1', exact: true }).count(), 0);
  checks.push('Logout entre abas e novo login cliente descartam contexto administrativo');

  assert.equal(await page.getByRole('button', { name: 'Exportar', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Visão Geral', exact: true }).click();
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: '5.000' }).waitFor();
  await page.getByRole('button', { name: 'Tabela Analítica', exact: true }).click();
  assert.equal(await page.getByRole('alert').count(), 0);
  checks.push('Exportacao geral trata limite e tabela tem apenas exportacao da pesquisa');

  await search.fill('limite');
  await page.getByRole('cell', { name: 'limite', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Exportar dados filtrados' }).click();
  await page.getByRole('alert').filter({ hasText: '5.000' }).waitFor();

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const closeMenu = page.getByRole('button', { name: 'Fechar menu', exact: true });
    if (await page.locator('.sidebar.open').count()) await closeMenu.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(output, `viewport-${width}.png`), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  }
  assert.equal(await page.evaluate(() => Object.keys(sessionStorage).some(key => key.startsWith('titulos:'))), false);
  assert.deepEqual(errors, []);
  checks.push('Celulares sem overflow da pagina, sem cache financeiro persistido ou erros de execucao');
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ passed: checks.length, checks, errors }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally {
  releaseSlow();
  releaseExport();
  await browser.close();
}
