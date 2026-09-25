import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { finiteValue, largestValue, positiveBaseRatio, qualitySummary } from '../src/utils/analytics';
import { fmtPercent } from '../src/utils/format';
import { KpiCards, kpiRegistry } from '../src/components/KpiCards';

describe('semantica e apresentacao de indicadores', () => {
  it.each([null, undefined, '', ' ', NaN, Infinity, -Infinity, true, {}, []])('nao transforma ausencia/invalido %j em zero', value => {
    expect(finiteValue(value)).toBeNull();
    expect(fmtPercent(value)).toBe('Indisponível');
  });
  it('distingue zero real e razao sem base; nao esconde excesso ou estorno', () => {
    expect(positiveBaseRatio(0, 100)).toBe(0);
    expect(fmtPercent(0)).toBe('0,0%');
    expect(positiveBaseRatio(50, 100)).toBe(0.5);
    expect(positiveBaseRatio(120, 100)).toBe(1.2);
    expect(positiveBaseRatio(-10, 100)).toBe(-0.1);
    for (const base of [0, -1, null, undefined, '']) expect(positiveBaseRatio(10, base)).toBeNull();
    expect(positiveBaseRatio(null, 100)).toBeNull();
    expect(positiveBaseRatio(Number.MAX_VALUE, Number.MIN_VALUE)).toBeNull();
  });
  it('maior volume independe da ordem alfabetica sem alterar a serie', () => {
    const rows = [{ nome: 'A', valor: 10 }, { nome: 'B', valor: 200 }, { nome: 'C', valor: null }];
    expect(largestValue(rows)).toBe(rows[1]);
    expect(rows[0].nome).toBe('A');
    expect(largestValue([])).toBeUndefined();
    expect(largestValue([{ valor: -5 }, { valor: -2 }])?.valor).toBe(-2);
  });
  it('alertas sobrepostos sao ocorrencias, nao pessoas/registros unicos', () => {
    const rows = [
      { severidade: 'Crítico', quantidade: 2, registrosAfetados: 2 },
      { severidade: 'Atenção', quantidade: 2, registrosAfetados: 2 },
    ];
    expect(qualitySummary(rows)).toEqual({ total: 4, critico: 2, atencao: 2, informativo: 0 });
    expect(qualitySummary(rows)).not.toHaveProperty('percentualBase');
    expect(qualitySummary(rows)).not.toHaveProperty('registrosAfetados');
  });
  it('cards nao prometem identidades unicas ou saldo bancario', () => {
    expect(kpiRegistry.quantidadeTitulos[0]).toBe('Registros na consulta');
    expect(kpiRegistry.ticketMedio[0]).toBe('Rateio médio por registro');
    expect(kpiRegistry.clientesUnicos[0]).toBe('Nomes de contraparte');
    expect(kpiRegistry.saldoLiquido[3]).toContain('Não representa saldo bancário');
  });
  it('renderiza zero verdadeiro, media fracionaria e ausencia separadamente', () => {
    const render = (data: Record<string, unknown>) => renderToStaticMarkup(createElement(KpiCards, {
      data, loading: false, keys: ['quantidadeTitulos', 'mediaDiasAtraso', 'percentualBaixado'],
    }));
    const html = render({ quantidadeTitulos: 0, mediaDiasAtraso: 1.5, percentualBaixado: null });
    expect(html).toContain('>0</strong>');
    expect(html).toContain('1,5 dias');
    expect(html).toContain('Indisponível');
    expect(render({}).match(/>Indisponível</g)).toHaveLength(3);
  });
});

describe('oraculos sinteticos de limites da origem, nao conciliacao RM', () => {
  it('dois rateios de um titulo nao equivalem a dois titulos ou duas baixas', () => {
    // Four-decimal units and a deliberately repeated title-level payment.
    const rows = [{ title: 'T1', rateio: 6000000n, baixa: 4000000n }, { title: 'T1', rateio: 4000000n, baixa: 4000000n }];
    expect(rows.length).toBe(2);
    expect(new Set(rows.map(row => row.title)).size).toBe(1);
    expect(rows.reduce((sum, row) => sum + row.rateio, 0n)).toBe(10000000n);
    expect(rows.reduce((sum, row) => sum + row.baixa, 0n)).toBe(8000000n);
    const actualPayment = 4000000n;
    expect(10000000n - actualPayment).toBe(6000000n);
    expect(10000000n - rows.reduce((sum, row) => sum + row.baixa, 0n)).not.toBe(6000000n);
  });
});
