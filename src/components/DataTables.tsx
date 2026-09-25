import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Download, FileWarning, RefreshCw, Search, Settings2 } from 'lucide-react';
import { apiGet, downloadTitulosExport, Filters } from '../services/api';
import { fmtDate, fmtInt, fmtMoney, fmtPercent, safe } from '../utils/format';
import { RemoteBlock } from './RemoteBlock';
import { ExpandablePanel } from './ExpandablePanel';
import type { BlockState } from '../hooks/dashboardState';

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
  blocks, retry,
}: {
  filters: Filters;
  rankings: Record<string, any[]>;
  chartRankings?: Record<string, any[]>;
  vencidos: any[];
  inconsistencias: any[];
  mode: TableMode;
  blocks?: Record<string, BlockState>; retry?: (key: string) => void;
}) {
  const wrap = (key: string, title: string, content: ReactNode) => <RemoteBlock key={key} state={blocks?.[key]} title={title} retry={() => retry?.(key)}>{content}</RemoteBlock>;
  if (mode === 'rankings') {
    return (
      <section className="tables-section">
        <div className="rank-grid ranking-details-grid">
          {wrap('clientes', 'Ranking por cliente/fornecedor', <Ranking title="Ranking por cliente/fornecedor" rows={rankings.clientes || []} name="CLIFOR" />)}
          {wrap('centros', 'Ranking por centro de custo', <Ranking title="Ranking por centro de custo" rows={rankings.centros || []} name="CCUSTO" />)}
          {wrap('naturezas', 'Ranking por natureza financeira', <Ranking title="Ranking por natureza financeira" rows={rankings.naturezas || []} name="NATFINANCEIRA" />)}
        </div>
        <div className="rank-grid">
          {wrap('contas', 'Ranking por conta', <SimpleTable title="Ranking por conta" rows={chartRankings.contas || []} columns={['nome', 'valor', 'quantidade']} />)}
          {wrap('tiposDocumento', 'Ranking por tipo de documento', <SimpleTable title="Ranking por tipo de documento" rows={chartRankings.tiposDocumento || []} columns={['nome', 'valor', 'quantidade']} />)}
          {wrap('origens', 'Ranking por origem', <SimpleTable title="Ranking por origem" rows={chartRankings.origens || []} columns={['nome', 'valor', 'quantidade']} />)}
        </div>
      </section>
    );
  }

  if (mode === 'vencidos') {
    return wrap('vencidos', 'Tabela de títulos vencidos', <SimpleTable title="Tabela de títulos vencidos" rows={vencidos} columns={['EMPRESA', 'CLIFOR', 'NUMERODOC', 'PAGREC', 'DTVENC', 'diasAtraso', 'VLRRATEIO', 'STATUS_FIN', 'CCUSTO', 'NATFINANCEIRA']} />);
  }

  if (mode === 'inconsistencias') {
    return wrap('inconsistencias', 'Lista de inconsistências', <InconsistencyTable rows={inconsistencias} />);
  }

  if (mode === 'pagarReceber') {
    const rows = (chartRankings.pagarReceber || []).map((row) => ({ tipo: row.nome, total: row.valor, quantidade: row.quantidade, contexto: 'Valores filtrados na base atual' }));
    return wrap('pagarReceber', 'Resumo por tipo financeiro', <SimpleTable title="Resumo por tipo financeiro" rows={rows} columns={['tipo', 'total', 'quantidade', 'contexto']} />);
  }

  return <AnalyticalTable key={JSON.stringify(filters)} filters={filters} />;
}

