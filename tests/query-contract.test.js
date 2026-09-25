import { parse } from 'node:querystring';
import { describe, expect, it, vi } from 'vitest';
import { buildFilters, readMultiFilter } from '../server/utils/queryBuilder.js';
import { ORDER_FIELDS, titulosOrder } from '../server/sql/titulosBase.js';
import { readPagination } from '../server/utils/pagination.js';

describe('contrato de filtros multiplos', () => {
  it.each(['clientes', 'centrosCusto', 'naturezas', 'tiposDocumento', 'contas', 'origens'])('preserva valores inteiros em %s', key => {
    const values = ['Silva, Souza & Cia', 'A+B / 50%', ' nome com espacos ', '[matriz]'];
    const query = new URLSearchParams();
    values.forEach(value => query.append(`${key}[]`, value));
    expect(readMultiFilter(parse(query.toString()), key)).toEqual(values);
    expect(readMultiFilter(parse(new URLSearchParams([[`${key}[]`, values[0]]]).toString()), key)).toEqual([values[0]]);
  });
  it('mantem compatibilidade com listas antigas mas recusa formatos misturados', () => {
    expect(readMultiFilter({ clientes: 'A, B' }, 'clientes')).toEqual(['A', 'B']);
    expect(readMultiFilter({ clientes: ['A,B', 'C'] }, 'clientes')).toEqual(['A,B', 'C']);
    expect(() => readMultiFilter({ clientes: 'A', 'clientes[]': 'B' }, 'clientes')).toThrow();
    expect(() => readMultiFilter({ 'clientes[]': {} }, 'clientes')).toThrow();
  });
  it('nao inclui valores no SQL nem trata virgulas como separador canonico', () => {
    const input = vi.fn();
    const value = "Nome, ' OR 1=1 --";
    const sql = buildFilters({ 'clientes[]': value, 'contas[]': ['A, B', 'C'] }, { input });
    expect(input.mock.calls.map(call => call[2])).toEqual([value, 'A, B', 'C']);
    expect(sql).toContain('CLIFOR IN (@f0)');
    expect(sql).not.toContain(value);
  });
});

describe('ordenacao compartilhada', () => {
  it.each(Object.keys(ORDER_FIELDS))('aceita %s e usa desempate sem repetir campo', sortBy => {
    const order = titulosOrder({ sortBy, sortDir: 'ASC' });
    expect(order.startsWith(`${ORDER_FIELDS[sortBy]} ASC`)).toBe(true);
    const columns = order.split(', ').map(item => item.split(' ')[0]);
    expect(new Set(columns).size).toBe(columns.length);
    expect(columns).toContain('CODCOLIGADA');
    expect(columns).toContain('REF');
  });
  it.each(['toString', '__proto__', 'VLRRATEIO; DROP TABLE x'])('nao interpola campo desconhecido %s', sortBy => {
    expect(titulosOrder({ sortBy, sortDir: 'ASC;--' })).toBe(titulosOrder({}));
  });
});

describe('paginacao limitada e inteira', () => {
  it('usa padrao e calcula offset', () => {
    expect(readPagination({})).toEqual({ page: 1, pageSize: 25, offset: 0 });
    expect(readPagination({ page: '3', pageSize: '100' })).toEqual({ page: 3, pageSize: 100, offset: 200 });
  });
  it.each(['0', '-1', '1.5', '1e2', 'NaN', 'Infinity', '', '01', '999999999999999999', ['1', '2']])('rejeita pagina invalida %j', page => {
    expect(() => readPagination({ page })).toThrow();
  });
  it.each(['0', '9', '101', '25.5', 'abc'])('rejeita tamanho invalido %s', pageSize => {
    expect(() => readPagination({ pageSize })).toThrow();
  });
  it('aceita o maior offset inteiro SQL suportado e recusa o seguinte', () => {
    const maxPage = Math.floor(2147483647 / 100) + 1;
    expect(readPagination({ page: String(maxPage), pageSize: '100' }).offset).toBeLessThanOrEqual(2147483647);
    expect(() => readPagination({ page: String(maxPage + 1), pageSize: '100' })).toThrow();
  });
});
