# Registro de etapa: datas e periodos

Data: 18/09/2026. Equilibrio BI, marca Equilibrio TI; governanca Atenza. Somente desenvolvimento local; projeto permanece em homologacao.

## Entregas

- Contrato compartilhado entre interface e backend para campos de data e calendario gregoriano. Datas exigem `AAAA-MM-DD`, ano entre 0001 e 9999, mes/dia reais e regra de ano bissexto, incluindo excecoes de seculo.
- Recusados intervalos invertidos, valores duplicados/estruturados, timestamps, formatos ambiguos e campo de data desconhecido. Campo ausente/vazio continua significando vencimento; datas vazias ou somente um limite continuam permitidas.
- Validacao na entrada das rotas financeiras, apos autorizacao e antes de cache, abertura de conexao financeira ou auditoria de exportacao. `buildFilters` tambem valida seu contrato antes de criar parametros. Requisicoes invalidas retornam 400 sem expor seus valores.
- Interface apresenta erro acessivel, associa-o aos campos e bloqueia a aplicacao sem modificar o recorte ja aplicado. Corrigir/limpar datas recupera o formulario.
- Parametros de data seguem como texto validado para conversao explicita `CONVERT(date, @parametro, 23)` no SQL. Isso evita interpretacao por `Date` no JavaScript/driver, preservando o dia civil informado.
- Inicio inclusivo e fim exclusivo no dia seguinte preservados: todo o dia final continua incluido, sem limite artificial em 23:59:59. A data final 9999-12-31 e recusada porque o dia seguinte ultrapassaria o tipo SQL; 9999-12-30 e o maior fim aceito.
- Escolha de agrupamento diario/mensal usa diferenca de dias civis, sem variacao por horario de verao. Preservada regra existente: diferenca de ate 31 dias, inclusive, gera agrupamento diario; isso pode abranger 32 datas inclusivas. Nao foi mudada silenciosamente para outro limite.
- Atalhos Este mes/Este ano usam inicio do periodo ate hoje no calendario local do navegador, sem conversao UTC. Nao incluem automaticamente dias futuros do mes/ano.

## Contrato temporal e limites

| Uso | Eixo atual | Limite de interpretacao |
|---|---|---|
| Filtro global | Campo selecionado: vencimento, emissao, baixa ou criacao | Restringe linhas; nao reconstroi status/saldo passado |
| Evolucao de vencimento | DTVENC, diario/mensal | Continua por vencimento mesmo se o filtro global usa outra data |
| Evolucao de baixa | DTBAIXA, mensal | Soma de baixa por linhas ainda depende de granularidade/aditividade RM |
| Matriz, mensal por empresa, juros/multa/desconto | DTVENC | Nao equivale a caixa realizado no periodo |
| Previsto/realizado legado | Rateio por DTVENC e baixa por DTBAIXA no mesmo recorte de linhas | Eixos diferentes; nao certificado como comparativo de caixa |
| Atraso/vencidos | GETDATE do SQL Server e status corrente | Nao usa a data final do filtro como posicao historica |

O fuso de negocio de cada cliente e o horario de corte do RM ainda precisam de definicao. Nao houve troca de GETDATE por relogio local, nem conversao das datas da origem para outro fuso. Filtros ativos excluem valores nulos no campo escolhido pela semantica SQL. Datas futuras validas continuam aceitas.

Este contrato cobre filtros de entrada e agrupamento, nao toda a formatacao de datas retornadas em tabelas/Excel. Timestamps, tratamento de datas nulas na origem e tipos SQL efetivos das views permanecem sujeitos a conciliacao. Nenhuma formula foi declarada financeiramente certificada.

## Verificacoes

- 377 testes em 16 arquivos aprovados. Casos de calendario, formatos, anos 0001/0099, seculos bissextos, intervalos abertos, quatro campos permitidos, limites SQL e validacao antes de conexao financeira.
- Subprocessos em UTC, America/Fortaleza, America/New_York e Pacific/Kiritimati confirmam diferenca de dias e atalhos. Cobertura de transicao de horario de verao sem horas fracionarias.
- Sete grupos novos de navegador aprovados: atalhos em Fortaleza/Kiritimati no mesmo instante, bloqueio de intervalo invertido, mesmo dia bissexto e quatro eixos enviados intactos, formulario em 390/320 px sem overflow. APIs interceptadas e dados sinteticos, sem RM.
- Regressao aprovada dos 28 grupos existentes de contexto/filtros/exportacoes, estados do painel e indicadores: 35 grupos de navegador no total nesta etapa.
- Roteiro `scripts/check-date-filters-ui.mjs`; resultados/capturas em `tmp/date-filters-qa/`, fora do Git. As provas SQL conferem texto e parametros com banco simulado; nao sao execucao no SQL Server real.
- Typecheck/build aprovados, bundle JS de aproximadamente 703 kB antes de gzip; aviso de tamanho permanece. Verificacao HTTP local de login/auditoria/logos/logout aprovada apos reinicio do backend local.
- Sem migration, consulta RM/HML, alteracao de views, commit, push ou deploy. PostgreSQL compartilhado local preservado; nenhuma base real de cliente copiada.

## Proxima etapa sugerida

Preparar os contratos dos comparativos com periodo anterior e ano anterior: intervalos equivalentes, anos bissextos, periodos incompletos, denominador zero/negativo, ausencia de cobertura e rotulagem do eixo temporal. Validar primeiro com casos sinteticos; nao apresentar saldo historico ou previsao como certificado sem os dados necessarios.

LGPD continua requisito transversal, sem ampliacao de campos ou uso de dados pessoais reais nos testes. Papeis, canal, retencao e demais pendencias de governanca permanecem; nao ha declaracao de conformidade integral. A mensagem consolidada para Leonardo fica para depois das frentes independentes restantes.

## Atualizacao posterior

Contratos e motor dos comparativos implementados na [etapa seguinte](registro-etapa-2026-09-18-comparativos.md). Nao equivale a ativacao sobre bases reais ou aceite de saldos historicos.
