export function finiteValue(value: unknown): number | null {
  if (value === null || value === undefined || (typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function positiveBaseRatio(numerator: unknown, denominator: unknown): number | null {
  const top = finiteValue(numerator), base = finiteValue(denominator);
  if (top === null || base === null || base <= 0) return null;
  return finiteValue(top / base);
}

export function largestValue<T extends { valor?: unknown }>(rows: T[]): T | undefined {
  return rows.reduce<T | undefined>((largest, row) => {
    const value = finiteValue(row.valor);
    if (value === null) return largest;
    return !largest || value > finiteValue(largest.valor)! ? row : largest;
  }, undefined);
}

export function qualitySummary(rows: { quantidade?: unknown; severidade?: string }[]) {
  return rows.reduce((summary, row) => {
    const count = finiteValue(row.quantidade) ?? 0;
    summary.total += count;
    if (row.severidade === 'Crítico') summary.critico += count;
    else if (row.severidade === 'Atenção') summary.atencao += count;
    else summary.informativo += count;
    return summary;
  }, { total: 0, critico: 0, atencao: 0, informativo: 0 });
}
