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
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMemo, useState, type ReactNode } from 'react';
import { Filters } from '../services/api';
import { chartPeriodLabel, dayLabel, fmtInt, fmtMoney, pivot } from '../utils/format';

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
}: {
  data: Record<string, any[]>;
  rankings?: Record<string, any[]>;
  loading: boolean;
  onFilter: (field: keyof Filters, value: string) => void;
  onClearFilter: (field: keyof Filters, value?: string) => void;
  filters: Filters;
  visible: ChartId[];
}) {
  const [expanded, setExpanded] = useState<{ title: string; rows: any[]; type: 'bar' | 'donut'; field?: keyof Filters } | null>(null);
  const daily = isDailyRange(filters.startDate, filters.endDate);
  const vencimentoTitle = daily
    ? `Evolução diária por vencimento${monthTitle(filters.startDate, filters.endDate)}`
    : 'Evolução mensal por vencimento';

  if (loading) {
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
    faixasVencimento: <Bars title="Títulos em aberto por faixa de vencimento" rows={data.faixasVencimento || []} onExpand={(rows) => setExpanded({ title: 'Faixas de vencimento', rows, type: 'bar' })} />,
    comparativoColigadas: (
      <LineSeries
        title="Comparativo mensal entre empresas"
        rows={pivot(data.comparativoColigadas || [])}
        lines={seriesFromRows(data.comparativoColigadas || [])}
      />
    ),
    encargosMes: (
      <ChartCard title="Juros, multas e descontos por mês">
        <ResponsiveContainer>
          <ComposedChart data={data.encargosMes || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" tickFormatter={chartPeriodLabel} />
            <YAxis tickFormatter={(v) => fmtMoney(v).replace('R$', '')} />
            <Tooltip labelFormatter={chartPeriodLabel} formatter={(v) => fmtMoney(v)} />
            <Legend />
            <Bar dataKey="juros" fill="#1d7afc" />
            <Bar dataKey="multas" fill="#dc2626" />
            <Line dataKey="descontos" stroke="#16a34a" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    ),
    previstoRealizado: (
      <LineSeries
        title="Previsto x realizado"
        rows={data.previstoRealizado || []}
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
      <section className="chart-grid">{visible.map((id) => <div key={id}>{chartMap[id]}</div>)}</section>
      {expanded && (
        <ChartModal
          title={expanded.title}
          rows={expanded.rows}
          type={expanded.type}
          active={expanded.field ? filters[expanded.field] : undefined}
          onClose={() => setExpanded(null)}
          onClick={(value) => expanded.field && onFilter(expanded.field, value)}
        />
      )}
    </>
  );
}

function rankingToChart(rows: any[]) {
  return rows.map((row) => ({ nome: row.nome, valor: row.totalRateio, quantidade: row.quantidade }));
}

function seriesFromRows(rows: any[]): [string, string][] {
  const series = Array.from(new Set(rows.map((row) => row.serie).filter(Boolean)));
  return series.map((name, index) => [String(name), colors[index % colors.length]]);
}

function ChartCard({ title, children, activeLabel, onClear, onExpand, className = '' }: { title: string; children: ReactNode; activeLabel?: string; onClear?: () => void; onExpand?: () => void; className?: string }) {
  return (
    <article className={`chart-card ${className} ${activeLabel ? 'chart-filtering' : ''}`}>
      <div className="chart-card-head">
        <h3>{title}</h3>
        <div className="chart-card-actions">
          {activeLabel && <button className="chart-filter-chip" onClick={onClear} title="Remover este filtro">Filtrando: {activeLabel} <b>x</b></button>}
          {onExpand && <button className="chart-expand-button" onClick={onExpand}>Ver todos</button>}
        </div>
      </div>
      <div className="chart-body">{children}</div>
    </article>
  );
}

function LineSeries({ title, rows, lines, daily = false }: { title: string; rows: any[]; lines: [string, string][]; daily?: boolean }) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer>
        <LineChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" tickFormatter={daily ? dayLabel : chartPeriodLabel} />
          <YAxis tickFormatter={(v) => fmtMoney(v).replace('R$', '')} />
          <Tooltip labelFormatter={chartPeriodLabel} formatter={(v) => fmtMoney(v)} />
          <Legend />
          {lines.map(([key, color]) => <Line key={key} dataKey={key} stroke={color} strokeWidth={2} dot={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function BarSeries({ title, rows, bars }: { title: string; rows: any[]; bars: [string, string][] }) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer>
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" tickFormatter={chartPeriodLabel} />
          <YAxis tickFormatter={(v) => fmtMoney(v).replace('R$', '')} />
          <Tooltip labelFormatter={chartPeriodLabel} formatter={(v) => fmtMoney(v)} />
          <Legend />
          {bars.map(([key, color]) => <Bar key={key} dataKey={key} fill={color} radius={[6, 6, 0, 0]} />)}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function Donut({ title, rows, field, active, onClick, onClear, onExpand }: { title: string; rows: any[]; field: keyof Filters; active: string | string[]; onClick: (value: string) => void; onClear: (field: keyof Filters, value?: string) => void; onExpand?: (rows: any[]) => void }) {
  const total = rows.reduce((sum, row) => sum + Number(row.valor || 0), 0);
  const chartRows = useMemo(() => rows.map((row) => ({ ...row, visualValor: Number(row.valor || 0) || (Number(row.quantidade || 0) > 0 ? Math.max(total * 0.006, 1) : 0) })), [rows, total]);
  const activeValues = normalizeActive(active);
  const activeLabel = activeValues.join(', ');
  return (
    <ChartCard title={title} activeLabel={activeLabel} onClear={() => onClear(field)} onExpand={onExpand ? () => onExpand(rows) : undefined} className="donut-with-summary">
      <div className="donut-layout">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={chartRows} dataKey="visualValor" nameKey="nome" innerRadius={58} outerRadius={92} minAngle={4} onClick={(row: any) => onClick(row.nome)}>
              {chartRows.map((row, index) => {
                const selected = activeValues.includes(row.nome);
                const dimmed = activeValues.length > 0 && !selected;
                return <Cell key={index} fill={colors[index % colors.length]} opacity={dimmed ? 0.28 : 1} stroke={selected ? '#111827' : 'transparent'} strokeWidth={selected ? 3 : 0} />;
              })}
            </Pie>
            <Tooltip formatter={(_value, _name, item: any) => [`${fmtMoney(item.payload.valor)} (${fmtInt(item.payload.quantidade)} títulos, ${((Number(item.payload.valor) / total) * 100 || 0).toFixed(1)}%)`, item.payload.nome]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <Summary rows={rows} activeValues={activeValues} onClick={onClick} />
      </div>
    </ChartCard>
  );
}

function Bars({ title, rows, field, active, limit, onClick, onClear, onExpand }: { title: string; rows: any[]; field?: keyof Filters; active?: string | string[]; limit?: number; onClick?: (value: string) => void; onClear?: (field: keyof Filters, value?: string) => void; onExpand?: (rows: any[]) => void }) {
  const activeValues = normalizeActive(active);
  const activeLabel = activeValues.join(', ');
  const displayRows = limit ? rows.slice(0, limit) : rows;
  return (
    <ChartCard title={title} activeLabel={activeLabel} onClear={field && onClear ? () => onClear(field) : undefined} onExpand={onExpand && rows.length > displayRows.length ? () => onExpand(rows) : undefined}>
      <ResponsiveContainer>
        <BarChart data={displayRows} layout="vertical" margin={{ left: 12, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={(v) => fmtMoney(v).replace('R$', '')} />
          <YAxis type="category" dataKey="nome" width={138} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value, _name, item: any) => [`${fmtMoney(value)} (${fmtInt(item.payload.quantidade || 0)} títulos)`, item.payload.nome]} />
          <Bar dataKey="valor" radius={[0, 8, 8, 0]} onClick={(row: any) => onClick?.(row.nome)}>
            {displayRows.map((row, index) => {
              const selected = activeValues.includes(row.nome);
              const dimmed = activeValues.length > 0 && !selected;
              return <Cell key={row.nome || index} fill={selected ? '#16a34a' : '#1d7afc'} opacity={dimmed ? 0.3 : 1} stroke={selected ? '#064e3b' : 'transparent'} strokeWidth={selected ? 2 : 0} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ChartModal({ title, rows, type, active, onClose, onClick }: { title: string; rows: any[]; type: 'bar' | 'donut'; active?: string | string[]; onClose: () => void; onClick: (value: string) => void }) {
  const activeValues = normalizeActive(active);
  const total = rows.reduce((sum, row) => sum + Number(row.valor || 0), 0);
  const chartRows = rows.map((row) => ({ ...row, visualValor: Number(row.valor || 0) || (Number(row.quantidade || 0) > 0 ? Math.max(total * 0.006, 1) : 0) }));
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <article className="chart-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span className="eyebrow">Visão completa</span>
            <h3>{title}</h3>
          </div>
          <button className="icon-button" onClick={onClose}>×</button>
        </header>
        <div className="chart-modal-layout">
          <div className="chart-modal-plot">
            <ResponsiveContainer>
              {type === 'donut' ? (
                <PieChart>
                  <Pie data={chartRows} dataKey="visualValor" nameKey="nome" innerRadius={96} outerRadius={150} minAngle={4} onClick={(row: any) => onClick(row.nome)}>
                    {chartRows.map((row, index) => <Cell key={row.nome || index} fill={colors[index % colors.length]} opacity={activeValues.length && !activeValues.includes(row.nome) ? 0.28 : 1} />)}
                  </Pie>
                  <Tooltip formatter={(_value, _name, item: any) => [`${fmtMoney(item.payload.valor)} (${fmtInt(item.payload.quantidade || 0)} títulos)`, item.payload.nome]} />
                  <Legend />
                </PieChart>
              ) : (
                <BarChart data={rows} layout="vertical" margin={{ left: 24, right: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => fmtMoney(v).replace('R$', '')} />
                  <YAxis type="category" dataKey="nome" width={220} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value, _name, item: any) => [`${fmtMoney(value)} (${fmtInt(item.payload.quantidade || 0)} títulos)`, item.payload.nome]} />
                  <Bar dataKey="valor" radius={[0, 8, 8, 0]} onClick={(row: any) => onClick(row.nome)}>
                    {rows.map((row, index) => <Cell key={row.nome || index} fill={activeValues.includes(row.nome) ? '#16a34a' : colors[index % colors.length]} opacity={activeValues.length && !activeValues.includes(row.nome) ? 0.35 : 1} />)}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          <Summary rows={rows} activeValues={activeValues} onClick={onClick} />
        </div>
      </article>
    </div>
  );
}

function Summary({ rows, activeValues, onClick }: { rows: any[]; activeValues: string[]; onClick: (value: string) => void }) {
  return (
    <aside className="chart-summary">
      <strong>Resumo</strong>
      {rows.map((row, index) => (
        <button key={row.nome || index} onClick={() => onClick(row.nome)} className={activeValues.includes(row.nome) ? 'active' : ''}>
          <i style={{ background: colors[index % colors.length] }} />
          <span>{row.nome}</span>
          <b>{fmtMoney(row.valor)}</b>
          <small>{fmtInt(row.quantidade || 0)} títulos</small>
        </button>
      ))}
    </aside>
  );
}

function normalizeActive(active?: string | string[]) {
  if (!active) return [];
  if (Array.isArray(active)) return active.filter(Boolean);
  if (active === 'Todas' || active === 'Todos') return [];
  return [active];
}

function Heatmap({ rows }: { rows: any[] }) {
  const years = Array.from(new Set(rows.map((row) => row.ano))).sort();
  const max = Math.max(...rows.map((row) => Number(row.valor || 0)), 1);
  return (
    <article className="chart-card heatmap-card">
      <h3>Matriz de calor por mês</h3>
      <p className="chart-subtitle">Compare a concentração de valores por ano e mês. Tons mais intensos indicam meses com maior volume financeiro dentro da base filtrada.</p>
      <div className="heatmap">
        <span />
        {months.map((month) => <b key={month}>{month}</b>)}
        {years.map((year) => [
          <b key={`${year}-label`}>{year}</b>,
          ...Array.from({ length: 12 }, (_, i) => {
            const row = rows.find((item) => item.ano === year && item.mes === i + 1);
            const value = Number(row?.valor || 0);
            return <span key={`${year}-${i}`} style={{ opacity: 0.25 + (value / max) * 0.75 }} title={`${year}/${months[i]}: ${fmtMoney(value)}`}>{value ? ' ' : '—'}</span>;
          }),
        ])}
      </div>
    </article>
  );
}

function isDailyRange(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return false;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const days = (end.getTime() - start.getTime()) / 86400000;
  return days >= 0 && days <= 31;
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
