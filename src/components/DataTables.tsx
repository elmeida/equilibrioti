import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Download, FileWarning, Search, Settings2 } from 'lucide-react';
import { apiGet, exportUrl, Filters } from '../services/api';
import { fmtDate, fmtInt, fmtMoney, fmtPercent, safe } from '../utils/format';

type TableResponse = { total: number; page: number; pageSize: number; rows: any[] };
export type TableMode = 'analitica' | 'rankings' | 'vencidos' | 'inconsistencias' | 'pagarReceber';

const columns = ['EMPRESA', 'REF', 'CODCFO', 'CLIFOR', 'NUMERODOC', 'PAGREC', 'STATUS_FIN', 'STATUS_BAIXA', 'DTVENC', 'DTEMISSAO', 'DTBAIXA', 'TIPODOC', 'CCUSTO', 'NATFINANCEIRA', 'VLRRATEIO', 'VLRBAIXA', 'VLRORIGINAL', 'VLRDESCONTO', 'VLRJUROS', 'VLRMULTA', 'CONTA'];
const moneyCols = new Set(['VLRRATEIO', 'VLRBAIXA', 'VLRORIGINAL', 'VLRDESCONTO', 'VLRJUROS', 'VLRMULTA', 'totalRateio', 'totalBaixa', 'totalAberto', 'totalVencido', 'ticketMedio']);
const dateCols = new Set(['DTVENC', 'DTEMISSAO', 'DTBAIXA']);

export function DataTables({
  filters,
  rankings,
  chartRankings = {},
  vencidos,
  inconsistencias,
  mode,
}: {
  filters: Filters;
  rankings: Record<string, any[]>;
  chartRankings?: Record<string, any[]>;
  vencidos: any[];
  inconsistencias: any[];
  mode: TableMode;
}) {
  if (mode === 'rankings') {
    return (
      <section className="tables-section">
        <div className="rank-grid">
          <Ranking title="Ranking por cliente/fornecedor" rows={rankings.clientes || []} name="CLIFOR" />
          <Ranking title="Ranking por centro de custo" rows={rankings.centros || []} name="CCUSTO" />
          <Ranking title="Ranking por natureza financeira" rows={rankings.naturezas || []} name="NATFINANCEIRA" />
        </div>
        <div className="rank-grid">
          <SimpleTable title="Ranking por conta" rows={chartRankings.contas || []} columns={['nome', 'valor', 'quantidade']} />
          <SimpleTable title="Ranking por tipo de documento" rows={chartRankings.tiposDocumento || []} columns={['nome', 'valor', 'quantidade']} />
          <SimpleTable title="Ranking por origem" rows={chartRankings.origens || []} columns={['nome', 'valor', 'quantidade']} />
        </div>
      </section>
    );
  }

  if (mode === 'vencidos') {
    return <SimpleTable title="Tabela de títulos vencidos" rows={vencidos} columns={['EMPRESA', 'CLIFOR', 'NUMERODOC', 'PAGREC', 'DTVENC', 'diasAtraso', 'VLRRATEIO', 'STATUS_FIN', 'CCUSTO', 'NATFINANCEIRA']} />;
  }

  if (mode === 'inconsistencias') {
    return <InconsistencyTable rows={inconsistencias} />;
  }

  if (mode === 'pagarReceber') {
    const rows = (chartRankings.pagarReceber || []).map((row) => ({ tipo: row.nome, total: row.valor, quantidade: row.quantidade, contexto: 'Valores filtrados na base atual' }));
    return <SimpleTable title="Resumo por tipo financeiro" rows={rows} columns={['tipo', 'total', 'quantidade', 'contexto']} />;
  }

  return <AnalyticalTable filters={filters} />;
}

