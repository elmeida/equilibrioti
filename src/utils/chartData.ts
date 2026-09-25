import { finiteValue } from './analytics';
import { isCalendarDate } from '../../server/utils/dateFilters.js';

export function categoryRows(rows: any[]) {
  return rows.map(row => {
    const count = finiteValue(row.quantidade);
    const filterValue = typeof row.nome === 'string' && row.nome.trim() ? row.nome : null;
    return { ...row, nome: filterValue ?? 'Não informado', filterValue,
      valor: finiteValue(row.valor), quantidade: count !== null && Number.isInteger(count) && count >= 0 ? count : null };
  });
}

export function canUsePie(rows: ReturnType<typeof categoryRows>) {
  const total = rows.reduce((sum, row) => sum + (row.valor ?? 0), 0);
  return rows.length > 0 && rows.every(row => row.valor !== null && row.valor >= 0) && Number.isFinite(total) && total > 0;
}

export function seriesValue(row: any, key: string) {
  const values = row.values ?? row;
  return Object.prototype.hasOwnProperty.call(values, key) ? finiteValue(values[key]) : null;
}

// One null marker breaks each gap without allocating an unbounded calendar range.
export function breakPeriodGaps(rows: any[]) {
  if (!rows.length) return rows;
  const daily = /^\d{4}-\d{2}-\d{2}$/.test(rows[0].mes);
  if (!rows.every(row => typeof row.mes === 'string' &&
    (daily ? isCalendarDate(row.mes) : /^\d{4}-\d{2}$/.test(row.mes) && isCalendarDate(`${row.mes}-01`)))) return rows;
  const sorted = [...rows].sort((a, b) => a.mes.localeCompare(b.mes));
  return sorted.flatMap((row, index) => {
    const following = sorted[index + 1];
    if (!following || following.mes <= row.mes) return [row];
    const date = new Date(`${row.mes}${daily ? '' : '-01'}T00:00:00Z`);
    if (daily) date.setUTCDate(date.getUTCDate() + 1);
    else date.setUTCMonth(date.getUTCMonth() + 1);
    const next = date.toISOString().slice(0, daily ? 10 : 7);
    return next < following.mes ? [row, { mes: next, gap: true, values: Object.create(null) }] : [row];
  });
}

export function heatmapCells(rows: any[]) {
  const groups = new Map<string, number | null>();
  const years = new Set<number>();
  for (const row of rows) {
    const year = finiteValue(row.ano), month = finiteValue(row.mes);
    if (year === null || month === null || !Number.isInteger(year) || !Number.isInteger(month) || year < 1 || year > 9999 || month < 1 || month > 12) continue;
    years.add(year);
    const key = `${year}-${month}`;
    groups.set(key, groups.has(key) ? null : finiteValue(row.valor));
  }
  return [...years].sort((a, b) => a - b).flatMap(ano => Array.from({ length: 12 }, (_, index) => ({
    ano, mes: index + 1, valor: groups.get(`${ano}-${index + 1}`) ?? null,
  })));
}
