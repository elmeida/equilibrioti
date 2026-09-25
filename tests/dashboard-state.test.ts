import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { pendingState, projectDashboard, replaceBlock, validateBlock } from '../src/hooks/dashboardState';
import { RemoteBlock } from '../src/components/RemoteBlock';
import { fmtInt, fmtMoney } from '../src/utils/format';

describe('estado independente por consulta', () => {
  it('falha nao apaga sucesso de outro bloco nem simula conclusao global', () => {
    let state = pendingState('a', ['kpis', 'coligadas']);
    state = replaceBlock(state, 'a', 'kpis', { status: 'success', data: { totalFinanceiro: 100 }, updatedAt: 10 });
    expect(projectDashboard(state.blocks).isUpdating).toBe(true);
    state = replaceBlock(state, 'a', 'coligadas', { status: 'error', error: 'offline' });
    const view = projectDashboard(state.blocks);
    expect(view.kpis.data.totalFinanceiro).toBe(100);
    expect(view.charts.data.coligadas).toEqual([]);
    expect(view.failedCount).toBe(1);
    expect(view.isUpdating).toBe(false);
    expect(view.lastUpdated).toBeUndefined();
  });
  it('troca de recorte invalida dados anteriores e resposta atrasada', () => {
    const next = pendingState('new', ['kpis']);
    expect(replaceBlock(next, 'old', 'kpis', { status: 'success', data: { totalFinanceiro: 999 } })).toBe(next);
    expect(projectDashboard(next.blocks).kpis.data).toEqual({});
    expect(replaceBlock(next, 'new', 'fora-do-escopo', { status: 'success', data: {} })).toBe(next);
  });
  it('nova tentativa remove valor e horario apenas do alvo', () => {
    let state = pendingState('a', ['kpis', 'coligadas']);
    state = replaceBlock(state, 'a', 'kpis', { status: 'success', data: { totalFinanceiro: 0 }, updatedAt: 10 });
    state = replaceBlock(state, 'a', 'coligadas', { status: 'success', data: [], updatedAt: 11 });
    expect(projectDashboard(state.blocks).lastUpdated).toBe(11);
    const before = state.blocks.coligadas;
    state = replaceBlock(state, 'a', 'kpis', { status: 'loading' });
    expect(state.blocks.kpis.data).toBeUndefined();
    expect(state.blocks.kpis.updatedAt).toBeUndefined();
    expect(state.blocks.coligadas).toBe(before);
  });
  it('listas derivadas nao mantem ranking anterior apos falha', () => {
    const view = projectDashboard({ clientes: { status: 'error', data: [{ nome: 'antigo', totalRateio: 99 }] } });
    expect(view.rankings.data.clientes).toEqual([]);
    expect(view.charts.data.topClientes).toEqual([]);
  });
  it('aba sem consultas nao conserva horario global anterior', () => {
    expect(projectDashboard({}).lastUpdated).toBeUndefined();
    expect(projectDashboard({}).isUpdating).toBe(false);
  });
  it.each([null, {}, [null], ['row'], [[]]])('recusa lista financeira malformada %j', value => {
    expect(() => validateBlock('clientes', value)).toThrow();
  });
  it('aceita lista vazia e objeto agregado, sem inventar valores', () => {
    expect(validateBlock('clientes', [])).toEqual([]);
    expect(validateBlock('kpis', {})).toEqual({});
    expect(() => validateBlock('kpis', [])).toThrow();
  });
});

describe('apresentacao sem falso zero', () => {
  it.each(['loading', 'idle', 'error'] as const)('estado %s nao renderiza valores antigos nem mensagem de vazio', status => {
    const html = renderToStaticMarkup(createElement(RemoteBlock, { state: { status }, title: 'Teste', retry() {}, empty: true, children: 'VALOR-ANTIGO-999' }));
    expect(html).not.toContain('VALOR-ANTIGO');
    expect(html).not.toContain('Sem registros');
    expect(html).toContain(status === 'error' ? 'Consulta indisponível' : 'Carregando');
  });
  it('vazio so aparece depois de sucesso', () => {
    expect(renderToStaticMarkup(createElement(RemoteBlock, { state: { status: 'success' }, title: 'Teste', empty: true, children: 'antigo' }))).toContain('Sem registros');
  });
  it.each([null, undefined, '', NaN, Infinity])('formata ausencia %j sem zero financeiro', value => {
    expect(fmtMoney(value)).toBe('Indisponível');
    expect(fmtInt(value)).toBe('Indisponível');
  });
  it('mantem zeros verdadeiros', () => {
    expect(fmtMoney(0)).toContain('0,00');
    expect(fmtInt(0)).toBe('0');
  });
});
