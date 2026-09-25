import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_PATH || 'playwright');
const url = 'http://127.0.0.1:5175';
const output = path.resolve('tmp/metrics-qa');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
await context.route('**/*', route => new URL(route.request().url()).origin === url ? route.continue() : route.abort());
await context.route('**/api/**', route => {
  const endpoint = new URL(route.request().url()).pathname;
  const json = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  if (endpoint === '/api/auth/me') return json({ user: { id: 1, nome: 'Cliente QA', perfil: 'cliente', empresa_id: 1, empresa: { id: 1, nome: 'Equilibrio TI', logo_url: '/logo_equilibrioti.png' } } });
  if (endpoint === '/api/titulos/kpis') return json({ quantidadeTitulos: 2, totalFinanceiro: 1000, totalPagar: 0, totalReceber: 1000,
    saldoLiquido: 1000, totalAberto: 0, totalBaixado: 1000, valorVencidoAberto: 0, valorBaixa: 0,
    diferencaRateadoBaixado: 1000, percentualBaixado: null, mediaDiasAtraso: 1.5, maiorAtrasoDias: 2, titulosVencidosAberto: 2 });
  if (endpoint === '/api/titulos/graficos/coligadas') return json([{ nome: 'A-menor', valor: 10 }, { nome: 'Z-maior', valor: 990 }]);
  if (endpoint === '/api/titulos/inconsistencias/resumo') return json([
    { severidade: 'Crítico', tipo: 'Teste A', quantidade: 2, registrosAfetados: 2 },
    { severidade: 'Atenção', tipo: 'Teste B', quantidade: 2, registrosAfetados: 2 },
  ]);
  if (endpoint === '/api/titulos/analises') return json({});
  if (endpoint.startsWith('/api/titulos/')) return json([]);
  throw new Error(`Unexpected mocked endpoint: ${endpoint}`);
});

try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('equilibrioti:auth-token', 'qa-metrics'));
  await page.reload({ waitUntil: 'networkidle' });
  const count = page.locator('.kpi-card').filter({ hasText: 'Registros na consulta' });
  await count.getByText('2', { exact: true }).waitFor();
  assert.match(await count.getAttribute('title'), /não é contagem de títulos únicos/);
  const company = page.locator('.insight-item').filter({ hasText: 'Empresa com maior volume' });
  await company.getByText(/Z-maior/).waitFor();
  const ratio = page.locator('.insight-item').filter({ hasText: '% vencido sobre aberto' });
  assert.equal(await ratio.locator('strong').innerText(), 'Indisponível');
  checks.push('Contagem identificada como registros, empresa por valor e razao sem base indisponivel');
  await page.locator('.primary-kpis').screenshot({ path: path.join(output, 'cards-desktop.png') });

  await page.getByRole('button', { name: 'Fluxo Financeiro', exact: true }).click();
  await page.locator('.kpi-card').filter({ hasText: 'Razão baixa / rateio' }).getByText('Indisponível', { exact: true }).waitFor();
  assert.equal(await page.getByText('Total realizado', { exact: true }).count(), 0);
  checks.push('Fluxo nao apresenta baixa no recorte como caixa certificado e preserva null');

  await page.getByRole('button', { name: 'Vencidos', exact: true }).click();
  await page.locator('.kpi-card').filter({ hasText: 'Média de atraso por registro' }).getByText('1,5 dias', { exact: true }).waitFor();
  checks.push('Media fracionaria exibida sem truncar');

  await page.getByRole('button', { name: 'Inconsistências', exact: true }).click();
  await page.locator('.mini-metric').filter({ hasText: 'Total de inconsistências' }).getByText('4', { exact: true }).waitFor();
  assert.equal(await page.getByText('% da base com alerta', { exact: true }).count(), 0);
  assert.equal(await page.getByText('Registros afetados', { exact: true }).count(), 0);
  checks.push('Ocorrencias sobrepostas nao geram falso percentual de registros distintos');

  await page.getByRole('button', { name: 'Visão Geral', exact: true }).click();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    if (await page.locator('.sidebar.open').count()) await page.getByRole('button', { name: 'Fechar menu', exact: true }).click();
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, `cards-${width}.png`), fullPage: true });
  }
  checks.push('Cards e rotulos conferidos em 390/320 px sem overflow de pagina');
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ passed: checks.length, checks, errors }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally {
  await browser.close();
}
