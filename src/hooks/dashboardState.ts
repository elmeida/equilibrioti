export type BlockState = { status: 'idle' | 'loading' | 'success' | 'error'; data?: any; error?: string; updatedAt?: number };
export type DashboardState = { scope: string; blocks: Record<string, BlockState> };
export const endpointMap: Record<string, string> = {
  kpis: '/api/titulos/kpis', evolucaoVencimento: '/api/titulos/graficos/evolucao-vencimento',
  evolucaoBaixa: '/api/titulos/graficos/evolucao-baixa', pagarReceber: '/api/titulos/graficos/pagar-receber',
  status: '/api/titulos/graficos/status', coligadas: '/api/titulos/graficos/coligadas', contas: '/api/titulos/graficos/contas',
  tiposDocumento: '/api/titulos/graficos/tiposDocumento', origens: '/api/titulos/graficos/origens',
  faixasVencimento: '/api/titulos/graficos/faixasVencimento', matrizCalor: '/api/titulos/graficos/matrizCalor',
  comparativoColigadas: '/api/titulos/graficos/comparativoColigadas', encargosMes: '/api/titulos/graficos/encargosMes',
  previstoRealizado: '/api/titulos/graficos/previstoRealizado', clientes: '/api/titulos/rankings/clientes',
  centros: '/api/titulos/rankings/centros-custo', naturezas: '/api/titulos/rankings/naturezas',
  analises: '/api/titulos/analises', vencidos: '/api/titulos/vencidos',
  inconsistencias: '/api/titulos/inconsistencias/v2', inconsistenciasResumo: '/api/titulos/inconsistencias/resumo',
};
export const tabEndpoints: Record<DashboardTab, string[]> = {
  geral: ['kpis', 'evolucaoVencimento', 'pagarReceber', 'status', 'coligadas', 'faixasVencimento', 'clientes', 'centros', 'naturezas', 'analises', 'inconsistenciasResumo'],
  fluxo: ['kpis', 'evolucaoVencimento', 'evolucaoBaixa', 'previstoRealizado', 'encargosMes', 'matrizCalor'],
  pagarReceber: ['kpis', 'evolucaoVencimento', 'pagarReceber', 'coligadas', 'centros', 'naturezas'],
  vencidos: ['kpis', 'faixasVencimento', 'clientes', 'centros', 'analises', 'vencidos'],
  rankings: ['clientes', 'centros', 'naturezas', 'contas', 'tiposDocumento', 'origens'],
  inconsistencias: ['kpis', 'inconsistenciasResumo', 'inconsistencias'], tabela: [],
};
export type DashboardTab = 'geral' | 'fluxo' | 'pagarReceber' | 'vencidos' | 'rankings' | 'inconsistencias' | 'tabela';
export const chartEndpoint = (id: string) => ({ topClientes: 'clientes', rankCentros: 'centros', rankNaturezas: 'naturezas' } as Record<string, string>)[id] || id;

export function pendingState(scope: string, keys: string[]): DashboardState {
  return { scope, blocks: Object.fromEntries(keys.map(key => [key, { status: 'loading' }])) };
}
export function replaceBlock(state: DashboardState, scope: string, key: string, block: BlockState): DashboardState {
  if (state.scope !== scope || !Object.prototype.hasOwnProperty.call(state.blocks, key)) return state;
  return { ...state, blocks: { ...state.blocks, [key]: block } };
}
export function validateBlock(key: string, value: unknown) {
  const object = key === 'kpis' || key === 'analises';
  if (object ? !value || typeof value !== 'object' || Array.isArray(value)
    : !Array.isArray(value) || value.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('Resposta indisponivel. Tente novamente.');
  return value;
}
export function projectDashboard(blocks: Record<string, BlockState>) {
  const block = <T,>(key: string, fallback: T) => {
    const current = blocks[key] || { status: 'idle' };
    return { ...current, data: (current.status === 'success' ? current.data : fallback) as T,
      loading: current.status === 'loading', error: current.status === 'error' ? current.error || 'Consulta indisponivel.' : '' };
  };
  const charts: Record<string, any[]> = {}, rankings: Record<string, any[]> = {};
  for (const key of Object.keys(blocks)) {
    if (['clientes', 'centros', 'naturezas'].includes(key)) rankings[key] = block<any[]>(key, []).data;
    else if (endpointMap[key]?.includes('/graficos/')) charts[key] = block<any[]>(key, []).data;
  }
  charts.topClientes = (rankings.clientes || []).map(row => ({ nome: row.nome, valor: row.totalRateio, quantidade: row.quantidade }));
  const values = Object.values(blocks);
  const isUpdating = values.some(item => item.status === 'loading');
  const failedCount = values.filter(item => item.status === 'error').length;
  const complete = values.length > 0 && values.every(item => item.status === 'success');
  return { blocks, kpis: block<Record<string, any>>('kpis', {}), analytics: block<Record<string, any>>('analises', {}),
    vencidos: block<any[]>('vencidos', []), inconsistencias: block<any[]>('inconsistencias', []),
    inconsistenciasResumo: block<any[]>('inconsistenciasResumo', []), charts: { data: charts, loading: isUpdating }, rankings: { data: rankings, loading: isUpdating },
    isUpdating, failedCount, lastUpdated: complete ? Math.max(...values.map(item => item.updatedAt || 0)) : undefined };
}
