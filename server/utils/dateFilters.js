export const DATE_FIELDS = {
  vencimento: 'DTVENC',
  emissao: 'DTEMISSAO',
  baixa: 'DTBAIXA',
  criacao: 'DTCRICAO',
};

export function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

export function dateFilterError(query) {
  const { dateField, startDate, endDate } = query;
  if (dateField !== undefined && dateField !== '' && (typeof dateField !== 'string' || !Object.hasOwn(DATE_FIELDS, dateField))) return 'Selecione um campo de data valido.';
  for (const [value, label] of [[startDate, 'inicial'], [endDate, 'final']]) {
    if (value !== undefined && value !== '' && !isCalendarDate(value)) return `Informe uma data ${label} valida no formato AAAA-MM-DD.`;
  }
  if (startDate && endDate && startDate > endDate) return 'A data inicial deve ser anterior ou igual a data final.';
  // SQL uses an exclusive next-day bound, which must fit in its date range.
  if (endDate === '9999-12-31') return 'A data final deve ser anterior a 31/12/9999.';
  return '';
}

export function assertDateFilters(query) {
  const error = dateFilterError(query);
  if (error) throw Object.assign(new Error(error), { status: 400 });
}

export function calendarDaySpan(startDate, endDate) {
  if (!isCalendarDate(startDate) || !isCalendarDate(endDate)) return null;
  return (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000;
}

export function currentPeriod(preset, today = new Date()) {
  const year = String(today.getFullYear()).padStart(4, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return { startDate: `${year}-${preset === 'year' ? '01' : month}-01`, endDate: `${year}-${month}-${day}` };
}
