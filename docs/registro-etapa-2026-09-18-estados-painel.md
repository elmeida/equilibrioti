# Registro de etapa: estados de consulta por bloco

Data: 18/09/2026. Equilibrio BI, marca Equilibrio TI; governanca Atenza. Desenvolvimento local, sem publicacao. Projeto permanece em homologacao.

## Entregas

- Indicadores, graficos, rankings e inconsistencias possuem estados independentes de carregamento, sucesso e falha. A falha de uma consulta nao apaga os demais resultados bem-sucedidos.
- Nova tentativa consulta somente o endpoint afetado. Blocos derivados do mesmo endpoint compartilham sua recuperacao. Dados e horario anteriores do alvo sao retirados durante a tentativa.
- Mudancas de filtros, aba ou ciclo de atualizacao ocultam os resultados anteriores ja na renderizacao, cancelam requisicoes pendentes e descartam respostas fora de ordem. Sair para a tabela analitica nao deixa o painel preso em carregamento.
- Copia ampliada de um grafico deixa de aparecer quando sua fonte muda; nao permanece com os dados de um filtro anterior.
- Consulta indisponivel, consulta bem-sucedida sem registros e zero real sao estados diferentes. Formatadores monetarios/inteiros nao transformam valores ausentes ou invalidos em zero. Respostas com estrutura inesperada sao recusadas.
- O horario global so aparece quando todos os blocos solicitados terminam com sucesso. A legenda indica conclusao da consulta, nao atualizacao da origem. Falhas parciais possuem aviso e nova tentativa acessivel.
- Corrigida expansao horizontal em telas pequenas com filtros ativos e acoes nos graficos. Verificadas larguras de 390 e 320 px, alem de desktop.

## Verificacoes

- 326 testes em 15 arquivos aprovados. Cobertura de estados, escopos, falhas parciais, novas tentativas, respostas invalidas, projecoes e formatacao de ausencias/zero.
- 28 grupos de navegador aprovados: 10 de estados do painel, 13 de contexto/filtros/exportacoes e cinco de indicadores. APIs interceptadas, dados sinteticos e origens externas bloqueadas. Nao representam conciliacao com clientes reais.
- Evidencias visuais e resultado dos novos cenarios em `tmp/dashboard-state-qa/`, fora do versionamento. Roteiro reproduzivel: `scripts/check-dashboard-state-ui.mjs`, com frontend local na porta 5175 e Playwright disponivel.
- Verificacao HTTP local de login, auditoria, logos e logout aprovada. Nenhuma migration ou alteracao de banco nesta etapa; testes PostgreSQL anteriores permanecem evidencia historica, nao nova execucao.
- Typecheck/build aprovados. Permanece aviso de bundle acima de 500 kB. Auditoria no limiar configurado aprovada, com dois alertas moderados transitivos uuid/ExcelJS ainda pendentes.
- Frontend local em `http://127.0.0.1:5175`. Sem conexao RM/HML, alteracao de views, push, commit ou deploy.

## Limites preservados

O painel deixa de reutilizar o cache de memoria do navegador nessas consultas. Consultas normais ainda podem usar o cache curto do servidor; atualizacao manual e nova tentativa pedem renovacao. Horario de conclusao nao comprova frescor, completude, identidade de carga ou snapshot comum da origem.

A validacao cobre estrutura de objeto/lista, nao todos os campos financeiros, sua aditividade ou regras de negocio. A revisao de valores nulos nas formulas/transformacoes legadas nao esta integralmente encerrada. D06 permanece parcial pela falta de versao de carga, snapshot e contrato de qualidade temporal.

Requisicoes nao possuem um novo prazo maximo no navegador nesta etapa; dependem do transporte/servidor ou do cancelamento ao mudar contexto. Politica de timeout continua uma melhoria operacional separada.

LGPD: testes sem dados pessoais reais ou ampliacao de campos. Papeis contratuais, canal de privacidade, retencao, custodia e finalidade por campo continuam pendentes. Nao ha declaracao de conformidade integral.

## Proxima etapa sugerida

Validar datas e periodos dos filtros: datas invalidas, limites de mes/ano, intervalos invertidos e tratamento de fuso. Preparar comparativos sem confundir vencimento, baixa e posicao historica. Implementar o que puder ser demonstrado localmente; aceite financeiro e historico continuam condicionados ao contrato e as referencias do RM.

A mensagem consolidada para Leonardo permanece para o encerramento das frentes independentes. Ainda existem pendencias locais, de infraestrutura e governanca alem das views.

## Atualizacao posterior

A validacao de datas e intervalos foi implementada na [etapa seguinte](registro-etapa-2026-09-18-datas-periodos.md), mantendo explicitos os limites de fuso de negocio, eixos distintos e ausencia de posicao historica.
