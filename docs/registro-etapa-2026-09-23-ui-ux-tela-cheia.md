# Avaliacao de UI/UX e ampliacao de paineis

Data: 23/09/2026. Produto: Equilibrio BI, marca Equilibrio TI, governanca Atenza.
Registro tecnico interno. Nao constitui aceite financeiro, auditoria integral de acessibilidade ou documento formal para cliente.

## Escopo e ambientes

Avaliacao autenticada da homologacao em https://equilibrio-bi-homologacao.atenza.digital, seguida de implementacao local solicitada durante a avaliacao: ampliar individualmente graficos e tabelas, motivada pelo print de rankings comprimidos enviado pelo responsavel.

Homologacao: login administrativo, navegacao de empresas, painel financeiro de uma empresa existente, filtros, ajuda e tabela. Sem alteracoes de cadastros, senhas, views ou dados financeiros. Os acessos normais geram auditoria. Nao foram copiados lancamentos, credenciais ou capturas de dados reais para este documento.

Larguras avaliadas: 1440, 1024, 768, 390, 360 e 320 pixels. Avaliacao por redimensionamento de navegador, nao por dispositivos fisicos; nao cobre Safari/iOS, leitores de tela, zoom completo ou todas as combinacoes de filtros.

Implementacao e verificacao adicional: ambiente local isolado, componentes reais com registros sinteticos em memoria. Nenhuma empresa ficticia cadastrada e nenhuma conexao do teste local com RM/PostgreSQL. Esta alteracao ainda nao foi publicada em homologacao.

## Diagnostico e backlog

| ID | Prioridade | Evidencia / impacto | Acao e criterio de aceite | Status |
|---|---|---|---|---|
| UX07 | Alta | Rankings de oito colunas divididos em tres paineis estreitos; print do responsavel confirma valores fora da area visivel. | Ampliacao individual, fechar por botao/Esc, foco contido e restaurado; ranking detalhado usa largura completa. | Implementado localmente |
| UX08 | Alta | Alterar senha no painel administrativo nao abriu tela. AdminApp nao fornece onChangePassword ao Sidebar, mas o botao e renderizado. | Conectar o fluxo real de troca de senha e validar sucesso/erro/revogacao sem alterar outras contas. | Pendente |
| UX09 | Alta | Acessar empresa, em 390px, comeca em x=358 e termina em x=462; fica parcialmente fora da tabela. | Acesso direto no Dashboard e acao acessivel sem procurar por rolagem horizontal; distinguir acessar painel de editar conexao. | Pendente |
| UX10 | Media | Quatorze campos globais abertos, mais dois controles comparativos. Filtros com cerca de 338px de altura no desktop; primeiros KPIs abaixo de y=1100 no recorte observado. | Separar essenciais/avancados; cabecalho compacto e indicadores antes de longos formularios. Manter todas as capacidades. | Pendente |
| UX11 | Media | Drawer de filtros em 390px: conteudo com 1166px para 844px de altura. Ao abrir a ultima opcao, Aplicar fica acima da area visivel. Aplicar nao fecha o drawer. | Rodape fixo com Aplicar/Limpar; fechar apos aplicar com sucesso; preservar rascunho e sinalizar alteracoes pendentes. | Pendente |
| UX12 | Media | Instalar app fica visualmente vazio no celular: CSS zera a fonte e o botao nao tem icone. Cabecalho ocupa multiplas linhas. | Icone com nome acessivel, instalacao apenas quando pertinente; agrupar acoes secundarias. | Pendente |
| UX13 | Media | Comparacao inicia em Ano anterior mesmo indisponivel; mensagem repetida em todos os KPIs. | Estado inicial Sem comparacao enquanto a fonte nao e elegivel; aviso consolidado e detalhes sob demanda, sem ocultar limites financeiros. | Pendente |
| UX14 | Media | Tabela analitica abre com 21 colunas tecnicas, cerca de 3238px. Datas contam como filtros ativos, mas nao aparecem no resumo dessa aba. | Colunas essenciais por padrao, rotulos de negocio, resumo persistente de periodo/campo de data; manter selecao completa de colunas. | Pendente |
| UX15 | Media | Menu administrativo permanece sobre a tela ao clicar Empresas no celular. Links sem href nao sao naturalmente navegaveis por Tab. Drawer sem dialog/aria-modal, fechar sem nome; Escape nao fechou multisselecao. | Navegacao semantica, fechamento apos selecao, foco/Escape e rotulos acessiveis. | Pendente |
| UX16 | Media | Em 320px, largura util de 305px com scrollbar, documento com 320px e rolagem horizontal da pagina. | Eliminar excesso da pagina; permitir rolagem horizontal somente nos componentes que precisam dela. | Pendente |
| UX17 | Baixa | Codigo dos filtros recarrega as seis listas quando uma busca muda e oculta falhas como lista vazia. | Consultar apenas lista ativa, distinguir carregamento/erro/sem resultado; verificar antes de prometer ganho de desempenho. | Pendente |
| UX18 | Media | Ranking anuncia Top 50, mas usa rows.slice(0,20). | Exibir ate 50 linhas retornadas, sem fabricar ou buscar registros adicionais. | Implementado localmente |