function AnalyticalTable({ filters }: { filters: Filters }) {
  const [table, setTable] = useState<TableResponse>({ total: 0, page: 1, pageSize: 25, rows: [] });
  const [sortBy, setSortBy] = useState('DTVENC');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(filters.search || '');
  const [visibleCols, setVisibleCols] = useState<string[]>(columns);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const response = await apiGet<TableResponse>('/api/titulos/tabela', { ...filters, search }, { page: table.page, pageSize: table.pageSize, sortBy, sortDir }, { cache: false });
      setTable(response);
      setLoading(false);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filters, search, table.page, table.pageSize, sortBy, sortDir]);

  const pageCount = Math.max(Math.ceil(table.total / table.pageSize), 1);
  const changeSort = (col: string) => {
    setSortBy(col);
    setSortDir((dir) => sortBy === col && dir === 'DESC' ? 'ASC' : 'DESC');
  };
  const filteredRows = table.rows.filter((row) => visibleCols.every((col) => {
    const term = (columnFilters[col] || '').trim().toLowerCase();
    return !term || String(row[col] ?? '').toLowerCase().includes(term);
  }));

  return (
    <section className="tables-section">
      <article className="table-card">
        <div className="table-toolbar">
          <div>
            <strong>Tabela analítica de títulos financeiros</strong>
            <span>{fmtInt(table.total)} registros filtrados, paginação server-side</span>
          </div>
          <div className="table-actions">
            <label className="table-search"><Search size={16} /><input value={search} onChange={(e) => { setSearch(e.target.value); setTable((old) => ({ ...old, page: 1 })); }} placeholder="Buscar na tabela" /></label>
            <details className="columns-menu">
              <summary><Settings2 size={16} /> Colunas</summary>
              <div>
                {columns.map((col) => (
                  <label key={col}>
                    <input
                      type="checkbox"
                      checked={visibleCols.includes(col)}
                      onChange={() => setVisibleCols((old) => old.includes(col) ? old.filter((item) => item !== col) : [...old, col])}
                    />
                    {col}
                  </label>
                ))}
              </div>
            </details>
            <a className="ghost-button" href={exportUrl(filters)} target="_blank" rel="noreferrer"><Download size={16} /> Exportar dados filtrados</a>
          </div>
        </div>
        <div className="table-wrap controlled-scroll">
          <table>
            <thead>
              <tr>
                <th />
                {visibleCols.map((col) => <th key={col}><button onClick={() => changeSort(col)}>{col}<ChevronsUpDown size={13} /></button></th>)}
              </tr>

            </thead>
            <tbody>
              {loading && <tr><td colSpan={visibleCols.length + 1}>Carregando dados...</td></tr>}
              {!loading && table.rows.length === 0 && <tr><td colSpan={visibleCols.length + 1}>Nenhum dado encontrado para os filtros atuais.</td></tr>}
              {!loading && filteredRows.map((row, index) => <ExpandableRow key={`${row.EMPRESA}-${row.REF}-${row.NUMERODOC}-${index}`} row={row} visibleCols={visibleCols} />)}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button className="icon-button" disabled={table.page <= 1} onClick={() => setTable((old) => ({ ...old, page: old.page - 1 }))}><ChevronLeft size={18} /></button>
          <span>Página {table.page} de {pageCount}</span>
          <button className="icon-button" disabled={table.page >= pageCount} onClick={() => setTable((old) => ({ ...old, page: old.page + 1 }))}><ChevronRight size={18} /></button>
        </div>
      </article>
    </section>
  );
}

