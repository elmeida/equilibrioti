# Registro de etapa: completude das exportacoes

Data: 18/09/2026. Produto: Equilibrio BI, White Label Equilibrio TI. Governanca documental: Atenza. Implementacao e verificacao somente locais; projeto permanece em homologacao.

## Diagnostico

A rota de exportacao usava `TOP (5000)` sem detectar excedentes, podendo entregar arquivo parcial como se fosse completo. O cabecalho dependia da primeira linha, inclusive em resultado vazio. A ordenacao da tabela nao era enviada ao export. Mudar a pesquisa durante o download nao cancelava explicitamente a operacao. Na tabela havia duas acoes de exportacao com recortes diferentes (global e pesquisa local).

## Implementado

1. Uma consulta limitada a 5.001 linhas identifica excedente no proprio resultado. Ate 5.000 linhas, gera todas as linhas retornadas. Acima disso, responde HTTP 422 com codigo `EXPORT_LIMIT_EXCEEDED`, limite e orientacao para refinar o recorte, sem anexo parcial. Nao executa contagem separada nem informa total que nao tenha medido.
2. Mesma construcao de filtros parametrizados usada pela tabela, incluindo busca, datas e tipo financeiro. Ordenacao enviada pelo cliente e resolvida por lista permitida no servidor.
3. Lista explicita das 22 colunas ja exportadas, inclusive no arquivo vazio. Campos inesperados da fonte nao entram no arquivo; nao foram incluidos historico livre, credenciais ou novos dados pessoais. Datas, numeros, zeros, nulos e textos semelhantes a formulas preservados nos testes de leitura do XLSX.
4. Arquivo gerado em memoria antes de enviar cabecalhos, sem arquivo temporario financeiro no servidor. Resposta continua `no-store`; cabecalho `X-Export-Row-Count` informa linhas efetivamente exportadas. Isso nao e prova de recebimento pelo usuario.
5. Cancelamento no navegador ao mudar filtros/pesquisa/ordenacao, sair da tabela ou trocar de contexto. Exportacao geral tambem cancela ao mudar filtros/aba. Erro acessivel via `role=alert`, sem download em caso de excesso. Na aba analitica fica apenas a exportacao da pesquisa da tabela.
6. Auditoria de autorizacao antes de consultar a fonte preservada: se falhar, a leitura nao comeca. Isolamento por empresa e versao de conexao mantido. Evento `financial.export` continua significando autorizacao, nao conclusao do download.

## Verificacao

- Pendencia anterior de logos/auditoria: os 212 testes passaram com prazo padrao e um worker, sem modificar timeouts/assercoes. Typecheck, build e auditoria de dependencias passaram localmente. A falha de verificacao anterior nao se reproduziu nesta rodada.
- Suite ampliada: 224 testes em 12 arquivos aprovados. Novos casos cobrem 0, 1, 5.000 e 5.001 linhas, leitura real do XLSX, campos excluidos, parametros iguais aos da tabela, busca, ordenacao permitida/invalida, isolamento e cancelamento.
- Navegador: 11 grupos aprovados com APIs interceptadas e origens externas bloqueadas, incluindo aviso de limite, ausencia de download parcial, cancelamento tardio, exportacao geral, troca de empresas e visualizacao desktop/mobile (390 e 320 px). Capturas conferidas visualmente. Evidencias sinteticas em `tmp/context-qa/`.
- `local:check` aprovado, sem alteracao de schema. Verificacao HTTP local de login, consulta de auditoria, cursor e logos aprovada; logout ao final. Nenhuma empresa ou dado financeiro real criado ou copiado.
- Typecheck e build finais aprovados; permanece aviso de tamanho do pacote principal (697,57 kB antes de gzip). Auditoria permanece com 2 alertas moderados transitivos de uuid/ExcelJS, sem altos/criticos. Nao foi aplicado downgrade forcado.

## Limites e riscos restantes

- O limite de 5.000 registros permanece intencional. Exportacao assincrona maior, quotas/concurrency por usuario/empresa e cancelamento da consulta SQL no servidor continuam pendentes; cancelar o navegador impede download tardio, mas nao garante interrupcao da consulta ja iniciada.
- Nao ha snapshot comum entre consultas do painel e exportacao; alteracoes da fonte entre requisicoes podem produzir diferencas. Ordenacao com valores empatados ainda precisa de chave estavel de origem.
- Selecao multipla com nomes contendo virgula ainda usa serializacao legada ambigua. Corrigir em todas as consultas e no modo demonstrativo, com testes de contrato, na proxima etapa UX05. Nao declarar UX05 integralmente concluido.
- Colunas ocultadas visualmente na tabela nao alteram a lista fixa de campos exportados. Justificativa por campo/finalidade e permissao especifica de exportacao precisam de decisao de produto/governanca; LG02 permanece parcial.
- Auditoria nao registra nesta etapa conclusao, falha ou quantidade exportada. Arquivo baixado fica sob custodia do destinatario, com retencao e compartilhamento ainda a definir.
- Nao houve consulta RM, alteracao de views, acesso a clientes reais, migration, push, deploy ou execucao do CI remoto. Testes locais nao certificam calculos ou conciliacao com RM.
- Responsabilidades contratuais e canal LGPD seguem sem definicao. Nao ha declaracao de conformidade integral.

## Proxima etapa sugerida

Atualizacao posterior em 18/09/2026: a correcao de filtros com virgulas e a melhoria de ordenacao/paginacao foram implementadas e testadas no [registro seguinte](registro-etapa-2026-09-18-filtros-paginacao.md). As restricoes de identidade unica/snapshot e escala permanecem. A recomendacao abaixo representa o encerramento original desta etapa.

Continuar UX05: preservar valores completos em filtros multiplos (nomes com virgulas), revisar ordenacao/paginacao e alinhar contratos entre tela, API e exportacao. Depois seguir com as demais frentes independentes do parceiro. A solicitacao final ao Leonardo sera consolidada quando essas frentes estiverem encerradas; ainda nao restam apenas views.

Arquivos principais: `server/utils/titulosExport.js`, `server/routes/titulos.js`, `src/services/api.ts`, `src/components/DataTables.tsx`, `src/App.tsx`. Testes: `tests/titulos-export.test.js`, `tests/server-authorization.test.js`, `tests/api-context.test.ts` e `scripts/check-context-ui.mjs`.
