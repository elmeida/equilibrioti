import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiGet, Filters } from '../services/api';

export type DashboardTab = 'geral' | 'fluxo' | 'pagarReceber' | 'vencidos' | 'rankings' | 'inconsistencias' | 'tabela';
type LoadState<T> = { data: T; loading: boolean; error: string; fromCache?: boolean; updatedAt?: number };

const emptyState = <T,>(data: T): LoadState<T> => ({ data, loading: false, error: '' });
const chartsInitial: Record<string, any[]> = {};

const tabEndpoints: Record<DashboardTab, string[]> = {
  geral: ['kpis', 'evolucaoVencimento', 'pagarReceber', 'status', 'coligadas', 'faixasVencimento', 'clientes', 'centros', 'naturezas', 'analises', 'inconsistenciasResumo'],
  fluxo: ['kpis', 'evolucaoVencimento', 'evolucaoBaixa', 'previstoRealizado', 'encargosMes', 'matrizCalor'],
  pagarReceber: ['kpis', 'evolucaoVencimento', 'pagarReceber', 'coligadas', 'centros', 'naturezas'],
  vencidos: ['kpis', 'faixasVencimento', 'clientes', 'centros', 'analises', 'vencidos'],
  rankings: ['clientes', 'centros', 'naturezas', 'contas', 'tiposDocumento', 'origens'],
  inconsistencias: ['kpis', 'inconsistenciasResumo', 'inconsistencias'],
  tabela: [],
};

const endpointMap: Record<string, string> = {
  kpis: '/api/titulos/kpis',
  evolucaoVencimento: '/api/titulos/graficos/evolucao-vencimento',
  evolucaoBaixa: '/api/titulos/graficos/evolucao-baixa',
  pagarReceber: '/api/titulos/graficos/pagar-receber',
  status: '/api/titulos/graficos/status',
  coligadas: '/api/titulos/graficos/coligadas',
  contas: '/api/titulos/graficos/contas',
  tiposDocumento: '/api/titulos/graficos/tiposDocumento',
  origens: '/api/titulos/graficos/origens',
  faixasVencimento: '/api/titulos/graficos/faixasVencimento',
  matrizCalor: '/api/titulos/graficos/matrizCalor',
  comparativoColigadas: '/api/titulos/graficos/comparativoColigadas',
  encargosMes: '/api/titulos/graficos/encargosMes',
  previstoRealizado: '/api/titulos/graficos/previstoRealizado',
  clientes: '/api/titulos/rankings/clientes',
  centros: '/api/titulos/rankings/centros-custo',
  naturezas: '/api/titulos/rankings/naturezas',
  analises: '/api/titulos/analises',
  vencidos: '/api/titulos/vencidos',
  inconsistencias: '/api/titulos/inconsistencias/v2',
  inconsistenciasResumo: '/api/titulos/inconsistencias/resumo',
};

export function useDashboardData(filters: Filters, activeTab: DashboardTab, refreshKey: number) {
  const abortRef = useRef<AbortController | null>(null);
  const loadedSignatureRef = useRef('');
  const [refreshingLabel, setRefreshingLabel] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | undefined>();
  const [state, setState] = useState({
    kpis: emptyState<Record<string, number | string>>({}),
    charts: emptyState<Record<string, any[]>>(chartsInitial),
    rankings: emptyState<Record<string, any[]>>({}),
    analytics: emptyState<Record<string, number | string>>({}),
    vencidos: emptyState<any[]>([]),
    inconsistencias: emptyState<any[]>([]),
    inconsistenciasResumo: emptyState<any[]>([]),
  });

  const load = useCallback(async (force = false) => {
    const endpoints = tabEndpoints[activeTab];
    if (endpoints.length === 0) return;
    const signature = `${activeTab}:${JSON.stringify(filters)}`;
    if (!force && loadedSignatureRef.current === signature) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsUpdating(true);
    setRefreshingLabel(force ? `Atualizando ${tabLabel(activeTab)}...` : `Carregando ${tabLabel(activeTab)}...`);
    setLoadingFor(endpoints, setState, true);
    try {
      const failures: Error[] = [];
      await Promise.all(endpoints.map(async (key) => {
        try {
          const data = await apiGet<any>(endpointMap[key], filters, undefined, {
            signal: controller.signal,
            refresh: force,
            storage: key === 'kpis' || key === 'inconsistenciasResumo',
          });
          if (!controller.signal.aborted) {
            setState((old) => mergeLoaded(old, { [key]: data }, [key]));
          }
        } catch (err) {
          if ((err as Error).name !== 'AbortError') failures.push(err as Error);
        }
      }));
      if (controller.signal.aborted) return;
      loadedSignatureRef.current = signature;
      setLastUpdated(Date.now());
      if (failures.length) throw failures[0];
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const error = err instanceof Error ? err.message : `Não foi possível carregar ${tabLabel(activeTab)} agora.`;
      setErrorFor(endpoints, setState, error);
    } finally {
      setIsUpdating(false);
      setRefreshingLabel('');
    }
  }, [filters, activeTab]);

  useEffect(() => {
    load(refreshKey > 0);
    return () => abortRef.current?.abort();
  }, [load, refreshKey]);

  return useMemo(() => ({ ...state, reload: () => load(true), refreshingLabel, isUpdating, lastUpdated }), [state, load, refreshingLabel, isUpdating, lastUpdated]);
}