function AnalyticalTable({ filters }: { filters: Filters }) {
  const [table, setTable] = useState<TableResponse>({ total: 0, page: 1, pageSize: 25, rows: [] });
  const [sortBy, setSortBy] = useState('DTVENC');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('DESC');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(filters.search || '');
  const [visibleCols, setVisibleCols] = useState<string[]>(columns);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const exportRequest = useRef<AbortController | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setExportError('');
    setExporting(false);
    return () => {
      exportRequest.current?.abort();
      exportRequest.current = null;
    };
  }, [filters, search, sortBy, sortDir]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timer = window.setTimeout(async () => {
      let relocating = false;
      try {
        const response = await apiGet<TableResponse>('/api/titulos/tabela', { ...filters, search }, { page: table.page, pageSize: table.pageSize, sortBy, sortDir }, { cache: false, signal: controller.signal });
        if (!controller.signal.aborted) {
          const lastPage = Math.max(Math.ceil(response.total / response.pageSize), 1);
          relocating = response.page > lastPage;
          setTable(relocating ? { ...response, page: lastPage, rows: [] } : response);
        }
      } catch (err) {
        if (!controller.signal.aborted && !(err instanceof Error && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Não foi possível carregar a tabela.');
          setTable(old => ({ ...old, rows: [] }));
        }
      } finally {
        if (!controller.signal.aborted && !relocating) setLoading(false);
      }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [filters, search, table.page, table.pageSize, sortBy, sortDir, retry]);

  const pageCount = Math.max(Math.ceil(table.total / table.pageSize), 1);
  const changeSort = (col: string) => {
    setTable(old => ({ ...old, page: 1 }));
    setSortBy(col);
    setSortDir((dir) => sortBy === col && dir === 'DESC' ? 'ASC' : 'DESC');
  };
  const filteredRows = table.rows.filter((row) => visibleCols.every((col) => {
    const term = (columnFilters[col] || '').trim().toLowerCase();
    return !term || String(row[col] ?? '').toLowerCase().includes(term);
  }));
  const exportData = async () => {
    exportRequest.current?.abort();
    const controller = new AbortController();
    exportRequest.current = controller;
    setExportError('');
    setExporting(true);
    try {
      await downloadTitulosExport({ ...filters, search }, { sortBy, sortDir, signal: controller.signal });
    } catch (err) {
      if (!controller.signal.aborted && !(err instanceof Error && err.name === 'AbortError')) setExportError(err instanceof Error ? err.message : 'Não foi possível exportar os dados.');
    } finally {
      if (exportRequest.current === controller) {
        exportRequest.current = null;
        setExporting(false);
      }
    }
  };

  return (
    <section className="tables-section">
      <ExpandablePanel title="Tabela analítica de títulos financeiros" className="table-card">
        <div className="table-toolbar">
          <div>
            <strong>Tabela analítica de títulos financeiros</strong>
            <span>{loading ? 'Carregando...' : error ? 'Consulta indisponível' : `${fmtInt(table.total)} registros filtrados`}</span>
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
            <button className="ghost-button" onClick={exportData} disabled={exporting || loading || Boolean(error)}><Download size={16} /> {exporting ? 'Exportando...' : 'Exportar dados filtrados'}</button>
          </div>
        </div>
        {exportError && <div className="error-box" role="alert">{exportError}</div>}
        {error && <div className="error-box" role="alert">{error} <button className="icon-button" title="Tentar novamente" aria-label="Tentar novamente" onClick={() => setRetry(value => value + 1)}><RefreshCw size={16} /></button></div>}
        <TableScroll className="controlled-scroll">
          <table>
            <thead>
              <tr>
                <th />
                {visibleCols.map((col) => <th key={col} aria-sort={sortBy === col ? (sortDir === 'ASC' ? 'ascending' : 'descending') : 'none'}><button onClick={() => changeSort(col)}>{col}<ChevronsUpDown size={13} /></button></th>)}
              </tr>

            </thead>
            <tbody>
              {loading && <tr><td colSpan={visibleCols.length + 1}>Carregando dados...</td></tr>}
              {!loading && !error && table.rows.length === 0 && <tr><td colSpan={visibleCols.length + 1}>Nenhum dado encontrado para os filtros atuais.</td></tr>}
              {!loading && !error && filteredRows.map((row, index) => <ExpandableRow key={`${row.EMPRESA}-${row.REF}-${row.NUMERODOC}-${index}`} row={row} visibleCols={visibleCols} />)}
            </tbody>
          </table>
        </TableScroll>
        <div className="pagination">
          <button className="icon-button" aria-label="Página anterior" disabled={loading || Boolean(error) || table.page <= 1} onClick={() => setTable((old) => ({ ...old, page: old.page - 1 }))}><ChevronLeft size={18} /></button>
          <span>Página {table.page} de {pageCount}</span>
          <button className="icon-button" aria-label="Próxima página" disabled={loading || Boolean(error) || table.page >= pageCount} onClick={() => setTable((old) => ({ ...old, page: old.page + 1 }))}><ChevronRight size={18} /></button>
        </div>
      </ExpandablePanel>
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

function TableScroll({ children, className = '' }: { children: ReactNode; className?: string }) {
  const topRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(1200);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const update = () => setWidth(body.scrollWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(body);
    const table = body.querySelector('table');
    if (table) observer.observe(table);
    return () => observer.disconnect();
  }, [children]);

  const syncFromTop = () => {
    if (bodyRef.current && topRef.current) bodyRef.current.scrollLeft = topRef.current.scrollLeft;
  };
  const syncFromBody = () => {
    if (bodyRef.current && topRef.current) topRef.current.scrollLeft = bodyRef.current.scrollLeft;
  };

  return (
    <div className="table-scroll-shell">
      <div className="table-scroll-top" ref={topRef} onScroll={syncFromTop} tabIndex={0} role="region" aria-label="Rolagem horizontal da tabela"><div style={{ width }} /></div>
      <div className={`table-wrap ${className}`} ref={bodyRef} onScroll={syncFromBody}>{children}</div>
    </div>
  );
}

function Ranking({ title, rows, name }: { title: string; rows: any[]; name: string }) {
  return (
    <ExpandablePanel title={title} className="table-card small ranking-table">
      <div className="table-toolbar"><div><strong>{title}</strong><span>Top 50 por VLRRATEIO</span></div></div>
      <TableScroll>
        <table>
          <thead><tr><th>{name}</th><th>Qtd.</th><th>Total</th><th>Baixa</th><th>Aberto</th><th>Vencido</th><th>Ticket</th><th>%</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8}>Sem registros neste recorte.</td></tr>}
            {rows.slice(0, 50).map((row) => (
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
      </TableScroll>
    </ExpandablePanel>
  );
}

function SimpleTable({ title, rows, columns: tableColumns, icon }: { title: string; rows: any[]; columns: string[]; icon?: ReactNode }) {
  const [term, setTerm] = useState('');
  const filteredRows = rows.filter((row) => !term || tableColumns.some((col) => String(row[col] ?? '').toLowerCase().includes(term.toLowerCase())));
  return (
    <ExpandablePanel title={title} className="table-card small">
      <div className="table-toolbar">
        <div><strong>{icon}{title}</strong><span>{fmtInt(filteredRows.length)} registros exibidos</span></div>
        <label className="table-search"><Search size={16} /><input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Filtrar tabela" /></label>
      </div>
      <TableScroll>
        <table>
          <thead><tr>{tableColumns.map((col) => <th key={col}>{col}</th>)}</tr></thead>
          <tbody>
            {filteredRows.length === 0 && <tr><td colSpan={tableColumns.length}>Nenhum dado encontrado.</td></tr>}
            {filteredRows.slice(0, 120).map((row, i) => <tr key={i}>{tableColumns.map((col) => <td key={col}>{formatCell(col, row[col])}</td>)}</tr>)}
          </tbody>
        </table>
      </TableScroll>
    </ExpandablePanel>
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
    <ExpandablePanel title="Tabela de inconsistências" className="table-card small">
      <div className="table-toolbar">
        <div><strong><FileWarning size={17} />Tabela de inconsistências</strong><span>{fmtInt(filtered.length)} registros exibidos</span></div>
      </div>
      <div className="inline-filters">
        <label>Severidade<select value={severity} onChange={(e) => setSeverity(e.target.value)}><option value="">Todas</option><option>Crítico</option><option>Atenção</option><option>Informativo</option></select></label>
        <label>Tipo de inconsistência<select value={type} onChange={(e) => setType(e.target.value)}><option value="">Todos</option>{types.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Cliente/Fornecedor, empresa ou documento<input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Pesquisar nos alertas" /></label>
      </div>
      <TableScroll>
        <table>
          <thead><tr>{['severidade', 'tipo', 'explicacao', 'EMPRESA', 'REF', 'CLIFOR', 'NUMERODOC', 'PAGREC', 'STATUS_FIN', 'STATUS_BAIXA', 'DTVENC', 'DTBAIXA', 'VLRRATEIO', 'VLRBAIXA', 'campo', 'valorAtual', 'sugestao'].map((col) => <th key={col}>{col}</th>)}</tr></thead>
          <tbody>{filtered.length === 0 && <tr><td colSpan={17}>Sem registros neste recorte.</td></tr>}{filtered.map((row, i) => <tr key={i}>{['severidade', 'tipo', 'explicacao', 'EMPRESA', 'REF', 'CLIFOR', 'NUMERODOC', 'PAGREC', 'STATUS_FIN', 'STATUS_BAIXA', 'DTVENC', 'DTBAIXA', 'VLRRATEIO', 'VLRBAIXA', 'campo', 'valorAtual', 'sugestao'].map((col) => <td key={col}>{formatCell(col, row[col])}</td>)}</tr>)}</tbody>
        </table>
      </TableScroll>
    </ExpandablePanel>
  );
}

function formatCell(col: string, value: any) {
  if (moneyCols.has(col) || col === 'valor' || col === 'total') return fmtMoney(value);
  if (dateCols.has(col)) return fmtDate(value);
  if (col.toLowerCase().includes('percentual')) return fmtPercent(value);
  return safe(value);
}
