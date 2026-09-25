import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CalendarCheck,
  Clock,
  FileText,
  Landmark,
  Percent,
  Receipt,
  Scale,
  TrendingDown,
  TrendingUp,
  Users,
  Info,
} from 'lucide-react';
import { fmtInt, fmtMoney, fmtPercent } from '../utils/format';
import { finiteValue } from '../utils/analytics';
import { RemoteBlock } from './RemoteBlock';
import type { BlockState } from '../hooks/dashboardState';
import { KpiHelp } from './KpiHelp';
import { defaultFilters, type Filters } from '../services/api';
import { comparisonPresentation, type ComparisonPresentation } from '../utils/comparisonPresentation';

export const kpiRegistry = {
  totalFinanceiro: ['Total financeiro', 'money', Banknote, 'Soma de VLRRATEIO nos filtros atuais.'],
  totalPagar: ['Total a pagar', 'money', TrendingDown, 'Soma de VLRRATEIO com PAGREC = A Pagar.'],
  totalReceber: ['Total a receber', 'money', TrendingUp, 'Soma de VLRRATEIO com PAGREC = A Receber.'],
  saldoLiquido: ['Diferença receber − pagar', 'money', Scale, 'Diferença entre os rateios a receber e a pagar. Não representa saldo bancário nem lucro.'],
  totalAberto: ['Rateio em aberto', 'money', Clock, 'Rateio das linhas com status Em Aberto; não inclui o residual de baixas parciais.'],
  totalBaixado: ['Rateio liquidado', 'money', CalendarCheck, 'Rateio das linhas com status Baixado. Não equivale ao caixa recebido/pago.'],
  totalBaixadoParcialmente: ['Baixado parcialmente', 'money', Percent, 'Soma de VLRRATEIO com STATUS_FIN = Baixado Parcialmente.'],
  quantidadeTitulos: ['Registros na consulta', 'int', FileText, 'Contagem de linhas das views. Um título pode ocupar várias linhas de rateio; não é contagem de títulos únicos.'],
  ticketMedio: ['Rateio médio por registro', 'money', Receipt, 'Soma de VLRRATEIO dividida pela quantidade de linhas, não por títulos únicos.'],
  titulosVencidosAberto: ['Registros vencidos', 'int', AlertTriangle, 'Linhas Em Aberto com vencimento anterior à data atual do servidor SQL; exclui baixas parciais.'],
  valorVencidoAberto: ['Valor vencido', 'money', AlertTriangle, 'Soma dos rateios Em Aberto vencidos pela data atual do servidor SQL; exclui baixas parciais.'],
  titulosAVencer: ['Registros a vencer', 'int', Clock, 'Linhas Em Aberto com vencimento hoje ou futuro.'],
  valorAVencer: ['Valor a vencer', 'money', Clock, 'Soma dos rateios Em Aberto com vencimento hoje ou futuro; exclui baixas parciais.'],
  juros: ['Juros', 'money', Landmark, 'Soma de VLRJUROS.'],
  multas: ['Multas', 'money', AlertTriangle, 'Soma de VLRMULTA.'],
  descontos: ['Descontos', 'money', Percent, 'Soma de VLRDESCONTO.'],
  valorBaixa: ['Baixa no recorte', 'money', CalendarCheck, 'Soma de VLRBAIXA sujeita ao campo de data selecionado. Repetição por rateio e composição do caixa ainda precisam de conciliação.'],
  diferencaRateadoBaixado: ['Rateio x baixa', 'money', Scale, 'SUM(VLRRATEIO) menos SUM(VLRBAIXA).'],
  percentualBaixado: ['Razão baixa / rateio', 'percent', Percent, 'Soma de VLRBAIXA dividida pelo rateio, somente com base positiva. Não certifica percentual de liquidação.'],
  clientesUnicos: ['Nomes de contraparte', 'int', Users, 'Nomes distintos de CLIFOR, não identidades únicas de clientes.'],
  documentosUnicos: ['Números de documento', 'int', FileText, 'Textos distintos de NUMERODOC; podem se repetir entre contrapartes/coligadas.'],
  titulosValorZerado: ['Registros zero/nulos', 'int', AlertTriangle, 'Linhas com VLRRATEIO zero ou nulo.'],
  valorBaixadoAtraso: ['Baixado com atraso', 'money', TrendingDown, 'Soma de VLRRATEIO com DTBAIXA maior que DTVENC.'],
  valorBaixadoPrazo: ['Baixado no prazo', 'money', TrendingUp, 'Soma de VLRRATEIO com DTBAIXA menor ou igual a DTVENC.'],
  mediaDiasAtraso: ['Média de atraso por registro', 'decimal', Clock, 'Média por linha Em Aberto vencida, com frações de dia na média. Referência: data atual do servidor SQL, não saldo histórico.'],
  maiorAtrasoDias: ['Maior atraso', 'int', AlertTriangle, 'Maior atraso em dias entre os títulos vencidos em aberto.'],
} as const;

