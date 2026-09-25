# Catalogo dos indicadores do backend e limites de conciliacao

Data: 18/09/2026. Equilibrio BI, marca Equilibrio TI. Governanca Atenza. Versao documental `backend-linhas-v1`; nao e uma versao de carga RM. Documento tecnico interno.

## Contrato comum

Fonte: uniao das views `PBI_TITULOSFINANCEIRO` e `PBI_TITULOSFINANCEIRO_COL2`, coligadas 1/2 fixadas no adaptador atual. Tenant definido pela autenticacao/conexao, nunca pelo nome da coligada. Campos monetarios convertidos para decimal(19,4) por linha; interface monetaria arredonda para duas casas. Moeda BRL presumida pela apresentacao existente, ainda a confirmar por cliente.

Granularidade comprovada no codigo: **linha retornada pela view**. Titulo, parcela, rateio, contraparte e evento de baixa ainda nao possuem identidade/granularidade conciliadas. Nao aplicar DISTINCT sobre valores para tentar corrigir duplicacao. Eventos financeiros independentes de mesmo valor devem continuar distintos.

Filtros: mesmos filtros SQL parametrizados sobre a uniao. Datas restringem o campo escolhido (vencimento por padrao, emissao, baixa ou criacao), com inicio inclusivo e fim exclusivo no dia seguinte. Filtrar vencimento nao significa filtrar caixa pela data de baixa. Data atual para atraso vem do SQL Server (`GETDATE`); nao e a data final do filtro. Fuso e horario de corte precisam de acordo com a origem.

Consulta bem-sucedida sem linhas pode representar zero para somas/contagens. Ausencia de amostra para media, denominador nao positivo ou dado invalido nao significa zero. Nulos monetarios da origem ainda sao ignorados por SUM/AVG conforme SQL; indicadores de completude da fonte continuam necessarios. Falha/ausencia de fonte nao deve ser interpretada como carteira zerada; a revisao integral dos estados de carregamento/erro e frente D06 separada.

## KPIs atuais

IDs mantidos para compatibilidade. Rotulos foram corrigidos onde prometiam identidade ou significado nao demonstrado. Todas as linhas abaixo estao **pendentes de conciliacao RM**, mesmo quando a operacao aritmetica e conhecida.

| ID | Operacao implementada | Interpretacao e limite |
|---|---|---|
| totalFinanceiro | Soma de VLRRATEIO | Rateio do recorte; nao receita, lucro ou saldo |
| totalPagar | Soma de rateio onde PAGREC = A Pagar | Volume de rateio pagar; inclui status do recorte, nao somente divida aberta |
| totalReceber | Soma de rateio onde PAGREC = A Receber | Volume de rateio receber; nao somente carteira residual |
| saldoLiquido | totalReceber - totalPagar | Diferenca entre volumes, nao saldo bancario |
| totalAberto | Rateio das linhas Em Aberto | Exclui baixas parciais; nao usar como carteira residual completa |
| totalBaixado | Rateio das linhas Baixado | Rateio liquidado, nao soma de eventos de caixa |
| totalBaixadoParcialmente | Rateio das linhas Baixado Parcialmente | Nao e residual nem valor efetivamente baixado |
| quantidadeTitulos | COUNT_BIG(*) | Contagem de registros, nao de titulos unicos |
| ticketMedio | Soma de rateio / quantidade de linhas | Rateio medio por registro; com base vazia conserva zero legado |
| titulosVencidosAberto | Contagem de linhas Em Aberto com vencimento anterior a hoje | Registros vencidos; exclui parcial e datas nulas |
| valorVencidoAberto | Soma de rateio dessas linhas vencidas | Rateio vencido, nao residual completo |
| titulosAVencer | Contagem de linhas Em Aberto com vencimento hoje/futuro | Inclui hoje; data nula fica fora |
| valorAVencer | Soma de rateio dessas linhas a vencer | Mesmo limite de parcial/residual |
| juros | Soma de VLRJUROS | Confirmar repeticao por rateio e composicao |
| multas | Soma de VLRMULTA | Confirmar repeticao por rateio e composicao |
| descontos | Soma de VLRDESCONTO | Confirmar repeticao por rateio e sinais |
| valorBaixa | Soma de VLRBAIXA | Baixa no recorte; sem prova de eventos unicos/caixa |
| diferencaRateadoBaixado | Soma de rateio - soma de baixa | Diferenca aritmetica, nao saldo residual certificado |
| percentualBaixado | Soma de baixa / soma de rateio, somente com base positiva | Null sem base; pode ser negativo ou maior que 100%, sem limitar/esconder ocorrencias |
| clientesUnicos | COUNT DISTINCT CLIFOR | Nomes distintos, nao clientes unicos; homonimos podem se fundir |
| documentosUnicos | COUNT DISTINCT NUMERODOC | Numeros/textos distintos, sem chave composta de documento |
| titulosValorZerado | Contagem de linhas com rateio zero ou nulo | Reune dois casos diferentes; nao titulos unicos |
| valorBaixadoAtraso | Rateio com DTBAIXA > DTVENC | Comparacao de datas disponiveis, nao fluxo de eventos atrasados |
| valorBaixadoPrazo | Rateio com DTBAIXA <= DTVENC | Mesmo limite; timestamp dentro do dia precisa de contrato |
| mediaDiasAtraso | AVG de diferenca em dias convertida para decimal antes de agregar | Media por linha vencida Em Aberto; null sem amostra; exibicao com uma casa |
| maiorAtrasoDias | MAX da diferenca em dias em linhas Em Aberto vencidas | Conserva zero legado sem amostra; nao historico reconstruido |

