import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Expand, Filter, Table2, X } from 'lucide-react';
import { Filters } from '../services/api';
import { chartPeriodLabel, dayLabel, fmtInt, fmtMoney, pivot } from '../utils/format';
import { RemoteBlock } from './RemoteBlock';
import { ExpandablePanel } from './ExpandablePanel';
import { chartEndpoint, type BlockState } from '../hooks/dashboardState';
import { breakPeriodGaps, canUsePie, categoryRows, heatmapCells, seriesValue } from '../utils/chartData';
import { calendarDaySpan } from '../../server/utils/dateFilters.js';

const colors = ['#1d7afc', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0f766e', '#be185d', '#64748b'];
const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export type ChartId =
  | 'evolucaoVencimento'
  | 'evolucaoBaixa'
  | 'pagarReceber'
  | 'status'
  | 'coligadas'
  | 'topClientes'
  | 'contas'
  | 'tiposDocumento'
  | 'origens'
  | 'faixasVencimento'
  | 'comparativoColigadas'
  | 'encargosMes'
  | 'previstoRealizado'
  | 'matrizCalor'
  | 'rankCentros'
  | 'rankNaturezas';

export function Charts({
  data,
  rankings = {},
  loading,
  onFilter,
  onClearFilter,
  filters,
  visible,
  blocks, retry,
}: {
  data: Record<string, any[]>;
  rankings?: Record<string, any[]>;
  loading: boolean;
  onFilter: (field: keyof Filters, value: string) => void;
  onClearFilter: (field: keyof Filters, value?: string) => void;
  filters: Filters;
  visible: ChartId[];
  blocks?: Record<string, BlockState>; retry?: (key: string) => void;
}) {
  type Expanded = { title: string; rows: any[]; type: 'bar' | 'donut'; field?: keyof Filters };
  const [expanded, storeExpanded] = useState<(Expanded & { source: typeof data }) | null>(null);
  const setExpanded = (value: Expanded | null) => storeExpanded(value ? { ...value, source: data } : null);
  const daily = isDailyRange(filters.startDate, filters.endDate);
  const vencimentoTitle = daily
    ? `Evolução diária por vencimento${monthTitle(filters.startDate, filters.endDate)}`
    : 'Evolução mensal por vencimento';

  if (loading && !blocks) {
    return <section className="chart-grid">{visible.map((id) => <div className="chart-card loading" key={id} />)}</section>;
  }

  const chartMap: Record<ChartId, ReactNode> = {
    evolucaoVencimento: (
      <LineSeries
        title={vencimentoTitle}
        rows={pivot(data.evolucaoVencimento || [])}
        daily={daily}
        lines={[
          ['A Pagar', '#dc2626'],
          ['A Receber', '#16a34a'],
        ]}
      />
    ),
    evolucaoBaixa: (
      <BarSeries
        title="Evolução mensal por baixa"
        rows={pivot(data.evolucaoBaixa || [])}
        bars={[
          ['Baixado', '#16a34a'],
          ['Em Aberto', '#f59e0b'],
          ['Baixado Parcialmente', '#1d7afc'],
        ]}
      />
    ),
    pagarReceber: <Donut title="A pagar x A receber" rows={data.pagarReceber || []} field="tipo" active={filters.tipo} onClick={(value) => onFilter('tipo', value)} onClear={onClearFilter} onExpand={(rows) => setExpanded({ title: 'A pagar x A receber', rows, type: 'donut', field: 'tipo' })} />,
    status: <Donut title="Status financeiro" rows={data.status || []} field="statusFin" active={filters.statusFin} onClick={(value) => onFilter('statusFin', value)} onClear={onClearFilter} onExpand={(rows) => setExpanded({ title: 'Status financeiro', rows, type: 'donut', field: 'statusFin' })} />,
    coligadas: <Bars title="Valor por empresa" rows={data.coligadas || []} field="coligada" active={filters.coligada} onClick={(value) => onFilter('coligada', value)} onClear={onClearFilter} onExpand={(rows) => setExpanded({ title: 'Valor por empresa', rows, type: 'bar', field: 'coligada' })} />,
    topClientes: <Bars title="Top 10 clientes/fornecedores" rows={data.topClientes || []} limit={10} field="clientes" active={filters.clientes} onClick={(value) => onFilter('clientes', value)} onClear={onClearFilter} onExpand={(rows) => setExpanded({ title: 'Clientes/fornecedores - todos os dados', rows, type: 'bar', field: 'clientes' })} />,
    contas: <Bars title="Ranking por conta financeira" rows={data.contas || []} limit={10} field="contas" active={filters.contas} onClick={(value) => onFilter('contas', value)} onClear={onClearFilter} onExpand={(rows) => setExpanded({ title: 'Contas financeiras - todos os dados', rows, type: 'bar', field: 'contas' })} />,
    tiposDocumento: <Bars title="Ranking por tipo de documento" rows={data.tiposDocumento || []} limit={10} field="tiposDocumento" active={filters.tiposDocumento} onClick={(value) => onFilter('tiposDocumento', value)} onClear={onClearFilter} onExpand={(rows) => setExpanded({ title: 'Tipos de documento - todos os dados', rows, type: 'bar', field: 'tiposDocumento' })} />,
    origens: <Bars title="Ranking por origem" rows={data.origens || []} limit={10} field="origens" active={filters.origens} onClick={(value) => onFilter('origens', value)} onClear={onClearFilter} onExpand={(rows) => setExpanded({ title: 'Origens - todos os dados', rows, type: 'bar', field: 'origens' })} />,
    faixasVencimento: <Bars title="Rateio em aberto por faixa de vencimento" rows={data.faixasVencimento || []} onExpand={(rows) => setExpanded({ title: 'Faixas de vencimento', rows, type: 'bar' })} />,
    comparativoColigadas: (
      <LineSeries
        title="Comparativo mensal entre empresas"
        rows={pivot(data.comparativoColigadas || [])}
        lines={seriesFromRows(data.comparativoColigadas || [])}
      />
    ),
    encargosMes: (
      <ChartCard title="Juros, multas e descontos por mês" values={<SeriesValues title="Juros, multas e descontos por mês" rows={breakPeriodGaps(data.encargosMes || [])} keys={['juros', 'multas', 'descontos']} />}>
        <ResponsiveContainer>
          <ComposedChart data={breakPeriodGaps(data.encargosMes || [])}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" tickFormatter={chartPeriodLabel} />
            <YAxis tickFormatter={(v) => fmtMoney(v).replace('R$', '')} />
            <Tooltip labelFormatter={chartPeriodLabel} formatter={(v) => fmtMoney(v)} />
            <Legend />
            <ReferenceLine y={0} stroke="var(--muted)" />
            <Bar dataKey={row => seriesValue(row, 'juros')} name="Juros" fill="#1d7afc" />
            <Bar dataKey={row => seriesValue(row, 'multas')} name="Multas" fill="#dc2626" />
            <Line dataKey={row => seriesValue(row, 'descontos')} name="Descontos" connectNulls={false} stroke="#16a34a" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    ),
    previstoRealizado: (
      <LineSeries
        title="Rateio por vencimento x baixa por data de baixa"
        rows={data.previstoRealizado || []}
        labels={{ previsto: 'Rateio por vencimento', realizado: 'Baixa por data de baixa' }}
        lines={[
          ['previsto', '#f59e0b'],
          ['realizado', '#16a34a'],
        ]}
      />
    ),
    matrizCalor: <Heatmap rows={data.matrizCalor || []} />,
    rankCentros: <Bars title="Top centros de custo" rows={rankingToChart(rankings.centros || [])} limit={10} field="centrosCusto" active={filters.centrosCusto} onClick={(value) => onFilter('centrosCusto', value)} onClear={onClearFilter} onExpand={(rows) => setExpanded({ title: 'Centros de custo - todos os dados', rows, type: 'bar', field: 'centrosCusto' })} />,
    rankNaturezas: <Bars title="Top naturezas financeiras" rows={rankingToChart(rankings.naturezas || [])} limit={10} field="naturezas" active={filters.naturezas} onClick={(value) => onFilter('naturezas', value)} onClear={onClearFilter} onExpand={(rows) => setExpanded({ title: 'Naturezas financeiras - todos os dados', rows, type: 'bar', field: 'naturezas' })} />,
  };

  return (
    <>
      <section className="chart-grid">{visible.map((id) => {
        const key = chartEndpoint(id);
        const state = blocks?.[key];
        const rows = id === 'rankCentros' ? rankings.centros : id === 'rankNaturezas' ? rankings.naturezas : data[id];
        const title = chartTitles[id];
        const unavailable = state && (state.status !== 'success' || !rows?.length);
        return <div key={id} data-block={key}>{unavailable
          ? <ChartCard title={title}><RemoteBlock state={state} title={title} retry={() => retry?.(key)} empty={!rows?.length}>{null}</RemoteBlock></ChartCard>
          : chartMap[id]}</div>;
      })}</section>
      {expanded && expanded.source === data && (
        <ChartModal
          title={expanded.title}
          rows={expanded.rows}
          type={expanded.type}
          active={expanded.field ? filters[expanded.field] : undefined}
          onClose={() => setExpanded(null)}
          onClick={expanded.field ? (value) => onFilter(expanded.field!, value) : undefined}
        />
      )}
    </>
  );
}

const chartTitles: Record<ChartId, string> = {
  evolucaoVencimento: 'Evolução por vencimento', evolucaoBaixa: 'Evolução por baixa', pagarReceber: 'A pagar x A receber',
  status: 'Status financeiro', coligadas: 'Valor por empresa', topClientes: 'Clientes/fornecedores', contas: 'Contas',
  tiposDocumento: 'Tipos de documento', origens: 'Origens', faixasVencimento: 'Faixas de vencimento',
  comparativoColigadas: 'Comparativo entre empresas', encargosMes: 'Juros, multas e descontos', previstoRealizado: 'Rateio por vencimento x baixa por data de baixa',
  matrizCalor: 'Matriz mensal', rankCentros: 'Centros de custo', rankNaturezas: 'Naturezas financeiras',
};

function rankingToChart(rows: any[]) {
  return rows.map((row) => ({ nome: row.nome, valor: row.totalRateio, quantidade: row.quantidade }));
}

function seriesFromRows(rows: any[]): [string, string][] {
  const series = Array.from(new Set(rows.map((row) => row.serie).filter(Boolean)));
  return series.map((name, index) => [String(name), colors[index % colors.length]]);
}

function ChartCard({ title, children, values, activeLabel, onClear, onExpand, className = '' }: { title: string; children: ReactNode; values?: ReactNode; activeLabel?: string; onClear?: () => void; onExpand?: () => void; className?: string }) {
  return (
    <ExpandablePanel title={title} className={`chart-card ${className} ${activeLabel ? 'chart-filtering' : ''}`}>
      <div className="chart-card-head">
        <h3>{title}</h3>
        <div className="chart-card-actions">
          {activeLabel && <button className="chart-filter-chip" onClick={onClear} title="Remover este filtro">Filtrando: {activeLabel} <X size={14} aria-hidden="true" /></button>}
          {onExpand && <button className="chart-expand-button" onClick={onExpand} title="Ampliar dados retornados"><Expand size={14} aria-hidden="true" />Ver todos</button>}
        </div>
      </div>
      <div className="chart-body">{children}</div>
      {values}
    </ExpandablePanel>
  );
}

function LineSeries({ title, rows, lines, daily = false, labels = {} }: { title: string; rows: any[]; lines: [string, string][]; daily?: boolean; labels?: Record<string, string> }) {
  const chartRows = breakPeriodGaps(rows);
  return (
    <ChartCard title={title} values={<SeriesValues title={title} rows={chartRows} keys={lines.map(([key]) => key)} labels={labels} />}>
      <ResponsiveContainer>
        <LineChart data={chartRows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" tickFormatter={daily ? dayLabel : chartPeriodLabel} />
          <YAxis tickFormatter={(v) => fmtMoney(v).replace('R$', '')} />
          <Tooltip labelFormatter={chartPeriodLabel} formatter={(v) => fmtMoney(v)} />
          <Legend />
          <ReferenceLine y={0} stroke="var(--muted)" />
          {lines.map(([key, color]) => <Line key={key} name={seriesLabel(key, labels)} dataKey={row => seriesValue(row, key)} stroke={color} strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function BarSeries({ title, rows, bars }: { title: string; rows: any[]; bars: [string, string][] }) {
  const chartRows = breakPeriodGaps(rows);
  return (
    <ChartCard title={title} values={<SeriesValues title={title} rows={chartRows} keys={bars.map(([key]) => key)} />}>
      <ResponsiveContainer>
        <BarChart data={chartRows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" tickFormatter={chartPeriodLabel} />
          <YAxis tickFormatter={(v) => fmtMoney(v).replace('R$', '')} />
          <Tooltip labelFormatter={chartPeriodLabel} formatter={(v) => fmtMoney(v)} />
          <Legend />
          <ReferenceLine y={0} stroke="var(--muted)" />
          {bars.map(([key, color]) => <Bar key={key} name={seriesLabel(key)} dataKey={row => seriesValue(row, key)} fill={color} />)}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function Donut({ title, rows, field, active, onClick, onClear, onExpand }: { title: string; rows: any[]; field: keyof Filters; active: string | string[]; onClick: (value: string) => void; onClear: (field: keyof Filters, value?: string) => void; onExpand?: (rows: any[]) => void }) {
  const chartRows = categoryRows(rows);
  const activeValues = normalizeActive(active);
  const activeLabel = activeValues.join(', ');
  return (
    <ChartCard title={title} activeLabel={activeLabel} onClear={() => onClear(field)} onExpand={onExpand ? () => onExpand(rows) : undefined} className="donut-with-summary" values={<CategoryValues title={title} rows={chartRows} activeValues={activeValues} onClick={onClick} />}>
      <div className="donut-layout">
        <CategoryPlot rows={chartRows} type="donut" activeValues={activeValues} onClick={onClick} />
        <Summary rows={chartRows} activeValues={activeValues} onClick={onClick} />
      </div>
    </ChartCard>
  );
}

function Bars({ title, rows, field, active, limit, onClick, onClear, onExpand }: { title: string; rows: any[]; field?: keyof Filters; active?: string | string[]; limit?: number; onClick?: (value: string) => void; onClear?: (field: keyof Filters, value?: string) => void; onExpand?: (rows: any[]) => void }) {
  const activeValues = normalizeActive(active);
  const activeLabel = activeValues.join(', ');
  const chartRows = categoryRows(rows);
  const displayRows = limit ? chartRows.slice(0, limit) : chartRows;
  return (
    <ChartCard title={title} activeLabel={activeLabel} onClear={field && onClear ? () => onClear(field) : undefined} onExpand={onExpand && rows.length > displayRows.length ? () => onExpand(rows) : undefined} values={<CategoryValues title={title} rows={chartRows} activeValues={activeValues} onClick={onClick} />}>
      <CategoryPlot rows={displayRows} type="bar" activeValues={activeValues} onClick={onClick} />
    </ChartCard>
  );
}

function ChartModal({ title, rows, type, active, onClose, onClick }: { title: string; rows: any[]; type: 'bar' | 'donut'; active?: string | string[]; onClose: () => void; onClick?: (value: string) => void }) {
  const activeValues = normalizeActive(active);
  const chartRows = categoryRows(rows);
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useId();
  useEffect(() => {
    const element = ref.current!;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal();
    return () => { element.close(); if (opener?.isConnected) opener.focus(); };
  }, []);
  return (
      <dialog ref={ref} className="chart-modal" aria-labelledby={heading} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const items = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex="0"], summary')].filter(item => item.getClientRects().length);
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
        <header>
          <div>
            <span className="eyebrow">Dados retornados</span>
            <h3 id={heading}>{title.replace('todos os dados', 'dados retornados')}</h3>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar gráfico" title="Fechar gráfico" autoFocus><X size={20} /></button>
        </header>
        <div className="chart-modal-layout" tabIndex={0} role="region" aria-label="Valores do gráfico">
          <div className="chart-modal-plot">
            <CategoryPlot rows={chartRows} type={type} activeValues={activeValues} onClick={onClick} />
          </div>
          <Summary rows={chartRows} activeValues={activeValues} onClick={onClick} />
        </div>
      </dialog>
  );
}

function Summary({ rows, activeValues, onClick }: { rows: any[]; activeValues: string[]; onClick?: (value: string) => void }) {
  return (
    <aside className="chart-summary">
      <strong>Resumo</strong>
      {rows.map((row, index) => {
        const content = <>
          <i style={{ background: colors[index % colors.length] }} />
          <span>{row.nome}</span>
          <b>{fmtMoney(row.valor)}</b>
          <small>{fmtInt(row.quantidade)} registros</small>
        </>;
        return onClick && row.filterValue
          ? <button key={index} aria-pressed={activeValues.includes(row.nome)} onClick={() => onClick(row.filterValue)} className={activeValues.includes(row.nome) ? 'active' : ''}>{content}</button>
          : <div className="summary-item" key={index}>{content}</div>;
      })}
    </aside>
  );
}

function normalizeActive(active?: string | string[]) {
  if (!active) return [];
  if (Array.isArray(active)) return active.filter(Boolean);
  if (active === 'Todas' || active === 'Todos') return [];
  return [active];
}

function CategoryPlot({ rows, type, activeValues, onClick }: { rows: ReturnType<typeof categoryRows>; type: 'bar' | 'donut'; activeValues: string[]; onClick?: (value: string) => void }) {
  if (rows.length && !rows.some(row => row.valor !== null && row.valor !== 0)) {
    const message = rows.every(row => row.valor === null) ? 'Valores indisponíveis'
      : rows.every(row => row.valor === 0) ? 'Valores zerados' : 'Valores disponíveis zerados';
    return <div className="chart-zero" role="status">{message}</div>;
  }
  const cells = rows.map((row, index) => <Cell key={index} fill={colors[index % colors.length]} opacity={activeValues.length && !activeValues.includes(row.nome) ? 0.3 : 1} />);
  const select = (row: any) => { if (row.filterValue) onClick?.(row.filterValue); };
  return <ResponsiveContainer>
    {type === 'donut' && canUsePie(rows) ? <PieChart>
      <Pie data={rows} dataKey="valor" nameKey="nome" innerRadius="48%" outerRadius="75%" minAngle={0} isAnimationActive={false} onClick={select}>{cells}</Pie>
      <Tooltip formatter={(_value, _name, item: any) => [fmtMoney(item.payload.valor), item.payload.nome]} />
    </PieChart> : <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 16 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis type="number" tickFormatter={value => fmtMoney(value).replace('R$', '')} />
      <YAxis type="category" dataKey="nome" width={100} tick={{ fontSize: 11 }} />
      <ReferenceLine x={0} stroke="var(--muted)" />
      <Tooltip formatter={(value, _name, item: any) => [`${fmtMoney(value)} (${fmtInt(item.payload.quantidade)} registros)`, item.payload.nome]} />
      <Bar dataKey="valor" onClick={select}>{cells}</Bar>
    </BarChart>}
  </ResponsiveContainer>;
}

function ValuesTable({ title, headers, rows }: { title: string; headers: string[]; rows: ReactNode[][] }) {
  return <details className="chart-values">
    <summary><Table2 size={16} aria-hidden="true" />Ver valores</summary>
    <div className="chart-values-scroll" tabIndex={0} role="region" aria-label={`Valores: ${title}`}>
      <table><caption>{title} · dados retornados</caption>
        <thead><tr>{headers.map(header => <th scope="col" key={header}>{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, col) => col === 0 ? <th scope="row" key={col}>{cell}</th> : <td key={col}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  </details>;
}

function CategoryValues({ title, rows, activeValues, onClick }: { title: string; rows: ReturnType<typeof categoryRows>; activeValues: string[]; onClick?: (value: string) => void }) {
  return <ValuesTable title={title} headers={['Categoria', 'Valor', 'Registros', ...(onClick ? ['Filtro'] : [])]} rows={rows.map(row => [row.nome, fmtMoney(row.valor), fmtInt(row.quantidade), ...(onClick ? [row.filterValue ? <button className="icon-button" aria-label={`Filtrar por ${row.nome}`} title={`Filtrar por ${row.nome}`} aria-pressed={activeValues.includes(row.nome)} onClick={() => onClick(row.filterValue)}><Filter size={16} /></button> : null] : [])])} />;
}

function seriesLabel(key: string, labels: Record<string, string> = {}) {
  return Object.prototype.hasOwnProperty.call(labels, key) ? labels[key] : key;
}

function SeriesValues({ title, rows, keys, labels = {} }: { title: string; rows: any[]; keys: string[]; labels?: Record<string, string> }) {
  return <ValuesTable title={title} headers={['Período', ...keys.map(key => seriesLabel(key, labels))]} rows={rows.map(row => [row.gap ? `${chartPeriodLabel(row.mes)}: início de lacuna` : chartPeriodLabel(row.mes), ...keys.map(key => fmtMoney(seriesValue(row, key)))])} />;
}

function Heatmap({ rows }: { rows: any[] }) {
  const cells = heatmapCells(rows);
  const years = Array.from(new Set(cells.map(row => row.ano)));
  const max = cells.reduce((max, row) => Math.max(max, Math.abs(row.valor ?? 0)), 0);
  return (
    <ExpandablePanel title="Matriz de calor por mês" className="chart-card heatmap-card">
      <h3>Matriz de calor por mês</h3>
      <div className="heatmap">
        <span />
        {months.map((month) => <b key={month}>{month}</b>)}
        {years.map((year) => [
          <b key={`${year}-label`}>{year}</b>,
          ...Array.from({ length: 12 }, (_, i) => {
            const value = cells.find(item => item.ano === year && item.mes === i + 1)!.valor;
            const state = value === null ? 'missing' : value === 0 ? 'zero' : value < 0 ? 'negative' : 'positive';
            return <span key={`${year}-${i}`} data-value-state={state} style={{ backgroundColor: value ? `rgb(${value < 0 ? '220 38 38' : '29 122 252'} / ${0.15 + Math.abs(value) / max * 0.7})` : undefined }} title={`${year}/${months[i]}: ${fmtMoney(value)}`} aria-label={`${year}/${months[i]}: ${fmtMoney(value)}`}>{value === null ? '—' : value === 0 ? '0' : value < 0 ? '−' : '+'}</span>;
          }),
        ])}
      </div>
      <ValuesTable title="Matriz de calor por mês" headers={['Período', 'Valor']} rows={cells.map(row => [`${months[row.mes - 1]}/${row.ano}`, fmtMoney(row.valor)])} />
    </ExpandablePanel>
  );
}

function isDailyRange(startDate?: string, endDate?: string) {
  const days = calendarDaySpan(startDate, endDate);
  return days !== null && days >= 0 && days <= 31;
}

function monthTitle(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return '';
  const [startYear, startMonth] = startDate.split('-');
  const [endYear, endMonth] = endDate.split('-');
  if (startYear === endYear && startMonth === endMonth) {
    const label = chartPeriodLabel(`${startYear}-${startMonth}`);
    return ` - ${label}`;
  }
  return ` - ${chartPeriodLabel(startDate)} a ${chartPeriodLabel(endDate)}`;
}
