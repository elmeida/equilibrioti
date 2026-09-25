import { describe, expect, it } from 'vitest';
import { change, comparisonPeriod, dateValue, hasCoverage, metrics, periodSeries, receivableAging, residual, resolveTenant, selectTitles, titlesCsv, titleStatus, validatePeriod, type Title } from '../src/demo/domain';
import { demoCoverage, demoPeriod, demoTitles } from '../src/demo/fixtures';

const all = { coligada: 'all', direction: 'all', search: '' };
const admin = { role: 'platform_admin' as const };
const aurora = () => selectTitles(demoTitles, admin, 'aurora', all);
const sample = (overrides: Partial<Title> = {}): Title => ({ tenantId: 'aurora', id: 'test', document: 'D', coligada: 1,
  counterpartId: 'C', counterpart: 'Teste', direction: 'receivable', issued: '2026-09-01', due: '2026-09-10',
  principalCents: 100_000, allocations: [{ costCenter: 'A', cents: 60_000 }, { costCenter: 'B', cents: 40_000 }], payments: [], ...overrides });

describe('contrato sintético e contexto (não certifica a autorização do backend)', () => {
  it('mantém chaves únicas por empresa e rateios conciliados', () => {
    expect(new Set(demoTitles.map(row => `${row.tenantId}:${row.id}`)).size).toBe(demoTitles.length);
    for (const row of demoTitles) {
      expect(row.allocations.reduce((sum, item) => sum + item.cents, 0)).toBe(row.principalCents);
      expect(Number.isSafeInteger(row.principalCents)).toBe(true);
      expect(new Set(row.payments.map(item => item.id)).size).toBe(row.payments.length);
    }
  });
  it('permite ao administrador selecionar cada empresa sem juntar as bases', () => {
    expect(aurora().every(row => row.tenantId === 'aurora')).toBe(true);
    expect(selectTitles(demoTitles, admin, 'horizonte', all).every(row => row.tenantId === 'horizonte')).toBe(true);
  });
  it('nega solicitação de outra empresa por perfil cliente', () => {
    expect(() => selectTitles(demoTitles, { role: 'client', tenantId: 'aurora' }, 'horizonte', all)).toThrow('Acesso negado');
  });
  it('nega papel desconhecido e empresa inexistente', () => {
    expect(() => resolveTenant({ role: 'unknown' } as never, 'aurora')).toThrow();
    expect(() => resolveTenant(admin, 'inexistente' as never)).toThrow();
  });
  it('mantém resultados diferentes apesar de IDs e coligadas repetidos', () => {
    expect(metrics(aurora(), demoPeriod)).toEqual({ received: 241_000, paid: 30_000, net: 211_000, receivable: 120_000, overdue: 60_000, openCount: 4 });
    expect(metrics(selectTitles(demoTitles, admin, 'horizonte', all), demoPeriod)).toEqual({ received: 100_000, paid: 300_000, net: -200_000, receivable: 1_250_000, overdue: 800_000, openCount: 2 });
  });
  it('aplica coligada, tipo e pesquisa ao universo inteiro', () => {
    const result = selectTitles(demoTitles, admin, 'aurora', { coligada: '2', direction: 'receivable', search: 'zeta' });
    expect(result.map(row => row.id)).toEqual(['002']);
  });
  it('não guarda contexto entre consultas A/B/A', () => {
    const before = metrics(aurora(), demoPeriod);
    metrics(selectTitles(demoTitles, admin, 'horizonte', all), demoPeriod);
    expect(metrics(aurora(), demoPeriod)).toEqual(before);
  });
});

describe('oráculos financeiros em centavos', () => {
  it('conta um título com dois rateios uma única vez', () => {
    expect(metrics([sample()], demoPeriod)).toMatchObject({ receivable: 100_000, openCount: 1 });
  });
  it('inclui residual de baixa parcial na carteira vencida', () => {
    const row = sample({ payments: [{ id: 'P', date: '2026-09-05', principalCents: 40_000, cashCents: 40_000 }] });
    expect(metrics([row], demoPeriod)).toMatchObject({ received: 40_000, receivable: 60_000, overdue: 60_000 });
    expect(titleStatus(row, demoPeriod.end)).toBe('Baixa parcial');
  });
  it('separa principal e caixa com encargos/desconto', () => {
    const row = sample({ payments: [{ id: 'P', date: '2026-09-05', principalCents: 100_000, cashCents: 101_000 }] });
    expect(metrics([row], demoPeriod)).toMatchObject({ received: 101_000, receivable: 0, openCount: 0 });
  });
  it('preserva o saldo histórico antes da liquidação futura', () => {
    const row = sample({ payments: [{ id: 'P', date: '2026-10-05', principalCents: 100_000, cashCents: 100_000 }] });
    expect(residual(row, '2026-09-17')).toBe(100_000);
    expect(residual(row, '2026-10-05')).toBe(0);
  });
  it('recebimento entra pelo evento mesmo com vencimento fora do período', () => {
    const row = sample({ issued: '2026-08-01', due: '2026-08-15', payments: [{ id: 'P', date: '2026-09-05', principalCents: 100_000, cashCents: 100_000 }] });
    expect(metrics([row], demoPeriod).received).toBe(100_000);
  });
  it('estorno reabre principal e zera o fluxo líquido dos dois eventos', () => {
    const row = sample({ payments: [{ id: 'P', date: '2026-09-05', principalCents: 100_000, cashCents: 100_000 }, { id: 'E', date: '2026-09-06', principalCents: -100_000, cashCents: -100_000 }] });
    expect(metrics([row], demoPeriod)).toMatchObject({ received: 0, receivable: 100_000 });
  });
  it('cancelamento respeita a posição histórica', () => {
    const row = sample({ cancelledAt: '2026-09-10' });
    expect(residual(row, '2026-09-09')).toBe(100_000);
    expect(residual(row, '2026-09-10')).toBe(0);
  });
  it('vencimento hoje não é atraso e títulos futuros não compõem posição', () => {
    expect(metrics([sample({ due: demoPeriod.end })], demoPeriod).overdue).toBe(0);
    expect(metrics([sample({ issued: '2026-10-01', due: '2026-10-10' })], demoPeriod).openCount).toBe(0);
  });
  it('faixas fecham com a carteira e não incluem obrigações a pagar', () => {
    const totals = metrics(aurora(), demoPeriod);
    expect(receivableAging(aurora(), demoPeriod.end).reduce((sum, row) => sum + row.cents, 0)).toBe(totals.receivable);
  });
  it('não perde centavos em somas', () => {
    expect(metrics([sample({ principalCents: 10 }), sample({ id: 'outro', principalCents: 20 })], demoPeriod).receivable).toBe(30);
  });
});

