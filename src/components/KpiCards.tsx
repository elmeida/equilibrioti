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
} from 'lucide-react';
import { fmtInt, fmtMoney, fmtPercent } from '../utils/format';

export const kpiRegistry = {
  totalFinanceiro: ['Total financeiro', 'money', Banknote, 'Soma de VLRRATEIO nos filtros atuais.'],
  totalPagar: ['Total a pagar', 'money', TrendingDown, 'Soma de VLRRATEIO com PAGREC = A Pagar.'],
  totalReceber: ['Total a receber', 'money', TrendingUp, 'Soma de VLRRATEIO com PAGREC = A Receber.'],
  saldoLiquido: ['Saldo líquido', 'money', Scale, 'Total a receber menos total a pagar.'],
  totalAberto: ['Valor em aberto', 'money', Clock, 'Soma de VLRRATEIO com STATUS_FIN = Em Aberto.'],
  totalBaixado: ['Valor baixado', 'money', CalendarCheck, 'Soma de VLRRATEIO com STATUS_FIN = Baixado.'],
  totalBaixadoParcialmente: ['Baixado parcialmente', 'money', Percent, 'Soma de VLRRATEIO com STATUS_FIN = Baixado Parcialmente.'],
  quantidadeTitulos: ['Quantidade de títulos', 'int', FileText, 'Contagem de títulos nos filtros atuais.'],
  ticketMedio: ['Ticket médio', 'money', Receipt, 'SUM(VLRRATEIO) dividido pela quantidade de títulos.'],
  titulosVencidosAberto: ['Títulos vencidos', 'int', AlertTriangle, 'Títulos em aberto com DTVENC anterior à data atual.'],
  valorVencidoAberto: ['Valor vencido', 'money', AlertTriangle, 'Soma de VLRRATEIO de títulos vencidos em aberto.'],
  titulosAVencer: ['Títulos a vencer', 'int', Clock, 'Títulos em aberto com vencimento hoje ou futuro.'],
  valorAVencer: ['Valor a vencer', 'money', Clock, 'Soma de VLRRATEIO de títulos a vencer.'],
  juros: ['Juros', 'money', Landmark, 'Soma de VLRJUROS.'],
  multas: ['Multas', 'money', AlertTriangle, 'Soma de VLRMULTA.'],
  descontos: ['Descontos', 'money', Percent, 'Soma de VLRDESCONTO.'],
  valorBaixa: ['Valor de baixa', 'money', CalendarCheck, 'Soma de VLRBAIXA.'],
  diferencaRateadoBaixado: ['Rateio x baixa', 'money', Scale, 'SUM(VLRRATEIO) menos SUM(VLRBAIXA).'],
  percentualBaixado: ['Percentual baixado', 'percent', Percent, 'SUM(VLRBAIXA) dividido por SUM(VLRRATEIO).'],
  clientesUnicos: ['Clientes únicos', 'int', Users, 'COUNT DISTINCT de CLIFOR.'],
  documentosUnicos: ['Documentos únicos', 'int', FileText, 'COUNT DISTINCT de NUMERODOC.'],
  titulosValorZerado: ['Títulos zerados', 'int', AlertTriangle, 'Títulos com VLRRATEIO zero ou nulo.'],
  valorBaixadoAtraso: ['Baixado com atraso', 'money', TrendingDown, 'Soma de VLRRATEIO com DTBAIXA maior que DTVENC.'],
  valorBaixadoPrazo: ['Baixado no prazo', 'money', TrendingUp, 'Soma de VLRRATEIO com DTBAIXA menor ou igual a DTVENC.'],
  mediaDiasAtraso: ['Média de atraso', 'decimal', Clock, 'Média de dias de atraso para títulos vencidos em aberto.'],
  maiorAtrasoDias: ['Maior atraso', 'int', AlertTriangle, 'Maior atraso em dias entre os títulos vencidos em aberto.'],
} as const;

export type KpiKey = keyof typeof kpiRegistry;

const defaultKeys = Object.keys(kpiRegistry) as KpiKey[];

export function KpiCards({
  data,
  loading,
  keys = defaultKeys,
  emphasis = false,
}: {
  data: Record<string, any>;
  loading: boolean;
  keys?: KpiKey[];
  emphasis?: boolean;
}) {
  return (
    <section className={`kpi-grid ${emphasis ? 'primary-kpis' : 'secondary-kpis'}`}>
      {keys.map((key) => {
        const [title, type, Icon, tooltip] = kpiRegistry[key];
        const value = formatKpi(type, data[key]);
        return (
          <article className={`kpi-card tone-${toneFor(key)}`} key={key} title={tooltip}>
            <div className="kpi-icon"><Icon size={20} /></div>
            <span>{title}</span>
            <strong className={loading ? 'skeleton-text' : ''}>{loading ? 'Carregando' : value}</strong>
          </article>
        );
      })}
    </section>
  );
}

function formatKpi(type: string, value: unknown) {
  if (type === 'money') return fmtMoney(value);
  if (type === 'percent') return fmtPercent(value);
  if (type === 'decimal') return `${Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`;
  return fmtInt(value);
}

function toneFor(key: KpiKey) {
  if (['totalReceber', 'totalBaixado', 'valorBaixadoPrazo', 'percentualBaixado'].includes(key)) return 'green';
  if (['valorVencidoAberto', 'titulosVencidosAberto', 'multas', 'valorBaixadoAtraso', 'maiorAtrasoDias'].includes(key)) return 'red';
  if (['totalPagar', 'totalAberto', 'valorAVencer', 'titulosAVencer'].includes(key)) return 'amber';
  if (['quantidadeTitulos', 'clientesUnicos', 'documentosUnicos'].includes(key)) return 'neutral';
  return 'blue';
}
