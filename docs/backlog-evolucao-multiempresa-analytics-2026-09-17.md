# Backlog de evolução: multiempresa, confiabilidade e análises

Projeto: Equilíbrio BI, White Label Equilíbrio TI  
Data: 17/09/2026 | Versão: 1.1  
Situação original: planejamento proposto em 17/09/2026. Atualização: entrega local do marco 0, inspeção inicial de fontes reais e inclusão da avaliação de APIs solicitada pelo usuário.  
Escopo acumulado: especificação, demonstração local, testes, inspeção de metadados em leitura e pesquisa documental de APIs. Sem migrations, deploy ou alteração dos bancos reais. Valores financeiros ainda não conciliados.

## 1. Direção do produto

Evoluir para uma plataforma financeira multiempresa escalável, com isolamento comprovado, indicadores conferíveis e recursos de apoio à decisão. Somente o administrador geral da plataforma poderá consultar empresas clientes diferentes. A experiência pública permanece Equilíbrio TI; documentos formais de acompanhamento do projeto continuam no padrão Atenza.

Ordem de valor: proteger os dados, conferir os cálculos, tornar a interpretação clara, oferecer comparações e análises gerenciais e, por último, habilitar previsões que tenham evidências de desempenho.

Este documento complementa [o backlog de adequação existente](backlog-adequacao-atenza.md), preservando suas pendências. Não substitui evidências de conclusão por marcações de “atendido”. É uma proposta técnica interna, não um aceite de homologação ou documento formal para cliente.

### Regras já definidas pelo usuário

1. Cada empresa cliente tem acesso somente aos próprios dados, inclusive em filtros, relatórios, exportações, arquivos e análises futuras.
2. Apenas o administrador geral tem acesso entre empresas, com contexto explícito e registro das ações.
3. Desenvolvimento na máquina local/Docker, sem dependência obrigatória do banco remoto de homologação.
4. Projeto em homologação. `atenza-hml-apps-01.atenza.cloud` é o destino documentado; implantação ativa não foi verificada nesta revisão.
5. A Equilíbrio TI, com Leonardo de Medeiros, é responsável pelas views RM e pelo apoio à validação funcional com os clientes.
6. A entrega original foi somente o backlog. O usuário autorizou iniciar as etapas e solicitou, ao fim de cada uma, informar o realizado e a próxima etapa sugerida.
7. Avaliar APIs nativas do RM, desempenho e usuário de integração por cliente para reduzir dependência de views e simplificar a entrada de novas empresas. Não substituir a fonte atual sem comprovar cobertura, isolamento e resultados.

### Situação constatada

Fotografia da análise original, preservada como histórico. Atualizações após implementação e acesso de leitura estão nas seções 13 e 14.

- React/TypeScript e Express já oferecem dashboards, filtros, administração, consultas SQL Server e exportação Excel; PostgreSQL atende autenticação e cadastro de empresas.
- A base multiempresa existe, mas não há evidência suficiente para declarar isolamento completo. O cache no navegador ignora o contexto da empresa.
- Existem Docker e containers PostgreSQL na máquina. Não foi confirmado banco, schema ou usuário local específico do Equilíbrio BI; não provisionar outra instância sem verificar esse mapeamento.
- Não há Compose próprio nem modo demonstrativo sem RM neste projeto. Os cinco testes existentes não conferem indicadores ou isolamento completo.
- Os arquivos locais de CI/CD, testes e documentação ainda aparecem sem rastreamento Git. Publicação e execução no GitHub não foram verificadas.
- A documentação de julho registra as views como pendentes; o recebimento atual não foi confirmado. Não tratar isso como impedimento para testes com dados sintéticos.

## 2. Referências estudadas

### Observatório SEMMU

O caminho informado não existe nesta máquina. Foi localizado o projeto correspondente em `C:/Projetos/Atenza/site_observatorio_semmu`.

Em [ObservatorioGenero.tsx](C:/Projetos/Atenza/site_observatorio_semmu/src/pages/ObservatorioGenero.tsx:901), foram identificados metadados de fonte/período, comparações visuais, `InsightBox` com “Leitura rápida” e `DataNotice` com ressalvas sobre os dados.

Aplicação proposta: leitura curta dos resultados, fonte e período visíveis, ressalvas específicas e comparações que distingam percentual de pontos percentuais. Adaptar ao domínio financeiro e à marca Equilíbrio TI, sem transportar a identidade visual ou as regras do observatório.

### Projeto Dario

Referência principal: `C:/Users/herto/OneDrive/Documentos/ChatGPT/Dario/painel-atividades-financeiras`.

- [Dashboard de receitas](C:/Users/herto/OneDrive/Documentos/ChatGPT/Dario/painel-atividades-financeiras/components/revenue-dashboard.tsx:375): ajuda contextual, variação entre períodos, minigráfico, comparação condicionada à cobertura e expansão do gráfico.
- [Origem e conferência](C:/Users/herto/OneDrive/Documentos/ChatGPT/Dario/painel-atividades-financeiras/components/expense-record-info.tsx:10): detalhamento do registro e interpretação da evidência.
- [Aviso de qualidade](C:/Users/herto/OneDrive/Documentos/ChatGPT/Dario/painel-atividades-financeiras/components/data-quality-notice.tsx:5): divergências e referência de origem sem esconder os valores.
- [Análises gerenciais](C:/Users/herto/OneDrive/Documentos/ChatGPT/Dario/painel-atividades-financeiras/lib/management-insights.ts:26): concentração e Pareto.

Usar os padrões de interação como referência, não copiar automaticamente cálculos de finanças públicas. A inspeção foi de código e documentação, sem validação visual em navegador dos projetos de referência.

## 3. Achados que orientam a prioridade

“Confirmado no código” significa comportamento identificável por leitura, não teste com o RM real. As regras financeiras dependentes da origem precisam de conciliação antes de certificação.

| Achado | Classificação e impacto | Evidência | Itens |
|---|---|---|---|
| Cache e requisições em andamento não incluem empresa/usuário na chave | Confirmado. Troca de empresa e respostas atrasadas podem reapresentar dados de outro contexto. | [api.ts](../src/services/api.ts:50) | M03, M06 |
| Token mantém perfil e empresa por até 12 horas | Confirmado. Desativação, mudança de vínculo ou senha não revogam acesso imediatamente às rotas financeiras. | [middleware.js](../server/auth/middleware.js:17) | M02, M06 |
| Credencial RM em texto e retorno integral no cadastro | Confirmado. Exposição desnecessária ao banco e à resposta administrativa. | [admin.js](../server/routes/admin.js:76), [schema](../server/db/migrations/001_auth_schema.sql:9) | M04 |
| “Empresa com maior volume” usa o primeiro resultado ordenado pelo nome | Confirmado. A liderança exibida pode estar errada mesmo com totais corretos. | [App.tsx](../src/App.tsx:503), [titulos.js](../server/routes/titulos.js:144) | D04 |
| Quantidade de títulos conta linhas; clientes e documentos usam nomes/números isolados | Risco dependente das views. Rateios podem multiplicar títulos; homônimos e documentos repetidos podem ser fundidos. | [titulos.js](../server/routes/titulos.js:56) | D01, D02, D04 |
| Aberto e vencido consideram somente status “Em Aberto” | Confirmado. Baixas parciais são excluídas; efeito sobre saldo residual depende do contrato de dados RM. | [titulos.js](../server/routes/titulos.js:53) | D03, D05 |
| “Valor baixado” pode usar rateio, enquanto “valor de baixa” usa VLRBAIXA | Confirmado. Rótulos próximos representam grandezas distintas; não declarar realizado sem separar principal e encargos. | [titulos.js](../server/routes/titulos.js:54), [KpiCards.tsx](../src/components/KpiCards.tsx:26) | D03, D05 |
| Percentual de registros com alerta soma contagens por regra | Confirmado. O mesmo título pode contar várias vezes e superar 100%. | [App.tsx](../src/App.tsx:528) | D04 |
| Média de atraso usa AVG sobre DATEDIFF inteiro | Confirmado na expressão. SQL Server retorna inteiro para AVG de inteiro, perdendo frações; a ponderação por linha também precisa ser revisada. | [titulos.js](../server/routes/titulos.js:73), documentação Microsoft abaixo | D04 |
| Valores ausentes viram zero; conversões inválidas podem virar NULL e ser ignoradas na soma | Confirmado nos caminhos de formatação/conversão. Pode aparentar ausência de movimento quando faltam dados válidos. | [format.ts](../src/utils/format.ts:5), [titulosBase.js](../server/sql/titulosBase.js:32) | D03, D06, UX06 |
| Gráfico de rosca cria valor visual para grupos de valor zero | Confirmado. A área representada pode divergir do valor financeiro e negativos exigem outra representação. | [Charts.tsx](../src/components/Charts.tsx:213) | UX04 |
| Previsto/realizado reutiliza o mesmo filtro temporal nas duas séries | Confirmado. É necessário distinguir análise da mesma carteira de análise de movimentos de caixa do período. | [titulos.js](../server/routes/titulos.js:223) | D03, D05, UX02 |
| Views e duas coligadas estão fixas no código | Confirmado. Adicionar clientes com fontes diferentes não é apenas cadastrar uma conexão. | [titulosBase.js](../server/sql/titulosBase.js:77) | D01, D02, SC06 |
| Pools por empresa não têm descarte de ciclo de vida; cache só remove expirados se consultados | Confirmado. Risco de crescimento de memória/conexões e uso de credenciais antigas após edição. | [pool.js](../server/db/pool.js:17), [cache.js](../server/utils/cache.js:1) | SC02 |

