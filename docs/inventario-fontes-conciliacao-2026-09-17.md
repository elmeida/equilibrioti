# Inventário de fontes e preparação da conciliação

Data: 17/09/2026. Projeto: Equilíbrio BI. Produto White Label Equilíbrio TI, governança Atenza. Documento técnico interno, ambiente de homologação.

## 1. Resultado desta etapa

Foram inspecionados o código e as configurações locais, com tentativas de acesso somente de leitura. As bases reais existentes continuam sendo a referência; a demonstração sintética não participa da conexão real.

| Origem | Evidência obtida | Limite |
|---|---|---|
| PostgreSQL configurado em `AUTH_DB_*` | Configuração remota presente; tentativa de conexão/leitura não concluída nesta máquina | Não foi possível listar as empresas nem confirmar as conexões cadastradas; não equivale a indisponibilidade na VPS |
| SQL Server configurado em `DB_*` | Acesso realizado; catálogo e consulta sem linhas retornadas funcionaram | Configuração legada/local, ainda não associada ao tenant do cadastro central |
| `dbo.PBI_TITULOSFINANCEIRO` | View existente com 40 colunas | Valores financeiros e cobertura temporal não consultados |
| `dbo.PBI_TITULOSFINANCEIRO_COL2` | View existente com 40 colunas | Valores financeiros e cobertura temporal não consultados |
| `dbo.GCOLIGADA` | Tabela existente com 30 colunas | Apenas metadados; nomes, documentos e endereços não extraídos |
| Consulta unificada usada pela aplicação | `SELECT TOP (0)` executado com sucesso | Compatibilidade de consulta não comprova totais, granularidade, desempenho ou isolamento |

Evidência local: `tmp/source-inspection/latest.json`, fora do Git. Nenhuma credencial, endereço de banco ou nome real de cliente foi incluído neste documento.

## 2. Caminho dos dados confirmado no código

1. O PostgreSQL guarda usuários, vínculo com a empresa e configurações de conexão SQL Server.
2. O backend seleciona a conexão pelo ID da empresa. As variáveis `DB_*` não são o caminho normal de consulta dos tenants; aparecem no bootstrap opcional de cadastro.
3. A consulta de títulos combina duas views, atribuindo os códigos de coligada 1 e 2 e buscando o nome em `GCOLIGADA`.
4. Os filtros e indicadores são calculados sobre essa união. Hoje o período padrão é filtrado por vencimento e não tem datas preenchidas inicialmente.

Referências: [conexões por empresa](../server/db/pool.js), [bootstrap opcional](../server/auth/init.js), [consulta de origem](../server/sql/titulosBase.js), [filtros](../server/utils/queryBuilder.js), [indicadores](../server/routes/titulos.js) e [filtros iniciais](../src/services/api.ts).

Não interpretar as duas coligadas como duas empresas clientes da plataforma. Também não deduzir todos os clientes ativos a partir do nome usado no bootstrap.

## 3. Pontos para conciliar antes de alterar fórmulas

| Item | Comportamento atual observado | Conferência necessária |
|---|---|---|
| Precisão | `VLRRATEIO` nas views é `numeric(16,4)`; `VLRBAIXA`, `VLRORIGINAL` e vários componentes são `numeric(35,12)`. O backend converte valores monetários para `decimal(19,4)` por linha | Comparar soma na precisão de origem, arredondamento por linha e arredondamento final; acordar tolerância com o financeiro |
| Quantidade e ticket médio | Contagem de linhas da união | Confirmar se cada linha é título, rateio ou combinação e qual é a chave única |
| Aberto e vencido | Usa somente `STATUS_FIN = 'Em Aberto'` e `VLRRATEIO` | Conferir inclusão do residual das baixas parciais; não assumir que rateio menos baixa representa o saldo líquido em todos os casos |
| Realizado | Soma `VLRBAIXA`, sujeita ao filtro de data escolhido, cujo padrão é vencimento | Comparar o mesmo período por data de baixa, separando principal, encargos, retenções e estornos |
| Atraso | Usa data atual do SQL Server; médias calculadas sobre diferença inteira de dias | Distinguir posição atual e posição histórica; revisar precisão da média |
| Coligada | Códigos 1/2 fixos e vários agrupamentos pelo nome | Validar abrangência real e preservar códigos estáveis no futuro conector |
| Comparação histórica | Status atual e uma data de baixa não demonstram histórico completo de eventos | Exigir cobertura das baixas, cancelamentos, estornos e alterações retroativas |

