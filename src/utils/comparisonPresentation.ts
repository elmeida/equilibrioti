import { planComparison, type ComparisonBasis, type ComparisonMode, type ComparisonPlan } from '../../server/analytics/comparisons.js';
import type { Filters } from '../services/api';

export type ComparisonPresentation = {
  status: 'disabled' | 'unavailable';
  reason: string;
  plan: ComparisonPlan | null;
  mode: ComparisonMode;
  basis: ComparisonBasis;
};
export const dateFieldLabels = { vencimento: 'Vencimento', emissao: 'Emissão', baixa: 'Baixa', criacao: 'Criação' };
export const civilLabel = (date: string) => date.split('-').reverse().join('/');
export function appliedPeriodLabel(filters: Pick<Filters, 'startDate' | 'endDate'>) {
  if (filters.startDate && filters.endDate) return `${civilLabel(filters.startDate)} a ${civilLabel(filters.endDate)}`;
  if (filters.startDate) return `Desde ${civilLabel(filters.startDate)}`;
  if (filters.endDate) return `Até ${civilLabel(filters.endDate)}`;
  return 'Sem limite de datas';
}
export function comparisonPresentation(filters: Filters, mode: ComparisonMode, basis: ComparisonBasis): ComparisonPresentation {
  const base = { mode, basis, plan: null };
  if (mode === 'none') return { ...base, status: 'disabled', reason: 'Sem comparação selecionada.' };
  if (!filters.startDate || !filters.endDate) return { ...base, status: 'unavailable', reason: 'O recorte não tem as duas datas definidas.' };
  try {
    const plan = planComparison({ start: filters.startDate, end: filters.endDate }, mode, basis);
    return { ...base, plan, status: 'unavailable', reason: 'A fonte ainda não informa cobertura comprovada e uma versão comum dos dados para os dois períodos.' };
  } catch {
    return { ...base, status: 'unavailable', reason: basis === 'month' ? 'O recorte mensal deve começar no dia 1 e terminar no mesmo mês, com período anterior dentro do calendário suportado.' : 'O período comparativo está fora do calendário suportado ou contém datas inválidas.' };
  }
}
export function comparisonWarnings(plan: ComparisonPlan | null) {
  if (!plan) return [];
  return [
    plan.warnings.includes('unequal-days') ? 'Durações diferentes; os totais não foram normalizados por dia.' : '',
    plan.warnings.includes('calendar-adjusted') ? 'Datas ajustadas ao calendário.' : '',
    plan.warnings.includes('overlapping-periods') ? 'Os períodos possuem datas em comum.' : '',
  ].filter(Boolean);
}