O retorno inteiro de `AVG(int)` está descrito na [documentação oficial do SQL Server](https://learn.microsoft.com/en-us/sql/t-sql/functions/avg-transact-sql?view=sql-server-ver17). Não foi executada consulta real para medir o impacto na base do projeto.

## 4. Arquitetura proposta

### Limite de isolamento

`tenant` significa empresa cliente contratante da plataforma. Coligadas e filiais do RM são subdivisões desse tenant, não fronteiras suficientes de segurança. Duas empresas clientes com coligada 1 continuam sendo dois contextos independentes.

| Camada | Direção proposta |
|---|---|
| Identidade | Papel explícito de administrador geral; demais usuários vinculados a um tenant. Não inferir privilégio global de um rótulo genérico “administrador”. Migração dos usuários atuais exige conferência. |
| Autorização | Validar sessão ativa, tenant ativo e permissão em cada operação. Contexto escolhido no navegador é apenas uma solicitação; a autorização ocorre no servidor. Negar por padrão. |
| Administração | Acesso entre clientes exclusivo ao administrador geral. Se existir gestor de cliente no futuro, ficará restrito ao próprio tenant e sem poderes para criar administradores globais. |
| Dados próprios | PostgreSQL com tenant obrigatório nas entidades de negócio compartilhadas, índices e relacionamentos compostos que impeçam vínculos entre tenants. Cadastros globais e autenticação têm política separada e explícita. |
| Defesa adicional | Avaliar RLS nas tabelas por tenant. Papel da aplicação sem superusuário/BYPASSRLS e separado do dono/migrations; contexto transacional e testes de reutilização do pool. O caminho administrativo não exige superusuário do banco. |
| Integração RM | Credencial de leitura com privilégio mínimo por tenant e catálogo de views autorizado. Sem SQL arbitrário enviado pelo navegador. TLS e conectividade definidos por cliente. |
| Consultas e cache | Chaves por tenant, escopo de permissão, filtros, período, versão do dado e versão da métrica. Respostas atrasadas não podem repopular contexto encerrado. |
| Arquivos e tarefas | Relatórios, uploads privados, jobs, notificações e downloads exigem autorização por tenant tanto na criação quanto no consumo. Logo só é pública quando explicitamente classificada como tal. |
| Escala | Manter inicialmente aplicação modular e processos de trabalho em segundo plano. Limitar recursos por tenant; introduzir cache compartilhado e mais réplicas quando as medições justificarem. |
| Dados analíticos | Evoluir para carga controlada, normalização, validação e publicação versionada. Preservar origem e correções; não fazer cada gráfico repetir grandes leituras remotas indefinidamente. |

RLS é uma defesa complementar: proprietários normalmente contornam suas políticas e papéis privilegiados exigem cuidado, conforme a [documentação oficial PostgreSQL](https://www.postgresql.org/docs/17/ddl-rowsecurity.html). A decisão final deve considerar a versão efetivamente escolhida para o banco local e homologação.

Não introduzir microserviços, clusters ou banco separado por cliente como requisito inicial. A necessidade de isolamento físico pode ser avaliada por contrato, volume ou restrição do cliente. A segregação lógica e seus testes são obrigatórios desde a primeira empresa.

## 5. Contrato dos indicadores

Cada indicador deverá registrar nome de negócio, identificador, fórmula versionada, unidade, granularidade, fonte, filtros, data de referência, status incluídos, tratamento de nulos, arredondamento, cobertura, interpretação e responsável pelo aceite. O mesmo contrato deve atender API, card, gráfico, tabela e exportação.

| Indicador | Definição a implementar/validar | Principal cuidado |
|---|---|---|
| Quantidade de títulos | Contagem de chave estável de título dentro de tenant, fonte, coligada e parcela, conforme contrato RM. | Não contar rateios ou eventos de baixa como novos títulos. |
| Principal rateado | Soma de parcelas de rateio reconciliadas ao principal do título. | Confirmar se valores de título se repetem nas linhas; não somar indiscriminadamente VLRORIGINAL. |
| Saldo em aberto | Saldo residual na data de referência, incluindo títulos parcialmente liquidados. | Preferir saldo oficial conferido; fórmula derivada exige eventos, estornos, descontos e regras aprovadas. Não assumir apenas rateio menos baixa. |
| Vencido em aberto | Saldo residual positivo e vencimento anterior à data de referência, separado entre pagar e receber. | Hoje não é vencido; título quitado após a data histórica ainda estava aberto naquela data. |
| A vencer | Saldo residual com vencimento igual ou posterior à referência. | Separar “vence hoje” para decisão operacional. |
| Realizado | Eventos efetivos de recebimento ou pagamento ocorridos no período, líquidos de estornos conforme convenção aprovada. | Distinguir principal, juros, multa, desconto, impostos e valor de caixa. |
| Fluxo líquido de títulos | Recebimentos menos pagamentos no recorte, com base temporal explícita. | Não chamar de lucro, saldo bancário ou caixa disponível sem as fontes correspondentes. |
| Ticket médio | Valor definido no contrato dividido por títulos únicos elegíveis. | Denominador zero gera indisponível; ticket da carteira difere de ticket de pagamentos. |
| Atraso médio | Média decimal de dias por título elegível; versão ponderada pelo saldo deve ser indicador diferente. | Não ponderar involuntariamente por quantidade de rateios. |
| Percentual vencido | Residual vencido a receber / residual total a receber na mesma referência. | Separar compromissos a pagar; base vazia não equivale a 0%. |
| Qualidade da base | Títulos únicos afetados / títulos únicos avaliados, acompanhados da contagem separada de ocorrências. | Uma ocorrência não prova erro; diferença pode ser legítima no RM. |
| Concentração | Participação de contraparte por identificador estável, separando recebimentos de pagamentos. | Não unir homônimos nem confundir concentração de receitas com volume total financeiro. |
| Variação | Diferença absoluta e relativa entre recortes comparáveis. | Mudanças em taxas devem mostrar pontos percentuais; base zero, negativa ou ausente tem regra própria. |

Regras transversais: precisão decimal no processamento; política de arredondamento acordada com RM; data civil preservada sem deslocamento de fuso; cancelamentos, renegociações e estornos explícitos; nenhum dado inválido silenciosamente convertido em zero. Reclassificações e correções históricas precisam de versão rastreável.

### Comparação temporal

1. Modos: período anterior, mesmo período do ano anterior, acumulado do ano e intervalo personalizado.
2. Mês corrente parcial: por exemplo, 01–17/09/2026 contra 01–17/08/2026 ou 01–17/09/2025. Se o período anterior for mais curto, ajustar o fim válido e informar a duração; não ocultar a diferença.
3. Meses encerrados: comparar meses completos, identificando suas durações. Para intervalo livre, “período anterior” terá a mesma quantidade de dias imediatamente antes do início.
4. Acumulado: 01/01 até a data de corte contra o intervalo equivalente do ano anterior, com política explícita para 29/02.
5. Usar a mesma cobertura, moeda, entidade, filtros dimensionais e regra nos dois lados; incluir categorias presentes em apenas um dos períodos. Não restringir o histórico somente às categorias ainda existentes no atual.
6. Se a cobertura falhar, exibir “comparação indisponível” e o motivo. Permitir recorte comum apenas como escolha explícita, com as novas datas visíveis.
7. Para valores positivos, variação relativa = (atual - anterior) / anterior. Base anterior zero, negativa ou ausente: apresentar diferença absoluta quando válida e percentual indisponível com explicação. Não apresentar infinito ou fabricar 0%.
8. Para taxas: 8% para 10% representa +2 pontos percentuais; uma variação relativa de +25% é outra informação e exige rótulo distinto.
9. Saldo de carteira em uma data é estoque; recebimentos do mês são fluxo. Comparar cada um com a mesma natureza. Não reconstruir carteira histórica apenas com o status atual do título.

## 6. Backlog executável

Todos os itens abaixo começaram com status **Proposto**. O acompanhamento incremental está na seção 13. Prioridade P0 bloqueia acesso real multiempresa ou confiança nos números; P1 compõe a primeira homologação ampliada; P2 é evolução posterior. A prioridade não elimina dependências.

Condições: **Agora** = desenho/código/testes sintéticos sem banco remoto; **Local** = banco local e/ou integração de componentes; **RM** = contrato, amostras ou conexão dos clientes; **HML** = ambiente e acessos de homologação. “Agora” não significa autorização para implementar nesta entrega.

### A. Isolamento e segurança

Responsável principal: Desenvolvimento Atenza. Infra participa de segredos e acesso; Equilíbrio TI valida os vínculos de clientes.

| ID | Prioridade | Entrega e critério de aceite | Dependências | Condição |
|---|---|---|---|---|
| M01 | P0 | Formalizar tenant, coligada, filial, usuário e administrador geral. Matriz de acesso aprovada e inventário dos usuários atuais; nenhum usuário comum pode mudar seu tenant ou atribuir papel global. | Nenhuma | Agora |
| M02 | P0 | Centralizar autorização e revogação. Desativar usuário/tenant, alterar papel/vínculo ou resetar senha invalida sessões anteriores na próxima operação protegida; teste de identificadores adulterados nega acesso. | M01 | Agora/Local |
| M03 | P0 | Isolar cache e estado do navegador. Alternância A→B→A, logout/login, recarga e requisição atrasada não exibem nem persistem dados do contexto anterior; limpar também metadados da empresa ativa. | M01 | Agora |
| M04 | P0 | Proteger credenciais RM e validar cadastros/uploads. Segredos não aparecem em respostas, logs ou exports; rotação invalida conexões antigas; conexão real usa política TLS conferida; payload inválido retorna erro de campo sem gravação parcial. | M01, SC01 | Agora/Local; TLS em RM |
| M05 | P1 | Auditoria e gestão de acesso: registrar autor real, tenant, ação, resultado, horário e ID de correlação; MFA do administrador geral e recuperação de acesso controlada. Usuário comum não consulta auditoria global; eventos não contêm segredos. | M01, M02 | Agora/Local |
| M06 | P0 | Suíte de isolamento com dois tenants e coligadas/IDs coincidentes. Exercitar consultas, filtros, exportações, arquivos, cache, tarefas e RLS onde adotada; apenas administrador geral cruza contextos, deixando auditoria. | M01–M05, SC01 | Agora/Local |

### B. Fontes e cálculos confiáveis

Responsáveis: Desenvolvimento Atenza implementa; Leonardo/Equilíbrio TI fornece contrato e amostras; responsável financeiro do cliente piloto valida resultados.

| ID | Prioridade | Entrega e critério de aceite | Dependências | Condição |
|---|---|---|---|---|
| D01 | P0 | Contrato das fontes por tenant, inicialmente views e futuramente APIs aprovadas: chaves, tipos, granularidade, coligadas, valores, status, eventos, histórico, atualização e acesso de leitura. Verificar compatibilidade antes de habilitar cliente; campos ausentes geram pendência explícita. | M01; fontes disponíveis e apoio de Leonardo | Rascunho agora; fechar com RM |
| D02 | P0 | Modelo canônico e adaptador versionado por origem. Separar título, rateio, evento de baixa e contraparte; suportar quantidade configurada de coligadas. IDs repetidos em fontes/clientes distintos permanecem separados; entrada inválida não é publicada. | D01, M01 | Agora/Local/RM |
| D03 | P0 | Catálogo de métricas e semântica comum. Aprovar definições da seção 5 e fornecer fórmula, precisão, unidade, data, cobertura e versão; API/UI/export não calculam regras divergentes. | D01 | Agora; aceite RM |
| D04 | P0 | Corrigir liderança, títulos únicos, homônimos, média decimal e qualidade da base. Massa conhecida comprova liderança real, média 1,5 para atrasos 1 e 2 e percentual de títulos afetados de até 100%, sem ocultar ocorrências. | D02, D03, D07 | Agora/Local |
| D05 | P0 | Conferir residual, baixas parciais, estornos, encargos e fluxo. Separar carteira por vencimento de caixa por evento; título emitido/vencido fora do mês e pago nele aparece no realizado correto. Reconciliação não duplica baixa em rateios. | D01–D03, D07 | Agora/Local/RM |
| D06 | P0 | Versão consistente e qualidade do conjunto analítico. Cards, gráficos e exportação informam versão/data de origem; última consulta difere de última atualização RM; falha não vira zero. Carga parcial mantém a versão anterior identificada ou bloqueia o recorte afetado. | D02, D03; SC03 para carga assíncrona | Agora/Local/RM |
| D07 | P0 | Massa sintética e oráculo de resultados calculados independentemente. Cobrir os casos da seção 7, com valores esperados e invariantes; executar testes unitários, de contrato e, quando disponível, SQL real local. Não declarar SQL validado somente por mocks. | Rascunho D01/D03 | Agora/Local |
| D08 | P0 | Conciliação formal RM x BI no cliente piloto e depois em cada novo cliente. Conferir totais e amostras por título, status, coligada e período; nenhuma diferença inexplicada, tolerância de arredondamento documentada e aceite do responsável financeiro. | M06, D04–D07, acesso RM | RM/HML |

### C. Comparativos e experiência explicativa

Responsável: Desenvolvimento/Design Atenza; Equilíbrio TI e usuários piloto validam compreensão.

| ID | Prioridade | Entrega e critério de aceite | Dependências | Condição |
|---|---|---|---|---|
| UX01 | P1 | Modo demonstrativo com dois tenants fictícios e cenários bom/parcial/indisponível. Interface e contratos podem ser exercitados sem PostgreSQL/RM; identificação de demonstração permanente e impossibilidade de ativação acidental em ambiente real. | M01, D07 | Agora |
| UX02 | P1 | Comparativos da seção 5 em cards, séries e tabela. Datas dos dois recortes sempre visíveis; testes de ano bissexto, mês parcial, cobertura insuficiente, base zero/negativa e categorias exclusivas de cada período. | D03, D06, D07 | Agora com mocks; RM para aceite |
| UX03 | P1 | Cards explicativos e ajuda contextual. Cada KPI prioritário tem definição curta, resultado, comparação válida, origem e “Como é calculado”; texto acompanha os filtros e nunca afirma causa não comprovada. Acesso por toque e teclado, sem depender de hover. | D03, UX02 | Agora |
| UX04 | P1 | Gráficos fiéis e investigação do resultado. Duas séries comparáveis, Pareto, barras de vencimento e detalhamento por clique; seleção equivalente pelo teclado. Não inventar área para valor zero nem usar pizza para saldos negativos; tabela alternativa e filtros preservados na expansão. | D03, UX02 | Agora com mocks |
| UX05 | P0 | Unificar filtros, busca e exportação. Corrigir busca de opções, nomes com vírgulas, ordenação estável e paginação após filtros; exportar exatamente o recorte pesquisado. Acima do limite, avisar ou gerar tarefa completa; nunca truncar silenciosamente. | M03, D03 | Agora/Local |
| UX06 | P1 | Estados completos e acessibilidade. Falha encerra loading e permite retry; requisição antiga não sobrescreve nova; zero, vazio, sem cobertura, sem permissão e desatualizado são distintos. Conferir mobile/desktop, foco/contraste, textos e identificação de homologação. | UX01, D06 | Agora; revisão visual local |

### D. Análises gerenciais

Responsáveis: Desenvolvimento Atenza e responsável financeiro indicado pela Equilíbrio TI. Cada análise exige definição de negócio antes da publicação.

| ID | Prioridade | Entrega e critério de aceite | Dependências | Condição |
|---|---|---|---|---|
| AN01 | P1 | Carteira por faixa de atraso e prioridade de cobrança. Separar recebíveis de obrigações, usar residual e mostrar exposição por contraparte; todas as faixas somam a carteira elegível. Priorização inicial é regra transparente, sem rótulo de probabilidade. | D05, D08, UX03 | Protótipo agora; RM para aceite |
| AN02 | P1 | Agenda de entradas/saídas em 7, 15, 30, 60 e 90 dias e pressão de caixa. Distinguir compromissos conhecidos de valores projetados; sem saldo bancário inicial validado, exibir fluxo líquido, não caixa disponível. | D05, D08 | RM; saldo é fonte adicional |
| AN03 | P1 | Concentração Top 5/10 e Pareto ABC por cliente, fornecedor, natureza e centro de custo. Bases separadas para pagar/receber; “Outros” explícito; devoluções/negativos não distorcem a participação positiva. Totais e universo conferíveis. | D04, D05, D08 | Agora com mocks; RM |
| AN04 | P2 | Explicação da variação e metas. Decompor aumento/redução por dimensão em gráfico de contribuições; soma das contribuições coincide com a diferença total. Meta/orçamento exige entrada versionada e autorizada; não inferir DRE ou lucro de títulos. | UX02, D08; fonte de metas | RM/Local |
| AN05 | P2 | Tratamento de inconsistências e alertas. Responsável, comentário, prazo, status e justificativa de exceção por tenant; alertas deduplicados com limite, destinatários autorizados e evidência. Nenhuma baixa, cobrança ou pagamento automático no RM. | M05, D06, D08, SC03 | Local/RM |

### E. Escala, operação e integração de novas empresas

Responsável: Desenvolvimento/Infra Atenza. SC01 começa cedo, em paralelo à especificação; não aguarda o fim dos recursos visuais.

| ID | Prioridade | Entrega e critério de aceite | Dependências | Condição |
|---|---|---|---|---|
| SC01 | P1 | Ambiente local reproduzível. Mapear PostgreSQL existente ou Compose dedicado, portas, volumes e credenciais de desenvolvimento; migrations e dados fictícios em instância isolada. Novo ambiente sobe pelo roteiro sem acessar homologação nem alterar bancos de outros projetos. | Inventário local | Agora/Local |
| SC02 | P1 | Limites e teste de capacidade. Expiração efetiva do cache, descarte/rotação de pools, timeout, limite global e por tenant, paginação e cancelamento. Definir carga-alvo (tenants, sessões, linhas, retenção) e orçamento de latência; testar que um cliente intenso não esgota os demais. | M01, D02, SC01 | Agora/Local; dimensionar HML |
| SC03 | P1 | Cargas e relatórios em segundo plano. Tarefas por tenant com tentativas limitadas, idempotência, cursor de atualização, estornos/exclusões e publicação atômica após validação. Interrupção não publica carga incompleta; repetição não duplica eventos; contexto validado na execução e no download. | M02, M04, D01, D02, SC01 | Local/RM |
| SC04 | P0 | Concluir CI/CD de homologação. Revisar e versionar alterações, corrigir porta SCP, rollback de falha de reinício, artefato imutável e migrations explícitas fora do startup. Gates incluem isolamento/cálculos; primeiro deploy e rollback comprovados, sem promoção automática para produção. | D07, M06; acessos para ativação | Revisão agora; HML para execução |
| SC05 | P1 | Sustentação: logs sem segredos, readiness por dependência, métricas, alertas, backup/restore e retenção. Distinguir falha de um RM de falha da plataforma; restore ensaiado e prevenção de exposição de dados de terceiros. Prazos de recuperação e responsáveis definidos. | M05, D06, SC01 | Local/HML |
| SC06 | P1 | Roteiro de onboarding de tenant e governança. Cadastro restrito ao administrador geral, teste isolado de conexão, contrato/versionamento, validação, liberação e suspensão auditadas. Novo cliente compatível entra por configuração; nova estrutura passa por adaptador. Documentar API, privacidade, suporte e atualização da matriz de acesso. | M06, D01, D02, D08, SC04, SC05 | Local/RM/HML |

### F. Cenários e análises preditivas

Responsáveis: Desenvolvimento/Análise de Dados Atenza e responsável financeiro do cliente piloto. Propostas P2, sem promessa de precisão antes dos testes.

| ID | Prioridade | Entrega e critério de aceite | Dependências | Condição |
|---|---|---|---|---|
| PR01 | P2 | Estudo de viabilidade por tenant e série. Inventariar extensão, frequência, lacunas, mudanças de regra, sazonalidade, volume e histórico disponível na data da previsão; classificar cada caso como apto, experimental ou insuficiente com motivo. | D01, D06, D08 | Planejar agora; medir com RM |
| PR02 | P2 | Simulador de cenários. Alterar atraso esperado, percentual de recebimento e calendário de pagamentos em cópia de análise; comparar cenário-base/conservador/otimista com premissas visíveis. Não alterar a carteira RM nem apresentar simulação como previsão validada. | AN02, UX03 | Agora com mocks; aceite RM |
| PR03 | P2 | Piloto de previsão de entradas/saídas por horizonte. Comparar métodos simples e modelo candidato com validação temporal e dados posteriores não usados na seleção; reportar erro, viés, intervalo preditivo e cobertura por tenant. Se não superar a referência ou a base for insuficiente, manter baseline identificado ou suspender previsão. | PR01, D06, SC03 | RM/histórico |
| PR04 | P2 | Anomalias e risco de atraso. Iniciar por regras conferíveis; modelos só com amostras e eventos históricos suficientes. Mostrar motivo, limitações e evidência; medir falsos positivos e, para probabilidades, calibração. Sem decisão automática de crédito ou cobrança. | PR01, D05, D08, M05 | RM/histórico |
| PR05 | P2 | Monitoramento e governança das previsões. Registrar versão do modelo/dados, data de treino, horizonte, métricas, mudança de distribuição e fallback; revisar erros por cliente. Modelos, atributos, logs e resultados não cruzam tenants; acesso global não autoriza treinamento conjunto. | PR03, PR04 | Local/RM/HML |

### G. Integração nativa RM e redução da dependência de views

Avaliação documental solicitada pelo usuário em 17/09/2026. Correção de escopo: INT01 cobre a avaliação autorizada; INT02–INT06 foram extrapolações da proposta e ficam apenas como possibilidades não aprovadas, fora da execução atual. Não iniciar piloto, benchmark, criação de conta ou migração. [Pesquisa, parecer e limites](avaliacao-apis-rm-2026-09-17.md).

| ID | Prioridade | Entrega e critério de aceite | Dependências | Ambiente |
|---|---|---|---|---|
| INT01 | P1 | Inventariar REST/DataServer por versão/cliente. Matriz relaciona campos e eventos necessários a endpoints/schema, paginação, filtros, limites e licenças; lacunas explícitas. Não classificar ConsultaSQL como independência de SQL. | D01; Swagger/WSDL do piloto | Pesquisa agora; confirmar RM |
| INT02 | P0 | Especificar conta de integração por cliente/ambiente, somente leitura, segredos segregados e coligadas explícitas. Responsável RM provisiona após aprovação; testes negativos demonstram negação fora do escopo. Listagem de coligadas nunca concede acesso. | M01–M04, INT01; apoio Leonardo | Especificação agora; piloto RM |
| INT03 | P0 | Prova de cobertura em leitura: títulos, rateios, baixas parciais, encargos, cancelamentos, estornos, natureza e histórico. Comparar com relatório RM e fonte atual no mesmo recorte, sem divergência inexplicada ou paginação incompleta. | INT01, INT02, D03; recorte D08 | RM/HML |
| INT04 | P1 | Benchmark SQL x API direta x sincronização analítica. Medir mediana/p95, extração completa/incremental, rede, erros e impacto RM com carga aprovada; registrar metas antes do teste e decisão baseada em números. | INT03, SC02 | RM/HML em janela acordada |
| INT05 | P1 | Implementar conector escolhido no modelo canônico. Sincronização por tenant com idempotência, cursor validado, reprocessamento retroativo, exclusões/estornos e publicação consistente. Credenciais nunca chegam ao navegador. | INT03, INT04, D02, SC03, M06 | Local/RM/HML |
| INT06 | P1 | Padronizar onboarding e migração gradual. Checklist de versão, conta, escopo, fonte e aceite por cliente; execução paralela sem duplicar entidades, reversão documentada e fonte antiga mantida até aceite. | INT05, D08, SC06 | RM/HML |

São 42 itens, distribuídos em sete frentes (36 originais e 6 de integração). Não atribuir datas ou horas antes de definir a capacidade da equipe, o contrato RM e a disponibilidade do cliente piloto.

## 7. Casos de aceite para os cálculos e isolamento

Os exemplos abaixo são sintéticos e especificam resultados esperados para testes futuros. Não foram executados contra as views reais nesta etapa.

| Caso | Entrada | Resultado esperado |
|---|---|---|
| Título rateado | Título de R$ 1.000,00 com rateios de R$ 600,00 e R$ 400,00 | 1 título e R$ 1.000,00; nunca 2 títulos ou R$ 2.000,00 por repetição do principal. |
| Baixa parcial simples | Principal R$ 1.000,00, pagamento de principal R$ 400,00, sem outros ajustes | Residual R$ 600,00; se vencido, compõe a carteira vencida em R$ 600,00. |
| Baixa repetida na origem | Baixa de R$ 400,00 repetida em duas linhas de rateio | Realizado de R$ 400,00 após normalização; rateio da baixa segue regra aprovada. |
| Encargos e desconto | Principal R$ 1.000,00 + juros R$ 20,00 - desconto R$ 10,00, liquidado | Caixa de R$ 1.010,00 e principal liquidado de R$ 1.000,00; interpretação depende das colunas RM. |
| Realizado fora da coorte | Título vencido em agosto e pago em setembro | Incluído no fluxo realizado de setembro; filtro de vencimento usado apenas na análise de carteira correspondente. |
| Posição histórica | Título de R$ 1.000,00 quitado em outubro, consulta da posição em setembro | Residual histórico conforme eventos até setembro; não usar automaticamente o status quitado atual. |
| Estorno | Pagamento de R$ 400,00 estornado integralmente no mesmo recorte | Efeito líquido de caixa zero; eventos permanecem rastreáveis. |
| Chaves coincidentes | Mesmo REF/documento/coligada em tenants A e B; homônimos com códigos diferentes | Segregação por tenant e fonte; identidades distintas conforme contrato. |
| Média | Dois títulos com atraso de 1 e 2 dias | 1,5 dia na média simples por título. |
| Liderança | Coligada Alfa R$ 100,00; Zeta R$ 900,00 | Zeta é líder independentemente da ordem alfabética. |
| Qualidade | 10 títulos avaliados; 1 título tem 3 alertas | 1 título afetado, 3 ocorrências, 10% da base. |
| Variação válida | Anterior R$ 100,00; atual R$ 120,00 | Diferença +R$ 20,00 e +20%, com cobertura equivalente. |
| Base zero | Anterior zero confirmado; atual R$ 120,00 | Diferença +R$ 120,00; percentual indisponível, sem infinito. |
| Falta de fonte | Consulta falha ou mês não coberto | Indisponível/desatualizado, nunca R$ 0,00 por substituição automática. |
| Percentuais | Taxa de 8% para 10% | +2 pontos percentuais, com denominadores equivalentes. |
| Precisão | Vários rateios com quatro casas decimais | Soma em precisão definida, arredondamento no estágio acordado e reconciliação em centavos; não arredondar cada parcela sem regra. |
| Busca/exportação | Busca com vírgula no nome, mais de 5.000 linhas e mudança de filtro na página final | Mesmo universo na tela e no arquivo; paginação válida e nenhum corte oculto. |
| Concorrência | Usuário A sai, B entra, resposta antiga de A termina depois | Resposta descartada, sem reaparecer em memória, armazenamento ou interface de B. |

Além dos exemplos: testar datas inválidas, virada de ano, 29/02, fuso, negativos, cancelamento, renegociação, títulos sem vencimento, cliente sem permissão de exportação, duplicação de carga e sessão desativada durante tarefa longa.

Testes devem incluir oráculo independente e invariantes: rateios fecham no título; carteiras pagar/receber não se misturam; ocorrências não equivalem a títulos únicos; totais do gráfico/tabela/export coincidem no mesmo recorte e versão. Coincidência de totais, sozinha, não certifica os registros.

## 8. Cards explicativos e recursos visuais

O projeto já possui ajuda por `title` nos KPIs. A evolução proposta torna essa explicação acessível no toque/teclado e ligada às regras e aos dados efetivamente exibidos.

### Anatomia do card

1. Nome compreensível e unidade; valor atual com estado de qualidade.
2. Período/data de referência e comparação, se disponível, com variação em R$, %, ou pontos percentuais conforme a métrica.
3. Leitura curta do resultado. Não descrever o funcionamento da interface nem preencher a tela com instruções técnicas.
4. Ícone de informação abre “Como é calculado”, contendo fórmula em linguagem de negócio, o que entra/não entra, fonte, atualização, cobertura e limitações.
5. Detalhamento leva aos títulos que compõem o valor, preservando filtros e autorização.

### Exemplos de conteúdo, com dados fictícios

| Card | Conteúdo sugerido |
|---|---|
| Recebíveis vencidos | “R$ 120 mil. R$ 20 mil acima da posição comparável (+20%). Inclui o saldo restante dos títulos parcialmente recebidos.” Somente mostrar comparação com carteira histórica reconstruível. |
| Concentração de recebíveis | “Cinco clientes representam 62% da carteira a receber. A concentração aumenta a exposição a atrasos desses clientes.” Exibir quais clientes apenas a quem tem acesso. |
| Leitura do período | “O saldo vencido cresceu principalmente no centro de custo X.” Publicar apenas se a decomposição quantificar essa contribuição; sem afirmar a causa do atraso. |
| Qualidade dos dados | “8 títulos apresentam pontos para conferência. Última atualização da origem: 17/09 às 08h.” Não chamar todo alerta de erro nem usar o horário de abertura da tela como atualização RM. |
| Comparação indisponível | “O período anterior não tem cobertura equivalente. Os valores atuais continuam disponíveis.” Não preencher a comparação com zero. |
| Previsão, quando habilitada | “Entrada estimada nos próximos 30 dias”, intervalo preditivo com nível identificado, data de corte, erro histórico e premissas. Não apresentar estimativa como recebimento garantido. |

Recursos priorizados: minigráficos por indicador, linhas atual/anterior com traços diferentes, barras ordenadas de aging, calendário financeiro, Pareto, contribuições da variação, filtros ativos visíveis e tabela de origem. Usar cores com significado específico: aumento de recebimento e aumento de atraso não podem receber a mesma avaliação automática. Crescimento de despesa não é necessariamente ruim sem contexto.

Não usar indicadores de velocidade decorativos, 3D, cores como único sinal ou percentuais sem denominador. Não reproduzir aninhamento de cards das referências; manter seções claras e componentes compactos, com boa leitura no celular.

## 9. Condições para análises preditivas

### Distinguir três entregas

- **Agenda contratual:** soma obrigações e recebíveis já conhecidos por vencimento. Útil desde que o residual esteja correto; não é previsão estatística.
- **Simulação:** aplica premissas escolhidas, por exemplo atraso de 10 dias ou recebimento de 80%. Mostra consequências de hipóteses; não atribui probabilidades sem modelo validado.
- **Previsão:** estima movimentos futuros usando histórico e apresenta erro e incerteza medidos. Não deve contar duas vezes títulos conhecidos e valores previstos para o mesmo universo.

### Porta de entrada e aceite

1. Definir alvo por tenant (entradas, saídas ou atraso), frequência e horizonte. Saldo de caixa exige saldo inicial e todas as fontes pertinentes; títulos isolados não bastam.
2. Avaliar histórico e qualidade. Como hipótese inicial de planejamento, estudar séries mensais com pelo menos dois ciclos anuais para sazonalidade anual; isso não garante precisão. Séries menores podem admitir modelos simples ou apenas cenários, dependendo do teste.
3. Treinar e validar respeitando o tempo, usando apenas informação disponível em cada data de corte. Separar o conjunto final de teste da seleção do modelo e avaliar os horizontes realmente exibidos. Referência: [validação temporal](https://otexts.com/fpp3/tscv.html).
4. Comparar com referências simples, como último período e mesmo período sazonal quando houver base. Medir MAE em reais, viés e uma métrica escalada quando seu denominador for válido. Não depender de MAPE em séries com zero; registrar critérios de promoção antes do teste final. Referência: [avaliação de previsões](https://otexts.com/fpp3/accuracy.html).
5. Exibir intervalo preditivo e medir sua cobertura histórica; erro de ajuste não é prova de previsão útil. Referência: [intervalos preditivos](https://otexts.com/fpp3/prediction-intervals.html).
6. Habilitar por tenant e indicador, com revisão humana e fallback. Empresa recém-cadastrada não recebe previsão fabricada nem herda silenciosamente modelo treinado com dados de outra.
7. Versionar dados/modelos, preservar snapshots disponíveis no passado e distinguir correção posterior da fonte de erro da previsão. Monitorar degradação e suspender o resultado quando deixar de atender ao critério acordado.

Ficam fora desta primeira evolução: crédito automático, pagamentos/cobranças automáticos, ranking público entre clientes, treinamento cruzado de empresas e assistente com acesso irrestrito aos bancos. Não há necessidade de um assistente generativo para explicar fórmulas e comparações conhecidas.

## 10. Sequência de execução e marcos

| Marco | Conteúdo | Condição para concluir |
|---|---|---|
| 0. Especificação e demonstração | M01, rascunhos D01/D03, D07, UX01 e desenho UX02/UX03; SC01 em paralelo | Matriz e exemplos conferidos; referência visual demonstrável com dados fictícios. Não exige RM/VPS. |
| 1. Base multiempresa protegida | M02–M06, SC01 e correções UX05 | Testes entre A/B aprovados, sessões revogáveis, segredos protegidos e ambiente local reproduzível. |
| 2. Indicadores conferidos | D01–D08, SC02/SC03 conforme carga, revisão SC04/SC05 | Regras e resultados conciliados com cliente piloto; versão e qualidade rastreáveis. |
| 2A. Parecer documental sobre APIs | INT01, sem execução em ambiente de cliente | Comparar cobertura documentada e arquitetura atual; distinguir velocidade dos dados de velocidade de desenvolvimento. Recomendar ao Leonardo somente vantagens sustentadas pelas evidências. INT02–INT06 não integram a sequência autorizada. |
| 3. Homologação ampliada | UX02–UX06, AN01–AN03, SC04–SC06 | Duas empresas de teste isoladas, comparativos compreensíveis, deploy/rollback/restore ensaiados e aceite registrado. |
| 4. Gestão e cenários | AN04/AN05 e PR01/PR02 | Fontes adicionais e responsáveis definidos; hipóteses de simulação visíveis. |
| 5. Preditivo validado | PR03–PR05 | Desempenho comparado a baseline, limites de uso e monitoramento aprovados por tenant. |

As frentes podem ser desenvolvidas em paralelo com contratos simulados, mas a publicação de indicadores depende do aceite real. Explicações e protótipos não substituem conciliação; nomes e fórmulas finais devem acompanhar D03.

### O que pode começar sem banco nem VPS

1. Matriz de isolamento, contratos de dados e catálogo de indicadores.
2. Massa fictícia de dois tenants, casos de aceite e testes de funções puras.
3. Correções de contexto/cache, filtros e tratamento de requisições com mocks.
4. Protótipos de comparação, cards explicativos, gráficos e modo demonstrativo.
5. Revisão dos scripts de CI/CD e preparação do Compose, sem executar deploy ou migration.

### Pendências por responsável

| Responsável | Pendência |
|---|---|
| Leonardo / Equilíbrio TI | Views e dicionário por cliente, chaves de título/rateio/baixa, significado dos campos, exemplos de baixas parciais/estornos, histórico disponível, credencial de leitura pelo canal seguro e indicação do cliente piloto. |
| Responsável financeiro do cliente | Definição de indicadores prioritários, relatórios RM de referência, datas de corte e aceite das diferenças/limitações. |
| Atenza Desenvolvimento | Implementar os itens na sequência acordada, manter evidências de testes e atualizar documentos sem apagar histórico. |
| Atenza Infra | Mapeamento PostgreSQL local, recursos/limites, acesso HML, secrets, HTTPS, logs, backup e ensaio de restore. |
| Gestão da plataforma | Confirmar administradores gerais, tenants iniciais, carga-alvo, metas de resposta/recuperação e tratamento de dados. |

### Correspondência com pendências anteriores

Segurança e sessões: M01–M06. PostgreSQL local: SC01. Testes: D07/M06 e aceite D08. Deploy/rollback/Git: SC04. Backup/monitoramento: SC05. API, LGPD e sustentação: SC06. Encoding, estados e acessibilidade: UX06. Performance: SC02. Exportação: UX05. Views do parceiro: D01/D08. Relatórios formais Atenza continuam sob demanda nos marcos; não enviar este backlog técnico como se fosse aceite do cliente.

## 11. Como acompanhar

1. Manter o ID estável e registrar status: Proposto, Pronto para iniciar, Em execução, Em validação, Concluído ou Bloqueado.
2. Ao iniciar, registrar responsável, dependências disponíveis e critérios escolhidos quando houver decisão em aberto.
3. Concluir somente com evidência: revisão, testes, resultado e, quando exigido, aceite RM/cliente. Código escrito ou tela bonita não equivalem a indicador certificado.
4. Bloqueios devem indicar informação faltante e responsável; continuar os itens independentes.
5. Cada marco atualiza backlog, matriz de acesso, catálogo de métricas, roteiro de testes e registro de versão quando afetados.

## 12. Limites da análise

Foram lidos código local, documentação Atenza/projeto e os trechos relevantes dos dois projetos de referência. As fontes técnicas externas estão vinculadas às recomendações correspondentes.

Não houve mudança no código da aplicação, dependências, bancos, containers, infraestrutura ou projetos de referência. Não foram executados testes de integração, conciliação RM, benchmark, previsões ou inspeção visual em navegador. Portanto, esta entrega identifica riscos e define o caminho de validação; não certifica os cálculos atuais nem a capacidade de escala.

Histórico: versão 1.0 em 17/09/2026, criada a partir da revisão aprofundada e das diretrizes de isolamento, comparação e análises explicativas/preditivas solicitadas.

## 13. Acompanhamento incremental

Atualização de 17/09/2026, marco 0 autorizado pelo usuário. A seção 12 descreve os limites da análise original; as evidências da implementação ficam no registro de etapa.

| Item | Status nesta atualização | Evidência / pendência |
|---|---|---|
| M01 | Em validação: especificação elaborada | [Matriz de acesso](contratos-etapa-0.md). Confirmar inventário real antes de migrar papéis. |
| D01 | Em execução: rascunho | Contrato e perguntas definidos. Aproveitar bases reais já conectadas, conforme informado pelo usuário; inventariar somente as views e informações faltantes. Conectividade não verificada nesta etapa. |
| D03 | Em validação: contrato sintético | Seis indicadores, aging e comparações definidos; aprovação RM pendente. |
| D07 | Em validação: cobertura parcial | 33 testes aprovados no total, incluindo funções sintéticas e testes existentes; SQL real e restante dos casos seguem pendentes. |
| UX01 | Em validação | Demonstração local em modo exclusivo, cenários completo/parcial/indisponível; 10 grupos de verificações de interface aprovados. |
| UX02/UX03 | Em execução: protótipo | Comparativos, ajuda contextual e leitura do resultado somente na demonstração. |
| SC01 | Proposto | Não houve provisionamento local nesta etapa. |

Nenhum item de segurança do backend ou conciliação RM foi marcado como concluído a partir de testes fictícios.

As empresas fictícias servem apenas aos testes controlados. Não substituem as empresas reais já conectadas. A próxima etapa prioriza o inventário e a conciliação das fontes disponíveis em leitura, sem aguardar indiscriminadamente todas as views pendentes. Evidências e limites: [registro da etapa 0](registro-etapa-2026-09-17-etapa-0.md).

## 14. Fontes reais e APIs: atualização posterior ao marco 0

Data: 17/09/2026. Evidências e fechamento: [inventário de fontes e conciliação](inventario-fontes-conciliacao-2026-09-17.md). Documentação oficial e fluxo de integração: [avaliação das APIs RM](avaliacao-apis-rm-2026-09-17.md).

| Item | Status atual | Evidência / próxima ação |
|---|---|---|
| D01 | Em execução: inventário parcial real | SQL Server legado/local acessível; duas views existentes, 40 colunas cada, consulta unificada compatível sem retornar linhas. Cadastro PostgreSQL remoto inacessível desta máquina; associação ao tenant e demais clientes pendentes |
| D03/D08 | Em execução / conciliação pendente | Precisão de origem e regras atuais mapeadas; falta recorte e relatório RM de referência. Não foram consultados valores financeiros |
| D07 | Cobertura parcial ampliada | 55 testes aprovados no total, incluindo 22 novos de inspeção segura; não substituem validação dos cálculos reais |
| INT01 | Em execução | Pesquisa pública concluída para a avaliação inicial; confirmar APIs/schema e versão instalada no piloto |
| INT02 | Especificado, não provisionado | Conta dedicada por cliente/ambiente e escopo mínimo documentados; nenhum usuário criado |
| INT03–INT06 | Propostos | Dependem do piloto e dos critérios de cobertura, segurança e desempenho; nenhuma API substituiu as views |
| SC01 | Proposto | Desenvolvimento local/Docker mantido como diretriz; nenhum banco provisionado nesta rodada |

Não é necessário solicitar ao Leonardo a recriação das duas views comprovadas nesta fonte. Solicitar somente lacunas reais, contrato/relatórios e acesso de integração do piloto. Não abrir o PostgreSQL publicamente para contornar a indisponibilidade local.

Proposta anterior de próxima etapa: confirmar fonte/tenant e preparar prova de conceito API. Esta parte relativa a piloto/API foi corrigida pelo esclarecimento do usuário abaixo. As prioridades de isolamento M02–M06, conciliação das fontes atuais e dependências permanecem.

## 15. Correção de escopo da avaliação de APIs

O usuário esclareceu que não pediu piloto. Pediu avaliar velocidade de atualização e equivalência dos dados com as informações existentes e a documentação RM; somente havendo vantagem e cobertura, elaborar mensagem ao Leonardo. Nenhuma operação de API, conta ou migração foi executada.

Parecer documental: não há evidência de atualização mais rápida via API para as agregações atuais em SQL, nem equivalência financeira integral comprovada. Há potencial de acelerar desenvolvimento/onboarding com serviços nativos adequados, o que é diferente de atualizar dados mais rápido. A API ConsultaSQL continua dependendo de consultas cadastradas e não elimina a manutenção de SQL.

INT01: parecer inicial entregue, lacunas documentais explícitas. INT02–INT06: possibilidades não aprovadas, fora da execução. Não condicionar o andamento das melhorias existentes a piloto ou migração para APIs. [Parecer corrigido](avaliacao-apis-rm-2026-09-17.md).

## 16. Isolamento no navegador e continuidade independente das views

Atualização de 17/09/2026. [Registro e evidências desta etapa](registro-etapa-2026-09-17-isolamento-navegador.md).

| Item | Status atual | Evidência / pendência |
|---|---|---|
| M03 | Implementado e validado localmente no navegador | Cache por contexto em memória, descarte de respostas antigas, limpeza ao trocar empresa/sessão e sincronização de logout entre abas. Validação integrada com autorização real permanece em M06 |
| UX05 | Em execução: correções parciais | Busca de opções, recuperação de erro da tabela, cancelamento e exportação com pesquisa corrigidos. Limite de exportação de 5.000 linhas ainda pendente |
| D07/M06 | Cobertura parcial ampliada | 72 testes aprovados e 8 grupos de verificações no navegador com API interceptada. Não certificam cálculos RM ou isolamento no backend real |
| M02/M04 | Próximas frentes independentes | Autorização e revogação no servidor; proteção de credenciais. Não dependem de Leonardo ajustar views |
| SC01/SC04 | Pendentes | PostgreSQL local/Docker, vulnerabilidades e revisão do CI/CD de homologação. Nenhum provisionamento ou deploy nesta etapa |

Próxima etapa sugerida: M02/M06, autorização e validade das sessões no servidor com testes controlados. Manter a marca Equilíbrio TI e a governança documental Atenza; projeto ainda em homologação.

**Mensagem ao Leonardo:** preparar somente ao final das frentes independentes, consolidando o que realmente falta por cliente. Ainda há trabalho que não depende das views. Não solicitar recriação das fontes já identificadas nem introduzir piloto API. Dicionários, relatórios RM e outras dependências externas devem ser distinguidos dos ajustes em views; não declarar que só restam views enquanto houver outros bloqueios.

## 17. Autorização, entrega e LGPD: atualização incremental

Data: 17/09/2026. [Registro da etapa](registro-etapa-2026-09-17-autorizacao-entrega.md). As constatações iniciais permanecem como histórico; esta seção registra os tratamentos posteriores.

| Item | Status atual | Evidência / pendência |
|---|---|---|
| M02 | Implementado, em validação local | Cadastro atual, empresa ativa, revogação individual e versão de sessão. Migration 002 preparada; aplicação e teste integrado pendentes |
| M04 | Parcial | Respostas sem senha, validação de usuário/empresa e pool isolado no teste de conexão. Criptografia/cofre, rotação/pools, TLS e uploads aprofundados ainda pendentes |
| M06/D07 | Cobertura ampliada | 126 testes locais aprovados em 7 arquivos. Rotas reais com persistência simulada; conciliação RM e validação integrada continuam abertas |
| SC04 | Parcial | Porta SCP, recuperação do restart e migrations fora do startup corrigidos; testes de script aprovados. Dependências sem alertas altos/críticos na auditoria atual, com 2 moderados restantes. Sem execução remota ou publicação |
| SC05 | Parcial | Correlação e minimização de erros; backup, restore, monitoramento e auditoria persistente não concluídos |
| LG01-LG09 | Obrigatórios, em execução/decisão conforme item | Novo plano transversal LGPD abaixo; nenhum item considerado concluído só pela documentação |

**LGPD em todo o projeto:** substitui qualquer interpretação anterior de que privacidade seria necessária apenas para acesso externo. Aplica-se também à máquina local/Docker, homologação, integrações, suporte, exports e preditivo. O usuário confirmou ausência de definição contratual de responsabilidades e de canal de privacidade. Não inventar controlador/operador, base legal ou canal. [Plano, inventário, prioridades e critérios LG01-LG09](lgpd-plano-adequacao.md).

Próxima etapa: completar proteção de credenciais e auditoria, preparar o ambiente local e continuar itens independentes. Não aplicar migrations ou publicar sem autorização. Mensagem final ao Leonardo continua reservada para quando as frentes independentes terminarem, distinguindo views de bloqueios de governança/infraestrutura ainda existentes.

## 18. Credenciais e auditoria: implementação local

17/09/2026. [Registro desta etapa](registro-etapa-2026-09-17-credenciais-auditoria.md) e [procedimento de operação](credenciais-auditoria-operacao.md).

| Item | Status | Evidência / pendência |
|---|---|---|
| M04/LG03 | Parcial, ampliado | Senhas cifradas por tenant, conversão/rotação explícita e pools/cache versionados. Falta provisionar chaves/cofre, aplicar conversão autorizada, testar TLS/restore e completar uploads |
| M05/LG07 | Parcial, implementado localmente | Auditoria transacional, autor real, empresa, ação, resultado e correlação; endpoint restrito. Falta tela, eventos complementares, MFA, retenção e privilégios de banco separados |
| M06/D07 | Cobertura ampliada | 157 testes em 8 arquivos. Sem PostgreSQL/RM real; migrations e transações ainda precisam de validação integrada |
| SC01 | Próxima etapa | Preparar configuração PostgreSQL/Docker local isolada e testes integrados. Ainda sem provisionamento/migration nesta rodada |
| LG01/LG04/LG05 | Decisão pendente | Responsabilidades contratuais, retenção e canal reais ainda não definidos. Não declarar conformidade integral |

Nenhuma chave operacional criada, senha real convertida ou ambiente remoto alterado. Ainda há frentes independentes das views; mensagem ao Leonardo continua adiada conforme combinado.

## 19. PostgreSQL compartilhado local: preparacao executada

17/09/2026, posterior a secao 18. [Registro e limites desta etapa](registro-etapa-2026-09-17-postgres-local.md). Banco/schema ja existentes foram reaproveitados, conforme orientacao do usuario; nao foi criado outro container ou database.

| Item | Status | Evidencia / pendencia |
|---|---|---|
| SC01 | Ambiente local preparado | Docker compartilhado, `equilibrio_auth.equilibrio_ti`, migrations 001-003, runtime dedicado, configuracao e segredos locais separados do `.env` remoto |
| M02/M06/D07 | Validacao integrada local ampliada | 168 testes automatizados e 14 grupos PostgreSQL/HTTP reais aprovados; dados sinteticos somente em schema temporario removido. Nao certifica conciliacao RM |
| M04/LG03 | Parcial | Chaves criadas somente localmente, acesso minimo e senhas por tenant verificados. Faltam cofre/restore/TLS operacional e protecao aprofundada dos uploads |
| M05/LG07 | Parcial | Persistencia, transacao, paginacao e negacao de UPDATE/DELETE/TRUNCATE ao runtime verificadas. Faltam tela, eventos complementares, MFA e retencao |
| SC05 | Parcial | Backup local antes das migrations, catalogo e hash conferidos. Restore completo, copia independente protegida e monitoramento pendentes |
| SC04 | Parcial, sem publicacao | Quality gate local aprovado; dois alertas moderados e aviso de bundle permanecem. Ativacao/teste de CI/CD em homologacao nao executados |
| LG01/LG04/LG05 | Decisoes pendentes | Contratos, papeis, retencao e canal de privacidade seguem sem definicao |

Proxima etapa: protecao dos uploads administrativos, seguida de tela de auditoria, ambas independentes de Leonardo. Backup/restore depende de destino descartavel autorizado; views e conciliacao dependem dos responsaveis pelos dados. Nenhum acesso remoto ou importacao de clientes reais nesta etapa.

## 20. Logos e tela de auditoria

17/09/2026, posterior a secao 19. [Registro, evidencias e limites](registro-etapa-2026-09-17-logos-auditoria.md).

| Item | Status | Evidencia / pendencia |
|---|---|---|
| M04/LG03 | Validacao de logos implementada localmente | Decode/re-encode, limites, publicacao segura, referencias locais e compatibilidade legada. Faltam quotas persistentes, reconciliacao de orfaos e verificacao do proxy/decoder em HML |
| M05/LG07 | Tela implementada e evento ampliado | Filtros, cursores, detalhes e erros/cancelamento; upload auditado. Retencao, MFA e demais eventos ainda pendentes |
| M06/D07 | Cobertura ampliada | Testes de conteudo, API e contexto; 16 grupos PostgreSQL reais e 7 grupos de navegador. Nao certifica dados/calculos RM |
| SC01/SC04 | Revalidacao completa pendente | Rodada inicial com 208 testes/build aprovada; repeticao final de 212 teve 207 aprovados e 5 timeouts de entrega. Tentativa sequencial ainda afetada por tempo dos processos Bash. Investigar ambiente e repetir gate sem reduzir assercoes |
| UX05/LG02 | Proxima frente independente | Limite/completude das exportacoes, feedback e minimizacao de campos |
| SC04/SC05 | Pendentes operacionais preservadas | Sem deploy/push; restore completo, ativacao CI/CD, duas vulnerabilidades moderadas e bundle acima de 500 kB continuam pendentes |

Gestao Atenza/Equilibrio TI: definir papeis, canal e retencao LGPD. Infra: restore, custodia, proxy e validacao Linux. Desenvolvimento: exportacoes e frentes independentes restantes. Leonardo/clientes: views e referencias para conciliacao, sem piloto API autorizado. Nao declarar que apenas views restam.

## 21. Evolucao em 18/09/2026: exportacoes

| Frente | Status atual | Evidencia e restante |
|---|---|---|
| SC01/SC04 | Revalidacao local aprovada | 212 testes anteriores, typecheck/build e auditoria aprovados; nao representa execucao do pipeline remoto |
| UX05 | Limite/completude corrigidos | Consulta de ate 5.001 linhas; excedente gera 422 sem anexo, ate 5.000 entrega todas; busca/ordem, cancelamento e erro acessivel testados |
| LG02 | Parcial | Lista explicita de campos existentes; finalidade por campo, custodia e permissao de exportacao pendentes |
| UX05 | Proxima frente | Serializacao de nomes com virgula em filtros multiplos, ordenacao/paginacao estaveis e contratos comuns de API/tela/export |

Suite ampliada: 224 testes locais; navegador com dados sinteticos e banco local conferidos. Sem acesso RM, novas migrations, push ou deploy. Registros anteriores preservam a situacao da respectiva data. [Registro e limites desta etapa](registro-etapa-2026-09-18-exportacoes.md).

## 22. Evolucao em 18/09/2026: filtros e paginacao

| Frente | Status atual | Evidencia e restante |
|---|---|---|
| UX05 | Filtros corrigidos localmente | Parametros repetidos preservam nomes com virgula; cache distingue selecoes; formato legado compativel, mistura rejeitada |
| UX05 | Ordenacao/paginacao ampliadas | Regra comum tabela/export, campos financeiros reconhecidos, desempates, inteiros/limites validados, retorno a primeira/ultima pagina valida |
| D01/D06/UX05 | Dependencias reais preservadas | Chave unica e granularidade das views ainda nao confirmadas; snapshot da carga e estabilidade absoluta sob alteracao concorrente nao implementados |
| M06/D07 | Cobertura ampliada | 287 testes, 13 grupos de navegador e 16 grupos PostgreSQL locais aprovados; zero tentativas RM e limpeza dos testes confirmada |
| D03/D07 | Proxima frente independente | Revisar indicadores do backend contra contratos e ampliar testes de regras, distinguindo verificacao local de aceite/conciliacao RM |

[Registro da etapa](registro-etapa-2026-09-18-filtros-paginacao.md). UX05 permanece parcial pelos limites de identidade/snapshot/exportacao em escala. Sem migrations operacionais, publicacao ou alteracao remota. Papeis/canal/retencao LGPD, restore, CI/CD remoto e pendencias de dependencias permanecem. Nao restam apenas ajustes em views.

## 23. Evolucao em 18/09/2026: revisao de indicadores

| Frente | Status | Evidencia / proxima acao |
|---|---|---|
| D03 | Catalogo do backend entregue | 26 KPIs com operacao, granularidade, datas e limites; nao equivale ao catalogo sintetico ou aceite RM |
| D07 | Cobertura local ampliada | 305 testes e cinco grupos de navegador; SQL emitido/mock nao comprova calculos no SQL Server real |
| D03/UX01 | Correcoes locais implementadas | Media decimal, razao sem base indisponivel, contagens/rotulos precisos, maior volume por valor e remocao de falso percentual unico de alertas |
| D01/D08 | Dependencia RM preservada | Chaves, aditividade, baixas parciais/eventos, datas/cobertura, moeda/precisao e amostras de aceite |
| D06/UX06 | Proxima etapa independente | Estados por bloco; nao apresentar resultado antigo como atual nem falha como zero; regressao de erros parciais e respostas atrasadas |

[Catalogo](catalogo-indicadores-backend-2026-09-18.md) e [registro](registro-etapa-2026-09-18-indicadores.md). Sem alteracoes remotas. LGPD/infra/ativacao CI/CD e outras pendencias permanecem; ainda nao restam apenas views.

## 24. Evolucao em 18/09/2026: estados de consulta por bloco

| Frente | Status | Evidencia / proxima acao |
|---|---|---|
| D06/UX06 | Estados locais implementados | Falha/carregamento/sucesso por endpoint, retry isolado, descarte de respostas antigas e modal sem copia de recorte anterior |
| D06 | Parcial | Consulta concluida nao equivale a origem atualizada; snapshot/versao de carga e validacao integral dos campos continuam pendentes |
| UX06 | Feedback e responsividade verificados | Falha nao vira zero ou lista vazia; avisos acessiveis e ausencia de overflow desktop/390/320 |
| D07 | Cobertura ampliada | 326 testes e 28 grupos de navegador aprovados; fixtures locais, sem conciliacao RM |
| D03/D08 | Proxima frente independente | Validar datas/intervalos e limites de mes/ano/fuso; distinguir vencimento, baixa e posicao historica antes dos comparativos |

[Registro e limites](registro-etapa-2026-09-18-estados-painel.md). Sem migration, acesso RM/HML ou publicacao. LGPD, restore, ativacao CI/CD, dependencias moderadas e tamanho do bundle continuam pendentes. Ainda nao restam apenas views.

## 25. Evolucao em 18/09/2026: datas e periodos

| Frente | Status | Evidencia / proxima acao |
|---|---|---|
| D03/UX05 | Contrato de filtros temporais implementado | Calendario real, intervalos, campos permitidos, limites inclusivo/exclusivo e rejeicao antes da conexao financeira |
| D07 | Cobertura local ampliada | 377 testes e sete grupos novos de navegador; fusos, ano bissexto, limites e bloqueio de formulario |
| D08 | Parcial | Eixos documentados; filtros nao reconstroem posicao historica; GETDATE continua no relogio do SQL Server |
| D08/UX01 | Proxima frente independente | Contratos para comparativos anterior/ano anterior, periodos incompletos, cobertura e variacoes com base zero/negativa |

[Registro e contrato temporal](registro-etapa-2026-09-18-datas-periodos.md). Sem RM/HML, migration ou publicacao. Aceite financeiro, LGPD, infraestrutura, CI/CD remoto e demais pendencias preservados. Ainda nao restam apenas views.

## 26. Evolucao em 18/09/2026: contratos dos comparativos

| Frente | Status | Evidencia / proxima acao |
|---|---|---|
| UX02/D03 | Motor e contrato preparados | Bases mensal/livre, periodo anterior/ano anterior, calendario, cobertura, contexto e variacoes decimais |
| UX02/D06 | Parcial | Metadados de carga/cobertura reais ainda ausentes; nao ativados percentuais RM nem estoque historico |
| D07 | Cobertura ampliada | 444 testes; 12 grupos de navegador demonstrativo e sete de datas operacionais aprovados |
| UX03/UX02 | Proxima frente independente | Explicacao dos indicadores e estado comparativo nos cards, com periodos/eixo/motivos de indisponibilidade; sem inventar variacoes |
| D08 | Conciliacao continua pendente | Nenhum teste sintetico equivale ao aceite financeiro de cliente real |

[Contrato](contrato-comparativos-2026-09-18.md) e [registro](registro-etapa-2026-09-18-comparativos.md). Nao criados clientes ficticios no banco, nem alteradas as conexoes reais. LGPD, restore, ativacao CI/CD, dependencias moderadas e bundle continuam pendentes. Ainda nao restam apenas views.

## 27. Evolucao em 18/09/2026: ajuda dos indicadores

| Frente | Status | Evidencia / proxima acao |
|---|---|---|
| UX03 | Implementado nos cards KPI | Catalogo dos 26 KPIs com formula, origem, unidade, referencia e limites; dialogo acessivel e contexto atualizado |
| UX02/UX06 | Planejamento e indisponibilidade integrados | Modos, bases, datas, duracoes e motivos; nenhuma variacao real sem cobertura e versao da carga |
| D07/M06 | Regressao ampliada | 485 testes e 42 grupos de navegador; sem consultas extras ao trocar modo, falha/retry e logout removendo ajuda antiga |
| UX03 | Parcial no conjunto do produto | Ajuda de resumos auxiliares/graficos e verificacao integral de acessibilidade ainda pendentes |
| UX04 | Proxima frente independente | Fidelidade de graficos para zero/negativos/dados ausentes, alternativa tabular e acesso por teclado |

[Registro](registro-etapa-2026-09-18-ajuda-indicadores.md). Sem banco/RM/HML ou publicacao; comparativos numericos reais, conciliacao, LGPD e infraestrutura continuam pendentes. Ainda nao restam apenas views.

## 28. Evolucao em 18/09/2026: fidelidade dos graficos

| Frente | Status | Evidencia / proxima acao |
|---|---|---|
| UX04 | Implementado no painel operacional | Zero sem proporcao artificial, negativos em barras, lacunas/nulos preservados, matriz com sinais e tabela alternativa |
| UX04/UX06 | Acesso por teclado ampliado | Filtros tabulares, dialogo com foco/Escape e visual conferido em desktop/390/320; nao equivale a auditoria integral de acessibilidade |
| D07 | Cobertura ampliada | 524 testes e 52 grupos de navegador aprovados; dados sinteticos sem cadastros locais ou acesso RM |
| D03/D06/D08 | Dependencias preservadas | SQL pode produzir zeros; granularidade, cobertura, moeda/precisao e conciliacao real nao certificadas |
| Desempenho web | Proxima frente independente | Medir e reduzir carregamento inicial com modulos sob demanda, mantendo isolamento, autenticacao e falhas recuperaveis |

[Registro](registro-etapa-2026-09-18-graficos.md). Sem backend/banco, migrations ou publicacao. Bundle acima de 500 kB, dois alertas moderados, ativacao CI/CD remoto, restore e LGPD permanecem pendentes. Ainda nao restam apenas views; mensagem consolidada para Leonardo segue reservada.

## 29. Evolucao em 18/09/2026: carregamento sob demanda

| Frente | Status | Evidencia / proxima acao |
|---|---|---|
| Desempenho web | Entrada reduzida localmente | 727 kB para 208 kB de JavaScript no login; maior modulo 405 kB, sem aviso acima de 500 kB. Painel completo e RM nao possuem a mesma reducao |
| SC04 | Limites incluidos no quality gate | Build verifica entrada e modulos; ativacao/execucao remota continuam pendentes |
| D07/M06/UX06 | Regressao ampliada | 532 testes e 58 grupos de navegador, seis sobre build compilado; logout/troca de empresa durante importacao preservados |
| Cache e atualizacao web | Proxima frente independente | Revisar service worker, recursos persistidos, fallback offline e versoes dos arquivos, alinhando testes e LGPD |

[Registro e medicao](registro-etapa-2026-09-18-carregamento.md). Sem backend/banco, views ou publicacao. Dois alertas moderados, conciliacao RM, infraestrutura, CI/CD remoto e definicoes LGPD permanecem pendentes. Ainda nao restam apenas views.

## 30. Evolucao em 21/09/2026: cache e atualizacao web

| Frente | Status | Evidencia / proxima acao |
|---|---|---|
| Cache/UX06 | Implementado localmente | Worker sem novos caches, limpeza restrita ao legado, offline neutro, erro de modulo sem HTML substituto e recuperacao explicita |
| LG02/SC04 | Persistencia reduzida, nao conformidade integral | Cache HTTP de longa duracao somente para codigo publico versionado; sessao, governanca e verificacao efetiva no proxy/navegadores HML continuam separados |
| D07/M06 | Cobertura ampliada | 567 testes e 45 grupos de navegador executados nesta etapa; migracao real do worker, cache de outro projeto preservado e isolamento mantido |
| Dependencias | Proxima frente independente | Avaliar/tratar uuid/ExcelJS com compatibilidade e regressao de exportacao, sem atualizacao forcada |

[Registro e limites](registro-etapa-2026-09-21-cache-atualizacao.md). Sem banco, views, acesso RM/HML ou publicacao. Restore, ativacao CI/CD remoto, conciliacao e definicoes LGPD continuam pendentes. Ainda nao restam apenas views.

## 31. Evolucao em 21/09/2026: dependencias e exportacao Excel

| Frente | Status | Evidencia / proxima acao |
|---|---|---|
| Dependencias | Dois alertas tratados localmente | UUID 11.1.1 na arvore do ExcelJS 4.4.0; falha reproduzida/corrigida na biblioteca, sem caminho exploravel identificado no export atual |
| D07/SC04 | Regressao ampliada | 590 testes, build e limites aprovados; auditoria sem vulnerabilidades conhecidas; instalacao isolada com lockfile conferida |
| Dependencias | Manutencao permanece | Override fora da faixa original exige revisao nas atualizacoes; avisos de descontinuacao transitivos e execucao remota continuam separados |
| Recuperacao local | Proxima frente independente | Preparar rotina/testes de backup e restore; ensaio somente em destino descartavel autorizado, sem sobrescrever banco ativo ou criar container |

[Registro e limites](registro-etapa-2026-09-21-dependencias-excel.md). Sem RM/HML, banco, views, migration ou publicacao. Ativacao CI/CD remoto, conciliacao, governanca LGPD e demais pendencias continuam; ainda nao restam apenas views.

## 32. Evolucao em 21/09/2026: publicacao autorizada de homologacao

| Frente | Status | Evidencia / proxima acao |
|---|---|---|
| Homologacao | Publicada manualmente | Release 20260921-125622, HTTPS, runtime/porta exclusivos, servico estavel; dominio novo sujeito a cache DNS local |
| Banco/credenciais | Aplicado com backup | Migrations 001/002/003, duas senhas RM cifradas, duas empresas/tres usuarios preservados; papel runtime restrito |
| D07/Proxy | Validado tecnicamente | 596 testes; HTTP publico, cache, bloqueio sem login e estrutura das duas fontes RM conferidos; sem leitura de lancamentos |
| Recuperacao | Parcial | Dump/catalogo/hash e copia restrita fora da VPS; ensaio de restore e custodia/retencao definitivos pendentes |
| CI/CD | Nao ativado | Conta atual sem escrita/admin no remoto publico; regularizar repositorio/permissoes antes de publicar workflows e secrets |
| D08/Aceite | Proxima etapa sugerida | Leonardo indicar validador, acesso individual e validacao autenticada; fechar contrato das views e conciliar valores com RM |

[Registro completo](registro-publicacao-hml-2026-09-21.md). Sem producao, seed, alteracao de views ou interferencia em outros projetos. Publicacao nao significa aceite financeiro ou conformidade LGPD integral.

## 33. Evolucao em 23/09/2026: UI/UX e tela cheia

| Frente | Status | Evidencia / proxima acao |
|---|---|---|
| UX07/UX18 | Implementado localmente | Tela cheia individual para graficos/tabelas, rankings com largura completa e ate 50 linhas; sem publicacao |
| UX08/UX09 | Prioridade alta | Corrigir Alterar senha do admin e tornar Acessar empresa facilmente visivel no Dashboard/celular |
| UX10/UX11/UX12 | Proxima frente sugerida | Filtros essenciais/avancados, Aplicar fixo no celular e cabecalho compacto sem botao vazio |
| UX13/UX14 | Pendente | Comparacao indisponivel menos repetitiva; tabela com rotulos/colunas de negocio e periodo visivel |
| UX15/UX16/UX17 | Pendente | Foco/navegacao por teclado, largura minima e carga/erro das listas de filtros |

[Diagnostico, criterios de aceite e verificacao](registro-etapa-2026-09-23-ui-ux-tela-cheia.md). Dados sinteticos somente na fixture local, sem criar empresas ou acessar bancos. Conexao/consultas autenticadas reais ja foram testadas apos a publicacao anterior conforme registro de 21/09; isso nao representa aceite financeiro. Avaliacao atual nao altera views, CI/CD ou definicoes LGPD.

## 34. Proposta comparativa em 23/09/2026

[Analise e proposta consolidada](proposta-evolucao-comparativa-2026-09-23.md), com referencias Dario e Observatorio SEMMU. Situacao: proposta para avaliacao, sem implementacao ou publicacao nesta etapa.

| Frente | Prioridade proposta | Vinculo e dependencia |
|---|---|---|
| UX08/UX09, depois UX10-UX12 | Imediata | Entrada na empresa, senha e filtros; sem novas views. Preservar UX07/UX18 locais |
| UX13-UX17 e EV01-EV03 | Alta | Clareza, ajuda ampliada, semantica visual e qualidade; metadados reais condicionados a origem |
| EV04-EV05 | Posterior | Exportacao visual e preferencias por usuario/empresa; politica de persistencia/exportacao |
| EV06-EV07 | Alta, condicionada | Complementam D01-D08/UX01-UX06: conciliacao, comparativos e novas analises elegiveis |
| EV08 | Conforme medicao | Complementa SC: cargas versionadas/camada analitica, sem presumir necessidade de migracao |
| EV09-EV10 | Futura/opcional | Previsoes e assistente governado, dependentes de dados confiaveis e decisao de escopo |
| OP01/GOV01 | Paralela desde o inicio | Agrupam pendencias existentes de Git/CI/CD, restore e governanca LGPD; nao sao entregas novas concluidas |

IDs EV01-EV10 detalham a proposta, sem duplicar contagens de conclusao do backlog anterior. Aceites, papeis responsaveis, esforco relativo e limites estao no documento vinculado. Nenhuma mudanca de banco, view, credencial, infraestrutura ou nos projetos de referencia. Proxima etapa sugerida: pacote de uso essencial e filtros, apos avaliacao da proposta. Ainda nao restam apenas ajustes em views.

## 35. Compartilhamento Git em 25/09/2026

OP01 avancou na preparacao do codigo validado para colaboracao, em branch separada da `main`.
603 testes, build e limites de bundle aprovados; auditoria npm sem vulnerabilidades reportadas.
Arquivos locais e evidencias excluidos do envio. [Registro e limites](registro-etapa-2026-09-25-compartilhamento-git.md).

Pendente de desenvolvimento: conciliar dez commits existentes na `main` remota, preservando filtros,
indicadores, administracao e privacidade, e repetir validacoes antes do merge. Pendente de infraestrutura:
confirmar CD e protecoes do ambiente antes da integracao. Sem deploy, alteracao de views ou banco.