Esses são critérios de investigação, não diferenças financeiras já medidas. Não houve leitura de lançamentos nem comparação com relatório RM nesta etapa.

## 4. Roteiro do piloto real

1. Confirmar com o responsável a associação entre a fonte acessível, cliente, tenant e coligadas autorizadas. Não abrir o PostgreSQL para toda a internet; usar acesso interno, VPN ou túnel aprovado, se necessário.
2. Selecionar um mês fechado com movimento e um corte parcial. Registrar moeda, data-base, fuso, filtros e versão RM. A conexão observada não comprova qual período possui dados.
3. Obter relatórios RM de referência de pagar, receber e baixas com os mesmos filtros e horário de extração. Guardar arquivos restritos fora do Git, sem documentos pessoais desnecessários.
4. Executar consultas agregadas limitadas ao período, com timeout. Comparar linhas, títulos distintos, principal, rateio, baixas, encargos, residual e arredondamento.
5. Investigar exemplos selecionados de rateio, baixa parcial, estorno e cancelamento; registrar a composição da diferença, sem ajustar fórmulas para apenas fazer o total coincidir.
6. Registrar resultado por indicador: conciliado, divergente, sem movimento ou sem evidência. Ausência de acesso não equivale a saldo zero.
7. Submeter as regras e diferenças ao responsável financeiro e usar o mesmo recorte na prova de conceito das APIs.

## 5. Ferramenta de inspeção entregue

O comando padrão verifica somente o cadastro central. A seleção de tenant é explícita, sem fallback para outro cliente. A opção legada verifica a configuração `DB_*` separadamente e identifica a associação ao tenant como não confirmada.

```powershell
npm run sources:inspect
node scripts/inspect-sources.mjs --tenant 7
node scripts/inspect-sources.mjs --legacy-env
```

O ID 7 é apenas exemplo; utilizar um ID realmente retornado pelo cadastro. A ferramenta não inicia a aplicação, não executa bootstrap/migrations, não aceita SQL arbitrário, não extrai lançamentos e não cria usuários.

O PostgreSQL usa transação de leitura e rollback. No SQL Server, são executadas apenas consultas fixas ao catálogo e `SELECT TOP (0)` da origem atual, com timeout de oito segundos. `readOnlyIntent` é indicação ao driver, não uma restrição de permissões: as credenciais de consulta devem ter privilégios mínimos definidos no servidor. Nenhuma alteração de privilégios foi feita.

Saída: 0 para todas as verificações solicitadas aprovadas; 2 para inspeção parcial/indisponível; 1 para falha de execução/configuração da chamada. O relatório mantém o resultado individual, inclusive quando SQL Server está acessível e PostgreSQL não. Alguns terminais representam qualquer saída não zero como falha genérica.

## 6. Pendências delimitadas

- Atenza/gestão: acesso seguro ao cadastro central e confirmação da associação da fonte ao cliente. PostgreSQL local continua sendo a base planejada para desenvolvimento, separado do RM dos clientes.
- Leonardo: confirmar cliente piloto, versão/patch RM, coligadas, significado dos campos e relatórios de referência. As duas views observadas já existem nesta fonte; não solicitar recriação sem necessidade. Outros clientes ainda não foram inventariados.
- Integração futura: obter documentação/Swagger e conta restrita do piloto antes de decidir substituir views, conforme [avaliação das APIs](avaliacao-apis-rm-2026-09-17.md).

## 7. Fechamento

Entregues: inventário técnico com evidência de leitura, ferramenta repetível e roteiro de conciliação. Verificação automatizada: 55 testes aprovados, sendo 22 novos para opções, seleção de fonte, leitura, encerramento de conexões e proteção de credenciais nos relatórios.

Compilação normal e verificação TypeScript aprovadas; permanece o aviso de pacote JavaScript acima de 500 kB. Links locais dos novos documentos conferidos e 42 IDs únicos no backlog. Evidência de inspeção confirmada como ignorada pelo Git.

Não concluídos: inventário de todos os tenants, conciliação financeira, benchmark SQL/API, implementação do conector API e aceite do cliente. Sem deploy, migração, alteração em bancos, commit ou push. O bloqueio de auditoria de dependências da etapa anterior permanece, sem nova auditoria nesta rodada.

Próxima etapa sugerida para as fontes atuais: confirmar a associação fonte/cliente e o recorte RM para conciliação. Correção posterior de escopo: o usuário solicitou somente avaliação documental das APIs, não uma prova de conceito. Nenhum piloto API está previsto no fluxo autorizado; seguir o parecer corrigido no documento de avaliação.
