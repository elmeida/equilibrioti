import { describe, expect, it } from 'vitest';
import { breakPeriodGaps, canUsePie, categoryRows, heatmapCells, seriesValue } from '../src/utils/chartData';
import { pivot } from '../src/utils/format';

describe('chart values', () => {
  it.each([null, undefined, '', ' ', 'invalid', NaN, Infinity, false])('preserves unavailable value %s', value => {
    expect(categoryRows([{ nome: 'A', valor: value }])[0].valor).toBeNull();
    expect(seriesValue({ value }, 'value')).toBeNull();
  });
  it.each([0, '0', -10, '-10', 12.5, '12.5'])('keeps finite value %s without minimum inflation', value => {
    expect(categoryRows([{ nome: 'A', valor: value }])[0].valor).toBe(Number(value));
  });
  it.each([null, -1, 1.5, Infinity])('does not fabricate record counts %s', quantidade => {
    expect(categoryRows([{ quantidade }])[0].quantidade).toBeNull();
  });
  it('accepts zero counts and disallows missing-name filter actions', () => {
    expect(categoryRows([{ quantidade: 0 }])[0]).toMatchObject({ quantidade: 0, filterValue: null });
  });
  it.each([[0, 0], [-1, 2], [null, 2], [Infinity, 2], [1e308, 1e308]])('does not make a pie from %s', (...values) => {
    expect(canUsePie(categoryRows(values.map(valor => ({ valor }))))).toBe(false);
  });
  it('allows positive distributions with genuine zero categories', () => {
    expect(canUsePie(categoryRows([{ valor: 0 }, { valor: 1 }]))).toBe(true);
    expect(canUsePie([])).toBe(false);
  });
});

describe('series and gaps', () => {
  it('preserves missing cells and explicit zero', () => {
    const rows = pivot([{ mes: '2026-01', serie: 'A', valor: 0 }, { mes: '2026-02', serie: 'B', valor: null }]);
    expect(seriesValue(rows[0], 'A')).toBe(0);
    expect(seriesValue(rows[0], 'B')).toBeNull();
    expect(seriesValue(rows[1], 'B')).toBeNull();
  });
  it('marks duplicates unavailable instead of silently overwriting', () => {
    const rows = pivot([1, 2, 3].map(valor => ({ mes: '2026-01', serie: 'A', valor })));
    expect(seriesValue(rows[0], 'A')).toBeNull();
  });
  it.each(['mes', '__proto__', 'constructor', 'Empresa.SA', 'Empresa[1]'])('isolates arbitrary series name %s', serie => {
    const row = pivot([{ mes: '2026-01', serie, valor: 10 }])[0];
    expect(row.mes).toBe('2026-01');
    expect(seriesValue(row, serie)).toBe(10);
  });
  it('orders periods and breaks monthly gaps without making zeros', () => {
    const rows = breakPeriodGaps([{ mes: '2026-04', A: 4 }, { mes: '2026-01', A: 1 }]);
    expect(rows.map(row => row.mes)).toEqual(['2026-01', '2026-02', '2026-04']);
    expect(rows[1].gap).toBe(true);
    expect(seriesValue(rows[1], 'A')).toBeNull();
  });
  it('respects leap days in UTC', () => {
    expect(breakPeriodGaps([{ mes: '2024-02-28' }, { mes: '2024-03-01' }])[1].mes).toBe('2024-02-29');
    expect(breakPeriodGaps([{ mes: '2025-02-28' }, { mes: '2025-03-01' }])).toHaveLength(2);
  });
  it('bounds memory for distant dates and never mutates inputs', () => {
    const rows = [{ mes: '0001-01-01' }, { mes: '9999-12-30' }];
    expect(breakPeriodGaps(rows)).toHaveLength(3);
    expect(rows).toHaveLength(2);
  });
  it('does not guess invalid or mixed calendar periods', () => {
    const rows = [{ mes: '2026-13' }, { mes: '2026-02-03' }];
    expect(breakPeriodGaps(rows)).toBe(rows);
  });
});

describe('heatmap', () => {
  it('distinguishes missing, zero, positive and negative values', () => {
    const cells = heatmapCells([{ ano: 2026, mes: 1, valor: 0 }, { ano: '2026', mes: '2', valor: -20 }, { ano: 2026, mes: 3, valor: 10 }]);
    expect(cells).toHaveLength(12);
    expect(cells.slice(0, 4).map(row => row.valor)).toEqual([0, -20, 10, null]);
  });
  it('does not pick an arbitrary duplicate value', () => {
    expect(heatmapCells([1, 2, 3].map(valor => ({ ano: 2026, mes: 1, valor })))[0].valor).toBeNull();
  });
  it('rejects invalid calendar coordinates', () => {
    expect(heatmapCells([{ ano: null, mes: 1 }, { ano: 2026, mes: 13 }, { ano: 1.5, mes: 2 }])).toEqual([]);
  });
});