## Analises e alertas

- `mediaAtraso` e media por contraparte agora convertem cada DATEDIFF para decimal antes de AVG. `maiorAtrasoMedio`/`mediaAtraso` conservam null sem amostra. DATEDIFF conta fronteiras de dia, nao horas decorridas.
- Concentracao Top 10, participacoes de ranking e percentuais por status continuam sobre linhas/nomes e valores atuais. Bases negativas, agrupamento de homonimos e amostra vazia dessas rotas ainda precisam de revisao; nao foram certificados nesta etapa.
- Empresa de maior volume no resumo e selecionada pelo maior valor retornado, nao pela primeira posicao alfabetica. O agrupamento da origem ainda usa nome de empresa; confirmar codigos para evitar fusao de nomes iguais.
- Ocorrencias de alertas sao somadas por severidade. Um registro pode gerar varias ocorrencias. A soma de `registrosAfetados` por regra nao mede registros distintos globais. Removidos os cards de total unico/percentual da base que usavam essa soma. O campo legado por regra continua na API, sem certificacao de identidade; a concatenacao de chaves tambem exige revisao.
- Graficos de previsto/realizado e baixas ainda dependem da escolha de data e da composicao de VLRBAIXA. Nao apresentar como extrato bancario ou fluxo historico conciliado. Renomeacao integral desses graficos e contratos de fluxo/estoque permanecem pendentes.

## Oraculos de verificacao

1. Titulo sintetico de 1.000,0000 com dois rateios de 600,0000 e 400,0000: duas linhas, um titulo. Uma baixa de 400,0000 repetida nas duas linhas soma 800,0000 erroneamente se tratada como evento aditivo; residual correto no contrato sintetico seria 600,0000. Isso demonstra risco, nao comprova que a view real repita valores.
2. Atrasos de 1 e 2 dias: media matematica 1,5. SQL deve converter antes de AVG; converter apenas o resultado inteiro nao recupera a fracao. Teste de SQL emitido e de transporte/renderizacao nao substitui execucao no SQL Server.
3. Baixa zero sobre rateio 100: 0%. Baixa 10 sobre rateio zero/negativo: indisponivel na razao KPI. Baixa 120 sobre 100: 120%, sem truncar artificialmente para 100%.
4. Dois registros com duas regras de alerta cada: quatro ocorrencias, mas nao quatro registros distintos. Sem identidade global, nao calcular percentual unico.
5. Emissao/vencimento/baixa em periodos diferentes: selecionar um campo de data nao equivale aos demais. Estoque historico exige eventos ate o corte, cancelamentos/estornos e cobertura comprovada.

Os testes `financial-semantics.test.ts` verificam apresentacao/regras puras e o limite sintetico da origem. Os testes de rotas verificam SQL emitido e preservacao de null/fracao usando banco simulado. Os contratos demonstrativos em centavos continuam separados dos rateios reais de quatro casas.

## Aceite necessario

Leonardo/responsavel tecnico: chave de titulo/parcela/rateio/baixa, granularidade, aditividade de cada campo, eventos/estornos/cancelamentos, datas/fuso, coligadas e cobertura. Responsavel financeiro do cliente: recorte de referencia, moeda, tolerancia de arredondamento e aceite por indicador. Nao solicitar recriacao de views ja existentes sem diagnostico.

Nao houve consulta a lancamentos, alteracao de views ou homologacao nesta etapa. Nao ha declaracao de exatidao financeira ou conformidade LGPD integral. Definicoes de responsabilidade, canal e retencao seguem pendentes.

## Referencias

- [Microsoft: AVG e tipos de retorno](https://learn.microsoft.com/en-us/sql/t-sql/functions/avg-transact-sql?view=sql-server-ver17). Consulta em 18/09/2026: inteiro agrega com retorno inteiro; decimal preserva escala fracionaria.
- [Contratos iniciais sinteticos](contratos-etapa-0.md).
- [Inventario e pendencias da origem](inventario-fontes-conciliacao-2026-09-17.md).
