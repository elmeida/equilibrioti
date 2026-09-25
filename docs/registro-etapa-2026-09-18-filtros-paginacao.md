# Registro de etapa: filtros, ordenacao e paginacao

Data: 18/09/2026, posterior a etapa de exportacoes. Produto: Equilibrio BI, White Label Equilibrio TI. Governanca documental: Atenza. Execucao somente local; projeto continua em homologacao.

## Diagnostico

Listas de filtros eram unidas por virgula no navegador e divididas no servidor, confundindo uma opcao como `Nome, Matriz` com duas opcoes. Isso tambem podia gerar a mesma chave de cache para selecoes diferentes. A tabela e o export mantinham regras de ordenacao separadas, e desconto/juros/multa apareciam clicaveis sem constar na lista de campos permitidos. Paginacao aceitava valores nao inteiros/invalidos; mudanca de ordenacao nao reiniciava a pagina, e reducao do total podia deixar o usuario numa pagina inexistente.

## Implementado

1. Contrato canonico de listas por parametros repetidos com sufixo `[]`: `clientes[]=Nome%2C+Matriz&clientes[]=Outra`. Vale para clientes, centros de custo, naturezas, tipos de documento, contas e origens. Preserva virgulas, espacos, acentos e caracteres especiais em uma opcao unica, mesmo quando so uma esta selecionada.
2. Parser simples explicitado no Express. Formato antigo sem sufixo continua aceito com sua semantica legada de separacao por virgulas; misturar formato novo/antigo no mesmo filtro retorna 400. Nao reinterpretar links antigos como se fossem inequivocos. Valores continuam vinculados como parametros SQL.
3. Serializacao comum em todas as chamadas da API, incluindo painel, tabela, export e chaves de cache. Selecao `['A,B']` deixa de colidir com `['A','B']`.
4. Funcao de ordenacao compartilhada entre tabela e export, por lista permitida. Incluidos desconto, juros e multa; campos herdados do prototipo ou SQL fornecido pelo cliente nao sao interpolados. Campo de data tambem resolve somente chaves proprias da lista.
5. Desempates pelos campos existentes: coligada, referencia, contraparte, documento, centro de custo, natureza e valores. Campo principal nao se repete na ordenacao. Isso reduz empates, mas nao certifica uma chave unica da origem.
6. Pagina inteira positiva, tamanho de 10 a 100, padroes 1/25 e offset limitado ao inteiro SQL suportado. Parametros invalidos retornam 400 antes de abrir o pool financeiro. Removida leitura de cache da tabela que nao era alimentada pela rota; consulta segue sem cache de resposta no navegador.
7. Ao ordenar, volta a pagina 1; cabecalho informa sentido via `aria-sort`. Se o total informado pelo servidor eliminar a pagina atual, a interface consulta novamente a ultima pagina valida, sem apresentar o recorte vazio como resultado final. Filtros/pesquisa continuam reiniciando pagina e descartando respostas antigas.

## Evidencias

- 287 testes em 13 arquivos aprovados com prazos padrao. Casos cobrem seis filtros multiplos, opcao unica/multipla, caracteres especiais, listas antigas, mistura invalida, chaves de cache distintas, parametros SQL, todos os campos ordenaveis, limites de paginacao e rotas reais com bancos simulados.
- 13 grupos no navegador aprovados com APIs interceptadas e origens externas bloqueadas. Incluem selecao de `Nome, Matriz & Filial` ate tabela/export; percurso 1/2/3/2 quando o total diminui; ordenacao voltando a pagina 1; contexto multiempresa, cancelamentos e exportacoes. Capturas desktop e celulares 390/320 px em `tmp/context-qa/`, com dados sinteticos.
- Modo demonstrativo nao usa o transporte HTTP da aplicacao: trabalha com objetos/arrays em memoria e busca textual. Nao precisou de adaptacao de producao; teste adicional preserva nome com virgula na busca e no CSV demonstrativo.
- Typecheck/build aprovados. Aviso de pacote principal permanece: 697,77 kB antes de gzip. Auditoria de dependencias aprovada no limiar alto/critico; permanecem dois alertas moderados transitivos uuid/ExcelJS.
- 16 grupos integrados no PostgreSQL compartilhado local aprovados. Schema e arquivos de teste removidos (`cleaned: true`), zero tentativas RM. Nenhuma migration nova ou mudanca no schema operacional.
- Backend local reiniciado com a versao atual; verificacao HTTP de login/auditoria/logos aprovada com logout ao final. Frontend em `http://127.0.0.1:5175` e backend restritos a loopback.

## Limites e pendencias

- SQL Server/RM nao foi executado nesta etapa. Estrutura das consultas e parametros foi validada com mocks, nao com dados reais. A compatibilidade operacional e a conciliacao permanecem pendentes de ambiente/fonte autorizados.
- As views ainda nao oferecem chave unica de titulo/rateio confirmada. Desempates nao garantem estabilidade absoluta entre linhas que empatem em todos os campos usados. Solicitacao de chave e granularidade permanece no inventario para Leonardo, sem inventar identidade ou deduplicar valores financeiros.
- Contagem e leitura paginada nao compartilham snapshot transacional com todas as consultas do painel. Alteracao simultanea dos dados pode deslocar linhas; versao de carga/snapshot e paginacao por chave continuam no backlog D01/D06/UX05.
- URLs legadas com virgulas continuam ambiguas por definicao; o navegador atual sempre envia o formato canonico. Publicar frontend/backend como a mesma release. Nenhum contrato remoto foi migrado ou publicado.
- LGPD: nenhum dado real copiado, nenhum conteudo de filtro registrado na auditoria/logs. Definicoes contratuais, canal de privacidade, retencao e justificativa dos campos continuam pendentes. Nao ha declaracao de conformidade integral.
- Exportacao acima de 5.000 linhas, permissoes especificas, quotas, restore e ativacao do CI/CD remoto continuam conforme backlog. Nao houve push, deploy ou acesso a homologacao.

## Proxima etapa sugerida

D03/D07: revisar os indicadores financeiros implementados no backend contra os contratos ja documentados, ampliar os testes de regras e registrar claramente quais indicadores podem ser verificados localmente e quais dependem de granularidade/chaves/referencias do RM. Priorizar contagem de titulos versus rateios, baixas parciais, valores repetidos e datas de referencia. Nao certificar calculos reais apenas com a demonstracao sintetica.

A mensagem final para Leonardo continua adiada enquanto houver frentes independentes, reunindo depois requisitos de views e evidencias de conciliacao, separados de pendencias de gestao/infra.
