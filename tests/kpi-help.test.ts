import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { KpiCards, kpiRegistry, type KpiKey } from '../src/components/KpiCards';
import { KpiHelp } from '../src/components/KpiHelp';
import { ComparisonControls } from '../src/components/ComparisonControls';
import { defaultFilters } from '../src/services/api';
import { appliedPeriodLabel, comparisonPresentation, comparisonWarnings } from '../src/utils/comparisonPresentation';
import { kpiExplanations, referenceDescriptions } from '../src/utils/kpiExplanations';

describe('catalogo acessivel dos indicadores operacionais', () => {
  it('possui explicacao para todos os indicadores registrados, sem extras', () => {
    expect(Object.keys(kpiExplanations).sort()).toEqual(Object.keys(kpiRegistry).sort());
  });
  it.each(Object.keys(kpiRegistry) as KpiKey[])('inclui formula, origem, limites e referencia em %s', key => {
    const explanation = kpiExplanations[key];
    expect(explanation.formula.length).toBeGreaterThan(20);
    expect(explanation.fields.length).toBeGreaterThan(3);
    expect(explanation.limit.length).toBeGreaterThan(20);
    expect(referenceDescriptions[explanation.reference]).toBeTruthy();
    const html = renderToStaticMarkup(createElement(KpiCards, { data: { [key]: 0 }, loading: false, keys: [key] }));
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('Como é calculado:');
    expect(html).not.toContain('<dialog');
  });
  it('nao confunde status corrente, relogio SQL e filtro aplicado', () => {
    expect(kpiExplanations.totalAberto.reference).toBe('status');
    expect(kpiExplanations.mediaDiasAtraso.reference).toBe('today');
    expect(kpiExplanations.valorBaixa.reference).toBe('selected');
    expect(kpiExplanations.valorBaixadoAtraso.reference).toBe('dates');
    expect(kpiExplanations.ticketMedio.limit).toContain('conserva zero');
    expect(kpiExplanations.maiorAtrasoDias.limit).toContain('conserva zero');
  });
  it('esconde conteudo antigo e ajuda durante falha do bloco', () => {
    const html = renderToStaticMarkup(createElement(KpiCards, { data: { totalFinanceiro: 999999 }, loading: false, keys: ['totalFinanceiro'], state: { status: 'error' } }));
    expect(html).toContain('Consulta indisponível');
    expect(html).not.toContain('Como é calculado:');
    expect(html).not.toContain('999');
  });
});

describe('planejamento visual sem inventar valores comparativos', () => {
  const filters = { ...defaultFilters, startDate: '2025-02-01', endDate: '2025-02-28' };
  it('mostra ambos os recortes com duracao e aviso de calendario', () => {
    const comparison = comparisonPresentation(filters, 'year', 'month');
    expect(comparison).toMatchObject({ status: 'unavailable', plan: { currentDays: 28, previousDays: 29, previous: { start: '2024-02-01', end: '2024-02-29' } } });
    expect(comparisonWarnings(comparison.plan)).toHaveLength(2);
    const html = renderToStaticMarkup(createElement(ComparisonControls, { filters, comparison, onMode() {}, onBasis() {} }));
    expect(html).toContain('01/02/2025 a 28/02/2025');
    expect(html).toContain('29/02/2024');
    expect(html).toContain('Referência planejada');
    expect(html).toContain('cobertura comprovada');
  });
  it.each([
    [defaultFilters, 'O recorte não tem as duas datas'],
    [{ ...defaultFilters, startDate: '2025-01-01' }, 'O recorte não tem as duas datas'],
    [{ ...defaultFilters, endDate: '2025-01-01' }, 'O recorte não tem as duas datas'],
    [{ ...defaultFilters, startDate: '0001-01-01', endDate: '0001-01-02' }, 'fora do calendário'],
    [{ ...defaultFilters, startDate: '2025-02-30', endDate: '2025-03-01' }, 'datas inválidas'],
  ])('explica intervalo inapto %j', (value, reason) => {
    const result = comparisonPresentation(value, 'year', 'range');
    expect(result.status).toBe('unavailable');
    expect(result.plan).toBeNull();
    expect(result.reason).toContain(reason);
  });
  it('recorte mensal invalido nao altera ou normaliza o filtro', () => {
    const value = { ...filters, startDate: '2025-02-02' };
    const before = JSON.stringify(value);
    expect(comparisonPresentation(value, 'previous', 'month').reason).toContain('começar no dia 1');
    expect(JSON.stringify(value)).toBe(before);
  });
  it('sem comparacao dispensa datas e nao mostra periodo anterior', () => {
    expect(comparisonPresentation(defaultFilters, 'none', 'month')).toMatchObject({ status: 'disabled', plan: null });
  });
  it('distingue recorte livre e mensal sem consultar dados', () => {
    const value = { ...filters, endDate: '2025-02-17' };
    expect(comparisonPresentation(value, 'previous', 'range').plan?.previous).toEqual({ start: '2025-01-15', end: '2025-01-31' });
    expect(comparisonPresentation(value, 'previous', 'month').plan?.previous).toEqual({ start: '2025-01-01', end: '2025-01-17' });
  });
  it('preserva e rotula intervalos abertos sem inferir datas', () => {
    expect(appliedPeriodLabel(defaultFilters)).toBe('Sem limite de datas');
    expect(appliedPeriodLabel({ startDate: '2025-01-01', endDate: '' })).toBe('Desde 01/01/2025');
    expect(appliedPeriodLabel({ startDate: '', endDate: '2025-01-01' })).toBe('Até 01/01/2025');
  });
  it('ajuda mostra limites historicos e distingue consulta da atualizacao da origem', () => {
    const html = renderToStaticMarkup(createElement(KpiHelp, { metric: 'valorVencidoAberto', title: 'Valor vencido', unit: 'R$', filters, comparison: comparisonPresentation(filters, 'year', 'month'), updatedAt: 1000, onClose() {} }));
    expect(html).toContain('relógio do servidor de origem');
    expect(html).toContain('histórico de status e saldos ainda não foi reconstruído');
    expect(html).toContain('Conclusão da consulta não comprova atualização do RM');
    expect(html).toContain('backend-linhas-v1');
    expect(html).toContain('Conciliação com o RM pendente');
  });
  it('dados numericos atuais nunca habilitam variacao sem metadados', () => {
    const comparison = comparisonPresentation(filters, 'year', 'range');
    const html = renderToStaticMarkup(createElement(KpiCards, { data: { totalFinanceiro: 120 }, loading: false, keys: ['totalFinanceiro'], filters, comparison }));
    expect(html).toContain('120,00');
    expect(html).toContain('Comparação indisponível');
    expect(html).not.toContain('%');
  });
});
