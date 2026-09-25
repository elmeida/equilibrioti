# Equilibrio BI - proposta de evolucao comparativa

Data: 23/09/2026. Versao: 1.0. Situacao: proposta para avaliacao, sem implementacao nesta etapa.

Produto white label Equilibrio TI. Governanca e documentacao Atenza. Ambiente atual de homologacao, nao producao.

## 1. Conclusao executiva

Recomenda-se aproveitar a clareza financeira do projeto Dario e a contextualizacao dos indicadores do Observatorio SEMMU, preservando os controles e a arquitetura ja existentes no Equilibrio BI. Nao ha justificativa identificada para migrar de framework, copiar integralmente qualquer projeto ou introduzir novos servicos nesta etapa.

A ordem sugerida e: corrigir os pontos de uso que dificultam a validacao, compactar filtros e tabelas, ampliar explicacoes e qualidade da informacao, fechar conciliacao e comparabilidade e, depois, evoluir atualizacao em escala e previsoes. Seguranca, isolamento entre empresas e governanca acompanham todas as etapas.

Esta proposta complementa, sem substituir, o [diagnostico UI/UX de 23/09](registro-etapa-2026-09-23-ui-ux-tela-cheia.md) e o [backlog mestre](backlog-evolucao-multiempresa-analytics-2026-09-17.md). As novas frentes abaixo estao propostas, nao aprovadas nem concluidas.

## 2. Escopo e evidencias

Foram inspecionados codigo e registros selecionados, nao executadas suites dos projetos de referencia nem uma nova auditoria visual integral. Quantidades de testes e publicacoes relatadas nos documentos de origem sao evidencias historicas dos respectivos autores, nao resultados reexecutados nesta analise.

| Referencia | Local efetivamente consultado | Contribuicao |
|---|---|---|
| Dario | `C:/Users/herto/OneDrive/Documentos/ChatGPT/Dario/painel-atividades-financeiras` | Comparativos, filtros aplicados, explicacao, exportacao visual e qualidade financeira |
| Observatorio SEMMU | `C:/Projetos/Atenza/site_observatorio_semmu` | Leitura rapida, contexto, fontes, filtros por interacao, tela cheia e assistente com referencias |
| Equilibrio BI | Este repositorio, codigo, backlog e registros de 17 a 23/09 | Base atual e lacunas reais, sem tratar funcionalidade existente como nova |

O caminho SEMMU informado originalmente, `C:/Projetos/Atenza/site/_observatorio/_semmu`, nao existe nesta maquina. A pasta alternativa encontrada corresponde ao projeto descrito pelo README e pelo codigo do Observatorio.

Nenhum banco, view, configuracao de infraestrutura, credencial ou projeto de referencia foi alterado. Nao houve acesso a registros financeiros nesta rodada.

### Evidencias de codigo selecionadas

- Dario: `components/variation-badge.tsx`, `components/indicator-assessment.tsx` e `REGRA-VISUAL-INDICADORES.md`: separacao entre direcao da variacao e avaliacao do resultado.
- Dario: `components/metric-explanation.tsx`: ajuda contextual; parte do conceito e escolhida pelo texto do rotulo. Aqui manter o catalogo explicito por identificador, mais apropriado para contratos financeiros.
- Dario: `app/page.tsx`, resumo a partir da linha 2879, detalhamento a partir da linha 3235 e `lib/financial-dashboard.ts`: filtros aplicados, filtros locais e comparacao financeira.
- Dario: `components/visualization-tools.tsx`: alternancia de grafico, movimento reduzido e PNG com periodo, filtros e fonte.
- Dario: `components/data-quality-notice.tsx` e `api/src/expense-versioned-replacement-plan.mjs`: ressalvas, divergencias e planejamento de substituicao sem decisao automatica. O plano isolado retorna `publishable: false`; nao e, sozinho, um mecanismo de publicacao.
- Dario: relatorios E02-AW, E03-UX07-08 e desempenho administrativo: metodo de validacao, limites e medidas por ambiente.
- SEMMU: `src/pages/ObservatorioGenero.tsx`, linhas 790, 939, 946, 995 e 1089: variacoes, leitura rapida, avisos, filtros identificados e tela cheia por elemento.
- SEMMU: `src/pages/PainelDados.tsx`: painel externo com expansao; nao e modelo recomendado de incorporacao dos dados privados do Equilibrio.
- SEMMU: `auditoria_observatorio/lis/IMPLEMENTACAO_E_TESTES.md` e `BACKLOG.md`: referencias, limites de contexto, estados de consulta e pendencias de qualidade. Nao equivalem a certificacao atual do projeto inteiro.
- Equilibrio: `src/utils/kpiExplanations.ts`, `src/components/KpiHelp.tsx`, `ExpandablePanel.tsx`, contratos dos comparativos e registros de testes.

