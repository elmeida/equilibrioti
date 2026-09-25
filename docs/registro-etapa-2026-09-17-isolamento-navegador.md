# Registro de acompanhamento: isolamento no navegador

Data: 17/09/2026. Projeto: Equilibrio BI. Marca do produto: Equilibrio TI. Governanca: Atenza. Ambiente: homologacao. Desenvolvimento na maquina local, com Docker como diretriz; PostgreSQL exclusivo do projeto ainda nao provisionado/confirmado.

## O que foi feito

- Contexto centralizado de empresa e sessao. Troca de empresa, novo login e logout descartam o cache e cancelam requisicoes pendentes, inclusive entre abas.
- Respostas atrasadas sao rejeitadas mesmo quando o transporte nao respeita o cancelamento. Exportacoes tambem verificam o contexto antes de iniciar o download.
- Dados financeiros mantidos somente no cache em memoria. Entradas legadas `titulos:*` sao removidas do armazenamento de sessao, sem apagar dados de outras funcionalidades.
- Estado da interface reiniciado ao mudar o contexto, evitando reaproveitar filtros, tabelas e resultados da sessao anterior.
- Metadados da empresa lidos com validacao e gravados apenas com identificador, nome e logo.
- Busca de opcoes corrigida para enviar o termo pesquisado; requisicoes antigas dos filtros sao canceladas.
- Tabela com encerramento do carregamento em caso de falha, mensagem de erro, tentativa novamente e bloqueio de exportacao durante falha/carregamento.
- Exportacao da tabela inclui a pesquisa atual. Respostas antigas nao substituem a busca mais recente.
- Tratamento de cancelamentos e erros nas consultas administrativas e no carregamento do painel.

## Verificacoes

| Verificacao | Resultado |
|---|---|
| Testes automatizados | 72 aprovados em 4 arquivos, incluindo 17 novos sobre contexto/cache |
| Interface normal com API interceptada | 8 grupos aprovados: troca A/B/A, resposta atrasada, erro e recuperacao, exportacao filtrada, busca, logout entre abas e novo login |
| Tipagem | Aprovada |
| Compilacao | Aprovada; permanece aviso de pacote JavaScript acima de 500 kB |
| Telas pequenas | Verificacoes em 390 e 320 px, sem transbordamento horizontal da pagina |
| Inspecao visual | Capturas desktop, 390 e 320 px revisadas; refinamento do cabecalho mobile permanece pendente |
| Dados persistidos e execucao | Sem cache financeiro em sessionStorage ou erros de execucao nos fluxos testados |
| Auditoria de dependencias | Nao repetida nesta etapa; resultado anterior ainda pendente: 15 vulnerabilidades, incluindo 8 altas |
| Autorizacao real no servidor e conciliacao RM | Nao executadas nesta etapa |

Roteiro reproduzivel: `node scripts/check-context-ui.mjs`, com Playwright disponivel e frontend local em `http://127.0.0.1:5175`, ou URL definida em `CONTEXT_QA_URL`. Evidencias locais em `tmp/context-qa/`. O teste intercepta todas as chamadas `/api/`; os contextos controlados nao cadastram empresas nem substituem as bases reais.

## Limites e impacto

O isolamento no navegador nao substitui autorizacao no servidor. A revisao local de contexto nao e uma permissao e nao certifica o isolamento real entre clientes. Cancelar uma gravacao no navegador tambem nao desfaz uma operacao que o servidor ja tenha recebido.

Recarregar a pagina volta a consultar os dados porque o cache financeiro nao persiste entre carregamentos. Dentro do mesmo contexto, o cache em memoria continua disponivel. Atualizar os dados invalida requisicoes pendentes para impedir reaproveitamento de respostas antigas.

Nao foram alteradas formulas financeiras, SQL, views, bancos, migracoes, infraestrutura ou configuracoes de clientes. Nao houve deploy, commit ou push. A tela normal foi disponibilizada localmente na porta 5175; uso com autenticacao real ainda exige o backend e o banco de autenticacao disponiveis.

## Pendencias independentes das views

1. M02/M06: validar permissoes no servidor, usuario/empresa ativos, revogacao de sessoes e testes de acesso indevido entre clientes.
2. M04: proteger credenciais das conexoes e impedir sua exposicao nas respostas administrativas.
3. SC01: preparar ambiente local reproduzivel com PostgreSQL/Docker, sem reabrir o banco remoto publicamente.
4. SC04: tratar vulnerabilidades de dependencias e revisar entrega, reinicio e recuperacao do CI/CD de homologacao.
5. UX05: completar tratamento dos limites de exportacao, inclusive o teto atual de 5.000 linhas, sem truncamento silencioso.
6. D03/D07 e UX: ampliar testes das regras de calculo e estados de ausencia de dados; aceite financeiro depende de referencias do RM.
7. UX06: refinar o cabecalho em telas pequenas, incluindo altura ocupada e botao de instalacao sem identificacao visual nas capturas mobile. Esta etapa nao redesenhou a interface.

## Proxima etapa sugerida

M02/M06: reforcar a autorizacao e a validade das sessoes no servidor, com testes controlados independentes das views. Preparar alteracoes de schema quando necessarias, sem executar migracoes em ambiente remoto nesta etapa.

## Comunicacao com Leonardo

Conforme pedido do usuario, a mensagem final sera preparada somente depois de esgotadas as frentes independentes e consolidadas as lacunas reais das views por cliente. Ainda nao e correto afirmar que restam apenas views.

A lista deve distinguir ajustes de views de outras dependencias externas, como dicionario de campos, associacao fonte/cliente e relatorios de referencia. Nao solicitar recriacao das duas views ja identificadas na fonte inspecionada, nem piloto API ou usuario de integracao sem nova decisao. Se restarem bloqueios que nao sejam views, registra-los explicitamente antes de declarar essa condicao atendida.

Referencias: [backlog](backlog-evolucao-multiempresa-analytics-2026-09-17.md), [inventario de fontes](inventario-fontes-conciliacao-2026-09-17.md) e [parecer sobre APIs](avaliacao-apis-rm-2026-09-17.md).
