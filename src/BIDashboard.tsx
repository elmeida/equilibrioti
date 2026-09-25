import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarClock,
  Download,
  Filter,
  LayoutGrid,
  Menu,
  Moon,
  RefreshCw,
  Sun,
  Table2,
  WalletCards,
  X,
  LogOut,
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { safeLogoReference } from '../server/security/logo-reference.js';
import { dateFilterError } from '../server/utils/dateFilters.js';
import { FilterPanel } from './components/FilterPanel';
import { KpiCards, type KpiKey } from './components/KpiCards';
import type { ChartId } from './components/Charts';
import { lazyModule } from './components/DeferredModule';
import { useDashboardData } from './hooks/useDashboardData';
import { changePassword, defaultFilters, downloadTitulosExport, Filters, type AuthUser } from './services/api';
import { fmtInt, fmtMoney, fmtPercent, safe } from './utils/format';
import { finiteValue, largestValue, positiveBaseRatio, qualitySummary } from './utils/analytics';
import { RemoteBlock } from './components/RemoteBlock';
import type { BlockState } from './hooks/dashboardState';
import { ComparisonControls } from './components/ComparisonControls';
import { comparisonPresentation } from './utils/comparisonPresentation';
import type { ComparisonMode, ComparisonBasis } from '../server/analytics/comparisons.js';

const Charts = lazyModule(async () => ({ default: (await import('./components/Charts')).Charts }), 'Gráficos');
const DataTables = lazyModule(async () => ({ default: (await import('./components/DataTables')).DataTables }), 'Tabelas');

type TabKey = 'geral' | 'fluxo' | 'pagarReceber' | 'vencidos' | 'rankings' | 'inconsistencias' | 'tabela';
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const tabs: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: 'geral', label: 'Visão Geral', icon: <LayoutGrid size={16} /> },
  { key: 'fluxo', label: 'Fluxo Financeiro', icon: <BarChart3 size={16} /> },
  { key: 'pagarReceber', label: 'A Pagar x A Receber', icon: <WalletCards size={16} /> },
  { key: 'vencidos', label: 'Vencidos', icon: <AlertTriangle size={16} /> },
  { key: 'rankings', label: 'Rankings', icon: <BarChart3 size={16} /> },
  { key: 'inconsistencias', label: 'Inconsistências', icon: <Activity size={16} /> },
  { key: 'tabela', label: 'Tabela Analítica', icon: <Table2 size={16} /> },
];

const overviewKpis: KpiKey[] = ['totalFinanceiro', 'totalPagar', 'totalReceber', 'saldoLiquido', 'totalAberto', 'valorVencidoAberto', 'totalBaixado', 'quantidadeTitulos'];
const fluxoKpis: KpiKey[] = ['totalFinanceiro', 'valorBaixa', 'diferencaRateadoBaixado', 'percentualBaixado'];
const pagarReceberKpis: KpiKey[] = ['totalPagar', 'totalReceber', 'saldoLiquido', 'quantidadeTitulos'];
const vencidosKpis: KpiKey[] = ['valorVencidoAberto', 'titulosVencidosAberto', 'maiorAtrasoDias', 'mediaDiasAtraso'];
const inconsistenciaKpis: KpiKey[] = ['titulosValorZerado'];