## 3. Nivel de qualidade observado

| Dimensao | Dario | SEMMU | Direcao para o Equilibrio |
|---|---|---|---|
| Interpretacao | Distincao clara entre variacao e julgamento; ajuda e ressalvas | Leitura rapida, fonte, periodo, limites e unidades | Combinar os dois, sem inferir regra a partir do nome do indicador |
| Exploracao | Filtros explicitos, detalhes e exportacao com contexto | Clique em grafico com identificacao da origem do filtro | Mesmo recorte em resumo, tabela e exportacao; desfazer filtro individual |
| Confiabilidade | Conciliacao, divergencias, historico de revisoes e restricao de publicacao | Metadados e avisos sobre disponibilidade das fontes | Evoluir de consulta concluida para qualidade e atualidade comprovadas por empresa |
| Experiencia | Modulos sob demanda e estados independentes | Expansao e leitura contextual | Preservar tela cheia local e tratar os problemas UX08-UX17 |
| Sustentacao | Relatorios delimitam testes e ganhos de desempenho | Backlog explicita limitacoes de tipos, interface e operacao | Nenhum dos projetos e padrao integralmente certificado a copiar |

Nao atribuir nota numerica ou porcentagem de aderencia sem checklist integral e testes atuais. Ha boas praticas concretas nos dois projetos, mas tambem ressalvas nos seus proprios registros. Alertas historicos de dependencias ou de compilacao nao foram reavaliados aqui.

## 4. O que ja existe no Equilibrio

- Ajuda dos 26 KPIs com formula, campos, unidade, referencia temporal e limites da leitura.
- Contrato de periodos e comparativos preparado; numericos reais condicionados a cobertura e versao da origem.
- Falha, espera, sucesso e repeticao por bloco; descarte de respostas antigas ao mudar contexto.
- Grafico com alternativa tabular e tratamento de sinais, ausencias e valores negativos.
- Filtros multiplos, ordenacao, paginacao e exportacao limitada com aviso de completude.
- Carregamento sob demanda, limite de pacote, controles de cache, auditoria e isolamento entre empresas.
- Tela cheia individual e rankings com largura completa/ate 50 linhas implementados e testados localmente, ainda nao publicados conforme o registro de 23/09.

O ultimo registro local informa 603 testes aprovados, tipos e build aprovados. Nao foram reexecutados nesta analise. Teste tecnico nao substitui conciliacao com o RM nem aceite do cliente.

CI/CD esta preparado, mas a ativacao remota permanece pendente de regularizacao do repositorio/permissoes. Backup existe; ensaio completo de restore e custodia definitiva continuam pendentes. Papeis contratuais, canal de privacidade e retencao ainda precisam de definicao. Nao declarar conformidade LGPD integral.

## 5. Experiencia proposta

### Inicio do painel

Cabecalho compacto com marca Equilibrio TI, empresa ativa e acao de troca para quem tem permissao. A entrada na empresa deve ser evidente no painel do administrador e utilizavel no celular, sem obrigar rolagem horizontal de uma tabela.

Primeira faixa: periodo, eixo de data, tipo financeiro e status. Coligada aparece quando aplicavel; o nome deve distingui-la da empresa cliente da plataforma. Os demais filtros ficam em area avancada. Datas escolhidas ainda nao aplicadas nao podem mudar o resumo do resultado ja exibido.

Na sequencia: filtros aplicados removiveis, condicao dos dados e um conjunto inicial pequeno de indicadores. Demais indicadores ficam agrupados por assunto. O conjunto inicial deve ser decidido com o usuario de negocio; nao remover os 26 existentes.

Tabelas largas ocupam a largura disponivel. Celular mantem colunas essenciais e detalhes sob demanda. A pagina nao deve rolar lateralmente; uma tabela genuinamente bidimensional pode ter rolagem interna identificada.

