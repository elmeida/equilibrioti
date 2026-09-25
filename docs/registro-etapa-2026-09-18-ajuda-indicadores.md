# Registro de etapa: ajuda dos indicadores e estado comparativo

Data: 18/09/2026. Equilibrio BI, marca Equilibrio TI; governanca Atenza. Somente desenvolvimento local; projeto permanece em homologacao.

## Entregas

- Catalogo de explicacoes dos 26 KPIs registrados, alinhado a `backend-linhas-v1`: formula, campos de origem, unidade, referencia temporal e limite de interpretacao. A ajuda aparece nos cards KPI presentes em cada aba; nao foram acrescentados novos indicadores financeiros.
- Botao de informacao com nome acessivel e tooltip. Dialogo nativo abre por clique/teclado, fecha com Escape ou botao, devolve foco e separa cabecalho fixo de conteudo rolavel. A area de leitura recebe foco para rolagem por teclado; navegacao Tab/Shift+Tab permanece no dialogo.
- Fonte e granularidade descritas sem afirmar identidade unica de titulo/cliente. Moeda da apresentacao, versao documental, horario de conclusao do bloco e ausencia de horario da origem ficam explicitos. A versao documental nao e apresentada como versao da carga.
- Avisos especificos sobre baixas parciais, status atual, relogio SQL, medias sem amostra, zero legado, campos nulos e ausencia de saldo historico. Tooltips de valor vencido/a vencer corrigidos para refletir linhas/rateios e exclusao de baixas parciais.
- Controles operacionais de comparacao: sem comparacao, periodo anterior e ano anterior; base livre ou mensal explicita. Padrao visual: ano anterior/intervalo livre. Sem as duas datas aplicadas, a tela informa a falta de intervalo fechado.
- Planejamento usa somente filtros aplicados, nao o rascunho. Mostra datas, duracoes inclusivas, campo de data e avisos de ajuste, duracao desigual ou sobreposicao. Intervalo mensal invalido nao e normalizado silenciosamente.
- Comparacao numerica permanece indisponivel: a API atual nao fornece cobertura e versao comum comprovadas. Nao houve dupla consulta dos KPIs legados, zero artificial ou percentual criado a partir de dados nao equivalentes.
- Trocar modo/base apenas recalcula o plano local. Nao altera filtros, nao provoca novas consultas financeiras e nao persiste preferencia/dados em armazenamento do navegador.
- Falha do bloco retira valores/ajuda anteriores; nova tentativa preserva os controles existentes. Ajuda e vinculada ao contexto do recorte, modo, estado e horario da consulta. Logout/troca de sessao desmonta o contexto completo.

## Verificacoes

- 485 testes em 18 arquivos aprovados. Incluem cobertura do catalogo, formulas/limites, estados de falha, periodos abertos, ano bissexto, recorte mensal invalido e ausencia de variacao sem metadados.
- Sete grupos novos de navegador: abertura/foco/Escape, modos sem consultas extras, periodo aplicado e bissexto, referencia SQL versus status historico, falha/retry, celulares e logout em outra aba com ajuda aberta.
- Regressao de 35 grupos anteriores aprovada: 13 de contexto/filtros/exportacoes, cinco de indicadores, dez de estados por bloco e sete de datas. Total de 42 grupos de navegador nesta etapa.
- APIs interceptadas e origens externas bloqueadas nos testes visuais. Somente respostas sinteticas em memoria; sem cadastro de empresas ficticias no PostgreSQL e sem leitura de clientes reais.
- Capturas desktop, tema escuro e celulares 390/320 px em `tmp/kpi-help-qa/`; roteiro reproduzivel em `scripts/check-kpi-help-ui.mjs`. Conferidos ausencia de overflow, leitura rolavel e acesso ao fechamento no fim do conteudo.
- Typecheck/build aprovados. Bundle de aproximadamente 719 kB antes de gzip; o aviso acima de 500 kB permanece. Fracionamento/carregamento sob demanda continua pendente.
- Sem alteracao de backend/API, banco, migrations, views ou homologacao. Sem commit, push ou deploy. Aplicacao local em `http://127.0.0.1:5175`.

## Limites e pendencias

UX03 avancou nos cards KPI. Resumos auxiliares, rankings, graficos, tabela alternativa e ajuda especifica de outros componentes continuam como frentes separadas. Nao foi declarada conformidade de acessibilidade integral do aplicativo.

Os controles mostram planejamento e indisponibilidade, nao resultados comparativos reais. Cobertura, versao comum da carga, fuso de negocio, moeda e evidencia historica continuam pendentes. A validacao de apresentacao nao substitui conciliacao RM ou aceite financeiro dos clientes.

LGPD permanece transversal: sem novos campos pessoais, sem novas consultas de dados e sem persistencia financeira adicionada. Papeis, canal de privacidade, retencao e demais definicoes ainda precisam ser fechados; nao ha declaracao de conformidade integral.

Dois alertas moderados transitivos uuid/ExcelJS permanecem no projeto. CI/CD remoto, restore e outras pendencias operacionais nao foram encerrados por esta etapa.

## Proxima etapa sugerida

UX04: revisar fidelidade e acessibilidade dos graficos. Priorizar valores zero/negativos, ausencia de dados versus ausencia de categoria, representacao sem proporcoes artificiais e consulta alternativa dos valores com acesso por teclado. Executar com respostas simuladas, preservando filtros e isolamento, sem depender de ajustes nas views.

A mensagem consolidada para Leonardo continua reservada ao fim das frentes independentes. Ainda existem tarefas locais, operacionais e de governanca alem das views.
