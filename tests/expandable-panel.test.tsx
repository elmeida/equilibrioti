import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ExpandablePanel } from '../src/components/ExpandablePanel';
import { DataTables, type TableMode } from '../src/components/DataTables';
import { Charts } from '../src/components/Charts';
import { defaultFilters } from '../src/services/api';

describe('expandable data panels', () => {
  it('starts inline with a named expansion control and no open dialog', () => {
    const html = renderToStaticMarkup(<ExpandablePanel title="Painel QA" className="table-card"><p>Conteudo</p></ExpandablePanel>);
    expect(html).toContain('aria-label="Ampliar Painel QA"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('Ver em tela cheia');
    expect(html).not.toContain('<dialog');
    expect(html.match(/<p>Conteudo<\/p>/g)).toHaveLength(1);
  });

  it('renders up to the announced 50 ranking rows, not only 20', () => {
    const rows = Array.from({ length: 55 }, (_, index) => ({ nome: `ROW_${index + 1}_END`, quantidade: 1, totalRateio: 1 }));
    const html = renderToStaticMarkup(<DataTables filters={defaultFilters} rankings={{ clientes: rows }} vencidos={[]} inconsistencias={[]} mode="rankings" />);
    expect(html).toContain('ROW_50_END');
    expect(html).not.toContain('ROW_51_END');
    expect(html).toContain('ranking-details-grid');
    expect(html.match(/aria-label="Ampliar Ranking/g)).toHaveLength(6);
  });

  it.each<TableMode>(['analitica', 'vencidos', 'inconsistencias', 'pagarReceber'])('supports the %s table', mode => {
    const html = renderToStaticMarkup(<DataTables filters={defaultFilters} rankings={{}} vencidos={[]} inconsistencias={[]} mode={mode} />);
    expect(html).toContain('aria-label="Ampliar ');
  });

  it('offers expansion for series, distribution and heatmap', () => {
    const html = renderToStaticMarkup(<Charts visible={['evolucaoVencimento', 'pagarReceber', 'matrizCalor']} data={{}} loading={false} filters={defaultFilters} onFilter={() => {}} onClearFilter={() => {}} />);
    expect(html.match(/aria-label="Ampliar /g)).toHaveLength(3);
    expect(html).toContain('Ampliar Matriz de calor por mês');
  });
});