### Explicacoes e leitura rapida

Ampliar a ajuda existente para graficos, rankings, alertas e exportacoes. Cada analise tem identificador e contrato explicito: pergunta respondida, formula, unidade, granularidade, data, fonte, cobertura, limite e acesso ao detalhe.

Usar icone de informacao acessivel para a explicacao completa. Quando necessario para interpretar o resultado, apresentar uma frase curta no proprio bloco, sem criar uma parede de orientacoes ou tutorial permanente.

Exemplos de conteudo proposto, sem numeros inventados: "Volume de rateios no periodo; nao representa saldo bancario"; "Comparacao indisponivel: cobertura anterior nao informada"; "Baixas parciais nao compoem integralmente este valor em aberto". Resumos quantitativos devem ser calculados por regras deterministicas, associados ao mesmo recorte e versao do resultado.

### Cor, comparacao e detalhamento

Separar aumento/queda de favoravel/desfavoravel. Mais despesa nao comprova piora; menos despesa nao comprova eficiencia. Ausencia nao e zero. Uma avaliacao exige criterio explicito por indicador e sinais textuais, nao somente cor.

Mostrar atual, anterior, diferenca monetaria e percentual apenas quando a base permitir. Diferenca entre taxas usa pontos percentuais. Periodo aberto nao deve ser comparado silenciosamente a periodo anterior completo. Saldo/status atual nao reconstroi saldo historico.

O caminho de exploracao sugerido e resumo -> grupo -> registros de origem. Todos os niveis mantem empresa, filtros, periodo, unidade e versao. Antes de chamar uma linha de titulo, documento ou cliente unico, confirmar as respectivas chaves na origem.

## 6. Backlog consolidado proposto

Prioridade P0: bloqueio/risco de uso. P1: proxima frente. P2: evolucao apos a base. P3: opcional futura. Esforco P/M/G e comparativo, nao prazo ou orcamento. Responsaveis sao papeis propostos, nao compromisso de agenda.

| ID | Pri. / esforco | Entrega e como implementar | Aceite principal | Dependencia / responsavel |
|---|---|---|---|---|
| UX08-UX09 | P0 / P | Corrigir troca de senha do administrador e entrada na empresa, reaproveitando fluxos existentes | Fluxo completo por teclado e celular, sem botao cortado; acesso individual | Sem views / Desenvolvimento |
| UX07-UX18 | P1 / P | Promover tela cheia e rankings ja implementados apos regressao da versao candidata | Busca, ordem e pagina preservadas; Esc e foco; ate 50 linhas coerentes | Publicacao posterior em HML / Desenvolvimento e Infra |
| UX10-UX12 | P1 / M | Filtros essenciais/avancados, rodape Aplicar no celular, cabecalho e instalacao revisados | Rascunho separado do aplicado; Aplicar acessivel com teclado virtual; nenhum botao vazio | Sem views / Desenvolvimento |
| UX13-UX17 | P1 / M | Aviso comparativo unico, nomes/colunas de negocio, periodo visivel, navegacao e busca de listas | Sem erro tratado como lista vazia; sem vazamento de resposta entre empresas; largura e foco corretos | Sem views / Desenvolvimento |
| EV01 | P1 / M | Expandir catalogo de ajuda e resumo deterministico aos graficos e rankings | Formula e limite corretos por ID; recorte mantido; sem conclusao causal | Sem views para estrutura / Desenvolvimento e Equilibrio TI |
| EV02 | P1 / M | Padronizar variacao, avaliacao e estados de dados | Aumento/queda nao define julgamento; nulo, zero, parcial e erro distintos | Sem views para estrutura / Desenvolvimento |
| EV03 | P1 / M | Painel de qualidade por empresa: cobertura, atualizacao, conciliacao e ocorrencias | Consulta e atualizacao na origem separadas; desconhecido permanece explicito | UI pode avancar; metadados reais dependem da fonte / Desenvolvimento e Leonardo |
| EV04 | P2 / M | Acoes comuns nos paineis: expandir, detalhar, grafico/tabela e exportar PNG com contexto | Somente acoes suportadas; imagem com empresa, periodo, fonte e ressalva; permissao/auditoria | Politica de exportacao / Desenvolvimento e Gestao |
| EV05 | P2 / M | Presets de colunas e filtros salvos por usuario e empresa | Preferencias nao concedem acesso; ao trocar empresa nao reaproveitam dados/nomes indevidos | Politica de persistencia / Desenvolvimento |
| EV06 | P1 / G | Conciliacao, contratos e comparativos reais por empresa | Totais de referencia RM reproduzidos; diferencas explicadas e aprovadas | Chaves, rateios, baixas, saldo e cobertura / Leonardo, clientes e Desenvolvimento |
| EV07 | P2 / G | Evoluir analises financeiras do quadro seguinte | Cada metrica habilitada apenas com contrato atendido e amostra conciliada | Dependencia varia por analise / Desenvolvimento e Equilibrio TI |
| EV08 | P2 / G | Avaliar camada analitica versionada, cargas idempotentes e controles de concorrencia | Reprocessamento sem duplicacao, ultima versao valida, isolamento, rollback e carga medidos | Projeto de dados, infraestrutura e governanca / Desenvolvimento e Infra |
| EV09 | P3 / G | Previsoes e cenarios explicaveis | Validacao temporal, erro comparado a base simples, faixa de incerteza e limitacoes | Historico suficiente e conciliado / Equilibrio TI e Desenvolvimento |
| EV10 | P3 / G | Assistente de ajuda e, posteriormente, consulta governada | Fonte/periodo citados, recusa sem base, sem acesso cruzado e sem SQL livre | Autorizacao especifica, privacidade e custo / Gestao e Desenvolvimento |
| OP01 | P1 / M | Concluir fluxo de entrega e recuperacao ja mapeado | Pipeline remoto executado, segredos protegidos, aprovacao HML, rollback/restore ensaiados | Permissoes Git e destino de restore / Gestao e Infra |
| GOV01 | P1 / M | Fechar definicoes de privacidade e operacao | Responsabilidades, canal, retencao, exportacao e acessos aprovados | Atenza, Equilibrio TI, clientes e apoio juridico |

