export type Period = { start: string; end: string };
export type ComparisonMode = 'previous' | 'year' | 'none';
export type ComparisonBasis = 'month' | 'range';
export type ComparisonPlan = { current: Period; previous: Period | null; mode: ComparisonMode; basis: ComparisonBasis; currentDays: number; previousDays: number | null; warnings: string[] };
export type Coverage = { status: 'verified' | 'unknown' | 'unavailable'; intervals: Period[] };
export type ComparisonUnit = 'amount' | 'count' | 'rate';
export type ComparisonContext = {
  tenantId: string; metricId: string; ruleVersion: string; filtersKey: string; sourceVersion: string; timeZone: string;
  dateField: 'vencimento' | 'emissao' | 'baixa' | 'criacao'; unit: ComparisonUnit;
  measure: 'movement' | 'position'; currency: string | null;
};
export type ComparisonSample = {
  period: Period; status: 'success' | 'error' | 'loading'; complete: boolean; value: string | null;
  context: ComparisonContext; coverage: Coverage; historical?: boolean;
};
export type ComparisonChange = { difference: string | null; relativeRatio: string | null; percentagePoints: string | null; reason: string | null };
export function planComparison(period: Period, mode: ComparisonMode, basis?: ComparisonBasis): ComparisonPlan;
export function coversPeriod(period: Period, coverage: Coverage | null | undefined): boolean;
export function decimalChange(current: unknown, previous: unknown, unit?: ComparisonUnit): ComparisonChange;
export function comparePeriods(input: { period: Period; mode: ComparisonMode; basis?: ComparisonBasis; current?: ComparisonSample; previous?: ComparisonSample }): ComparisonChange & { plan: ComparisonPlan; status: 'available' | 'unavailable' | 'disabled' };
export function alignCategories(current: { id: string; value: string | null }[], previous: { id: string; value: string | null }[]): { id: string; current: string | null; previous: string | null; presentCurrent: boolean; presentPrevious: boolean }[];
