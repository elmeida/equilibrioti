import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE_PATH || 'playwright');
const url = 'http://127.0.0.1:5175', output = path.resolve('tmp/date-filters-qa');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const checks = [], errors = [];
try {
  for (const [timezoneId, today, monthStart] of [['America/Fortaleza', '2024-02-29', '2024-02-01'], ['Pacific/Kiritimati', '2024-03-01', '2024-03-01']]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId });
    const calls = [];
    await context.route('**/*', route => new URL(route.request().url()).origin === url ? route.continue() : route.abort());
    await context.route('**/api/**', route => {
      const target = new URL(route.request().url()), endpoint = target.pathname;
      const json = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
      if (endpoint === '/api/auth/me') return json({ user: { id: 1, nome: 'QA', perfil: 'cliente', empresa_id: 1, empresa: { id: 1, nome: 'Equilibrio TI', logo_url: '/logo_equilibrioti.png' } } });
      if (endpoint === '/api/titulos/kpis') { calls.push(Object.fromEntries(target.searchParams)); return json({ totalFinanceiro: 50 }); }
      if (endpoint === '/api/titulos/analises') return json({});
      if (endpoint.startsWith('/api/titulos/')) return json([]);
      throw new Error(`Unexpected endpoint ${endpoint}`);
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2024-03-01T01:30:00Z'));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.setItem('equilibrioti:auth-token', 'qa-dates'));
    await page.reload({ waitUntil: 'networkidle' });
    const start = page.getByLabel('Data inicial', { exact: true }), end = page.getByLabel('Data final', { exact: true });
    if (!(await start.isVisible())) await page.getByRole('button', { name: /Filtros globais/ }).click();
    await page.getByRole('button', { name: 'Este mês', exact: true }).click();
    assert.equal(await start.inputValue(), monthStart);
    assert.equal(await end.inputValue(), today);
    await page.getByRole('button', { name: 'Este ano', exact: true }).click();
    assert.equal(await start.inputValue(), '2024-01-01');
    assert.equal(await end.inputValue(), today);
    checks.push(`Atalhos respeitam calendario local sem deslocamento UTC: ${timezoneId}`);

    const before = calls.length;
    await start.fill('2026-03-01');
    await end.fill('2026-02-28');
    await page.getByRole('alert').getByText('A data inicial deve ser anterior ou igual a data final.').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).isDisabled(), true);
    assert.equal(calls.length, before);
    checks.push(`Intervalo invertido bloqueado sem alterar consulta aplicada: ${timezoneId}`);

    await start.fill('2024-02-29');
    await end.fill('2024-02-29');
    for (const dateField of ['baixa', 'emissao', 'criacao', 'vencimento']) {
      await page.getByLabel('Campo de data').selectOption(dateField);
      const response = page.waitForResponse(response => {
        const target = new URL(response.url());
        return target.pathname === '/api/titulos/kpis' && target.searchParams.get('dateField') === dateField && target.searchParams.get('startDate') === '2024-02-29';
      });
      await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
      await response;
      assert.deepEqual([calls.at(-1).dateField, calls.at(-1).startDate, calls.at(-1).endDate], [dateField, '2024-02-29', '2024-02-29']);
    }
    checks.push(`Mesmo dia bissexto e quatro campos chegam intactos a API: ${timezoneId}`);

    if (timezoneId === 'America/Fortaleza') {
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        if (await page.locator('.sidebar.open').count()) await page.getByRole('button', { name: 'Fechar menu', exact: true }).click();
        if (!(await page.locator('.filter-drawer').isVisible())) await page.getByRole('button', { name: /^Filtros(?: \(|$)/ }).click();
        await page.locator('.filter-drawer').getByLabel('Data inicial', { exact: true }).fill('2026-03-01');
        await page.locator('.filter-drawer').getByRole('alert').waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        await page.screenshot({ path: path.join(output, `invalid-${width}.png`) });
      }
      checks.push('Erro e bloqueio acessiveis no celular, sem overflow em 390/320 px');
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify({ passed: checks.length, checks, errors }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally {
  await browser.close();
}