EV01-EV10 detalham/complementam UX01-UX06, D01-D08, M e SC do backlog mestre; nao representam uma segunda contagem de conclusao das mesmas funcionalidades. OP01 e GOV01 sao agrupamentos de pendencias existentes.

## 7. Analises adicionais para tomada de decisao

| Analise | Utilidade | Dados e condicoes necessarios | O que pode avancar agora |
|---|---|---|---|
| Concentracao e Pareto | Ver dependencia de poucos clientes/fornecedores e centros de custo | Universo completo, medida aditiva e identidade confiavel. Top 50 sozinho nao fornece denominador global | Contrato, visual e teste; ranking por nome deve ser rotulado como tal, nao cliente unico |
| Envelhecimento dos vencidos | Priorizar cobranca por faixas de atraso | Vencimento, data de posicao e saldo residual, incluindo baixas parciais | Interface e regras; indicador completo depende do saldo conciliado |
| Agenda de entradas e saidas | Antecipar compromissos de 7/30/60/90 dias | Vencimentos e saldos residuais com cancelamentos/renegociacoes | Contrato e visual; nao chamar agenda de caixa realizado |
| Pontualidade e atraso ponderado | Entender recebimentos/pagamentos fora do prazo | Eventos de baixa unicos, valores, vencimento e regras de rateio | Casos de teste; nao usar uma data final de baixa como se fosse todos os eventos |
| Evolucao por centro de custo e natureza | Localizar concentracao e mudancas do periodo | Classificacao estavel, mesma regra/periodo e cobertura | Melhorar leitura atual; variacao real condicionada a comparabilidade |
| Duplicidades e anomalias | Sinalizar casos para revisao | Chaves de titulo/parcela/rateio e regras de negocio | Sinais tecnicos conhecidos; sem chamar rateios legitimos de duplicidade ou anomalia de fraude |
| Previsto versus realizado | Medir desvio de planejamento | Orcamento/meta aprovada e realizado conciliado, mesma competencia | Especificacao; nao ha evidencia de fonte orcamentaria empresarial contratada |
| Previsao de recebimentos e cenarios | Apoiar planejamento com incerteza explicita | Serie coerente, eventos, historico suficiente, sazonalidade e validacao temporal | Desenho metodologico; nao habilitar previsao confiavel apenas com a soma atual dos rateios |