export type KpiKey = keyof typeof kpiRegistry;

const defaultKeys = Object.keys(kpiRegistry) as KpiKey[];

export function KpiCards({
  data,
  loading,
  keys = defaultKeys,
  emphasis = false,
  state, retry,
  filters = defaultFilters,
  comparison = comparisonPresentation(filters, 'none', 'range'),
}: {
  data: Record<string, any>;
  loading: boolean;
  keys?: KpiKey[];
  emphasis?: boolean;
  state?: BlockState; retry?: () => void;
  filters?: Filters; comparison?: ComparisonPresentation;
}) {
  const context = JSON.stringify([filters, comparison, state?.updatedAt, state?.status, loading, keys]);
  const [help, setHelp] = useState<{ key: KpiKey; context: string } | null>(null);
  useEffect(() => { setHelp(null); }, [context]);
  const activeHelp = help?.context === context ? help.key : null;
  if (state && state.status !== 'success') return <RemoteBlock state={state} title="Indicadores financeiros" retry={retry}>{null}</RemoteBlock>;
  return (
    <>
    <section className={`kpi-grid ${emphasis ? 'primary-kpis' : 'secondary-kpis'}`}>
      {keys.map((key) => {
        const [title, type, Icon, tooltip] = kpiRegistry[key];
        const value = formatKpi(type, data[key]);
        return (
          <article className={`kpi-card tone-${toneFor(key)}`} key={key} title={tooltip}>
            <div className="kpi-card-tools"><div className="kpi-icon"><Icon size={20} /></div><button className="icon-button kpi-info" aria-label={`Como é calculado: ${title}`} title={`Como é calculado: ${title}`} aria-haspopup="dialog" onClick={() => setHelp({ key, context })}><Info size={17} /></button></div>
            <span>{title}</span>
            <strong className={loading ? 'skeleton-text' : ''}>{loading ? 'Carregando' : value}</strong>
            <p className="kpi-comparison-state">{comparison.status === 'disabled' ? 'Sem comparação' : 'Comparação indisponível'}</p>
          </article>
        );
      })}
    </section>
    {activeHelp && <KpiHelp metric={activeHelp} title={kpiRegistry[activeHelp][0]} unit={kpiRegistry[activeHelp][1] === 'money' ? 'R$ na apresentação; moeda da origem ainda a confirmar.' : kpiRegistry[activeHelp][1] === 'percent' ? 'Percentual (razão × 100).' : activeHelp === 'maiorAtrasoDias' || activeHelp === 'mediaDiasAtraso' ? 'Dias.' : 'Contagem de registros ou valores distintos, conforme a fórmula.'} filters={filters} comparison={comparison} updatedAt={state?.updatedAt} onClose={() => setHelp(null)} />}
    </>
  );
}

function formatKpi(type: string, value: unknown) {
  if (finiteValue(value) === null) return 'Indisponível';
  if (type === 'money') return fmtMoney(value);
  if (type === 'percent') return fmtPercent(value);
  if (type === 'decimal') return `${Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`;
  return fmtInt(value);
}

function toneFor(key: KpiKey) {
  if (['totalReceber', 'totalBaixado', 'valorBaixadoPrazo'].includes(key)) return 'green';
  if (['valorVencidoAberto', 'titulosVencidosAberto', 'multas', 'valorBaixadoAtraso', 'maiorAtrasoDias'].includes(key)) return 'red';
  if (['totalPagar', 'totalAberto', 'valorAVencer', 'titulosAVencer'].includes(key)) return 'amber';
  if (['quantidadeTitulos', 'clientesUnicos', 'documentosUnicos', 'percentualBaixado'].includes(key)) return 'neutral';
  return 'blue';
}
