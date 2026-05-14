export const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
export const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 });

export function fmtMoney(value: unknown) {
  return currency.format(Number(value || 0));
}

export function fmtInt(value: unknown) {
  return integer.format(Number(value || 0));
}

export function fmtPercent(value: unknown) {
  return percent.format(Number(value || 0));
}

export function fmtDate(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

export function safe(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Não informado';
  return String(value);
}

export function chartPeriodLabel(value: unknown) {
  const text = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split('-');
    return `${day}/${month}/${year}`;
  }
  if (/^\d{4}-\d{2}$/.test(text)) {
    const [year, month] = text.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' })
      .format(date)
      .replace('.', '');
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  return text || 'Não informado';
}

export function dayLabel(value: unknown) {
  const text = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.slice(8, 10);
  return chartPeriodLabel(value);
}

export function pivot(rows: any[], index = 'mes', series = 'serie', value = 'valor') {
  const map = new Map<string, Record<string, any>>();
  rows.forEach((row) => {
    const key = row[index] || 'Não informado';
    const item = map.get(key) || { [index]: key };
    item[row[series] || 'Não informado'] = Number(row[value] || 0);
    map.set(key, item);
  });
  return Array.from(map.values());
}
