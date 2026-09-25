import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_PATH || 'playwright');
const url = 'http://127.0.0.1:5175', output = path.resolve('tmp/dashboard-state-qa');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(30000);
const errors = [], checks = [], calls = [];
let mode = 'normal', recoveredKpi = false, recoveredRanking = false;
const releases = new Map();
const held = key => new Promise(resolve => releases.set(key, resolve));
page.on('pageerror', error => errors.push(error.message));
await context.route('**/*', route => new URL(route.request().url()).origin === url ? route.continue() : route.abort());
await context.route('**/api/**', async route => {
  const target = new URL(route.request().url()), endpoint = target.pathname, search = target.searchParams.get('search') || '';
  calls.push({ endpoint, search });
  const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }).catch(() => {});
  if (endpoint === '/api/auth/me') return json({ user: { id: 1, nome: 'QA', perfil: 'cliente', empresa_id: 1, empresa: { id: 1, nome: 'Equilibrio TI', logo_url: '/logo_equilibrioti.png' } } });
  if (endpoint.startsWith('/api/titulos/filtros/')) return json([]);
  if (endpoint === '/api/titulos/tabela') return json({ total: 0, page: 1, pageSize: 25, rows: [] });
  if (endpoint === '/api/titulos/kpis') {
    if (search === 'lento' || search === 'sair-pendente') {
      await held(search);
      return json({ totalFinanceiro: 999999, quantidadeTitulos: 999999 });
    }
    if (mode === 'partial' && !recoveredKpi) return json({ error: 'Falha controlada' }, 503);
    const amount = mode === 'empty' ? 0 : search === 'atual' ? 3333 : recoveredKpi ? 2222 : 1111;
    return json({ totalFinanceiro: amount, totalReceber: amount, totalPagar: 0, saldoLiquido: amount, totalAberto: 0, totalBaixado: amount, quantidadeTitulos: mode === 'empty' ? 0 : 1, valorVencidoAberto: 0 });
  }
  if (endpoint === '/api/titulos/graficos/status' && mode === 'partial') return json({ error: 'Falha controlada' }, 503);
  if (endpoint === '/api/titulos/inconsistencias/resumo' && mode === 'partial') return json({ error: 'Falha controlada' }, 503);
  if (endpoint === '/api/titulos/inconsistencias/v2' && mode === 'partial') return json({ error: 'Falha controlada' }, 503);
  if (endpoint === '/api/titulos/rankings/clientes') {
    if (mode === 'partial' && !recoveredRanking) return json({ error: 'Falha controlada' }, 503);
    return json(mode === 'empty' ? [] : [{ nome: 'Cliente atual', totalRateio: 50, quantidade: 1 }, ...Array.from({ length: 10 }, (_, index) => ({ nome: `Cliente QA ${index}`, totalRateio: 10, quantidade: 1 }))]);
  }
  if (endpoint === '/api/titulos/graficos/coligadas') return json(mode === 'malformed' ? { unexpected: true } : mode === 'empty' ? [] : [{ nome: search === 'atual' ? 'Empresa atual' : mode === 'partial' ? 'Empresa preservada' : 'Empresa inicial', valor: 100 }]);
  if (endpoint === '/api/titulos/analises') return json({});
  if (endpoint.startsWith('/api/titulos/')) return json([]);
  throw new Error(`Unexpected endpoint ${endpoint}`);
});
const total = () => page.locator('.kpi-card').filter({ hasText: 'Total financeiro' }).locator('strong');
async function filter(value) {
  const input = page.getByPlaceholder('Documento, cliente, histórico...');
  if (!(await input.isVisible())) await page.getByRole('button', { name: /Filtros globais/ }).click();
  await input.fill(value);
  await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
}
try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('equilibrioti:auth-token', 'qa-dashboard-state'));
  await page.reload({ waitUntil: 'networkidle' });
  await total().getByText(/1\.111,00/).waitFor();
  await page.locator('.top-actions').getByText(/Consulta concluída:/).waitFor();
  assert.equal(await page.getByText(/Dados atualizados em/).count(), 0);
  await page.locator('[data-block="clientes"]').getByRole('button', { name: 'Ver todos', exact: true }).click();
  await page.locator('.chart-modal').waitFor();
  await page.locator('.chart-modal .chart-summary').getByRole('button', { name: /Cliente atual/ }).click();
  await page.locator('.chart-modal').waitFor({ state: 'hidden' });
  await page.locator('.top-actions').getByText(/Consulta concluída:/).waitFor();
  checks.push('Modal do grafico nao conserva copia de dados apos mudar filtro');
  mode = 'partial';
  await page.getByRole('button', { name: 'Atualizar dados', exact: true }).click();
  await page.getByRole('alert', { name: 'Indicadores financeiros', exact: true }).waitFor();
  await page.locator('[data-block="coligadas"] summary').click();
  await page.locator('[data-block="coligadas"]').getByRole('rowheader', { name: 'Empresa preservada', exact: true }).waitFor();
  assert.equal(await total().count(), 0);
  assert.equal(await page.locator('.top-actions').getByText(/Consulta concluída:/).count(), 0);
  assert.equal(await page.locator('.quality-grid').count(), 0);
  checks.push('Falha parcial remove valor anterior apenas do bloco e nao mostra horario global de sucesso');

  const before = calls.length;
  recoveredKpi = true;
  await page.getByRole('button', { name: 'Tentar novamente: Indicadores financeiros', exact: true }).click();
  await total().getByText(/2\.222,00/).waitFor();
  assert.deepEqual(calls.slice(before).map(call => call.endpoint), ['/api/titulos/kpis']);
  await page.locator('[data-block="status"]').getByRole('alert').waitFor();
  checks.push('Nova tentativa consulta somente o alvo; erro de outro bloco permanece localizado');
  await page.screenshot({ path: path.join(output, 'partial-desktop.png'), fullPage: true });

  await page.getByRole('button', { name: 'Rankings', exact: true }).click();
  await page.getByRole('alert', { name: 'Ranking por cliente/fornecedor', exact: true }).waitFor();
  recoveredRanking = true;
  await page.getByRole('button', { name: 'Tentar novamente: Ranking por cliente/fornecedor', exact: true }).click();
  await page.getByRole('cell', { name: 'Cliente atual', exact: true }).waitFor();
  checks.push('Tabela e grafico de ranking compartilham recuperacao do mesmo bloco');

  await page.getByRole('button', { name: 'Inconsistências', exact: true }).click();
  await page.getByRole('alert', { name: 'Resumo de inconsistências', exact: true }).waitFor();
  await page.getByRole('alert', { name: 'Lista de inconsistências', exact: true }).waitFor();
  assert.equal(await page.getByText('Total de inconsistências', { exact: true }).count(), 0);
  assert.equal(await page.getByText('Nenhum dado encontrado.', { exact: true }).count(), 0);
  checks.push('Falha de alertas nao vira zero nem lista sem movimento');

  mode = 'normal';
  await page.getByRole('button', { name: 'Visão Geral', exact: true }).click();
  await total().getByText(/2\.222,00/).waitFor();
  await filter('lento');
  await page.getByRole('status', { name: 'Indicadores financeiros', exact: true }).waitFor();
  assert.equal(await total().count(), 0);
  await filter('atual');
  await total().getByText(/3\.333,00/).waitFor();
  releases.get('lento')();
  await page.waitForTimeout(250);
  assert.match(await total().innerText(), /3\.333,00/);
  assert.equal(await page.getByText(/999\.999/).count(), 0);
  checks.push('Filtro novo oculta valor anterior e ignora resposta fora de ordem');

  await filter('sair-pendente');
  await page.getByRole('status', { name: 'Indicadores financeiros', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Tabela Analítica', exact: true }).click();
  releases.get('sair-pendente')();
  await page.getByText('Nenhum dado encontrado para os filtros atuais.', { exact: true }).waitFor();
  assert.equal(await page.locator('.top-actions').getByText('Consultando dados...', { exact: true }).count(), 0);
  await filter('atual');
  await page.getByRole('button', { name: 'Visão Geral', exact: true }).click();
  await total().getByText(/3\.333,00/).waitFor();
  checks.push('Sair para tabela cancela ciclo pendente; retorno reconsulta sem estado travado');

  mode = 'empty';
  await page.getByRole('button', { name: 'Atualizar dados', exact: true }).click();
  await total().getByText(/0,00/).waitFor();
  await page.locator('[data-block="coligadas"]').getByText('Sem registros neste recorte.').waitFor();
  await page.locator('.top-actions').getByText(/Consulta concluída:/).waitFor();
  assert.equal(await page.getByRole('alert').count(), 0);
  checks.push('Sucesso vazio e zero verdadeiro continuam distintos de indisponibilidade');

  mode = 'malformed';
  await page.getByRole('button', { name: 'Atualizar dados', exact: true }).click();
  await page.locator('[data-block="coligadas"]').getByRole('alert').waitFor();
  assert.equal(await page.locator('[data-block="coligadas"]').getByText('Sem registros neste recorte.').count(), 0);
  checks.push('Resposta de estrutura invalida e indisponivel, nao lista vazia');

  mode = 'partial'; recoveredKpi = false;
  await page.getByRole('button', { name: 'Atualizar dados', exact: true }).click();
  await page.getByRole('alert', { name: 'Indicadores financeiros', exact: true }).waitFor();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    if (await page.locator('.sidebar.open').count()) await page.getByRole('button', { name: 'Fechar menu', exact: true }).click();
    await page.waitForTimeout(350);
    await page.evaluate(() => window.scrollTo(0, 0));
    const overflow = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, elements: [...document.querySelectorAll('main *')].filter(element => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map(element => ({ tag: element.tagName, className: element.className, text: element.textContent?.slice(0, 80) })) }));
    assert.equal(overflow.scrollWidth <= width + 1, true, JSON.stringify(overflow));
    await page.screenshot({ path: path.join(output, `partial-${width}.png`), fullPage: true });
  }
  assert.deepEqual(errors, []);
  checks.push('Estados e novas tentativas acessiveis em desktop/390/320 sem overflow');
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ passed: checks.length, checks, errors }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally {
  releases.forEach(release => release());
  await browser.close();
}
