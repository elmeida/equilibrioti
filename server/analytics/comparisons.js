import Decimal from 'decimal.js-light';
import { assertDateFilters, calendarDaySpan, DATE_FIELDS } from '../utils/dateFilters.js';

const Arithmetic = Decimal.clone({ precision: 80 });
const DAY = 86400000;
const nonempty = value => typeof value === 'string' && value.trim().length > 0;

function validatePeriod(period) {
  if (!period || !period.start || !period.end) throw new RangeError('Comparison requires a closed date interval.');
  assertDateFilters({ startDate: period.start, endDate: period.end });
}
function dateNumber(value) { return Date.parse(`${value}T00:00:00Z`); }
function iso(value) {
  const result = new Date(value).toISOString().slice(0, 10);
  assertDateFilters({ startDate: result });
  return result;
}
function lastDay(year, month) {
  return [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}
function shift(value, months, closeMonth = false) {
  const [year, month, day] = value.split('-').map(Number);
  const index = year * 12 + month - 1 + months;
  const shiftedYear = Math.floor(index / 12), shiftedMonth = index % 12 + 1;
  if (shiftedYear < 1 || shiftedYear > 9999) throw new RangeError('Comparison outside supported calendar.');
  const shiftedDay = closeMonth ? lastDay(shiftedYear, shiftedMonth) : Math.min(day, lastDay(shiftedYear, shiftedMonth));
  return `${String(shiftedYear).padStart(4, '0')}-${String(shiftedMonth).padStart(2, '0')}-${String(shiftedDay).padStart(2, '0')}`;
}

export function planComparison(period, mode, basis = 'range') {
  validatePeriod(period);
  if (!['previous', 'year', 'none'].includes(mode) || !['month', 'range'].includes(basis)) throw new RangeError('Invalid comparison mode or basis.');
  if (basis === 'month' && (!period.start.endsWith('-01') || period.start.slice(0, 7) !== period.end.slice(0, 7))) throw new RangeError('Monthly comparison must start on day one of the same month.');
  const current = { start: period.start, end: period.end };
  const currentDays = calendarDaySpan(current.start, current.end) + 1;
  if (mode === 'none') return { current, previous: null, mode, basis, currentDays, previousDays: null, warnings: [] };
  const [year, month, day] = current.end.split('-').map(Number);
  const fullMonth = basis === 'month' && day === lastDay(year, month);
  let previous;
  if (mode === 'year' || basis === 'month') {
    const months = mode === 'year' ? -12 : -1;
    previous = { start: shift(current.start, months), end: shift(current.end, months, fullMonth) };
  } else {
    previous = { start: iso(dateNumber(current.start) - currentDays * DAY), end: iso(dateNumber(current.start) - DAY) };
  }
  validatePeriod(previous);
  const previousDays = calendarDaySpan(previous.start, previous.end) + 1;
  const warnings = [];
  if (currentDays !== previousDays) warnings.push('unequal-days');
  if (current.start.slice(8) !== previous.start.slice(8) || current.end.slice(8) !== previous.end.slice(8)) {
    if (mode === 'year' || basis === 'month') warnings.push('calendar-adjusted');
  }
  if (previous.end >= current.start) warnings.push('overlapping-periods');
  return { current, previous, mode, basis, currentDays, previousDays, warnings };
}

export function coversPeriod(period, coverage) {
  try {
    validatePeriod(period);
    if (coverage?.status !== 'verified' || !Array.isArray(coverage.intervals) || !coverage.intervals.length) return false;
    const intervals = coverage.intervals.map(interval => { validatePeriod(interval); return { ...interval }; })
      .sort((a, b) => a.start.localeCompare(b.start));
    let next = dateNumber(period.start);
    for (const interval of intervals) {
      const start = dateNumber(interval.start), end = dateNumber(interval.end);
      if (start > next) return false;
      next = Math.max(next, end + DAY);
      if (next > dateNumber(period.end)) return true;
    }
    return false;
  } catch { return false; }
}

function decimal(value) {
  // Decimal strings avoid silently inheriting binary rounding from JSON numbers.
  if (typeof value !== 'string' || !/^-?(0|[1-9]\d{0,37})(\.\d{1,18})?$/.test(value)) return null;
  return new Arithmetic(value);
}

export function decimalChange(current, previous, unit = 'amount') {
  const a = decimal(current), b = decimal(previous);
  const empty = { difference: null, relativeRatio: null, percentagePoints: null };
  if (!['amount', 'count', 'rate'].includes(unit)) throw new RangeError('Invalid comparison unit.');
  if (!a || !b || (unit === 'count' && (!a.isInteger() || !b.isInteger() || a.isNegative() || b.isNegative()))) return { ...empty, reason: 'invalid-value' };
  const difference = a.minus(b);
  return {
    difference: difference.toFixed(),
    relativeRatio: b.isPositive() ? difference.div(b).toDecimalPlaces(12, Arithmetic.ROUND_HALF_UP).toFixed() : null,
    percentagePoints: unit === 'rate' ? difference.times(100).toFixed() : null,
    reason: b.isZero() ? 'zero-base' : b.isNegative() ? 'negative-base' : null,
  };
}

function knownTimeZone(timeZone) {
  try { new Intl.DateTimeFormat('en', { timeZone }); return true; } catch { return false; }
}
function validContext(context) {
  return context && ['tenantId', 'metricId', 'ruleVersion', 'filtersKey', 'sourceVersion', 'timeZone'].every(key => nonempty(context[key]))
    && knownTimeZone(context.timeZone)
    && typeof context.dateField === 'string' && Object.hasOwn(DATE_FIELDS, context.dateField)
    && ['amount', 'count', 'rate'].includes(context.unit)
    && ['movement', 'position'].includes(context.measure)
    && (context.unit === 'amount' ? typeof context.currency === 'string' && /^[A-Z]{3}$/.test(context.currency) : context.currency === null);
}

export function comparePeriods({ period, mode, basis = 'range', current, previous }) {
  const plan = planComparison(period, mode, basis);
  const unavailable = reason => ({ plan, status: 'unavailable', reason, difference: null, relativeRatio: null, percentagePoints: null });
  if (!plan.previous) return { ...unavailable('disabled'), status: 'disabled' };
  for (const [side, sample, expected] of [['current', current, plan.current], ['previous', previous, plan.previous]]) {
    if (sample?.status !== 'success') return unavailable(`${side}-unavailable`);
    if (sample.complete !== true) return unavailable(`${side}-incomplete-result`);
    if (sample.period?.start !== expected.start || sample.period?.end !== expected.end) return unavailable(`${side}-period-mismatch`);
    if (!validContext(sample.context)) return unavailable(`${side}-context-unknown`);
  }
  const fields = ['tenantId', 'metricId', 'ruleVersion', 'filtersKey', 'sourceVersion', 'timeZone', 'dateField', 'unit', 'measure', 'currency'];
  if (fields.some(key => current.context[key] !== previous.context[key])) return unavailable('context-mismatch');
  for (const [side, sample, expected] of [['current', current, plan.current], ['previous', previous, plan.previous]]) {
    if (!coversPeriod(expected, sample.coverage)) return unavailable(`${side}-coverage`);
    if (sample.context.measure === 'position' && sample.historical !== true) return unavailable(`${side}-history-unverified`);
  }
  const change = decimalChange(current.value, previous.value, current.context.unit);
  if (change.reason === 'invalid-value') return unavailable(change.reason);
  return { plan, status: 'available', ...change };
}

export function alignCategories(current, previous) {
  function index(rows) {
    if (!Array.isArray(rows)) throw new TypeError('Invalid category collection.');
    const result = new Map();
    for (const row of rows) {
      if (!nonempty(row?.id) || result.has(row.id) || (row.value !== null && !decimal(row.value))) throw new TypeError('Invalid or duplicate category.');
      result.set(row.id, row.value);
    }
    return result;
  }
  const a = index(current), b = index(previous);
  return [...new Set([...a.keys(), ...b.keys()])].map(id => ({ id, current: a.get(id) ?? null, previous: b.get(id) ?? null, presentCurrent: a.has(id), presentPrevious: b.has(id) }));
}