function ExpandableRow({ row, visibleCols }: { row: any; visibleCols: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr>
        <td><button className="icon-button compact" onClick={() => setOpen((value) => !value)}><ChevronDown size={16} className={open ? 'rotated' : ''} /></button></td>
        {visibleCols.map((col) => <td key={col}>{formatCell(col, row[col])}</td>)}
      </tr>
      {open && (
        <tr className="expanded-row">
          <td />
          <td colSpan={visibleCols.length}>
            <div className="detail-scroll">
              <div className="detail-grid">
                <Detail label="Histórico" value={row.HISTORICO} wide />
                <Detail label="Origem" value={row.ORIGEM} />
                <Detail label="CODTDO" value={row.CODTDO} />
                <Detail label="CODCCUSTO" value={row.CODCCUSTO} />
                <Detail label="CODNATFINANCEIRA" value={row.CODNATFINANCEIRA} />
                <Detail label="VLRISS" value={fmtMoney(row.VLRISS)} />
                <Detail label="VLRINSS" value={fmtMoney(row.VLRINSS)} />
                <Detail label="VLRDEVOLUCAO" value={fmtMoney(row.VLRDEVOLUCAO)} />
                <Detail label="VLRNOTACRED" value={fmtMoney(row.VLRNOTACRED)} />
                <Detail label="VLRNCADIANT" value={fmtMoney(row.VLRNCADIANT)} />
                <Detail label="VLRVINCULADO" value={fmtMoney(row.VLRVINCULADO)} />
                <Detail label="NUMCHEQUE" value={row.NUMCHEQUE} />
                <Detail label="CODCXA" value={row.CODCXA} />
                <Detail label="Dias emissão/vencimento" value={row.diasEmissaoVencimento} />
                <Detail label="Dias vencimento/baixa" value={row.diasVencimentoBaixa} />
                <Detail label="Situação de atraso" value={row.situacaoAtraso} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Detail({ label, value, wide }: { label: string; value: any; wide?: boolean }) {
  return <div className={wide ? 'detail-item wide' : 'detail-item'}><span>{label}</span><strong>{safe(value)}</strong></div>;
}

function Ranking({ title, rows, name }: { title: string; rows: any[]; name: string }) {
  return (
    <article className="table-card small">
      <div className="table-toolbar"><div><strong>{title}</strong><span>Top 50 por VLRRATEIO</span></div></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>{name}</th><th>Qtd.</th><th>Total</th><th>Baixa</th><th>Aberto</th><th>Vencido</th><th>Ticket</th><th>%</th></tr></thead>
          <tbody>
            {rows.slice(0, 20).map((row) => (
              <tr key={row.nome}>
                <td>{safe(row.nome)}</td>
                <td>{fmtInt(row.quantidade)}</td>
                <td>{fmtMoney(row.totalRateio)}</td>
                <td>{fmtMoney(row.totalBaixa)}</td>
                <td>{fmtMoney(row.totalAberto)}</td>
                <td>{fmtMoney(row.totalVencido)}</td>
                <td>{fmtMoney(row.ticketMedio)}</td>
                <td>{fmtPercent(row.percentual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function SimpleTable({ title, rows, columns: tableColumns, icon }: { title: string; rows: any[]; columns: string[]; icon?: ReactNode }) {
  const [term, setTerm] = useState('');
  const filteredRows = rows.filter((row) => !term || tableColumns.some((col) => String(row[col] ?? '').toLowerCase().includes(term.toLowerCase())));
  return (
    <article className="table-card small">
      <div className="table-toolbar">
        <div><strong>{icon}{title}</strong><span>{fmtInt(filteredRows.length)} registros exibidos</span></div>
        <label className="table-search"><Search size={16} /><input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Filtrar tabela" /></label>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{tableColumns.map((col) => <th key={col}>{col}</th>)}</tr></thead>
          <tbody>
            {filteredRows.length === 0 && <tr><td colSpan={tableColumns.length}>Nenhum dado encontrado.</td></tr>}
            {filteredRows.slice(0, 120).map((row, i) => <tr key={i}>{tableColumns.map((col) => <td key={col}>{formatCell(col, row[col])}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function InconsistencyTable({ rows }: { rows: any[] }) {
  const [severity, setSeverity] = useState('');
  const [type, setType] = useState('');
  const [term, setTerm] = useState('');
  const types = useMemo(() => Array.from(new Set(rows.map((row) => row.tipo).filter(Boolean))).sort(), [rows]);
  const filtered = rows.filter((row) => {
    const text = `${row.CLIFOR || ''} ${row.NUMERODOC || ''} ${row.EMPRESA || ''} ${row.STATUS_FIN || ''}`.toLowerCase();
    return (!severity || row.severidade === severity)
      && (!type || row.tipo === type)
      && (!term || text.includes(term.toLowerCase()));
  });
  return (
    <article className="table-card small">
      <div className="table-toolbar">
        <div><strong><FileWarning size={17} />Tabela de inconsistências</strong><span>{fmtInt(filtered.length)} registros exibidos</span></div>
      </div>
      <div className="inline-filters">
        <label>Severidade<select value={severity} onChange={(e) => setSeverity(e.target.value)}><option value="">Todas</option><option>Crítico</option><option>Atenção</option><option>Informativo</option></select></label>
        <label>Tipo de inconsistência<select value={type} onChange={(e) => setType(e.target.value)}><option value="">Todos</option>{types.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Cliente/Fornecedor, empresa ou documento<input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Pesquisar nos alertas" /></label>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{['severidade', 'tipo', 'explicacao', 'EMPRESA', 'REF', 'CLIFOR', 'NUMERODOC', 'PAGREC', 'STATUS_FIN', 'STATUS_BAIXA', 'DTVENC', 'DTBAIXA', 'VLRRATEIO', 'VLRBAIXA', 'campo', 'valorAtual', 'sugestao'].map((col) => <th key={col}>{col}</th>)}</tr></thead>
          <tbody>{filtered.map((row, i) => <tr key={i}>{['severidade', 'tipo', 'explicacao', 'EMPRESA', 'REF', 'CLIFOR', 'NUMERODOC', 'PAGREC', 'STATUS_FIN', 'STATUS_BAIXA', 'DTVENC', 'DTBAIXA', 'VLRRATEIO', 'VLRBAIXA', 'campo', 'valorAtual', 'sugestao'].map((col) => <td key={col}>{formatCell(col, row[col])}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </article>
  );
}

function formatCell(col: string, value: any) {
  if (moneyCols.has(col) || col === 'valor' || col === 'total') return fmtMoney(value);
  if (dateCols.has(col)) return fmtDate(value);
  if (col.toLowerCase().includes('percentual')) return fmtPercent(value);
  return safe(value);
}
