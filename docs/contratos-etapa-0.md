# Contratos iniciais: acesso, origem e indicadores

Data: 17/09/2026. Marco 0 do [backlog de evolução](backlog-evolucao-multiempresa-analytics-2026-09-17.md).

As regras de isolamento abaixo traduzem a diretriz do usuário. Os contratos financeiros são uma proposta inicial demonstrada com dados fictícios, pendente de confirmação pela Equilíbrio TI e de conciliação com o RM. Não houve migração dos usuários ou mudança na autorização do backend real nesta etapa.

Esclarecimento de 17/09/2026: o usuário informou que a aplicação já possui bases de empresas reais conectadas. Os dados fictícios são exclusivamente uma bancada local de regressão, com resultados conhecidos; não substituem essas bases nem são requisito para utilizá-las. A próxima validação deve aproveitar as fontes reais já disponíveis, em leitura, identificando separadamente quais views e informações ainda faltam ao Leonardo. A conectividade atual dessas bases não foi testada nesta etapa.

## 1. Fronteiras e permissões (M01)

Tenant é a empresa cliente da plataforma. Coligada e filial são unidades internas do tenant. Identificadores do RM só têm significado dentro de sua origem e tenant: coligada 1 de Aurora não é coligada 1 de Horizonte.

| Ação | Público | Usuário do cliente | Administrador geral |
|---|---|---|---|
| Autenticar | Sim | Sim | Sim |
| Consultar indicadores e títulos | Não | Somente próprio tenant e escopo autorizado | Tenant explicitamente selecionado |
| Alterar filtros de coligada | Não | Somente coligadas autorizadas do próprio tenant | Dentro do tenant selecionado |
| Exportar | Não | Próprio tenant, se a permissão permitir | Tenant selecionado, com auditoria |
| Consultar relatórios/arquivos/tarefas | Não | Próprio tenant e permissão do recurso | Contexto selecionado, com auditoria |
| Cadastrar tenant e configurar conexão RM | Não | Não | Sim |
| Atribuir papel global | Não | Não | Somente fluxo administrativo controlado |
| Trocar de empresa cliente | Não | Não | Sim, com sessão válida e registro |
| Consultar auditoria global | Não | Não | Sim |

Regras de implementação para a etapa 1:

1. Negar por padrão. Validar sessão, vínculo ativo, tenant ativo e permissão antes de consultar, gravar ou baixar qualquer recurso.
2. O cabeçalho ou parâmetro de empresa não concede acesso. A mesma verificação se aplica a consultas, exportação e tarefas em segundo plano.
3. Não promover todos os usuários `admin` atuais automaticamente. Inventariar usuários e confirmar os administradores gerais antes da migração.
4. Revogar a autorização anterior ao desativar usuário/tenant, redefinir senha ou mudar perfil/vínculo. A próxima operação deve exigir contexto válido.
5. Separar cache, armazenamento e arquivos por tenant e escopo. Respostas pendentes de uma sessão encerrada não podem reaparecer em outra.
6. Acesso global não significa credenciais de superusuário do banco; registrar autor real, tenant, operação, resultado, horário e correlação sem segredos.
7. Na primeira versão, um usuário de cliente pertence a um tenant. Gestor local, múltiplos vínculos e restrição por filial exigem contrato adicional antes da implementação.

Pendência: lista real de usuários/papéis e atribuição dos administradores gerais. Não foi consultado o banco real para obter essa lista.

## 2. Contrato de origem RM (D01, rascunho)

O código atual conhece `PBI_TITULOSFINANCEIRO` e `PBI_TITULOSFINANCEIRO_COL2`; isso não comprova a existência ou equivalência dessas views nos clientes futuros.

| Informação solicitada à Equilíbrio TI | Por que é necessária |
|---|---|
| Cliente, ambiente, banco, schema e views permitidas | Definir a origem e os limites de leitura por tenant. Credenciais seguem canal seguro, nunca documentação. |
| Chave estável de título, parcela, rateio e evento de baixa | Evitar duplicação e colisões entre coligadas e fontes. |
| Granularidade de cada linha | Distinguir título, rateio e evento; confirmar campos repetidos nas linhas. |
| Significado de VLRRATEIO, VLRBAIXA, VLRORIGINAL e encargos | Separar principal, caixa, impostos, descontos e composição do residual. |
| Pagamentos parciais, estornos, cancelamentos e renegociações | Reconstruir o saldo por data sem depender do status atual. |
| Datas e fuso de origem | Distinguir emissão, vencimento, baixa, atualização e data civil do movimento. |
| Identificadores de contraparte, coligada, filial e centro de custo | Não agrupar pessoas/empresas diferentes pelo mesmo nome. |
| Histórico disponível e atualização da origem | Definir cobertura e comparabilidade; não exibir dado ausente como zero. |
| Exemplos e relatório RM com resultado esperado | Conciliar título a título e total por período antes de habilitar cliente real. |
| Responsável técnico e responsável financeiro | Resolver interpretação e registrar aceite. |

Campos propostos para o modelo canônico: tenant, origem/versionamento, título/parcela, direção pagar/receber, contraparte, coligada, datas, principal decimal; rateios associados; eventos assinados de principal/caixa, com identidade própria e vínculo ao título. Não são nomes de colunas já garantidos pelo RM.

Na demonstração, os valores são inteiros em centavos. Essa simplificação não substitui a precisão de quatro casas usada em rateios reais: a política de arredondamento ainda precisa ser acordada com o RM.

## 3. Catálogo inicial dos indicadores (D03)