Previsao deve comecar por uma referencia simples e explicavel. Separar treino e teste no tempo, impedir uso de informacao futura e medir erro por horizonte/empresa; publicar modelo mais complexo somente com beneficio demonstrado. Sem historico suficiente, manter indisponivel. Cenarios ajustados pelo usuario nao devem ser apresentados como previsoes estatisticas.

## 8. Escalabilidade e isolamento

Preservar a empresa cliente como fronteira de autorizacao no servidor. Coligadas RM sao dimensoes internas, nao substitutos dessa fronteira. Administrador geral tem acesso excepcional identificado e auditado; usuarios de empresa nao herdam visibilidade de outros clientes.

Novos filtros salvos, exportacoes, jobs, caches e eventual assistente precisam carregar o contexto autorizado da empresa. Chaves de cache incluem empresa, permissao, filtros e versao. Mudancas de permissao/sessao invalidam conteudo. Novas tabelas exigem estrategia de isolamento consistente, testes negativos e avaliacao de defesa adicional no banco, sem presumir que somente um campo de empresa garante seguranca.

Uma camada analitica no PostgreSQL e candidata para reduzir consultas repetitivas ao RM e fornecer snapshots consistentes. Deve ser adotada apenas apos medir gargalos e custo de manutencao. Duplicar dados amplia o escopo de protecao, backup e retencao.

Desenho candidato: conector por cliente -> area de preparacao -> validacao/quarentena -> publicacao atomica de versao -> agregados/API autenticada. Falha mantem a ultima versao valida com aviso de desatualizacao, nunca como dado novo. Incremental requer chaves, marcadores de alteracao e tratamento de exclusoes; timestamp isolado nao garante captura correta.

Medir duracao/falhas de carga, p50/p95 de consultas e interacoes, consumo de memoria, concorrencia e custo por cliente. Aplicar limites para que uma carga grande nao bloqueie os demais. Desenvolvimento continua na maquina do usuario e PostgreSQL Docker compartilhado, com isolamento do projeto; nao criar outro container por padrao.

Sobre APIs RM: esta comparacao nao reabre piloto nem comprova que API e mais rapida. Preservar a avaliacao documentada em 17/09. A equivalencia dos campos, versao/modulos do RM, paginacao, limites e custo total de atualizacao precisam ser demonstrados. Melhorar independencia de views e melhorar desempenho sao beneficios distintos.

## 9. O que nao copiar

- Identidade do portal SEMMU, paginas institucionais, carrosseis, botoes flutuantes acumulados ou a estrutura de varias plataformas. O Equilibrio continua uma ferramenta operacional com marca Equilibrio TI.
- Regras publicas de orcamento/empenho/liquidacao como se fossem conceitos equivalentes aos titulos empresariais RM.
- `DeltaBadge` da SEMMU que colore pelo sinal como avaliacao geral. O significado financeiro depende de cada indicador.
- Comparar o item anterior de uma serie e chama-lo automaticamente de ano anterior: validar continuidade e calendario, inclusive lacunas.
- Valores de fallback estaticos quando uma API privada falhar. Se houver ultima carga valida, identificar sua versao e idade.
- Injecao manual de botoes via DOM para expandir paineis; reaproveitar o componente React ja implementado.
- Download irrestrito de imagens ou dados. Em BI privado, exportacao precisa de permissao, minimizacao, contexto e trilha adequada.
- Assistente publico ligado diretamente a documentos/dados de todos os clientes; tratar autorizacao no servidor, sem confiar apenas no prompt.
- Ganhos de desempenho, cobertura ou certificacao derivados de uma unica medicao ou da quantidade de testes.

## 10. Sequencia e criterios de liberacao

| Etapa | Entrega | Porta de saida | Dependencia externa |
|---|---|---|---|
| 1 | UX08-UX09, validacao da tela cheia ja pronta, UX10-UX12 | Usuario entra na empresa, altera senha e aplica filtros em computador/celular; testes sem regressao | Nenhuma view; publicacao HML em etapa posterior |
| 2 | UX13-UX17, EV01-EV02 e estrutura EV03 | Contexto uniforme, tabela legivel, ajuda e estados corretos, navegacao acessivel | Metadados desconhecidos explicitamente pendentes |
| 3 | EV04-EV05 opcionais e controles OP01/GOV01 | Exportacao e preferencias autorizadas; pipeline/recuperacao e regras de operacao comprovados | Gestao/Infra, nao ajustes de views |
| 4 | EV06 e analises elegiveis EV07 | Conciliacao assinada ou aceite registrado por responsavel de cada cliente; historico comparavel | Leonardo e clientes |
| 5 | EV08 por necessidade comprovada | Medicao antes/depois, isolamento concorrente, reprocessamento e rollback | Contratos de origem e Infra |
| 6 | EV09 e eventual EV10 | Beneficio demonstrado, riscos aprovados e validacao por empresa | Historico, governanca e decisao de escopo |

