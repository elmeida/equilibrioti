import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { alignCategories, comparePeriods, coversPeriod, decimalChange, planComparison } from '../server/analytics/comparisons.js';

const period = { start: '2026-09-01', end: '2026-09-17' };
const verified = intervals => ({ status: 'verified', intervals });
const context = { tenantId: 'qa-1', metricId: 'rateio', ruleVersion: 'test-v1', sourceVersion: 'test-load-1', filtersKey: 'all', timeZone: 'America/Fortaleza', dateField: 'vencimento', unit: 'amount', measure: 'movement', currency: 'BRL' };
function samples() {
  const plan = planComparison(period, 'previous', 'month');
  const make = (range, value) => ({ period: range, value, status: 'success', complete: true, context: { ...context }, coverage: verified([range]) });
  return { period: { ...period }, mode: 'previous', basis: 'month', current: make(plan.current, '120'), previous: make(plan.previous, '100') };
}

describe('intervalos comparativos explicitos', () => {
  it('intervalo livre preserva duracao mesmo com inicio no dia um', () => {
    expect(planComparison(period, 'previous').previous).toEqual({ start: '2026-08-15', end: '2026-08-31' });
    expect(planComparison(period, 'previous', 'month').previous).toEqual({ start: '2026-08-01', end: '2026-08-17' });
  });
  it.each([
    ['2024-03-01', '2024-03-31', 'previous', '2024-02-01', '2024-02-29', 31, 29],
    ['2026-02-01', '2026-02-28', 'previous', '2026-01-01', '2026-01-31', 28, 31],
    ['2025-02-01', '2025-02-28', 'year', '2024-02-01', '2024-02-29', 28, 29],
    ['2024-02-01', '2024-02-29', 'year', '2023-02-01', '2023-02-28', 29, 28],
    ['2026-03-01', '2026-03-30', 'previous', '2026-02-01', '2026-02-28', 30, 28],
  ])('mensal %s/%s preserva fechamento ou explicita ajuste', (start, end, mode, oldStart, oldEnd, currentDays, previousDays) => {
    expect(planComparison({ start, end }, mode, 'month')).toMatchObject({ previous: { start: oldStart, end: oldEnd }, currentDays, previousDays, warnings: ['unequal-days', 'calendar-adjusted'] });
  });
  it('acumulado anual mantem corte equivalente e informa dia bissexto extra', () => {
    expect(planComparison({ start: '2024-01-01', end: '2024-09-17' }, 'year')).toMatchObject({ previous: { start: '2023-01-01', end: '2023-09-17' }, currentDays: 261, previousDays: 260, warnings: ['unequal-days'] });
  });
  it('dia bissexto livre e ajustado sem expandir o intervalo', () => {
    expect(planComparison({ start: '2024-02-29', end: '2024-02-29' }, 'year')).toMatchObject({ previous: { start: '2023-02-28', end: '2023-02-28' }, currentDays: 1, previousDays: 1, warnings: ['calendar-adjusted'] });
    expect(planComparison({ start: '2025-02-01', end: '2025-02-28' }, 'year', 'range').previous.end).toBe('2024-02-28');
  });
  it('preserva anos menores que 100 sem comportamento especial de Date.UTC', () => {
    expect(planComparison({ start: '0099-01-01', end: '0099-01-31' }, 'previous', 'month').previous).toEqual({ start: '0098-12-01', end: '0098-12-31' });
  });
  it('desliga comparacao sem produzir periodo ou diferenca', () => {
    expect(planComparison(period, 'none')).toMatchObject({ previous: null, previousDays: null, warnings: [] });
    expect(comparePeriods({ period, mode: 'none' })).toMatchObject({ status: 'disabled', difference: null, relativeRatio: null });
  });
  it('nao recorta silenciosamente periodos anuais sobrepostos', () => {
    expect(planComparison({ start: '2024-01-01', end: '2025-03-01' }, 'year').warnings).toContain('overlapping-periods');
  });
  it.each([
    [{ start: '', end: '2026-01-01' }, 'previous', 'range'],
    [{ start: '2026-02-30', end: '2026-03-01' }, 'year', 'range'],
    [{ start: '2026-03-01', end: '2026-02-01' }, 'previous', 'range'],
    [{ start: '0001-01-01', end: '0001-01-02' }, 'previous', 'range'],
    [{ start: '0001-02-01', end: '0001-02-28' }, 'year', 'month'],
    [{ start: '2026-01-02', end: '2026-01-17' }, 'previous', 'month'],
    [period, 'bad-mode', 'range'], [period, 'previous', 'guess'],
  ])('recusa contrato/limite invalido %j %s %s', (range, mode, basis) => {
    expect(() => planComparison(range, mode, basis)).toThrow();
  });
  it.each(['UTC', 'America/Fortaleza', 'America/New_York', 'Pacific/Kiritimati'])('mesma duracao em %s', timezone => {
    const moduleUrl = new URL('../server/analytics/comparisons.js', import.meta.url).href;
    const script = `import { planComparison } from ${JSON.stringify(moduleUrl)}; console.log(JSON.stringify(planComparison({start:'2026-11-01',end:'2026-11-15'},'previous')));`;
    const plan = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', env: { ...process.env, TZ: timezone } }));
    expect(plan).toMatchObject({ currentDays: 15, previousDays: 15, previous: { start: '2026-10-17', end: '2026-10-31' } });
  });
});