Responsavel sugerido pelos itens: desenvolvimento/frontend. UX07/UX18 nao dependem de Leonardo; demais itens de usabilidade tambem podem avancar sem alterar views. Ativar comparativos numericos reais continua condicionado a cobertura/versionamento e conciliacao.

Avisos de dimensoes iniciais dos graficos apareceram no console de homologacao durante redimensionamento. Graficos renderizaram; nao foi comprovada falha persistente. Investigar em regressao, sem classificar automaticamente como indisponibilidade.

## Filtros mais praticos

Manter na faixa principal: periodo (com atalhos Este mes, Mes anterior, Este ano e Personalizado), tipo financeiro e status financeiro. Mostrar coligada quando houver mais de uma opcao; chamar de Coligada/empresa do RM para nao confundir com cliente da plataforma.

Manter campo de data visivel junto do periodo, ainda que compacto: vencimento, emissao e baixa nao sao intercambiaveis. Agrupar status de baixa, cliente/fornecedor, centro de custo, natureza, documento, conta e origem em Mais filtros. Busca textual proxima da tabela, com uma regra clara para sua combinacao com a busca global.

Mostrar resumo removivel dos filtros aplicados e periodo sempre visivel. Atalhos devem ter comportamento coerente: apenas preparar o rascunho com Aplicar explicito, ou aplicar imediatamente com feedback; nao misturar os dois sem indicacao. Nao salvar dados financeiros ou nomes pesquisados no navegador como parte dessa melhoria.

## Implementacao desta etapa

- Componente ExpandablePanel com icone Maximize2/Minimize2 e descricao ao passar o mouse.
- Dialogo nativo modal ocupando a area do navegador; nao depende de permissao de fullscreen do sistema.
- Fechamento por botao ou Escape, foco ciclico por Tab/Shift+Tab, retorno de foco e restauracao da rolagem da pagina.
- Integrado a graficos de serie, barras, distribuicao, matriz mensal e tabelas analitica, rankings, vencidos, inconsistencias e resumo financeiro.
- Busca, selecao de colunas, ordenacao e pagina da tabela analitica ficam no componente de origem e sao mantidas na ampliacao/restauracao.
- Rankings detalhados deixam a grade de tres colunas, preservam valores numericos e exibem ate 50 linhas. Tabelas largas continuam com rolagem interna no celular; tela cheia nao remove essa necessidade fisica.
- Ajuda dos KPIs e dialogo Ver todos dos graficos preservados. Paineis administrativos e cards numericos nao foram convertidos nesta etapa.

## Verificacao

- Suite final: 603 testes aprovados em 24 arquivos, incluindo sete novos testes de renderizacao/contrato para os paineis.
- Typecheck, build final e limites de bundle aprovados apos o ajuste de teclado. Entrada JavaScript com 208293 bytes; novo modulo de ampliacao com 1826 bytes (929 gzip).
- Navegador local: ranking com 50 linhas e oito colunas legiveis em 1440px; ampliacao em 390px; tabela analitica em 320px com tema escuro, botao de retorno dentro da tela e rolagem interna.
- Pagina 2 preservada ao ampliar/restaurar; busca, ordenacao REF e ocultacao de CODCFO mantidas. Tab/Shift+Tab percorrem o modal; Escape restaura foco/rolagem.
- Grafico de linha renderizado em 390px; distribuicao com duas fatias e SVG nao vazio em desktop; matriz ampliada em 320px. Ver todos abre e fecha sobre o painel ampliado.
- Nenhum erro de console observado no teste local. Nao equivale a auditoria completa, teste de carga ou conciliacao de calculos.
- Tela de ajuda existente funcionou em homologacao; atalho Este mes, aplicar, filtro financeiro e remocao do filtro funcionaram.

Teste local reproduzivel: `node scripts/serve-panel-qa.mjs`, URL `http://127.0.0.1:5187/tests/fixtures/panels.html`. Servidor vinculado somente ao loopback, sem env do projeto, proxy ou rotas de banco. Fixture fora da entrada do build de producao.

## Proxima etapa sugerida

Publicar somente apos validacao/autorizacao de homologacao. Em seguida, tratar UX08/UX09 e simplificar filtros/cabecalho (UX10/UX11/UX12), preservando as regras financeiras e o isolamento por empresa. Pendencias de CI/CD, LGPD e conciliacao continuam independentes desta entrega.

## Referencias

Codigo: `src/AdminApp.tsx`, `src/components/Sidebar.tsx`, `src/components/FilterPanel.tsx`, `src/BIDashboard.tsx`, `src/components/DataTables.tsx`, `src/components/Charts.tsx`, `src/components/ExpandablePanel.tsx`, `src/styles.css`.

Guias Atenza: instrucao rapida, fluxo rapido e padrao de qualidade para sistemas/apps consultados. Reflow e operacao modal avaliados com apoio das referencias oficiais [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) e [W3C Dialog Modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). Tabelas podem exigir rolagem bidimensional; isso nao justifica excesso horizontal em toda a pagina.
