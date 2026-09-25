import type { KpiKey } from '../components/KpiCards';

type Explanation = { formula: string; fields: string; limit: string; reference: 'selected' | 'status' | 'today' | 'dates' };
const rowLimit = 'A unidade da origem é a linha da view. Um título pode aparecer em mais de um rateio; a identidade ainda depende de conciliação.';
const currentStatus = 'Usa o status atual da linha na origem, não uma posição histórica reconstruída.';
export const kpiExplanations: Record<KpiKey, Explanation> = {
  totalFinanceiro: { formula: 'Soma dos valores rateados das linhas no recorte.', fields: 'VLRRATEIO', limit: 'Não equivale a receita, lucro ou saldo bancário. ' + rowLimit, reference: 'selected' },
  totalPagar: { formula: 'Soma dos rateios classificados como A Pagar.', fields: 'VLRRATEIO, PAGREC', limit: 'Inclui os status presentes no recorte; não representa apenas dívida em aberto.', reference: 'selected' },
  totalReceber: { formula: 'Soma dos rateios classificados como A Receber.', fields: 'VLRRATEIO, PAGREC', limit: 'Não representa somente o saldo restante a receber dos títulos.', reference: 'selected' },
  saldoLiquido: { formula: 'Rateio a receber menos rateio a pagar.', fields: 'VLRRATEIO, PAGREC', limit: 'Diferença de volumes do recorte, não saldo bancário, caixa disponível ou lucro.', reference: 'selected' },
  totalAberto: { formula: 'Soma dos rateios com status Em Aberto.', fields: 'VLRRATEIO, STATUS_FIN', limit: 'Exclui o saldo restante das baixas parciais. ' + currentStatus, reference: 'status' },
  totalBaixado: { formula: 'Soma dos rateios com status Baixado.', fields: 'VLRRATEIO, STATUS_FIN', limit: 'Não é a soma dos eventos de recebimento ou pagamento. ' + currentStatus, reference: 'status' },
  totalBaixadoParcialmente: { formula: 'Soma dos rateios com status Baixado Parcialmente.', fields: 'VLRRATEIO, STATUS_FIN', limit: 'Não é o saldo restante nem o valor efetivamente pago. ' + currentStatus, reference: 'status' },
  quantidadeTitulos: { formula: 'Contagem de todas as linhas retornadas no recorte.', fields: 'COUNT_BIG(*)', limit: rowLimit, reference: 'selected' },
  ticketMedio: { formula: 'Soma dos rateios dividida pela quantidade de linhas.', fields: 'VLRRATEIO, COUNT_BIG(*)', limit: 'Média por registro, não por título único. Sem linhas, a fórmula atual conserva zero.', reference: 'selected' },
  titulosVencidosAberto: { formula: 'Contagem de linhas Em Aberto com vencimento anterior a hoje.', fields: 'STATUS_FIN, DTVENC', limit: 'Exclui baixas parciais e vencimentos nulos. ' + rowLimit, reference: 'today' },
  valorVencidoAberto: { formula: 'Soma dos rateios Em Aberto com vencimento anterior a hoje.', fields: 'VLRRATEIO, STATUS_FIN, DTVENC', limit: 'Não é saldo residual completo: exclui baixas parciais e vencimentos nulos.', reference: 'today' },
  titulosAVencer: { formula: 'Contagem de linhas Em Aberto com vencimento hoje ou futuro.', fields: 'STATUS_FIN, DTVENC', limit: 'Inclui hoje; exclui vencimentos nulos e baixas parciais. ' + rowLimit, reference: 'today' },
  valorAVencer: { formula: 'Soma dos rateios Em Aberto com vencimento hoje ou futuro.', fields: 'VLRRATEIO, STATUS_FIN, DTVENC', limit: 'Inclui hoje, mas não inclui o saldo restante das baixas parciais.', reference: 'today' },
  juros: { formula: 'Soma dos juros das linhas do recorte.', fields: 'VLRJUROS', limit: 'Composição do valor e possível repetição por rateio ainda precisam de conciliação.', reference: 'selected' },
  multas: { formula: 'Soma das multas das linhas do recorte.', fields: 'VLRMULTA', limit: 'Composição do valor e possível repetição por rateio ainda precisam de conciliação.', reference: 'selected' },
  descontos: { formula: 'Soma dos descontos das linhas do recorte.', fields: 'VLRDESCONTO', limit: 'Sinais, composição e possível repetição por rateio ainda precisam de conciliação.', reference: 'selected' },
  valorBaixa: { formula: 'Soma dos valores de baixa nas linhas filtradas.', fields: 'VLRBAIXA', limit: 'Filtrar vencimento não seleciona automaticamente a data de baixa. Eventos únicos e composição do caixa ainda não foram conciliados.', reference: 'selected' },
  diferencaRateadoBaixado: { formula: 'Soma dos rateios menos soma dos valores de baixa.', fields: 'VLRRATEIO, VLRBAIXA', limit: 'Diferença aritmética, não saldo residual certificado. A baixa pode ter granularidade diferente do rateio.', reference: 'selected' },
  percentualBaixado: { formula: 'Soma dos valores de baixa dividida pela soma dos rateios, apenas quando o rateio total é positivo.', fields: 'VLRBAIXA, VLRRATEIO', limit: 'Sem base positiva, fica indisponível. Pode ser negativo ou maior que 100%; não certifica percentual de liquidação.', reference: 'selected' },
  clientesUnicos: { formula: 'Contagem de nomes distintos de cliente/fornecedor, desconsiderando nulos.', fields: 'CLIFOR', limit: 'Nomes iguais podem representar pessoas ou empresas diferentes. Não mede clientes únicos.', reference: 'selected' },
  documentosUnicos: { formula: 'Contagem de números de documento distintos, desconsiderando nulos.', fields: 'NUMERODOC', limit: 'O mesmo número pode aparecer em contrapartes ou coligadas diferentes; não é chave única de documento.', reference: 'selected' },
  titulosValorZerado: { formula: 'Contagem de linhas com rateio igual a zero ou nulo.', fields: 'VLRRATEIO', limit: 'Reúne zero verdadeiro e ausência de valor; não é contagem de títulos únicos.', reference: 'selected' },
  valorBaixadoAtraso: { formula: 'Soma dos rateios cuja data de baixa é posterior à data de vencimento.', fields: 'VLRRATEIO, DTBAIXA, DTVENC', limit: 'Não é soma de eventos de caixa atrasados. Datas nulas ficam fora; horários dentro do dia dependem do contrato da origem.', reference: 'dates' },
  valorBaixadoPrazo: { formula: 'Soma dos rateios cuja data de baixa é anterior ou igual à data de vencimento.', fields: 'VLRRATEIO, DTBAIXA, DTVENC', limit: 'Não é soma de eventos de caixa no prazo. Datas nulas ficam fora; horários dentro do dia dependem do contrato da origem.', reference: 'dates' },
  mediaDiasAtraso: { formula: 'Média das diferenças em dias por linha Em Aberto vencida, preservando a fração na média.', fields: 'STATUS_FIN, DTVENC, DATEDIFF', limit: 'Conta fronteiras de dia, não horas decorridas. Sem amostra fica indisponível; exclui baixas parciais.', reference: 'today' },
  maiorAtrasoDias: { formula: 'Maior diferença em dias entre hoje e o vencimento das linhas Em Aberto vencidas.', fields: 'STATUS_FIN, DTVENC, DATEDIFF', limit: 'Sem amostra a fórmula atual conserva zero. Exclui baixas parciais; não reconstrói atraso histórico.', reference: 'today' },
};
export const referenceDescriptions = {
  selected: 'Campo de data dos filtros aplicados.',
  status: 'Status atual registrado na origem. A data final do filtro não reconstrói o status passado.',
  today: 'Hoje no relógio do servidor de origem. A data final do filtro não redefine o atraso; o fuso de negócio ainda depende de confirmação.',
  dates: 'Datas de baixa e vencimento da origem, dentro do recorte filtrado.',
};