export function BIDashboard({ user, activeEmpresa, onStopImpersonate, onLogout }: { user: AuthUser, activeEmpresa: any, onStopImpersonate?: () => void, onLogout: () => void }) {
  const initialSidebarOpen = typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1025px)').matches;
  const [passwordModal, setPasswordModal] = useState(false);
  const [installHelp, setInstallHelp] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<Filters>(defaultFilters);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('geral');
  const [refreshKey, setRefreshKey] = useState(0);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('year');
  const [comparisonBasis, setComparisonBasis] = useState<ComparisonBasis>('range');
  const comparison = useMemo(() => comparisonPresentation(filters, comparisonMode, comparisonBasis), [filters, comparisonMode, comparisonBasis]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const exportRequest = useRef<AbortController | null>(null);
  const data = useDashboardData(filters, activeTab, refreshKey, Boolean(user));

  useEffect(() => {
    setExportError('');
    setExporting(false);
    return () => {
      exportRequest.current?.abort();
      exportRequest.current = null;
    };
  }, [filters, activeTab]);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const activeFilters = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      const base = (defaultFilters as any)[key];
      return Array.isArray(value) ? value.length > 0 : value && value !== base;
    }).length;
  }, [filters]);

  const applyFilters = () => { if (!dateFilterError(draftFilters)) setFilters(draftFilters); };
  const resetFilters = () => {
    setDraftFilters(defaultFilters);
    setFilters(defaultFilters);
  };
  const chartFilter = (field: keyof Filters, value: string) => {
    const apply = (old: Filters) => {
      const current = old[field];
      if (Array.isArray(current)) return { ...old, [field]: current.includes(value) ? current : [...current, value] };
      return { ...old, [field]: value };
    };
    setFilters(apply);
    setDraftFilters(apply);
  };
  const clearContextFilter = (field: keyof Filters, value?: string) => {
    const apply = (old: Filters) => {
      const current = old[field];
      if (Array.isArray(current)) return { ...old, [field]: value ? current.filter((item) => item !== value) : [] };
      return { ...old, [field]: (defaultFilters as any)[field] };
    };
    setFilters(apply);
    setDraftFilters(apply);
  };

  const insights = buildInsights(data, activeFilters);
  const inconsistencyCounts = countInconsistencies(data.inconsistencias.data);
  const quality = qualitySummary(data.inconsistenciasResumo.data);

  const logoUrl = safeLogoReference(activeEmpresa?.logo_url) || safeLogoReference(user.empresa?.logo_url) || '/logo_equilibrioti.png';
  const empresaNome = activeEmpresa?.nome || user.empresa?.nome || 'Equilíbrio TI';

  const installApp = async () => {
    if (!installPrompt) {
      setInstallHelp(true);
      return;
    }
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const exportData = async () => {
    exportRequest.current?.abort();
    const controller = new AbortController();
    exportRequest.current = controller;
    setExportError('');
    setExporting(true);
    try {
      await downloadTitulosExport(filters, { signal: controller.signal });
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
    <div className={`app ${theme} ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      <Sidebar open={sidebarOpen} user={user} onClose={() => setSidebarOpen(false)} onLogout={onLogout} onChangePassword={() => setPasswordModal(true)} />
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <button className="icon-button" onClick={() => setSidebarOpen((value) => !value)} aria-label="Alternar menu">
              <Menu size={20} />
            </button>
            <img src={logoUrl} alt={empresaNome} style={{ maxHeight: '40px', maxWidth: '200px', objectFit: 'contain' }} />
          </div>
          <div className="top-actions">
            {onStopImpersonate && (
              <button className="ghost-button" onClick={onStopImpersonate}>
                <LogOut size={18} /> Voltar ao Painel Admin
              </button>
            )}
            <div className={`update-status ${data.isUpdating ? 'updating' : ''}`}>
              <RefreshCw size={14} />
              <span>{data.isUpdating ? data.refreshingLabel : data.failedCount ? `${data.failedCount} ${data.failedCount === 1 ? 'consulta indisponível' : 'consultas indisponíveis'}` : data.lastUpdated ? `Consulta concluída: ${formatLastUpdate(data.lastUpdated)}` : 'Consulta por bloco'}</span>
            </div>
            <button className="ghost-button" onClick={installApp}>Instalar app</button>
            <button className="ghost-button mobile-only" onClick={() => setMobileFilters(true)}>
              <Filter size={18} /> Filtros {activeFilters ? `(${activeFilters})` : ''}
            </button>
            {activeTab !== 'tabela' && <button className="ghost-button" onClick={exportData} disabled={exporting}>
              <Download size={18} /> {exporting ? 'Exportando...' : 'Exportar'}
            </button>}
            <button className={`ghost-button ${data.isUpdating ? 'is-refreshing' : ''}`} onClick={() => setRefreshKey((key) => key + 1)}>
              <RefreshCw size={18} /> {data.isUpdating ? 'Atualizando...' : 'Atualizar dados'}
            </button>
            <button className="icon-button" onClick={() => setTheme((value) => value === 'light' ? 'dark' : 'light')} aria-label="Alternar tema">
              {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
            </button>
          </div>
        </header>

        <main className="content">
          <section className="desktop-filters">
            <div className="filters-collapse">
              <button className="filters-collapse-toggle" onClick={() => setFiltersOpen((value) => !value)}>
                <Filter size={16} />
                <span>Filtros globais</span>
                  <strong>{activeFilters ? `${activeFilters} aplicados` : 'Sem filtros aplicados'}</strong>
              </button>
              {filtersOpen && <FilterPanel filters={draftFilters} appliedFilters={filters} onChange={setDraftFilters} onApply={applyFilters} onClear={resetFilters} activeFilters={activeFilters} />}
            </div>
          </section>

          {mobileFilters && (
            <div className="drawer-backdrop" onClick={() => setMobileFilters(false)}>
              <aside className="filter-drawer" onClick={(event) => event.stopPropagation()}>
                <div className="drawer-title">
                  <strong>Filtros</strong>
                  <button className="icon-button" onClick={() => setMobileFilters(false)}><X size={18} /></button>
                </div>
                <FilterPanel filters={draftFilters} appliedFilters={filters} onChange={setDraftFilters} onApply={applyFilters} onClear={resetFilters} activeFilters={activeFilters} />
              </aside>
            </div>
          )}

          <section className="hero-strip">
            <div>
              <span className="eyebrow"><Building2 size={15} /> Empresas unificadas</span>
              <h1>Visão executiva dos títulos financeiros</h1>
            </div>
            <div className="status-pill"><Activity size={16} /> {activeFilters ? `${activeFilters} filtros ativos` : 'Base completa'}</div>
          </section>

          <nav className="dashboard-tabs" aria-label="Seções do dashboard">
            {tabs.map((tab) => (
              <button key={tab.key} className={activeTab === tab.key ? 'active' : ''} onClick={() => setActiveTab(tab.key)}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {exportError && <div className="error-box" role="alert">{exportError}</div>}
          {(data.refreshingLabel || data.lastUpdated || data.failedCount > 0) && <div className="cache-note">{data.refreshingLabel || (data.failedCount ? 'Consulta parcial: alguns blocos estão indisponíveis.' : `Consulta concluída em ${formatLastUpdate(data.lastUpdated)}`)}</div>}
          <ActiveFilterChips filters={filters} onRemove={(next) => { setFilters(next); setDraftFilters(next); }} onClear={resetFilters} />
          {['geral', 'fluxo', 'pagarReceber', 'vencidos', 'inconsistencias'].includes(activeTab) && <ComparisonControls filters={filters} comparison={comparison} onMode={setComparisonMode} onBasis={setComparisonBasis} />}

          {activeTab === 'geral' && (
            <TabPanel eyebrow="Visão Geral" title="Resumo executivo" subtitle="Os indicadores mais importantes aparecem primeiro; análises detalhadas ficam nas abas ao lado.">
              <KpiCards filters={filters} comparison={comparison} state={data.blocks.kpis} retry={() => data.retry('kpis')} data={data.kpis.data} loading={data.kpis.loading} keys={overviewKpis} emphasis />
              <ExecutiveInsights insights={insights} quality={quality} state={data.blocks.inconsistenciasResumo} retry={() => data.retry('inconsistenciasResumo')} onDetails={() => setActiveTab('inconsistencias')} />
              <Charts blocks={data.blocks} retry={data.retry} data={data.charts.data} rankings={data.rankings.data} loading={data.charts.loading} filters={filters} onFilter={chartFilter} onClearFilter={clearContextFilter} visible={['evolucaoVencimento', 'pagarReceber', 'status', 'coligadas', 'topClientes', 'rankCentros', 'rankNaturezas', 'faixasVencimento']} />
            </TabPanel>
          )}

          {activeTab === 'fluxo' && (
            <TabPanel eyebrow="Fluxo Financeiro" title="Previsto, realizado e encargos" subtitle="Acompanhe vencimentos, baixas, realizado financeiro e sazonalidade mensal.">
              <RemoteBlock state={data.blocks.kpis} title="Resumo financeiro" retry={() => data.retry('kpis')}><div className="analysis-grid">
                <MiniMetric title="Rateio no recorte" value={data.kpis.data.totalFinanceiro} type="money" icon={<CalendarClock />} />
                <MiniMetric title="Baixa no recorte" value={data.kpis.data.valorBaixa} type="money" icon={<WalletCards />} />
                <MiniMetric title="Diferença rateio x baixa" value={data.kpis.data.diferencaRateadoBaixado} type="money" icon={<BarChart3 />} />
                <MiniMetric title="Razão baixa / rateio" value={data.kpis.data.percentualBaixado} type="percent" icon={<Activity />} />
              </div></RemoteBlock>
              <KpiCards filters={filters} comparison={comparison} state={data.blocks.kpis} retry={() => data.retry('kpis')} data={data.kpis.data} loading={data.kpis.loading} keys={fluxoKpis} />
              <Charts blocks={data.blocks} retry={data.retry} data={data.charts.data} rankings={data.rankings.data} loading={data.charts.loading} filters={filters} onFilter={chartFilter} onClearFilter={clearContextFilter} visible={['evolucaoVencimento', 'evolucaoBaixa', 'previstoRealizado', 'encargosMes', 'matrizCalor']} />
            </TabPanel>
          )}

          {activeTab === 'pagarReceber' && (
            <TabPanel eyebrow="A Pagar x A Receber" title="Comparativos por tipo financeiro" subtitle="Compare compromissos, recebimentos e saldo líquido por tempo, empresa e dimensões financeiras.">
              <KpiCards filters={filters} comparison={comparison} state={data.blocks.kpis} retry={() => data.retry('kpis')} data={data.kpis.data} loading={data.kpis.loading} keys={pagarReceberKpis} emphasis />
              <Charts blocks={data.blocks} retry={data.retry} data={data.charts.data} rankings={data.rankings.data} loading={data.charts.loading} filters={filters} onFilter={chartFilter} onClearFilter={clearContextFilter} visible={['evolucaoVencimento', 'pagarReceber', 'coligadas', 'rankCentros', 'rankNaturezas']} />
              <DataTables blocks={data.blocks} retry={data.retry} filters={filters} rankings={data.rankings.data} chartRankings={data.charts.data} vencidos={data.vencidos.data} inconsistencias={data.inconsistencias.data} mode="pagarReceber" />
            </TabPanel>
          )}

          {activeTab === 'vencidos' && (
            <TabPanel eyebrow="Vencidos" title="Risco, atraso e carteira em aberto" subtitle="Foco em títulos vencidos, faixas de atraso e lista operacional para acompanhamento.">
              <KpiCards filters={filters} comparison={comparison} state={data.blocks.kpis} retry={() => data.retry('kpis')} data={data.kpis.data} loading={data.kpis.loading} keys={vencidosKpis} emphasis />
              <div className="analysis-grid">
                <MiniMetric state={data.blocks.clientes} retry={() => data.retry('clientes')} title="Cliente com maior valor" value={data.rankings.data.clientes?.[0]?.nome || 'Sem registros'} icon={<WalletCards />} />
                <MiniMetric state={data.blocks.analises} retry={() => data.retry('analises')} title="Centro com maior vencido" value={data.analytics.data.centroMaiorValorVencido || 'Sem registros'} icon={<Building2 />} />
                <MiniMetric state={data.blocks.analises} retry={() => data.retry('analises')} title="Valor do centro crítico" value={data.analytics.data.valorCentroMaiorVencido} type="money" icon={<AlertTriangle />} />
                <MiniMetric state={data.blocks.vencidos} retry={() => data.retry('vencidos')} title="Registros vencidos exibidos" value={fmtInt(data.vencidos.data.length)} icon={<Table2 />} />
              </div>
              <Charts blocks={data.blocks} retry={data.retry} data={data.charts.data} rankings={data.rankings.data} loading={data.charts.loading} filters={filters} onFilter={chartFilter} onClearFilter={clearContextFilter} visible={['faixasVencimento', 'topClientes']} />
              <DataTables blocks={data.blocks} retry={data.retry} filters={filters} rankings={data.rankings.data} chartRankings={data.charts.data} vencidos={data.vencidos.data} inconsistencias={data.inconsistencias.data} mode="vencidos" />
            </TabPanel>
          )}

          {activeTab === 'rankings' && (
            <TabPanel eyebrow="Rankings" title="Dimensões mais representativas" subtitle="Rankings de clientes, centros de custo, naturezas, contas, tipos de documento e origem.">
              <Charts blocks={data.blocks} retry={data.retry} data={data.charts.data} rankings={data.rankings.data} loading={data.charts.loading} filters={filters} onFilter={chartFilter} onClearFilter={clearContextFilter} visible={['topClientes', 'rankCentros', 'rankNaturezas', 'contas', 'tiposDocumento', 'origens']} />
              <DataTables blocks={data.blocks} retry={data.retry} filters={filters} rankings={data.rankings.data} chartRankings={data.charts.data} vencidos={data.vencidos.data} inconsistencias={data.inconsistencias.data} mode="rankings" />
            </TabPanel>
          )}

          {activeTab === 'inconsistencias' && (
            <TabPanel eyebrow="Inconsistências" title="Alertas cadastrais e financeiros" subtitle="Pontos de atenção para saneamento de dados e validação operacional.">
              <RemoteBlock state={data.blocks.inconsistenciasResumo} title="Resumo de inconsistências" retry={() => data.retry('inconsistenciasResumo')}><div className="analysis-grid">
                <MiniMetric title="Total de inconsistências" value={fmtInt(quality.total)} icon={<AlertTriangle />} />
                <MiniMetric title="Críticas" value={fmtInt(quality.critico)} icon={<AlertTriangle />} />
                <MiniMetric title="Atenção" value={fmtInt(quality.atencao)} icon={<CalendarClock />} />
                <MiniMetric title="Informativas" value={fmtInt(quality.informativo)} icon={<Activity />} />
              </div></RemoteBlock>
              <section className="help-card">
                <h3>O que são inconsistências?</h3>
                <p>Inconsistências são pontos de atenção identificados automaticamente nos dados financeiros. Elas não significam necessariamente erro no sistema, mas indicam registros que merecem conferência porque podem afetar indicadores, análises ou cadastros.</p>
              </section>
              <RemoteBlock state={data.blocks.inconsistenciasResumo} title="Gráficos de inconsistências" retry={() => data.retry('inconsistenciasResumo')} empty={!data.inconsistenciasResumo.data.length}><InconsistencyCharts rows={data.inconsistenciasResumo.data} /></RemoteBlock>
              <KpiCards filters={filters} comparison={comparison} state={data.blocks.kpis} retry={() => data.retry('kpis')} data={data.kpis.data} loading={data.kpis.loading} keys={inconsistenciaKpis} />
              <DataTables blocks={data.blocks} retry={data.retry} filters={filters} rankings={data.rankings.data} chartRankings={data.charts.data} vencidos={data.vencidos.data} inconsistencias={data.inconsistencias.data} mode="inconsistencias" />
            </TabPanel>
          )}

          {activeTab === 'tabela' && (
            <TabPanel eyebrow="Tabela Analítica" title="Consulta detalhada de títulos" subtitle="Tabela paginada no servidor com busca, ordenação, seleção de colunas, exportação e linhas expansíveis.">
              <DataTables key={refreshKey} filters={filters} rankings={data.rankings.data} chartRankings={data.charts.data} vencidos={data.vencidos.data} inconsistencias={data.inconsistencias.data} mode="analitica" />
            </TabPanel>
          )}
        </main>

        <footer>Desenvolvido por Equilíbrio TI</footer>
      </div>
      {passwordModal && <ChangePasswordModal onClose={() => setPasswordModal(false)} />}
      {installHelp && <InstallHelpModal onClose={() => setInstallHelp(false)} />}
    </div>
  );
}

function TabPanel({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="tab-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow"><Activity size={15} /> {eyebrow}</span>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ExecutiveInsights({ insights, quality, state, retry, onDetails }: { insights: { title: string; value: string; tone: string; state?: BlockState; retry?: () => void }[]; quality: ReturnType<typeof qualitySummary>; state?: BlockState; retry?: () => void; onDetails: () => void }) {
  return (
    <section className="insights-card insights-layout">
      <div>
        <span className="eyebrow"><Activity size={15} /> Insights executivos</span>
        <h3>Leitura rápida da carteira financeira</h3>
      </div>
      <div className="insights-grid">
        {insights.map((insight) => (
          <article key={insight.title} className={`insight-item tone-${insight.tone}`}>
            <span>{insight.title}</span>
            <RemoteBlock state={insight.state} title={insight.title} retry={insight.retry}><strong>{insight.value}</strong></RemoteBlock>
          </article>
        ))}
      </div>
      <article className="quality-card">
        <div>
          <span className="eyebrow"><AlertTriangle size={15} /> Qualidade dos dados</span>
          <h3>Validações encontradas na base financeira filtrada</h3>
          <p>Inconsistências são registros que precisam de conferência, como títulos baixados sem data de baixa, valores zerados, vencimentos ausentes ou cadastros incompletos.</p>
        </div>
        <RemoteBlock state={state} title="Qualidade dos dados" retry={retry}><div className="quality-grid">
          <strong>Críticas: {fmtInt(quality.critico)}</strong>
          <strong>Atenção: {fmtInt(quality.atencao)}</strong>
          <strong>Informativas: {fmtInt(quality.informativo)}</strong>
          <strong>Total: {fmtInt(quality.total)}</strong>
        </div></RemoteBlock>
        <button className="ghost-button" onClick={onDetails}>Ver detalhes</button>
      </article>
    </section>
  );
}

function MiniMetric({ title, value, type, icon, state, retry }: { title: string; value: any; type?: 'money' | 'percent'; icon: ReactNode; state?: BlockState; retry?: () => void }) {
  const formatted = value === null || value === undefined || (type && finiteValue(value) === null) ? 'Indisponível' : type === 'money'
    ? fmtMoney(value)
    : type === 'percent'
      ? fmtPercent(value)
      : value;
  return <article className="mini-metric"><div>{icon}</div><span>{title}</span><RemoteBlock state={state} title={title} retry={retry}><strong>{formatted}</strong></RemoteBlock></article>;
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (newPassword !== confirmPassword) {
      setError('A confirmação da nova senha não confere.');
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setMessage('Senha alterada com sucesso.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível alterar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="password-modal" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span className="eyebrow">Segurança</span>
            <h3>Alterar senha</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose}><X size={18} /></button>
        </header>
        <label>
          Senha atual
          <span className="login-input">
            <input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
            <button type="button" onClick={() => setShowCurrent((value) => !value)}>{showCurrent ? 'Ocultar' : 'Mostrar'}</button>
          </span>
        </label>
        <label>
          Nova senha
          <span className="login-input">
            <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required />
            <button type="button" onClick={() => setShowNew((value) => !value)}>{showNew ? 'Ocultar' : 'Mostrar'}</button>
          </span>
        </label>
        <label>
          Confirmar nova senha
          <span className="login-input">
            <input type={showNew ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required />
          </span>
        </label>
        {error && <div className="login-error">{error}</div>}
        {message && <div className="login-success">{message}</div>}
        <button className="login-submit" disabled={loading}>{loading ? 'Alterando...' : 'Salvar nova senha'}</button>
      </form>
    </div>
  );
}

function InstallHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="password-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span className="eyebrow">Instalação</span>
            <h3>Instalar Equilíbrio BI</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose}><X size={18} /></button>
        </header>
        <p className="install-help-text">
          O aplicativo já está preparado como PWA. Para o navegador liberar a instalação automática, a página precisa estar em HTTPS com certificado válido.
        </p>
        <p className="install-help-text">
          Enquanto estiver acessando por IP em HTTP, use o menu do navegador para criar um atalho quando disponível. Para instalação completa no Windows e celular, configure um domínio com HTTPS.
        </p>
        <button className="login-submit" onClick={onClose}>Entendi</button>
      </section>
    </div>
  );
}

function buildInsights(data: ReturnType<typeof useDashboardData>, activeFilters: number) {
  const kpis = data.kpis.data;
  const totalAberto = kpis.totalAberto;
  const valorVencido = kpis.valorVencidoAberto;
  const empresa = largestValue(data.charts.data.coligadas || []);
  const cliente = data.rankings.data.clientes?.[0];
  const centro = data.rankings.data.centros?.[0];

  return [
    { title: 'Valor vencido em aberto', value: finiteValue(valorVencido) === null ? 'Indisponível' : fmtMoney(valorVencido), tone: 'red', state: data.blocks.kpis, retry: () => data.retry('kpis') },
    { title: '% vencido sobre aberto', value: fmtPercent(positiveBaseRatio(valorVencido, totalAberto)), tone: 'amber', state: data.blocks.kpis, retry: () => data.retry('kpis') },
    { title: 'Empresa com maior volume', value: empresa ? `${safe(empresa.nome)} · ${fmtMoney(empresa.valor)}` : 'Sem registros', tone: 'blue', state: data.blocks.coligadas, retry: () => data.retry('coligadas') },
    { title: 'Cliente/fornecedor líder', value: cliente ? `${safe(cliente.nome)} · ${fmtMoney(cliente.totalRateio)}` : 'Sem registros', tone: 'green', state: data.blocks.clientes, retry: () => data.retry('clientes') },
    { title: 'Centro mais representativo', value: centro ? `${safe(centro.nome)} · ${fmtMoney(centro.totalRateio)}` : 'Sem registros', tone: 'neutral', state: data.blocks.centros, retry: () => data.retry('centros') },
    { title: 'Filtros ativos', value: activeFilters ? `${activeFilters} filtros aplicados` : 'Visão da base completa', tone: 'blue' },
  ].slice(0, 5);
}

function countInconsistencies(rows: any[]) {
  return rows.reduce((acc, row) => {
    const tipo = String(row.tipo || '');
    if (tipo.includes('zerado')) acc.zerado += 1;
    if (tipo.includes('Baixado sem data')) acc.baixadoSemData += 1;
    if (tipo.includes('Em aberto com data')) acc.abertoComData += 1;
    if (tipo.includes('Baixa maior')) acc.baixaMaior += 1;
    return acc;
  }, { zerado: 0, baixadoSemData: 0, abertoComData: 0, baixaMaior: 0 });
}

function ActiveFilterChips({ filters, onRemove, onClear }: { filters: Filters; onRemove: (filters: Filters) => void; onClear: () => void }) {
  const chips: { key: keyof Filters; label: string; value: string }[] = [];
  const add = (key: keyof Filters, label: string, value: any) => {
    if (Array.isArray(value)) value.forEach((item) => chips.push({ key, label, value: item }));
    else if (value && value !== 'Todas' && value !== 'Todos') chips.push({ key, label, value });
  };
  add('coligada', 'Empresa', filters.coligada);
  add('tipo', 'Tipo', filters.tipo);
  add('statusFin', 'Status', filters.statusFin);
  add('statusBaixa', 'Baixa', filters.statusBaixa);
  add('clientes', 'Cliente', filters.clientes);
  add('centrosCusto', 'Centro', filters.centrosCusto);
  add('naturezas', 'Natureza', filters.naturezas);
  add('tiposDocumento', 'Documento', filters.tiposDocumento);
  add('contas', 'Conta', filters.contas);
  add('origens', 'Origem', filters.origens);
  if (!chips.length) return null;
  return (
    <section className="active-chips">
      <span>Filtros ativos:</span>
      {chips.map((chip) => (
        <button key={`${chip.key}-${chip.value}`} onClick={() => {
          const current = filters[chip.key];
          const next = Array.isArray(current)
            ? { ...filters, [chip.key]: current.filter((item) => item !== chip.value) }
            : { ...filters, [chip.key]: (defaultFilters as any)[chip.key] };
          onRemove(next);
        }}>{chip.label}: {chip.value} <b>x</b></button>
      ))}
      <button className="clear-chip" onClick={onClear}>Limpar todos</button>
    </section>
  );
}

function InconsistencyCharts({ rows }: { rows: any[] }) {
  const bySeverity = ['Crítico', 'Atenção', 'Informativo'].map((sev) => ({ name: sev, count: rows.filter((row) => row.severidade === sev).reduce((sum, row) => sum + Number(row.quantidade || 0), 0) }));
  const topTypes = [...rows].sort((a, b) => Number(b.quantidade || 0) - Number(a.quantidade || 0)).slice(0, 8);
  return (
    <section className="quality-breakdown">
      <article className="table-card small">
        <div className="table-toolbar"><div><strong>Gráfico por severidade</strong><span>Resumo das validações por criticidade</span></div></div>
        <div className="severity-bars">{bySeverity.map((item) => <div key={item.name}><span>{item.name}</span><strong>{fmtInt(item.count)}</strong><i style={{ width: `${Math.min(100, item.count / Math.max(1, bySeverity[0].count) * 100)}%` }} /></div>)}</div>
      </article>
      <article className="table-card small">
        <div className="table-toolbar"><div><strong>Tipos de inconsistência</strong><span>Regras com maior volume</span></div></div>
        <div className="severity-bars">{topTypes.map((item) => <div key={item.tipo}><span>{item.tipo}</span><strong>{fmtInt(item.quantidade)}</strong><i style={{ width: `${Math.min(100, Number(item.quantidade || 0) / Math.max(1, Number(topTypes[0]?.quantidade || 1)) * 100)}%` }} /></div>)}</div>
      </article>
    </section>
  );
}

function formatLastUpdate(value?: number) {
  if (!value) return 'ainda não carregado';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));
}