describe('comparação temporal e dados ausentes', () => {
  it('compara recorte mensal parcial com mesmos dias do mês anterior', () => {
    expect(comparisonPeriod(demoPeriod, 'previous')).toEqual({ start: '2026-08-01', end: '2026-08-17' });
  });
  it('compara meses fechados completos e trata ano bissexto', () => {
    expect(comparisonPeriod({ start: '2024-03-01', end: '2024-03-31' }, 'previous')).toEqual({ start: '2024-02-01', end: '2024-02-29' });
    expect(comparisonPeriod({ start: '2024-02-01', end: '2024-02-29' }, 'year')).toEqual({ start: '2023-02-01', end: '2023-02-28' });
  });
  it('intervalo livre mantém quantidade de dias na virada do ano', () => {
    expect(comparisonPeriod({ start: '2026-01-05', end: '2026-01-10' }, 'previous')).toEqual({ start: '2025-12-30', end: '2026-01-04' });
  });
  it('retorna nulo quando comparação está desligada', () => expect(comparisonPeriod(demoPeriod, 'none')).toBeNull());
  it('rejeita datas inexistentes e intervalos invertidos', () => {
    expect(() => dateValue('2026-02-30')).toThrow();
    expect(() => dateValue('data')).toThrow();
    expect(() => validatePeriod({ start: '2026-09-10', end: '2026-09-01' })).toThrow();
  });
  it('distingue percentual sem base de diferença absoluta', () => {
    expect(change(12_000, 10_000)).toEqual({ difference: 2_000, ratio: 0.2 });
    expect(change(12_000, 0)).toEqual({ difference: 12_000, ratio: null });
    expect(change(12_000, -100)).toEqual({ difference: 12_100, ratio: null });
    expect(change(12_000, null)).toEqual({ difference: null, ratio: null });
  });
  it('exige cobertura dos dois recortes, não zero artificial', () => {
    expect(hasCoverage(demoPeriod, demoCoverage)).toBe(true);
    expect(hasCoverage(comparisonPeriod(demoPeriod, 'year')!, { start: '2026-01-01', end: demoCoverage.end })).toBe(false);
  });
  it('séries reconciliam com KPIs sem usar o período atual no histórico', () => {
    const old = comparisonPeriod(demoPeriod, 'year')!;
    const series = periodSeries(aurora(), demoPeriod, old);
    expect(series.reduce((sum, row) => sum + (row.current ?? 0), 0)).toBe(2410);
    expect(series.reduce((sum, row) => sum + (row.previous ?? 0), 0)).toBe(1000);
  });
  it('preserva dias excedentes do mês anterior sem atribuir zero ao atual', () => {
    const period = { start: '2026-02-01', end: '2026-02-28' };
    const series = periodSeries([], period, comparisonPeriod(period, 'previous'));
    expect(series).toHaveLength(31);
    expect(series[30]).toMatchObject({ current: null, previous: 0, date: null, previousDate: '2026-01-31' });
  });
});

describe('exportação demonstrativa', () => {
  it('mantem nome com virgula na busca e no arquivo sem dividir a contraparte', () => {
    const selected = selectTitles([sample({ counterpart: 'Nome, Matriz & Filial' }), sample({ id: 'outro', counterpart: 'Nome' })], admin, 'aurora', { ...all, search: 'Nome, Matriz' });
    expect(selected.map(row => row.id)).toEqual(['test']);
    expect(titlesCsv(selected, demoPeriod)).toContain('"Nome, Matriz & Filial"');
  });
  it('exporta o mesmo recorte autorizado sem títulos futuros', () => {
    const csv = titlesCsv(aurora(), demoPeriod);
    expect(csv).toContain('Cliente Alfa');
    expect(csv).not.toContain('Cliente Litoral');
    expect(csv).not.toContain('Cliente Futuro');
    expect(csv).toContain('600,00');
    expect(csv).toContain('2026-09-17');
  });
  it('escapa delimitadores, aspas e fórmulas em células', () => {
    const csv = titlesCsv([sample({ counterpart: '=HYPERLINK("teste;nome")' })], demoPeriod);
    expect(csv).toContain('"\'=HYPERLINK(""teste;nome"")"');
  });
});