Versão das regras demonstradas: `demo-v1`. Data de corte inicial: 17/09/2026. Cobertura fictícia completa: 01/01/2025 a 17/09/2026; cenário parcial: 01/01/2026 a 17/09/2026. Dentro desse contrato fictício, ausência de evento em dia coberto significa zero; fora da cobertura significa indisponível.

| Indicador | Fórmula demonstrada | Natureza e limites |
|---|---|---|
| Recebido no período | Soma do caixa dos eventos a receber entre início e fim, com estornos negativos | Fluxo. Inclui encargos/descontos presentes no caixa sintético. |
| Pago no período | Soma do caixa dos eventos a pagar entre início e fim, com estornos negativos | Fluxo. Não restringe pelo vencimento. |
| Fluxo líquido de títulos | Recebido menos pago | Fluxo, não lucro nem saldo bancário. |
| Carteira a receber | Soma do principal menos eventos de principal até a data final, para recebíveis emitidos e não cancelados nessa data | Estoque. Inclui residual de baixa parcial. Fórmula restrita aos casos fictícios previstos. |
| Recebíveis vencidos | Residual positivo dos recebíveis cujo vencimento é anterior à referência | Estoque. Vencimento hoje não está atrasado. |
| Títulos em aberto | Contagem única de títulos com residual positivo na referência | Estoque. Inclui pagar/receber conforme filtro; rateios não multiplicam títulos. |
| Faixas de atraso | Agrupamento do residual a receber por diferença de dias civis | A vencer/hoje; 1–30; 31–60; 61–90; mais de 90. Soma fecha com carteira sintética. |

Filtros de empresa, coligada, direção e pesquisa selecionam o mesmo universo para indicadores, gráfico, tabela e CSV. A tabela mostra títulos emitidos até o fim, inclusive históricos liquidados/cancelados; seu total de principal não é apresentado como saldo aberto. A carteira usa a data final; os movimentos usam início e fim.

Comparação: mês iniciado no dia 1 até corte parcial contra mesmo recorte do mês anterior; mês fechado contra mês anterior fechado; intervalo livre contra intervalo imediatamente anterior de mesma duração; ano anterior com ajuste de 29/02 para data válida. Mostrar os dois intervalos e preservar dias excedentes no gráfico. Sem cobertura equivalente, omitir o comparativo, mantendo os dados atuais se válidos.

Variação absoluta: atual menos anterior. Relativa: diferença dividida pelo anterior apenas quando este é positivo. Base zero ou negativa mantém diferença absoluta, mas sem percentual; ausência de cobertura não gera nenhum dos dois. Crescimento não é automaticamente melhora.

## 4. Oráculo da massa inicial (D07 parcial)

Resultados manuais esperados para 01–17/09/2026, todas as coligadas e direções:

| Resultado | Aurora | Horizonte |
|---|---:|---:|
| Recebido | R$ 2.410,00 | R$ 1.000,00 |
| Pago | R$ 300,00 | R$ 3.000,00 |
| Fluxo líquido | R$ 2.110,00 | -R$ 2.000,00 |
| Carteira a receber | R$ 1.200,00 | R$ 12.500,00 |
| Recebíveis vencidos | R$ 600,00 | R$ 8.000,00 |
| Títulos em aberto | 4 | 2 |
| Recebido em 01–17/09/2025 | R$ 1.000,00 | R$ 6.000,00 |

Exemplos implementados: título de R$ 1.000,00 com rateios de R$ 600,00/R$ 400,00 e baixa de R$ 400,00; liquidação de R$ 2.000,00 de principal e R$ 2.010,00 de caixa; pagamento e estorno de R$ 100,00; cancelamento e título futuro; IDs e coligadas repetidos em tenants diferentes.

Os testes verificam contratos sintéticos, datas, filtros, variações, soma da série, composição do residual e exportação. D07 permanece parcial: não foram validados SQL Server, duplicação das views, granularidade real, todas as métricas atuais nem rateios reais de quatro casas.

## 5. Limite de segurança da demonstração (UX01)

O seletor de perfil é um simulador, não autenticação. Todos os dados fictícios estão no navegador. O bloqueio de contexto nas funções testadas demonstra o contrato desejado, mas não comprova isolamento do backend nem deve ser reutilizado como controle de acesso real.

O modo exige servidor Vite de desenvolvimento em `--mode demo`, usa porta local separada, não cadastra service worker, não acessa a API e não utiliza tokens ou dados da sessão real. O build com esse modo é bloqueado; o build normal exclui a importação demonstrativa. A identificação de dados fictícios permanece na interface.

O funcionamento normal da aplicação e os problemas de segurança já identificados continuam sob os itens M02–M06. Não liberar clientes reais com base no sucesso desta demonstração.

## 6. Decisões e próximos passos

M01 está especificado, com inventário real pendente. D01/D03 são rascunhos com demonstração executável. UX02/UX03 possuem protótipo, não integração na interface autenticada. SC01 permanece pendente de mapeamento/provisionamento; nenhuma instância de banco foi criada nesta etapa.

Próxima etapa sugerida: base multiempresa protegida (M02–M06), ambiente PostgreSQL local isolado (SC01) e saneamento das dependências que bloquearem o gate de segurança. Em paralelo, Leonardo fornece o contrato RM e as amostras para D01/D08.

Atualização posterior em 17/09/2026: houve inspeção real de metadados na configuração SQL Server local, com as duas views presentes; o cadastro PostgreSQL não foi acessado com sucesso desta máquina. O usuário solicitou avaliar APIs nativas e conta de integração por cliente. Seguir o [inventário e conciliação](inventario-fontes-conciliacao-2026-09-17.md) e a [avaliação de APIs](avaliacao-apis-rm-2026-09-17.md); esta atualização não altera as fórmulas sintéticas nem certifica indicadores reais.
