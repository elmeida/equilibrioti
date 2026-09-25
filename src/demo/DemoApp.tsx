import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, BarChart3, Building2, ChevronDown, ChevronLeft, ChevronRight, Download, Info, RefreshCw, Search, ShieldCheck, Wallet } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtMoney, fmtPercent } from '../utils/format';
import { change, comparisonPlan, hasCoverage, metrics, periodSeries, receivableAging, residual, selectTitles, titlesCsv, titleStatus, validatePeriod, type ComparisonMode, type DemoIdentity, type Metrics, type Period, type Scenario, type TenantId } from './domain';
import { demoCoverage, demoPeriod, demoSource, demoTenants, demoTitles } from './fixtures';
import './demo.css';

const formatDate = (date: string) => date.split('-').reverse().join('/');
const rangeLabel = (period: Period) => `${formatDate(period.start)} a ${formatDate(period.end)}`;
const metricSpecs: { key: keyof Metrics; label: string; help: string; position?: boolean; count?: boolean; icon: typeof Wallet }[] = [
  { key: 'received', label: 'Recebido no período', icon: ArrowDownLeft,
    help: 'Soma dos eventos de recebimento, líquidos de estornos, nas datas selecionadas. Nesta massa fictícia, o caixa pode incluir encargos e descontos, separados do principal.' },
  { key: 'paid', label: 'Pago no período', icon: ArrowUpRight,
    help: 'Soma dos eventos de pagamento, líquidos de estornos, nas datas selecionadas. Não depende do mês de vencimento do título.' },
  { key: 'net', label: 'Fluxo líquido de títulos', icon: Wallet,
    help: 'Recebido menos pago no período. Não representa lucro ou saldo bancário disponível: não inclui um saldo inicial de contas bancárias.' },
  { key: 'receivable', label: 'Carteira a receber', icon: Building2, position: true,
    help: 'Principal ainda não liquidado na data final, incluindo baixas parciais. Usa os eventos conhecidos até essa data, e não o status atual do título.' },
  { key: 'overdue', label: 'Recebíveis vencidos', icon: BarChart3, position: true,
    help: 'Saldo residual dos recebíveis com vencimento anterior à data final. Títulos que vencem no próprio dia não são classificados como atrasados.' },
  { key: 'openCount', label: 'Títulos em aberto', icon: Info, position: true, count: true,
    help: 'Quantidade de títulos únicos com saldo positivo na data final, a pagar ou receber conforme os filtros. Rateios não são contados como novos títulos.' },
];

