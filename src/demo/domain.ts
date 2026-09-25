import { planComparison, coversPeriod, decimalChange } from '../../server/analytics/comparisons.js';
import { isCalendarDate } from '../../server/utils/dateFilters.js';

export type TenantId = 'aurora' | 'horizonte';
export type DemoIdentity = { role: 'platform_admin' } | { role: 'client'; tenantId: TenantId };
export type Period = { start: string; end: string };
export type ComparisonMode = 'previous' | 'year' | 'none';
export type Scenario = 'complete' | 'partial' | 'unavailable';
export type Payment = { id: string; date: string; principalCents: number; cashCents: number };
export type Title = {
  tenantId: TenantId;
  id: string;
  document: string;
  coligada: number;
  counterpartId: string;
  counterpart: string;
  direction: 'receivable' | 'payable';
  issued: string;
  due: string;
  cancelledAt?: string;
  principalCents: number;
  allocations: { costCenter: string; cents: number }[];
  payments: Payment[];
};
export type Selection = { coligada: string; direction: string; search: string };
export type Metrics = {
  received: number;
  paid: number;
  net: number;
  receivable: number;
  overdue: number;
  openCount: number;
};

const DAY = 86_400_000;
export function dateValue(value: string): number {
  if (!isCalendarDate(value)) throw new Error('Data inválida.');
  const time = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) throw new Error('Data inválida.');
  return time;
}
function iso(time: number) { return new Date(time).toISOString().slice(0, 10); }
export function validatePeriod(period: Period) {
  if (dateValue(period.start) > dateValue(period.end)) throw new Error('A data inicial deve ser anterior ou igual à final.');
}
export function comparisonPeriod(period: Period, mode: ComparisonMode): Period | null {
  return comparisonPlan(period, mode).previous;
}
export function comparisonPlan(period: Period, mode: ComparisonMode) {
  validatePeriod(period);
  const basis = period.start.endsWith('-01') && period.start.slice(0, 7) === period.end.slice(0, 7) ? 'month' : 'range';
  return planComparison(period, mode, basis);
}

export function resolveTenant(identity: DemoIdentity, requested: TenantId): TenantId {
  if (identity.role === 'platform_admin') {
    if (requested !== 'aurora' && requested !== 'horizonte') throw new Error('Empresa inválida.');
    return requested;
  }
  if (identity.role !== 'client' || identity.tenantId !== requested) throw new Error('Acesso negado à empresa.');
  return identity.tenantId;
}

export function selectTitles(all: Title[], identity: DemoIdentity, tenant: TenantId, selection: Selection): Title[] {
  const allowedTenant = resolveTenant(identity, tenant);
  const search = selection.search.trim().toLocaleLowerCase('pt-BR');
  return all.filter(title => title.tenantId === allowedTenant
    && (selection.coligada === 'all' || String(title.coligada) === selection.coligada)
    && (selection.direction === 'all' || title.direction === selection.direction)
    && (!search || `${title.document} ${title.counterpart} ${title.id}`.toLocaleLowerCase('pt-BR').includes(search)));
}

export function residual(title: Title, asOf: string): number {
  if (title.issued > asOf || (title.cancelledAt && title.cancelledAt <= asOf)) return 0;
  return title.principalCents - title.payments.filter(payment => payment.date <= asOf)
    .reduce((sum, payment) => sum + payment.principalCents, 0);
}

export function metrics(titles: Title[], period: Period): Metrics {
  validatePeriod(period);
  const totals: Metrics = { received: 0, paid: 0, net: 0, receivable: 0, overdue: 0, openCount: 0 };
  for (const title of titles) {
    const cash = title.payments.filter(payment => payment.date >= period.start && payment.date <= period.end)
      .reduce((sum, payment) => sum + payment.cashCents, 0);
    if (title.direction === 'receivable') totals.received += cash;
    else totals.paid += cash;
    const balance = residual(title, period.end);
    if (balance > 0) totals.openCount++;
    if (title.direction === 'receivable') {
      totals.receivable += balance;
      if (title.due < period.end && balance > 0) totals.overdue += balance;
    }
  }
  totals.net = totals.received - totals.paid;
  return totals;
}

export function change(current: number, previous: number | null) {
  const result = decimalChange(String(current), previous === null ? null : String(previous));
  return { difference: result.difference === null ? null : Number(result.difference),
    ratio: result.relativeRatio === null ? null : Number(result.relativeRatio) };
}

export function hasCoverage(period: Period, coverage: Period): boolean {
  return coversPeriod(period, { status: 'verified', intervals: [coverage] });
}

export function receivableAging(titles: Title[], asOf: string) {
  const rows = [
    { label: 'A vencer / hoje', cents: 0 }, { label: '1–30 dias', cents: 0 },
    { label: '31–60 dias', cents: 0 }, { label: '61–90 dias', cents: 0 }, { label: 'Mais de 90 dias', cents: 0 },
  ];
  for (const title of titles.filter(row => row.direction === 'receivable')) {
    const balance = residual(title, asOf);
    if (balance <= 0) continue;
    const days = (dateValue(asOf) - dateValue(title.due)) / DAY;
    rows[days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4].cents += balance;
  }
  return rows;
}

export function periodSeries(titles: Title[], period: Period, previous: Period | null) {
  const days = (range: Period) => Math.round((dateValue(range.end) - dateValue(range.start)) / DAY) + 1;
  const length = Math.max(days(period), previous ? days(previous) : 0);
  return Array.from({ length }, (_, index) => {
    const date = iso(dateValue(period.start) + index * DAY);
    const oldDate = previous ? iso(dateValue(previous.start) + index * DAY) : null;
    return { date: date <= period.end ? date : null, previousDate: oldDate && previous && oldDate <= previous.end ? oldDate : null, label: String(index + 1),
      current: date <= period.end ? metrics(titles, { start: date, end: date }).received / 100 : null,
      previous: oldDate && previous && oldDate <= previous.end ? metrics(titles, { start: oldDate, end: oldDate }).received / 100 : null };
  });
}

export function titleStatus(title: Title, asOf: string) {
  if (title.cancelledAt && title.cancelledAt <= asOf) return 'Cancelado';
  const balance = residual(title, asOf);
  if (balance === 0) return 'Liquidado';
  if (balance < title.principalCents) return 'Baixa parcial';
  return title.due < asOf ? 'Vencido' : 'A vencer';
}

function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export function titlesCsv(titles: Title[], period: Period) {
  const rows = titles.filter(title => title.issued <= period.end);
  const content: unknown[][] = [['Documento', 'Contraparte', 'Coligada', 'Tipo', 'Vencimento', 'Principal (R$)', 'Saldo (R$)', 'Situação', 'Posição em']];
  for (const title of rows) content.push([title.document, title.counterpart, title.coligada,
    title.direction === 'receivable' ? 'A receber' : 'A pagar', title.due,
    (title.principalCents / 100).toFixed(2).replace('.', ','),
    (residual(title, period.end) / 100).toFixed(2).replace('.', ','), titleStatus(title, period.end), period.end]);
  return '\uFEFF' + content.map(row => row.map(csvCell).join(';')).join('\r\n');
}