describe('cobertura continua, nao inferida por MIN/MAX ou linhas retornadas', () => {
  it('une trechos adjacentes e sobrepostos sem modificar entrada', () => {
    const intervals = [{ start: '2026-09-09', end: '2026-09-17' }, { start: '2026-09-01', end: '2026-09-05' }, { start: '2026-09-05', end: '2026-09-08' }];
    const before = JSON.stringify(intervals);
    expect(coversPeriod(period, verified(intervals))).toBe(true);
    expect(JSON.stringify(intervals)).toBe(before);
  });
  it('rejeita lacuna interna mesmo com inicio e fim cobertos', () => {
    expect(coversPeriod(period, verified([{ start: period.start, end: '2026-09-05' }, { start: '2026-09-07', end: period.end }]))).toBe(false);
  });
  it.each([null, { status: 'unknown', intervals: [period] }, { status: 'unavailable', intervals: [period] }, verified([]), verified([{ start: 'bad', end: period.end }]), verified([{ start: '2026-09-02', end: period.end }])])('rejeita cobertura insuficiente ou nao verificada %j', coverage => {
    expect(coversPeriod(period, coverage)).toBe(false);
  });
});

describe('variacao decimal sem confundir percentual e pontos percentuais', () => {
  it('mantem exatidao decimal e diferenca de quatro casas', () => {
    expect(decimalChange('0.3', '0.1')).toMatchObject({ difference: '0.2', relativeRatio: '2' });
    expect(decimalChange('99999999999999999999999999.0001', '99999999999999999999999999.0000').difference).toBe('0.0001');
  });
  it('percentual exige base anterior positiva, inclusive para queda ate negativo', () => {
    expect(decimalChange('120', '100')).toEqual({ difference: '20', relativeRatio: '0.2', percentagePoints: null, reason: null });
    expect(decimalChange('-50', '100')).toMatchObject({ difference: '-150', relativeRatio: '-1.5' });
    expect(decimalChange('0', '0')).toMatchObject({ difference: '0', relativeRatio: null, reason: 'zero-base' });
    expect(decimalChange('120', '-100')).toMatchObject({ difference: '220', relativeRatio: null, reason: 'negative-base' });
    expect(decimalChange('100', '0')).toMatchObject({ difference: '100', relativeRatio: null });
  });
  it('8 para 10 por cento sao 2 pontos e 25 por cento relativos', () => {
    expect(decimalChange('0.10', '0.08', 'rate')).toEqual({ difference: '0.02', relativeRatio: '0.25', percentagePoints: '2', reason: null });
    expect(decimalChange('0.1', '0', 'rate')).toMatchObject({ percentagePoints: '10', relativeRatio: null });
  });
  it('arredonda somente a razao para 12 casas com half-up', () => {
    expect(decimalChange('2', '3').relativeRatio).toBe('-0.333333333333');
    expect(decimalChange('3', '7').relativeRatio).toBe('-0.571428571429');
  });
  it.each([null, undefined, '', ' ', '1,20', 'NaN', 'Infinity', '1e3', true, {}, 0.1, '9'.repeat(39), '0.' + '1'.repeat(19)])('nao transforma valor invalido em zero %j', value => {
    expect(decimalChange(value, '100')).toMatchObject({ difference: null, relativeRatio: null, reason: 'invalid-value' });
    expect(decimalChange('100', value).difference).toBeNull();
  });
  it('contagens exigem inteiros nao negativos', () => {
    expect(decimalChange('2', '1', 'count').difference).toBe('1');
    expect(decimalChange('2.5', '1', 'count').reason).toBe('invalid-value');
    expect(decimalChange('-1', '1', 'count').reason).toBe('invalid-value');
  });
});

