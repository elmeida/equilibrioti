import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_PATH || 'playwright');
const baseUrl = process.env.DEMO_URL || 'http://127.0.0.1:5174';
const output = path.resolve('tmp/demo-qa');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
const checks = [];
const errors = [];
const apiRequests = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, acceptDownloads: true });
await context.route('**/*', route => {
  const target = new URL(route.request().url());
  return target.origin === new URL(baseUrl).origin && !target.pathname.startsWith('/api/') ? route.continue() : route.abort();
});
const page = await context.newPage();
page.setDefaultTimeout(30_000);
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (/\/api\//.test(request.url())) apiRequests.push(request.url()); });
const normalized = value => value.replace(/\s/g, '');
async function metric(key, expected) {
  await page.getByTestId(`metric-${key}`).waitFor();
  assert.equal(normalized(await page.getByTestId(`metric-${key}`).locator('.demo-metric-value').innerText()), normalized(expected));
}
async function noOverflow() {
  await page.waitForFunction(() => [...document.querySelectorAll('.demo-chart .recharts-wrapper')].every(element => element.getBoundingClientRect().width <= element.closest('.demo-chart').getBoundingClientRect().width + 1));
  const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, overflowing: [...document.querySelectorAll('main *')].filter(element => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 8).map(element => ({ className: element.className, text: element.textContent?.slice(0, 90) })) }));
  assert.equal(layout.scrollWidth <= layout.width + 1, true, JSON.stringify(layout));
}
try {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 120_000 });
  await metric('received', 'R$ 2.410,00');
  await metric('receivable', 'R$ 1.200,00');
  assert.ok(await page.locator('.recharts-line-curve').count() >= 2, 'Gráfico atual/anterior deve ter linhas');
  assert.equal(await page.locator('.demo-brand img').evaluate(img => img.complete && img.naturalWidth > 0), true);
  await noOverflow();
  await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
  checks.push('Desktop: marca, valores conhecidos, gráficos e layout');

  await page.getByTestId('metric-overdue').locator('summary').click();
  assert.equal(await page.getByTestId('metric-overdue').locator('details').getAttribute('open'), '');
  await page.getByTestId('metric-overdue').locator('summary').click();
  await page.getByRole('button', { name: 'Detalhes de DOC-001', exact: true }).click();
  assert.match(await page.locator('.demo-detail').innerText(), /Operações.*600,00/s);
  checks.push('Ajuda do indicador e composição de rateio/baixa');

  await page.getByLabel('Empresa', { exact: true }).selectOption('horizonte');
  await metric('received', 'R$ 1.000,00');
  await metric('receivable', 'R$ 12.500,00');
  assert.equal(await page.getByText('Cliente Alfa', { exact: true }).count(), 0);
  await page.getByLabel('Empresa', { exact: true }).selectOption('aurora');
  await metric('received', 'R$ 2.410,00');
  checks.push('Alternância de contexto A/B/A no simulador');

  await page.getByLabel('Perfil simulado').selectOption('horizonte');
  assert.equal(await page.getByLabel('Empresa', { exact: true }).count(), 0);
  await metric('receivable', 'R$ 12.500,00');
  await page.getByLabel('Perfil simulado').selectOption('aurora');
  await metric('received', 'R$ 2.410,00');
  checks.push('Perfil cliente sem seletor entre empresas');

  await page.getByLabel('Cenário', { exact: true }).selectOption('partial');
  assert.match(await page.locator('.demo-notice').innerText(), /Comparação indisponível/);
  await metric('received', 'R$ 2.410,00');
  assert.match(await page.getByTestId('metric-received').locator('.demo-delta').innerText(), /indisponível/);
  await page.screenshot({ path: path.join(output, 'partial.png'), fullPage: true });
  await page.getByLabel('Comparar com').selectOption('previous');
  assert.match(await page.getByTestId('metric-received').locator('.demo-delta').innerText(), /100,83/);
  checks.push('Cobertura parcial e mês anterior válido');

  await page.getByLabel('Cenário', { exact: true }).selectOption('unavailable');
  await metric('received', 'Indisponível');
  assert.equal(await page.getByRole('button', { name: 'Exportar títulos filtrados em CSV' }).isDisabled(), true);
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await metric('received', 'R$ 2.410,00');
  checks.push('Fonte indisponível sem zeros artificiais e recuperação');

  await page.getByLabel('Buscar títulos').fill('zeta');
  await metric('received', 'R$ 2.010,00');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar títulos filtrados em CSV' }).click()]);
  const csvPath = path.join(output, 'export-filtered.csv');
  await download.saveAs(csvPath);
  const csv = await fs.readFile(csvPath, 'utf8');
  assert.match(csv, /Cliente Zeta/);
  assert.doesNotMatch(csv, /Cliente Alfa|Cliente Litoral/);
  await page.getByLabel('Buscar títulos').fill('sem-correspondencia');
  assert.match(await page.locator('tbody').innerText(), /Nenhum título/);
  await page.getByLabel('Buscar títulos').fill('');
  checks.push('Pesquisa em todo o recorte, exportação coerente e vazio');

  await page.getByLabel('Início', { exact: true }).fill('2026-09-20');
  await page.getByRole('button', { name: 'Aplicar período' }).click();
  assert.match(await page.locator('.demo-error').innerText(), /data inicial/);
  await page.getByLabel('Início', { exact: true }).fill('2026-09-01');
  await page.getByRole('button', { name: 'Aplicar período' }).click();
  checks.push('Validação do período sem substituir a consulta aplicada');

  await page.getByLabel('Início', { exact: true }).fill('2025-02-01');
  await page.getByLabel('Fim', { exact: true }).fill('2025-02-28');
  await page.getByLabel('Comparar com').selectOption('year');
  await page.getByRole('button', { name: 'Aplicar período' }).click();
  assert.match(await page.locator('.demo-period').innerText(), /28 dias.*01\/02\/2024 a 29\/02\/2024.*29 dias/s);
  await page.getByText(/Períodos com durações diferentes/).waitFor();
  await page.screenshot({ path: path.join(output, 'comparison-calendar.png') });
  await page.setViewportSize({ width: 320, height: 900 });
  await noOverflow();
  await page.screenshot({ path: path.join(output, 'comparison-calendar-320.png') });
  await page.setViewportSize({ width: 1440, height: 1050 });
  checks.push('Meses fechados entre anos bissextos preservam duracoes e aviso de ajuste');

  await page.getByLabel('Início', { exact: true }).fill('0001-01-01');
  await page.getByLabel('Fim', { exact: true }).fill('0001-01-01');
  await page.getByRole('button', { name: 'Aplicar período' }).click();
  assert.match(await page.locator('.demo-period').innerText(), /Comparação indisponível: período fora do calendário/);
  await page.getByLabel('Início', { exact: true }).fill('2026-09-01');
  await page.getByLabel('Fim', { exact: true }).fill('2026-09-17');
  await page.getByRole('button', { name: 'Aplicar período' }).click();
  await metric('received', 'R$ 2.410,00');
  checks.push('Limite inferior do calendario nao quebra tela e permite recuperar recorte');

  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('heading', { name: 'Equilíbrio BI', exact: true }).waitFor();
    await noOverflow();
    assert.equal(await page.getByLabel('Perfil simulado').isVisible(), true);
    await page.screenshot({ path: path.join(output, `viewport-${width}.png`), fullPage: true });
  }
  checks.push('Tablet e celulares de 390/320px sem overflow da página');
  assert.deepEqual(await page.evaluate(() => Object.keys(localStorage)), []);
  assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 0);
  assert.deepEqual(apiRequests, []);
  assert.deepEqual(errors, []);
  checks.push('Sem API, sessão persistida, service worker ou erros de execução');
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ url: baseUrl, checks, apiRequests, errors }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally {
  await browser.close();
}