function mergeLoaded(old: any, loaded: Record<string, any>, endpoints: string[]) {
  const next = { ...old };
  const charts = { ...old.charts.data };
  const rankings = { ...old.rankings.data };
  const now = Date.now();

  for (const key of endpoints) {
    if (key === 'kpis') next.kpis = { data: loaded[key], loading: false, error: '', updatedAt: now };
    else if (key === 'analises') next.analytics = { data: loaded[key], loading: false, error: '', updatedAt: now };
    else if (key === 'vencidos') next.vencidos = { data: loaded[key], loading: false, error: '', updatedAt: now };
    else if (key === 'inconsistencias') next.inconsistencias = { data: loaded[key], loading: false, error: '', updatedAt: now };
    else if (key === 'inconsistenciasResumo') next.inconsistenciasResumo = { data: loaded[key], loading: false, error: '', updatedAt: now };
    else if (['clientes', 'centros', 'naturezas'].includes(key)) {
      rankings[key] = loaded[key];
      charts.topClientes = key === 'clientes' ? loaded[key].map((row: any) => ({ nome: row.nome, valor: row.totalRateio, quantidade: row.quantidade })) : charts.topClientes;
    } else {
      charts[key] = loaded[key];
    }
  }

  next.charts = { data: charts, loading: false, error: '', updatedAt: now };
  next.rankings = { data: rankings, loading: false, error: '', updatedAt: now };
  return next;
}

function setLoadingFor(endpoints: string[], setState: any, loading: boolean) {
  setState((old: any) => ({
    ...old,
    kpis: endpoints.includes('kpis') ? { ...old.kpis, loading, error: '' } : old.kpis,
    charts: endpoints.some((key) => !['kpis', 'analises', 'clientes', 'centros', 'naturezas', 'vencidos', 'inconsistencias', 'inconsistenciasResumo'].includes(key)) ? { ...old.charts, loading, error: '' } : old.charts,
    rankings: endpoints.some((key) => ['clientes', 'centros', 'naturezas'].includes(key)) ? { ...old.rankings, loading, error: '' } : old.rankings,
    analytics: endpoints.includes('analises') ? { ...old.analytics, loading, error: '' } : old.analytics,
    vencidos: endpoints.includes('vencidos') ? { ...old.vencidos, loading, error: '' } : old.vencidos,
    inconsistencias: endpoints.includes('inconsistencias') ? { ...old.inconsistencias, loading, error: '' } : old.inconsistencias,
    inconsistenciasResumo: endpoints.includes('inconsistenciasResumo') ? { ...old.inconsistenciasResumo, loading, error: '' } : old.inconsistenciasResumo,
  }));
}

function setErrorFor(endpoints: string[], setState: any, error: string) {
  setState((old: any) => ({
    ...old,
    kpis: endpoints.includes('kpis') ? { ...old.kpis, loading: false, error } : old.kpis,
    charts: { ...old.charts, loading: false, error },
    rankings: { ...old.rankings, loading: false, error },
    analytics: { ...old.analytics, loading: false, error },
    vencidos: { ...old.vencidos, loading: false, error },
    inconsistencias: { ...old.inconsistencias, loading: false, error },
    inconsistenciasResumo: { ...old.inconsistenciasResumo, loading: false, error },
  }));
}

function tabLabel(tab: DashboardTab) {
  const labels: Record<DashboardTab, string> = {
    geral: 'Visão Geral',
    fluxo: 'Fluxo Financeiro',
    pagarReceber: 'A Pagar x A Receber',
    vencidos: 'Vencidos',
    rankings: 'Rankings',
    inconsistencias: 'Inconsistências',
    tabela: 'Tabela Analítica',
  };
  return labels[tab];
}
