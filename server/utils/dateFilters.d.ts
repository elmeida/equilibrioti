export const DATE_FIELDS: { vencimento: 'DTVENC'; emissao: 'DTEMISSAO'; baixa: 'DTBAIXA'; criacao: 'DTCRICAO' };
export function isCalendarDate(value: unknown): boolean;
export function dateFilterError(query: { dateField?: unknown; startDate?: unknown; endDate?: unknown }): string;
export function assertDateFilters(query: { dateField?: unknown; startDate?: unknown; endDate?: unknown }): void;
export function calendarDaySpan(startDate: unknown, endDate: unknown): number | null;
export function currentPeriod(preset: 'year' | 'month', today?: Date): { startDate: string; endDate: string };