describe('elegibilidade dos dois recortes', () => {
  it('calcula apenas quando ambos sao comparaveis', () => {
    expect(comparePeriods(samples())).toMatchObject({ status: 'available', difference: '20', relativeRatio: '0.2' });
  });
  it.each(['tenantId', 'metricId', 'ruleVersion', 'sourceVersion', 'filtersKey', 'timeZone', 'dateField', 'unit', 'measure', 'currency'])('impede mistura de %s', key => {
    const input = samples();
    const alternatives = { dateField: 'baixa', unit: 'rate', measure: 'position', currency: 'USD' };
    input.previous.context[key] = alternatives[key] || 'different';
    expect(comparePeriods(input)).toMatchObject({ status: 'unavailable', difference: null, relativeRatio: null });
  });
  it.each(['current', 'previous'])('exige evidencia e valor valido no lado %s', side => {
    for (const [mutate, reason] of [
      [sample => { sample.status = 'error'; }, `${side}-unavailable`],
      [sample => { sample.period = { start: '2020-01-01', end: '2020-01-02' }; }, `${side}-period-mismatch`],
      [sample => { sample.complete = false; }, `${side}-incomplete-result`],
      [sample => { delete sample.context.sourceVersion; }, `${side}-context-unknown`],
      [sample => { sample.context.timeZone = 'unknown'; }, `${side}-context-unknown`],
      [sample => { sample.coverage.status = 'unknown'; }, `${side}-coverage`],
      [sample => { sample.value = null; }, 'invalid-value'],
    ]) {
      const input = samples();
      mutate(input[side]);
      expect(comparePeriods(input)).toMatchObject({ status: 'unavailable', reason, difference: null, relativeRatio: null });
    }
  });
  it('nao usa status corrente para certificar estoque historico', () => {
    const input = samples();
    input.current.context.measure = input.previous.context.measure = 'position';
    expect(comparePeriods(input).reason).toBe('current-history-unverified');
    input.current.historical = true;
    expect(comparePeriods(input).reason).toBe('previous-history-unverified');
    input.previous.historical = true;
    expect(comparePeriods(input).status).toBe('available');
  });
  it('zero verdadeiro mantem absoluto, mas ausencia de cobertura suprime ambos', () => {
    const input = samples(); input.previous.value = '0';
    expect(comparePeriods(input)).toMatchObject({ status: 'available', difference: '120', relativeRatio: null, reason: 'zero-base' });
    input.previous.coverage = verified([]);
    expect(comparePeriods(input)).toMatchObject({ status: 'unavailable', difference: null, relativeRatio: null });
  });
  it('nao altera o contexto ou os valores atuais ao recusar anterior', () => {
    const input = samples(); input.previous.status = 'error';
    const before = JSON.stringify(input);
    comparePeriods(input);
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe('categorias exclusivas de cada periodo', () => {
  it('une IDs sem descartar categoria anterior nem inventar zero', () => {
    expect(alignCategories([{ id: 'novo', value: '20' }, { id: 'comum', value: '0' }], [{ id: 'antigo', value: '10' }, { id: 'comum', value: null }])).toEqual([
      { id: 'novo', current: '20', previous: null, presentCurrent: true, presentPrevious: false },
      { id: 'comum', current: '0', previous: null, presentCurrent: true, presentPrevious: true },
      { id: 'antigo', current: null, previous: '10', presentCurrent: false, presentPrevious: true },
    ]);
  });
  it('rejeita duplicatas e invalidez em vez de sobrescrever valores', () => {
    expect(() => alignCategories([{ id: 'a', value: '1' }, { id: 'a', value: '2' }], [])).toThrow();
    expect(() => alignCategories([], [{ id: 'a', value: '' }])).toThrow();
  });
});