OP01/GOV01 podem caminhar em paralelo desde a primeira etapa. Metadados de cobertura/versao necessarios aos comparativos devem ser antecipados de EV08 quando EV06 precisar deles, sem esperar a camada analitica completa. Nao habilitar recurso numerico bloqueado apenas para encerrar uma etapa.

### Verificacao transversal

- Funcional: mesmos filtros e totais entre resumo, detalhe e exportacao; periodo/eixo sempre reconheciveis; preservacao de estado ao ampliar.
- Interface: 320, 360, 390, 768, 1024 e 1440 px, orientacao horizontal, zoom, teclado virtual, Tab/Shift+Tab/Esc, foco e leitores de tela. Sem sobreposicao; contraste e movimento reduzido. Ensaios previos nao equivalem a conformidade integral.
- Financeiro: zero/nulo/base negativa, centavos e arredondamento, mes aberto, ano bissexto, ausencia de ano intermediario, baixas parciais, estorno e rateios duplicando campos de titulo.
- Isolamento: trocar empresa durante consultas, exportacao, importacao e dialogos; impedir acesso direto por identificador, cache e preferencias. Testar administrador versus usuarios de empresas diferentes.
- Operacao: timeouts, lentidao, origem indisponivel, ultima carga valida, publicacao/rollback e restore em destino descartavel autorizado.

Os criterios de dialogo, foco e fechamento seguem o [padrao W3C de dialogos modais](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). Reflow a 320 CSS px, com excecao localizada para tabelas bidimensionais, segue a [orientacao W3C sobre reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). Sinais textuais complementam cores conforme [W3C sobre uso da cor](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html). Referencias consultadas em 23/09/2026; sao criterios de trabalho, nao selo de conformidade.

## 11. Pendencias de decisao e encerramento da etapa

Gestao Atenza/Equilibrio TI: aprovar a primeira frente, definir usuario validador e os indicadores prioritarios; concluir privacidade, retencao e politica de exportacao. Infra: regularizar Git/CI/CD e ensaiar recuperacao. Leonardo/clientes: contrato e amostras das fontes RM.

Para Leonardo, manter uma lista consolidada, sem solicitar views novas por recurso visual: identificadores e granularidade; valores de titulo/rateio/baixa sem duplicacao; eventos, saldos parciais, estornos e cancelamentos; eixos de data/fuso; moeda/precisao; cobertura, versao e referencias de conciliacao. O esquema final e os nomes de campos devem ser definidos no contrato, nao inventados neste documento.

Feito nesta etapa: comparacao de referencias, consolidacao com a analise UI/UX e proposta de sequencia/aceite. Nenhuma mudanca funcional, publicacao, acesso a banco ou alteracao dos projetos de referencia.

Proxima etapa sugerida: executar o pacote 1, com entrada na empresa, troca de senha e filtros compactos, preservando a tela cheia ja preparada; depois revalidar a versao candidata antes de publicar em homologacao. Ainda nao restam apenas ajustes em views.

## 12. Documentos para leitura

- [Proposta executiva em PDF](../output/proposta-evolucao-2026-09-23/Equilibrio_BI_Proposta_Evolucao_2026-09-23.pdf).
- [Versao editavel em Word](../output/proposta-evolucao-2026-09-23/Equilibrio_BI_Proposta_Evolucao_2026-09-23.docx).

Documentos gerados a partir dos componentes do gerador oficial Atenza, sem alterar o gerador compartilhado. PDF com sete paginas, fontes institucionais embutidas, cabecalho/rodape e marca d'agua conferidos visualmente. DOCX com fontes oficiais incorporadas para evitar substituicao na maquina de leitura e previa conferida no Word. Nenhum documento foi enviado ao parceiro ou anexado ao CRM nesta etapa de avaliacao.
