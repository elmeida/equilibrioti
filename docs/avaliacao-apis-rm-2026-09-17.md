# Avaliação inicial de integração por APIs do RM

Data: 17/09/2026. Equilíbrio BI / Equilíbrio TI. Governança Atenza. Status: avaliação documental, sem piloto, benchmark, ativação ou implementação de API autorizados.

## 1. Objetivo e conclusão preliminar

Avaliar, com o código atual e a documentação RM, se consumir APIs poderia atualizar os mesmos dados mais rapidamente e reduzir a manutenção de views. Correção de escopo após esclarecimento do usuário: a proposta anterior ampliou indevidamente o pedido para um piloto. Somente a avaliação documental está no fluxo atual; INT02–INT06 ficam como possibilidades não aprovadas, sem execução.

Há APIs nativas de cadastros úteis e serviços DataServer para leitura de objetos do RM. Ainda não está comprovado que REST nativo cobre todos os títulos, eventos de baixa, rateios e estornos necessários ao BI na versão de cada cliente. O catálogo público consultado não é prova de ausência de outras APIs; o Swagger do ambiente é a próxima evidência necessária. [Catálogo Backoffice RM](https://tdn.totvs.com/pages/viewpage.action?pageId=877869228), [APIs e Swagger do RM](https://tdn.totvs.com/pages/viewpage.action?pageId=419548455).

**Parecer para o projeto atual: não recomendar a troca por promessa de maior velocidade de atualização.** O backend já agrega os dados no SQL Server. Como inferência de engenharia, para a mesma carga, filtros e condições de rede, uma consulta SQL bem ajustada tende a ter vantagem sobre obter registros paginados via API e depois agregá-los, porque esta alternativa acrescenta processamento e transferência. Isso não é uma medição do ambiente nem uma regra absoluta: contratos incrementais, cache e consultas atuais ineficientes podem mudar o resultado. Esses recursos também podem ser usados com origem SQL e não são vantagens exclusivas de APIs.

**Velocidade de desenvolvimento é outra questão:** serviços nativos com cobertura equivalente podem reduzir a criação/manutenção de views por cliente e facilitar novas integrações. A documentação consultada confirma recursos úteis, mas não demonstrou equivalência integral de títulos, rateios e eventos de baixa/estorno usados neste projeto. Portanto, as duas condições solicitadas pelo usuário (atualização mais rápida e mesmos dados) não estão comprovadas. Não enviar recomendação ao Leonardo afirmando que já estão atendidas, nem solicitar conta de integração neste momento.

## 2. Recursos nativos identificados

Rotas relativas abaixo são documentadas publicamente, não confirmadas em nenhum cliente. Usar somente operações de leitura aprovadas. Não inferir que versões, filtros ou paginação sejam iguais em todas as instalações.

| Necessidade | Recurso identificado | Uso e limite |
|---|---|---|
| Cliente/fornecedor | REST `GET /api/fin/v1/CustomerVendor` | Dimensão de contraparte e chave composta por coligada/código; selecionar apenas campos necessários. [Documentação](https://tdn.totvs.com/pages/viewpage.action?pageId=947313428) |
| Coligadas | REST `GET /api/framework/v1/companies` | Descoberta técnica, nunca autorização automática de acesso. A documentação alerta que, desde 12.1.2310, a listagem não é filtrada pelo perfil. [Documentação](https://tdn.totvs.com/display/LRM/API%2Bde%2BColigada) |
| Centros de custo | REST `GET /api/ctb/v1/costcenters` | Cadastro para agrupamentos; a especificação indica RM a partir de 12.1.29, a confirmar no piloto. [OpenAPI oficial TOTVS](https://github.com/totvs/ttalk-standard-message/blob/master/jsonschema/apis/CostCenter_v1_000.json) |
| Tipos de documento | REST `GET /api/financial/v1/documenttypes` | Dimensão documental; confirmar coligada, paginação e filtros no Swagger. [Documentação](https://tdn.totvs.com/display/LRM/API%2Bde%2BTipo%2Bde%2BDocumento) |
| Moedas e índices | REST `/api/financial/v1/currencies` | Apoio ao tratamento monetário; não converter nem somar moedas diferentes sem regra validada. [Documentação](https://tdn.totvs.com/pages/viewpage.action?pageId=804049487) |
| Conta/caixa | API listada no catálogo financeiro | Candidata para dimensão de contas. Rota e contrato ainda precisam ser obtidos no Swagger do piloto; não foram presumidos. [Catálogo](https://tdn.totvs.com/pages/viewpage.action?pageId=877869228) |
| Títulos financeiros | DataServer `FinLanDataBR`, candidato via `wsDataServer` | O nome é confirmado pela TOTVS. Validar `ReadView`, `ReadRecord` e schema na versão real; isso é serviço nativo SOAP/XML, não REST financeiro confirmado. [Referência do objeto](https://tdn.totvs.com/pages/viewpage.action?pageId=621010284), [DataServer](https://tdn.totvs.com/display/LRM/TBC%2B-%2BWeb%2BService%2BDataServer) |
| Baixas parciais, estornos, cancelamentos, rateios e naturezas | Cobertura exata ainda não confirmada | Verificar entidades/anexos, chaves de eventos, valores e datas no schema/Swagger. Não inventar endpoints nem deduzir histórico completo do status atual |
| Consultas complementares | `GET /api/framework/v1/consultaSQLServer/RealizaConsulta/{codSentenca}/{codColigada}/{codSistema}` | Executa consulta previamente cadastrada. Pode servir como transição, mas continua exigindo manutenção de SQL e não atende, sozinha, ao objetivo de independência das consultas. [Documentação](https://tdn.totvs.com/display/LRM/API%2Bde%2BConsultaSQL) |

O Swagger é disponibilizado pelo RM.Host em `/api/swagger/`, quando habilitado. Solicitar a descrição do ambiente ao responsável, sem presumir que a porta do SQL Server seja a porta de API. A documentação pública usa HTTP em exemplos locais; a integração proposta deve usar HTTPS validado e acesso restrito. [Framework RM](https://tdn.totvs.com/pages/viewpage.action?pageId=419548455).

Não utilizar `SaveRecord`, exclusão, baixa, geração de lançamento ou alteração de perfil. SOAP utiliza HTTP POST inclusive em operações de leitura; o bloqueio deve considerar a operação SOAP, não simplesmente proibir todo POST. [Métodos DataServer](https://tdn.totvs.com/display/LRM/Web%2BServices%2Bdo%2BTBC).

## 3. Estratégia de desempenho a avaliar

As linhas abaixo são hipóteses de arquitetura, não resultados medidos.

| Alternativa | Benefício potencial | Custo/risco a medir |
|---|---|---|
| SQL/views atuais | Agregação próxima aos dados, referência existente | Manutenção por cliente, acoplamento ao schema e impacto de consultas repetidas |
| APIs nativas consultadas a cada tela | Contratos de negócio e menor dependência de SQL específico | Paginação, rede, transformação e várias chamadas para compor um indicador podem piorar a resposta |
| APIs + sincronização incremental + base analítica | Painéis desacoplados do RM, histórico controlado e agregações locais | Armazenamento, atraso de atualização, monitoramento e tratamento de alterações/exclusões retroativas |
| Híbrido transitório | Preservar o que funciona enquanto se cobre lacunas | Evitar duplicação: definir origem única por entidade/período e conferir totais durante a transição |

Preferência técnica para investigar: conectores por tenant que alimentem um modelo canônico, sem chamadas do navegador diretamente ao RM. A eventual base analítica não é automaticamente o PostgreSQL de autenticação; dimensionamento, isolamento, backup e retenção precisam ser definidos.

### Referência técnica futura, fora do escopo autorizado

Os critérios abaixo foram propostos antes do esclarecimento do usuário e permanecem apenas como referência histórica. Não são uma próxima etapa, exigência ao Leonardo ou autorização de execução.

1. Mesmo cliente, coligadas, período, moeda, campos e resultados. Separar teste de carga inicial, atualização incremental e leitura dos painéis.
2. Medir latência mediana/p95, tempo total de extração, registros/segundo, chamadas, bytes, erros, consumo de recursos no RM e eventual consumo de licenças. Cache frio/quente devem ser registrados separadamente.
3. Executar carga progressiva em janela acordada, com orçamento de requisições, concorrência e timeout limitados. Nenhum teste de carga em produção sem aprovação específica.
4. Verificar paginação completa, ordenação estável, reinício de uma carga interrompida, alterações com mesma data, exclusões, baixas e estornos retroativos. Confirmar se há filtro confiável por atualização; não presumir CDC ou webhook nativo.
5. Publicar atualização somente após lote consistente; mostrar a última atualização válida e a defasagem. Indisponibilidade não pode limpar totais ou virar zero.
6. Conciliar todos os indicadores selecionados com relatórios RM e acordar tolerância decimal. Não considerar uma API aprovada apenas porque replica uma fórmula SQL possivelmente incorreta.
7. Critérios de aceite: cobertura integral do recorte e das regras escolhidas; nenhuma divergência sem explicação; testes negativos de isolamento aprovados; metas de tempo/atualização e limites de impacto acordados antes do benchmark. Valores-alvo ainda não definidos.

## 4. Usuário de integração por cliente

Proposta a validar com Leonardo: uma identidade técnica dedicada por cliente e por ambiente, sem usar conta pessoal nem administrador geral do RM.

- Acesso somente de leitura aos recursos necessários, limitado às coligadas/filiais autorizadas. Testar tentativas de acesso fora do escopo; a listagem de coligadas não é prova de permissão.
- Segredos guardados no backend/cofre, segregados por tenant, com rotação, revogação e auditoria. Nunca enviar senha no Git, documentação, navegador ou mensagem aberta.
- Confirmar autenticação suportada pela instalação e contrato de licenciamento. Não presumir OAuth/client credentials, gratuidade ou ausência de consumo de licença.
- Registrar URL base e ambientes aprovados, versão/patch, certificado TLS e política de rede. Não habilitar descoberta/consulta de endereços arbitrários a partir de entrada do cliente.
- Mapeamento explícito `tenant -> credencial -> ambiente -> coligadas`. Chaves analíticas devem incluir tenant e origem, além da chave nativa.
- Negar por padrão no backend, separar filas/cache/arquivos por tenant e testar o acesso cruzado. Um usuário dedicado é parte da defesa, não garantia suficiente de isolamento.

O comportamento de filtragem de coligadas documentado pela TOTVS torna essa validação obrigatória, especialmente em instalações compartilhadas. [API de Coligada](https://tdn.totvs.com/display/LRM/API%2Bde%2BColigada).

## 5. Comunicação ao Leonardo

Não há fundamento suficiente para recomendar a migração como mais rápida e equivalente. Uma eventual mensagem exploratória deve explicar apenas o potencial de reduzir manutenção de views, distinguindo esse ganho da velocidade de atualização dos dados. Não pedir piloto, criação de conta ou ativação de serviço. Se necessário para fechar a análise documental, pedir somente versão/patch e documentação dos serviços financeiros disponíveis, sem credenciais.

## 6. Fluxo incorporado

Fluxo corrigido: analisar código e documentação -> comparar cobertura dos dados e custos de atualização -> emitir parecer -> somente se houver sustentação para a vantagem e equivalência, preparar recomendação ao Leonardo. Piloto, conta de integração, benchmark e migração não fazem parte deste pedido.

Sem cobertura completa, manter a fonte atual para as entidades faltantes e registrar a lacuna; não eliminar views ou conexões por antecipação. A redução da dependência do Leonardo é um objetivo a comprovar: implantação, permissões e particularidades por cliente continuam exigindo coordenação.