export function DemoApp() {
  const [profile, setProfile] = useState('admin');
  const [chosenTenant, setChosenTenant] = useState<TenantId>('aurora');
  const [scenario, setScenario] = useState<Scenario>('complete');
  const [period, setPeriod] = useState<Period>(demoPeriod);
  const [draftPeriod, setDraftPeriod] = useState<Period>(demoPeriod);
  const [dateError, setDateError] = useState('');
  const [comparison, setComparison] = useState<ComparisonMode>('year');
  const [coligada, setColigada] = useState('all');
  const [direction, setDirection] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sort, setSort] = useState<'due' | 'balance'>('due');
  const identity: DemoIdentity = profile === 'admin' ? { role: 'platform_admin' } : { role: 'client', tenantId: profile as TenantId };
  const tenant = identity.role === 'client' ? identity.tenantId : chosenTenant;
  const tenantName = demoTenants.find(item => item.id === tenant)!.name;
  const coverage = scenario === 'partial' ? { ...demoCoverage, start: '2026-01-01' } : demoCoverage;
  const available = scenario !== 'unavailable' && hasCoverage(period, coverage);
  const comparisonState = useMemo(() => {
    try { return { plan: comparisonPlan(period, comparison), error: '' }; }
    catch { return { plan: null, error: 'Comparação indisponível: período fora do calendário suportado.' }; }
  }, [period, comparison]);
  const previousPeriod = comparisonState.plan?.previous ?? null;
  const comparable = available && previousPeriod !== null && hasCoverage(previousPeriod, coverage);
  const selected = selectTitles(demoTitles, identity, tenant, { coligada, direction, search });
  const current = available ? metrics(selected, period) : null;
  const previous = comparable && previousPeriod ? metrics(selected, previousPeriod) : null;
  const aging = available ? receivableAging(selected, period.end) : [];
  const rows = available ? selected.filter(title => title.issued <= period.end).sort((a, b) =>
    (sort === 'balance' ? residual(b, period.end) - residual(a, period.end) : a.due.localeCompare(b.due)) || a.id.localeCompare(b.id)) : [];
  const safePage = Math.min(page, Math.max(1, Math.ceil(rows.length / 6)));
  const visibleRows = rows.slice((safePage - 1) * 6, safePage * 6);
  const series = useMemo(() => available ? periodSeries(selected, period, comparable ? previousPeriod : null) : [],
    [available, tenant, coligada, direction, search, period.start, period.end, comparable, comparison]);

  const resetContext = () => { setSearch(''); setColigada('all'); setDirection('all'); setPage(1); setExpanded(null); };
  const applyPeriod = () => {
    try {
      validatePeriod(draftPeriod);
      if (Date.parse(draftPeriod.end) - Date.parse(draftPeriod.start) > 366 * 86_400_000) throw new Error('Selecione um intervalo de até 367 dias.');
      setPeriod({ ...draftPeriod }); setDateError(''); setPage(1); setExpanded(null);
    } catch (error) { setDateError((error as Error).message); }
  };
  const exportRows = () => {
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([titlesCsv(rows, period)], { type: 'text/csv;charset=utf-8' }));
    link.href = url; link.download = `equilibrio-demo-${tenant}-${period.end}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return <div className="demo-app">
    <div className="demo-banner" role="status"><ShieldCheck size={16} /><strong>Demonstração local</strong><span>Dados fictícios · sem conexão com o RM</span></div>
    <header className="demo-header">
      <div className="demo-brand"><img src="/logo_equilibrioti.png" alt="Equilíbrio TI" /><div><h1>Equilíbrio BI</h1><span>Visão financeira</span></div></div>
      <div className="demo-controls">
        <label>Perfil simulado<select aria-label="Perfil simulado" value={profile} onChange={event => { setProfile(event.target.value); resetContext(); }}>
          <option value="admin">Administrador geral</option><option value="aurora">Cliente Aurora</option><option value="horizonte">Cliente Horizonte</option>
        </select></label>
        <label>Cenário<select aria-label="Cenário" value={scenario} onChange={event => setScenario(event.target.value as Scenario)}>
          <option value="complete">Histórico completo</option><option value="partial">Histórico parcial</option><option value="unavailable">Fonte indisponível</option>
        </select></label>
      </div>
    </header>
    <main className="demo-main">
      <section className="demo-context" aria-label="Contexto da empresa">
        <div><span className="demo-eyebrow">Empresa cliente</span><h2>{tenantName}</h2><p>{identity.role === 'platform_admin' ? 'Contexto do administrador geral' : 'Consulta da própria empresa'} · Coligadas 1 e 2</p></div>
        {identity.role === 'platform_admin' && <label>Empresa<select aria-label="Empresa" value={chosenTenant} onChange={event => { setChosenTenant(event.target.value as TenantId); resetContext(); }}>
          {demoTenants.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>}
      </section>
      <form className="demo-filters" onSubmit={event => { event.preventDefault(); applyPeriod(); }}>
        <label>Início<input aria-label="Início" type="date" required value={draftPeriod.start} onChange={event => setDraftPeriod({ ...draftPeriod, start: event.target.value })} /></label>
        <label>Fim<input aria-label="Fim" type="date" required value={draftPeriod.end} onChange={event => setDraftPeriod({ ...draftPeriod, end: event.target.value })} /></label>
        <label>Comparar com<select aria-label="Comparar com" value={comparison} onChange={event => setComparison(event.target.value as ComparisonMode)}>
          <option value="year">Mesmo período do ano anterior</option><option value="previous">Período anterior</option><option value="none">Sem comparação</option>
        </select></label>
        <label>Coligada<select aria-label="Coligada" value={coligada} onChange={event => { setColigada(event.target.value); setPage(1); }}><option value="all">Todas</option><option value="1">Coligada 1</option><option value="2">Coligada 2</option></select></label>
        <label>Tipo<select aria-label="Tipo" value={direction} onChange={event => { setDirection(event.target.value); setPage(1); }}><option value="all">Pagar e receber</option><option value="receivable">A receber</option><option value="payable">A pagar</option></select></label>
        <button className="demo-action" type="submit"><RefreshCw size={16} />Aplicar período</button>
      </form>
      {dateError && <p className="demo-error" role="alert">{dateError}</p>}
      <div className="demo-period"><strong>{rangeLabel(period)}{comparisonState.plan ? ` · ${comparisonState.plan.currentDays} dias` : ''}</strong><span>{previousPeriod ? `Comparação: ${rangeLabel(previousPeriod)} · ${comparisonState.plan?.previousDays} dias` : comparisonState.error || 'Sem comparação'} · {demoSource}</span></div>
      {!!comparisonState.plan?.warnings.length && <div className="demo-notice demo-notice-warning" role="status"><Info size={18} /><span>{comparisonState.plan.warnings.includes('unequal-days') ? 'Períodos com durações diferentes. Os totais não foram normalizados por dia. ' : ''}{comparisonState.plan.warnings.includes('calendar-adjusted') ? 'Datas ajustadas ao calendário. ' : ''}{comparisonState.plan.warnings.includes('overlapping-periods') ? 'Os períodos possuem datas em comum.' : ''}</span></div>}
      {!available && <div className="demo-notice demo-notice-warning" role="alert"><Info size={20} /><div><strong>{scenario === 'unavailable' ? 'Fonte indisponível' : 'Período sem cobertura'}</strong><p>{scenario === 'unavailable' ? 'Não foi possível consultar a fonte fictícia. Os valores não foram substituídos por zero.' : `Cobertura disponível: ${rangeLabel(coverage)}.`}</p></div>
        {scenario === 'unavailable' && <button className="demo-action" onClick={() => setScenario('complete')}><RefreshCw size={16} />Tentar novamente</button>}</div>}
      {available && previousPeriod && !comparable && <div className="demo-notice demo-notice-warning" role="status"><Info size={18} /><span>Comparação indisponível: o histórico não cobre todo o período anterior. Os valores atuais continuam disponíveis.</span></div>}
      <section className="demo-metrics" aria-label="Indicadores financeiros">
        {metricSpecs.map(spec => {
          const value = current?.[spec.key] ?? null;
          const old = previous?.[spec.key] ?? null;
          const delta = value === null ? { difference: null, ratio: null } : change(value, old);
          const format = (number: number | null) => number === null ? 'Indisponível' : spec.count ? String(number) : fmtMoney(number / 100);
          return <article className={`demo-metric demo-metric-${spec.key}`} key={spec.key} data-testid={`metric-${spec.key}`}>
            <div className="demo-metric-label"><spec.icon size={18} /><h3>{spec.label}</h3></div>
            <strong className="demo-metric-value">{format(value)}</strong>
            <span className="demo-metric-date">{spec.position ? `Posição em ${formatDate(period.end)}` : 'Movimento no período'}</span>
            <p className="demo-delta">{delta.difference === null ? (comparison === 'none' ? 'Sem comparação' : 'Comparação indisponível') : `${delta.difference > 0 ? '+' : ''}${format(delta.difference)}${delta.ratio === null ? ' · % indisponível' : ` · ${delta.ratio > 0 ? '+' : ''}${fmtPercent(delta.ratio)}`}`}</p>
            <details className="demo-help"><summary><Info size={14} />Como é calculado</summary><p>{spec.help}</p>{old !== null && <p>Valor anterior: {format(old)}.</p>}<p>Fonte: dados fictícios. Regra inicial em validação para o RM.</p></details>
          </article>;
        })}
      </section>
      <section className="demo-reading" aria-label="Leitura do resultado"><Info size={20} /><div><h3>Leitura do resultado</h3><p>{current ? current.receivable > 0
        ? `${fmtPercent(current.overdue / current.receivable)} da carteira a receber está vencida na data de referência. O saldo inclui títulos com baixa parcial.`
        : 'Não há saldo de recebíveis nos filtros atuais. O percentual vencido fica indisponível porque a base é zero.'
        : 'Sem dados disponíveis para interpretar este recorte.'}</p></div></section>
      <div className="demo-analysis">
        <section aria-labelledby="receipts-title"><div className="demo-section-heading"><h2 id="receipts-title">Recebimentos no período</h2><span>R$ · eventos de caixa</span></div>
          <div className="demo-chart">{available ? <ResponsiveContainer width="100%" height="100%"><LineChart data={series} margin={{ left: 0, right: 12, top: 16, bottom: 0 }} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" minTickGap={18} /><YAxis width={66} tickFormatter={value => Number(value).toLocaleString('pt-BR')} />
            <Tooltip labelFormatter={(_label, items) => { const point = items?.[0]?.payload; return [point?.date ? `Atual: ${formatDate(point.date)}` : '', point?.previousDate ? `Anterior: ${formatDate(point.previousDate)}` : ''].filter(Boolean).join(' · '); }} formatter={value => fmtMoney(value)} /><Legend />
            <Line dataKey="current" name="Atual" type="linear" stroke="#14776c" strokeWidth={2} dot={false} isAnimationActive={false} />
            {comparable && <Line dataKey="previous" name="Anterior (dias alinhados)" type="linear" stroke="#3469b7" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls={false} isAnimationActive={false} />}
          </LineChart></ResponsiveContainer> : <p className="demo-empty">Série indisponível.</p>}</div>
          <p className="demo-caption">{comparable ? 'Séries alinhadas pela ordem dos dias em cada recorte; datas completas acima.' : 'Sem série anterior comparável.'}</p>
        </section>
        <section aria-labelledby="aging-title"><div className="demo-section-heading"><h2 id="aging-title">Idade da carteira a receber</h2><span>Saldo na data final</span></div>
          <div className="demo-aging">{aging.length ? aging.map((row, index) => <div key={row.label}><div><span>{row.label}</span><strong>{fmtMoney(row.cents / 100)}</strong></div><div className="demo-track"><span style={{ width: `${current?.receivable ? row.cents / current.receivable * 100 : 0}%`, background: index === 0 ? '#14776c' : '#be4b49' }} /></div></div>) : <p className="demo-empty">Carteira indisponível.</p>}</div>
        </section>
      </div>
      <section className="demo-titles" aria-labelledby="titles-title"><div className="demo-section-heading"><div><h2 id="titles-title">Títulos e composição</h2><p>Posição em {formatDate(period.end)} · {available ? `${rows.length} títulos` : 'indisponível'}</p></div>
        <div className="demo-table-actions"><label className="demo-search"><Search size={16} /><input aria-label="Buscar títulos" placeholder="Documento ou contraparte" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label>
          <label className="demo-sort">Ordenação<select aria-label="Ordenação" value={sort} onChange={event => { setSort(event.target.value as 'due' | 'balance'); setPage(1); }}><option value="due">Vencimento</option><option value="balance">Maior saldo</option></select></label>
          <button className="demo-icon" title="Exportar títulos filtrados em CSV" aria-label="Exportar títulos filtrados em CSV" onClick={exportRows} disabled={!available || !rows.length}><Download size={18} /></button></div></div>
        <div className="demo-table-scroll"><table><thead><tr><th>Detalhes</th><th>Documento / contraparte</th><th>Coligada</th><th>Vencimento</th><th>Principal</th><th>Saldo</th><th>Situação</th></tr></thead><tbody>
          {!visibleRows.length && <tr><td colSpan={7}>{available ? 'Nenhum título encontrado para os filtros atuais.' : 'Dados indisponíveis.'}</td></tr>}
          {visibleRows.map(title => <TitleRows key={`${tenant}:${title.id}`} title={title} end={period.end} expanded={expanded === `${tenant}:${title.id}`} onToggle={() => setExpanded(expanded === `${tenant}:${title.id}` ? null : `${tenant}:${title.id}`)} />)}
        </tbody></table></div>
        <div className="demo-pagination"><span>Página {safePage} de {Math.max(1, Math.ceil(rows.length / 6))}</span><button className="demo-icon" title="Página anterior" aria-label="Página anterior" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}><ChevronLeft size={18} /></button><button className="demo-icon" title="Próxima página" aria-label="Próxima página" disabled={safePage * 6 >= rows.length} onClick={() => setPage(safePage + 1)}><ChevronRight size={18} /></button></div>
      </section>
      <footer className="demo-footer">Equilíbrio TI · Demonstração com dados fictícios · Regras financeiras pendentes de conciliação com o RM</footer>
    </main>
  </div>;
}

function TitleRows({ title, end, expanded, onToggle }: { title: typeof demoTitles[number]; end: string; expanded: boolean; onToggle: () => void }) {
  return <><tr><td><button className="demo-icon" aria-label={`Detalhes de ${title.document}`} aria-expanded={expanded} onClick={onToggle}><ChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : undefined }} /></button></td>
    <td><strong>{title.document}</strong><span className="demo-counterpart">{title.counterpart} · {title.direction === 'receivable' ? 'A receber' : 'A pagar'}</span></td><td>{title.coligada}</td><td>{formatDate(title.due)}</td><td>{fmtMoney(title.principalCents / 100)}</td><td>{fmtMoney(residual(title, end) / 100)}</td><td>{titleStatus(title, end)}</td></tr>
    {expanded && <tr className="demo-detail"><td colSpan={7}><div><section><h3>Rateios do principal</h3>{title.allocations.map(item => <p key={item.costCenter}>{item.costCenter}: {fmtMoney(item.cents / 100)}</p>)}</section><section><h3>Eventos até {formatDate(end)}</h3>{title.payments.filter(item => item.date <= end).map(item => <p key={item.id}>{formatDate(item.date)} · {item.principalCents < 0 ? 'Estorno' : 'Baixa'} · principal {fmtMoney(item.principalCents / 100)} · caixa {fmtMoney(item.cashCents / 100)}</p>)}{!title.payments.some(item => item.date <= end) && <p>Sem eventos de baixa neste recorte.</p>}</section></div></td></tr>}</>;
}
