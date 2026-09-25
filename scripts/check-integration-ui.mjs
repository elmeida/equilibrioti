import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_PATH || 'playwright');
const server = await createServer({ configFile: false, envFile: false, plugins: [react()],
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('') },
  server: { host: '127.0.0.1', port: 5190, strictPort: false } });
await server.listen();
const url = `http://127.0.0.1:${server.httpServer.address().port}`;
const output = path.resolve('tmp/integration-qa');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const companies = [2, 1].map(id => ({ id, nome: `Empresa QA ${id}`, ativo: true, logo_url: '/logo_equilibrioti.png' }));
const admin = { id: 1, nome: 'Admin QA', perfil: 'admin', email: 'admin@example.test' };
const client = { id: 2, nome: 'Cliente QA', perfil: 'cliente', empresa_id: 1, empresa: companies[1] };
const errors = [], checks = [];
let context;

async function scenario(width, token = '') {
  context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
  const calls = [];
  await context.addInitScript(token => {
    if (token) {
      localStorage.setItem('equilibrioti:auth-token', token);
      localStorage.setItem('equilibrioti:cookie-consent', JSON.stringify({ version: 2, essential: true, analytics: false, savedAt: '2026-09-25T12:00:00Z' }));
    }
  }, token);
  // Synthetic fixtures only: intercept every API request and block external origins.
  await context.route('**/*', async route => {
    const target = new URL(route.request().url());
    if (target.origin !== url) return route.abort();
    if (!target.pathname.startsWith('/api/')) return route.continue();
    calls.push(target.pathname);
    const json = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (target.pathname === '/api/auth/me') return json({ user: token === 'qa-admin' ? admin : client });
    if (target.pathname === '/api/admin/empresas') return json(companies);
    if (target.pathname === '/api/admin/usuarios') return json([client]);
    if (target.pathname.endsWith('/conexao')) return json({ ok: true, message: 'Conexao confirmada neste teste.' });
    if (target.pathname.endsWith('/kpis')) return json({ totalFinanceiro: 1000, totalBaixado: 700, quantidadeTitulos: 50 });
    if (target.pathname.endsWith('/analises')) return json({});
    if (target.pathname.includes('/filtros/')) return json([{ value: 'Árvore, Matriz', total: 20 }, { value: 'Árvore Filial', total: 10 }, { value: 'Outra empresa', total: 1 }]);
    if (target.pathname.includes('/rankings/')) return json(Array.from({ length: 50 }, (_, i) => ({ nome: `Contraparte sintetica ${i + 1}`, quantidade: i + 1, totalRateio: 123456.78, totalBaixa: 1234, totalAberto: 12000, totalVencido: 600, ticketMedio: 600, percentual: .1 })));
    if (target.pathname.endsWith('/tabela')) return json({ rows: [{ EMPRESA: 'Empresa QA 1', CLIFOR: 'Contraparte sintetica', REF: 'QA-1', NUMERODOC: 'QA-1', VLRRATEIO: 1000 }], page: 1, pageSize: 25, total: 1 });
    return json([]);
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  return { page, calls };
}

try {
  for (const width of [1440, 390, 320]) {
    const { page } = await scenario(width);
    const notice = page.getByRole('region', { name: 'Privacidade e armazenamento', exact: true });
    await notice.waitFor();
    await notice.getByRole('button', { name: 'Detalhes' }).click();
    assert.equal(await notice.getByRole('checkbox').nth(1).isDisabled(), true);
    assert.equal(await notice.getByRole('checkbox').nth(1).isChecked(), false);
    const bounds = await notice.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
    assert.notEqual(await notice.evaluate(el => getComputedStyle(el).backgroundColor), 'rgba(0, 0, 0, 0)');
    await page.screenshot({ path: path.join(output, `privacy-${width}.png`), fullPage: true });
    await notice.getByRole('button', { name: 'Entendi' }).click();
    assert.equal(await notice.count(), 0);
    await page.getByRole('button', { name: 'Privacidade e armazenamento', exact: true }).click();
    await notice.waitFor();
    await context.close();
    checks.push(`Aviso de privacidade em ${width}px: cabe no viewport, reabre e nao habilita analytics`);
  }

  const { page, calls } = await scenario(1440, 'qa-admin');
  await page.getByRole('heading', { name: 'Painel do Administrador' }).waitFor();
  await page.locator('nav a[title="Empresas"]').click();
  const rows = page.locator('.admin-table tbody tr');
  await rows.first().waitFor();
  assert.ok((await rows.first().innerText()).includes('Empresa QA 1'));
  assert.equal(calls.some(p => p.endsWith('/conexao')), false);
  await page.getByRole('button', { name: 'Verificar conexao de Empresa QA 1' }).click();
  await page.getByRole('status').filter({ hasText: 'Conexao confirmada' }).waitFor();
  assert.equal(calls.filter(p => p.endsWith('/conexao')).length, 1);
  await rows.first().getByRole('button', { name: 'Acessar', exact: true }).click();
  await page.getByRole('button', { name: 'Inconsistências', exact: true }).waitFor();
  const filter = page.locator('[data-filter="clientes"]');
  await filter.locator('.multi-summary').click();
  await filter.getByPlaceholder('Pesquisar cliente/fornecedor').fill('arvore');
  await filter.getByRole('checkbox').first().waitFor();
  assert.equal(await filter.getByRole('checkbox').count(), 2);
  await filter.getByRole('button', { name: 'Selecionar todos' }).click();
  assert.equal(await filter.getByRole('checkbox', { checked: true }).count(), 2);
  await filter.getByRole('button', { name: 'Remover seleção' }).click();
  assert.equal(await filter.getByRole('checkbox', { checked: true }).count(), 0);
  await filter.locator('.multi-summary').click();
  checks.push('Admin: lista ordenada, conexao apenas por acao, busca sem acentos e selecao multipla');

  await page.getByRole('button', { name: 'Rankings', exact: true }).click();
  await page.getByRole('button', { name: 'Ampliar Ranking por cliente/fornecedor', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Ranking por cliente/fornecedor', exact: true });
  await dialog.waitFor();
  assert.equal(await dialog.locator('tbody tr').count(), 50);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(200);
    const box = await dialog.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
    const top = dialog.locator('.table-scroll-top');
    const body = dialog.locator('.table-wrap');
    await top.evaluate(el => { el.scrollLeft = 220; });
    await page.waitForTimeout(100);
    assert.ok(Math.abs(await top.evaluate(el => el.scrollLeft) - await body.evaluate(el => el.scrollLeft)) < 2);
    await body.evaluate(el => { el.scrollLeft = 80; });
    await page.waitForTimeout(100);
    assert.ok(Math.abs(await top.evaluate(el => el.scrollLeft) - await body.evaluate(el => el.scrollLeft)) < 2);
    await page.screenshot({ path: path.join(output, `ranking-${width}.png`) });
  }
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Ampliar Ranking por cliente/fornecedor', exact: true }).evaluate(el => document.activeElement === el), true);
  checks.push('Ranking com 50 linhas em 1440/390/320px: tela cheia, rolagem sincronizada, Escape e foco');
  await context.close();

  const clientScenario = await scenario(1440, 'qa-client');
  await clientScenario.page.getByRole('button', { name: 'Tabela Analítica', exact: true }).waitFor();
  assert.equal(await clientScenario.page.getByRole('button', { name: 'Inconsistências', exact: true }).count(), 0);
  await clientScenario.page.getByRole('button', { name: 'Tabela Analítica', exact: true }).click();
  await clientScenario.page.getByRole('cell', { name: 'Contraparte sintetica', exact: true }).waitFor();
  assert.equal(clientScenario.calls.some(p => p.includes('/inconsistencias')), false);
  await clientScenario.page.getByRole('button', { name: 'Ampliar Tabela analítica de títulos financeiros', exact: true }).click();
  await clientScenario.page.getByRole('dialog').waitFor();
  await clientScenario.page.keyboard.press('Escape');
  checks.push('Cliente: tabela analitica ampliavel sem consultas ou aba de inconsistencias');
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ checks, errors }, null, 2));
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally {
  await context?.close();
  await browser.close();
  await server.close();
}
