import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { assertDateFilters, calendarDaySpan, currentPeriod, dateFilterError, isCalendarDate, DATE_FIELDS } from '../server/utils/dateFilters.js';
import { buildFilters } from '../server/utils/queryBuilder.js';
import { FilterPanel } from '../src/components/FilterPanel';
import { defaultFilters } from '../src/services/api';

describe('datas civis e limites de calendario', () => {
  it.each(['0001-01-01', '0099-12-31', '2000-02-29', '2024-02-29', '2026-04-30', '9999-12-31'])('aceita data real %s', value => {
    expect(isCalendarDate(value)).toBe(true);
  });
  it.each(['0000-01-01', '1900-02-29', '2026-02-29', '2026-04-31', '2026-00-01', '2026-13-01', '2026-01-00', '2026-1-01', '18/09/2026', '2026-09-18T00:00:00Z', ' 2026-09-18', '10000-01-01', ['2026-01-01'], null, 2026])('recusa data invalida %j', value => {
    expect(isCalendarDate(value)).toBe(false);
    expect(() => assertDateFilters({ startDate: value })).toThrow();
  });
  it.each([{}, { startDate: '', endDate: '' }, { startDate: '2026-01-01' }, { endDate: '2026-01-01' }, { startDate: '2024-02-29', endDate: '2024-02-29' }])('aceita intervalo aberto/vazio/mesmo dia %j', query => {
    expect(dateFilterError(query)).toBe('');
  });
  it('recusa ordem invertida e limite que estouraria DATEADD', () => {
    expect(() => assertDateFilters({ startDate: '2026-02-01', endDate: '2026-01-31' })).toThrow();
    expect(() => assertDateFilters({ endDate: '9999-12-31' })).toThrow();
    expect(dateFilterError({ endDate: '9999-12-30' })).toBe('');
  });
  it.each(['toString', '__proto__', 'DTVENC', ['baixa', 'vencimento'], null])('recusa eixo desconhecido/duplicado %j', dateField => {
    expect(() => assertDateFilters({ dateField })).toThrow();
  });
  it.each(Object.entries(DATE_FIELDS))('usa coluna permitida e limites inclusivo/exclusivo para %s', (dateField, column) => {
    const input = vi.fn();
    const where = buildFilters({ dateField, startDate: '2024-02-29', endDate: '2024-03-01' }, { input });
    expect(where).toContain(`${column} >= CONVERT(date, @f0, 23)`);
    expect(where).toContain(`${column} < DATEADD(day, 1, CONVERT(date, @f1, 23))`);
    expect(input.mock.calls.map(call => call[2])).toEqual(['2024-02-29', '2024-03-01']);
    expect(where).not.toContain('2024-');
  });
  it('valida antes de criar parametros e preserva vencimento como padrao', () => {
    const input = vi.fn();
    expect(() => buildFilters({ coligada: 'A', endDate: '2026-02-30' }, { input })).toThrow();
    expect(input).not.toHaveBeenCalled();
    expect(buildFilters({ startDate: '2026-01-01' }, { input })).toContain('DTVENC >=');
  });
  it('calcula dias civis entre meses, anos e anos bissextos', () => {
    expect(calendarDaySpan('2024-02-28', '2024-03-01')).toBe(2);
    expect(calendarDaySpan('2025-12-31', '2026-01-01')).toBe(1);
    expect(calendarDaySpan('2026-01-01', '2026-02-01')).toBe(31);
    expect(calendarDaySpan('2026-01-01', '2026-02-02')).toBe(32);
    expect(calendarDaySpan('invalid', '2026-01-01')).toBeNull();
  });
  it.each(['America/Fortaleza', 'America/New_York', 'Pacific/Kiritimati', 'UTC'])('independe do fuso para intervalo e conserva data local dos atalhos em %s', timezone => {
    const moduleUrl = new URL('../server/utils/dateFilters.js', import.meta.url).href;
    const script = `import { calendarDaySpan, currentPeriod } from ${JSON.stringify(moduleUrl)}; console.log(JSON.stringify([calendarDaySpan('2026-10-15', '2026-11-15'), currentPeriod('month', new Date(2024, 1, 29, 23, 59))]));`;
    const result = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ: timezone }, encoding: 'utf8' }));
    expect(result).toEqual([31, { startDate: '2024-02-01', endDate: '2024-02-29' }]);
  });
  it('atalhos terminam hoje e preservam virada de ano', () => {
    expect(currentPeriod('year', new Date(2026, 0, 1))).toEqual({ startDate: '2026-01-01', endDate: '2026-01-01' });
    expect(currentPeriod('month', new Date(2026, 11, 31))).toEqual({ startDate: '2026-12-01', endDate: '2026-12-31' });
  });
  it('formulario informa erro e impede aplicacao de intervalo invertido', () => {
    const markup = renderToStaticMarkup(React.createElement(FilterPanel, { filters: { ...defaultFilters, startDate: '2026-02-01', endDate: '2026-01-01' }, appliedFilters: defaultFilters, onChange() {}, onApply() {}, onClear() {}, activeFilters: 0 }));
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toMatch(/apply-button[^>]+disabled/);
  });
});
