# Equilibrio BI

Dashboard web White Label da Equilibrio TI para acompanhamento financeiro integrado ao TOTVS RM, mantido dentro do padrao de qualidade Atenza.

## Status Atenza

Atualizacao posterior em 25/09/2026: os dez commits da `main` foram conciliados na branch de
colaboracao. Testes unitarios e revisao visual com dados sinteticos aprovados; sem merge na `main`
ou deploy. [Decisoes de integracao e limites](docs/registro-etapa-2026-09-25-integracao-main.md).

Atualizacao de 25/09/2026: o trabalho local validado esta sendo compartilhado na branch `atenza/consolidacao-validada-20260925`, sem merge ou deploy. A `main` remota possui dez commits ausentes da base local; a conciliacao deve preservar as duas linhas de trabalho. Consulte o [guia de colaboracao](CONTRIBUTING.md) e o [registro desta etapa](docs/registro-etapa-2026-09-25-compartilhamento-git.md). A disponibilidade no Git nao significa publicacao em homologacao.

Atualizacao de 21/09/2026: versao validada publicada em [homologacao](https://equilibrio-bi-homologacao.atenza.digital), com backup, banco preparado e HTTPS. [Registro de publicacao, verificacoes e limites](docs/registro-publicacao-hml-2026-09-21.md). Publicacao manual rastreada por hash; CI/CD remoto ainda nao ativado por falta de permissao no repositorio. Trechos historicos abaixo sobre ausencia de alteracao em HML referem-se as etapas anteriores.

Diagnostico inicial realizado em 2026-07-09. O projeto esta em fase de homologacao e parcialmente aderente ao padrao Atenza: compila, usa Git, tem variaveis de ambiente fora do codigo, identidade publica da Equilibrio TI, documentacao viva e pipeline de CI/CD preparado para VPS de homologacao.

Antes de Go-Live/producao, ainda devem ser fechados os dados reais de infraestrutura, secrets, banco, backup, monitoramento e seguranca.

Os documentos tecnicos vivos ficam em `docs/`. Relatorios formais de acompanhamento, aceite, Go-Live, riscos ou sustentacao enviados ao cliente devem continuar sendo gerados pelos templates oficiais Atenza em DOCX/PDF.

## Stack

- Frontend: React, TypeScript, Vite e Recharts.
- Backend: Node.js, Express, JWT e Zod.
- Bancos: PostgreSQL para autenticacao/multiempresa e SQL Server/TOTVS RM para dados financeiros.
- PWA: manifest, service worker e assets da marca Equilibrio TI.

## Requisitos

- Node.js `^20.19.0` ou `>=22.12.0`.
- npm `>=10`.
- PostgreSQL acessivel para o schema de autenticacao.
- SQL Server/TOTVS RM acessivel para cada empresa cadastrada.

## Ambiente local

O desenvolvimento usa o PostgreSQL compartilhado do Docker Desktop: `atenza-postgres-local`, `127.0.0.1:5432`, banco existente `equilibrio_auth`, schema `equilibrio_ti`. Nao criar outro container ou banco para o projeto.

1. Instale dependencias:

```powershell
npm ci
```

2. A configuracao desta maquina esta em `.local/equilibrio-bi/runtime.env`, fora do Git. O `.env` legado foi preservado e nao e usado pelos comandos `local:*` nem por `dev`. Nao executar os comandos genericos `server` ou `db:*` com esse arquivo remoto sem revisar o destino.

3. Confira e inicie o backend local:

```powershell
npm run local:check
npm run local:server
```

4. Em outro terminal, inicie o frontend local: `npm run local:client`. Alternativamente, `npm run dev` inicia os dois processos locais. O acesso inicial fica em `.local/equilibrio-bi/admin.json`; nao enviar esse arquivo, as chaves ou backups pelo Git/WhatsApp.

Preparacao, backup, migrations e testes reais: [PostgreSQL local](docs/postgres-local.md). `local:prepare` gera arquivos apenas se ausentes; `local:migrate` exige autorizacao e faz backup antes das alteracoes; `local:init` cria somente o administrador local, sem empresas demonstrativas. `local:test` usa um schema temporario no mesmo banco, nao acessa RM e nao depende das views.

## Comandos

### Demonstracao local sem banco

```powershell
npm run demo
```

Disponivel em `http://127.0.0.1:5174` quando a porta estiver livre (o Vite informa outra porta se necessario). Usa duas empresas ficticias, perfis simulados, comparativos e cenarios de cobertura. Nao inicia backend, nao usa o `.env` de banco, nao autentica usuarios reais nem certifica os calculos do RM. O modo demonstrativo nao pode ser usado em build de publicacao.

Regras, matriz de acesso e resultados esperados: [contratos da etapa 0](docs/contratos-etapa-0.md). Evolucao planejada: [backlog multiempresa](docs/backlog-evolucao-multiempresa-analytics-2026-09-17.md).

### Inspecao das fontes reais sem iniciar a aplicacao

```powershell
npm run sources:inspect
node scripts/inspect-sources.mjs --tenant 7
node scripts/inspect-sources.mjs --legacy-env
```

O primeiro comando lista o cadastro central em leitura. Nos demais, o ID e apenas exemplo e a configuracao legada nao comprova vinculo com um tenant. A inspecao consulta metadados e valida a consulta atual sem retornar lancamentos; nao executa migrations. Evidencias em `tmp/source-inspection/`, fora do Git. Consulte o [inventario e roteiro de conciliacao](docs/inventario-fontes-conciliacao-2026-09-17.md) e a [avaliacao de APIs RM](docs/avaliacao-apis-rm-2026-09-17.md).

### Testes e compilacao

```powershell
npm run typecheck
npm test
npm run build
npm run audit:high
npm run ci:check
```

Os testes usam bancos simulados e nao aplicam migrations. `db:check` apenas confere as versoes. `db:migrate` altera o schema e `db:init` tambem pode criar os cadastros iniciais; ambos exigem destino confirmado e autorizacao. Iniciar a aplicacao nao altera banco nem cria usuarios.

### Logos e auditoria administrativa

O painel administrativo inclui consulta de auditoria com filtros e detalhes por evento. A consulta nao e disponibilizada para clientes. Uploads aceitam PNG/JPEG/WebP reais ate 2 MB e 4096 x 4096 pixels, publicados como WebP normalizado. Referencias externas de logo sao bloqueadas; usar envio ou caminho de imagem local. O valor legado nao e alterado automaticamente. [Implementacao, verificacoes e limites](docs/registro-etapa-2026-09-17-logos-auditoria.md).

### Interpretacao dos indicadores

Os agregados atuais operam sobre linhas das views, ainda sem chave/granularidade conciliada. Contagem de registros nao equivale a titulos unicos, e rateio menos baixa nao e saldo residual certificado. Medias preservam fracao e razoes sem base positiva aparecem indisponiveis. Consulte o [catalogo de formulas, datas e limites](docs/catalogo-indicadores-backend-2026-09-18.md) e o [registro da revisao](docs/registro-etapa-2026-09-18-indicadores.md).

### Estados das consultas

O painel separa carregamento, falha, sucesso sem registros e zero real por bloco. Nova tentativa recupera somente a consulta afetada; mudar filtros descarta resultados e respostas anteriores. O horario global indica conclusao das consultas, nao frescor do RM ou snapshot comum. Consistencia temporal entre blocos permanece pendente. [Implementacao, verificacoes e limites](docs/registro-etapa-2026-09-18-estados-painel.md).

### Comparativos temporais

O [contrato comparison-v1](docs/contrato-comparativos-2026-09-18.md) possui motor compartilhado para periodos, cobertura, compatibilidade de contexto e variacoes decimais. Diferenca de duracao, base zero/negativa e pontos percentuais possuem regras explicitas. Ainda nao ha ativacao numerica nas rotas RM: faltam metadados confiaveis de cobertura/carga e, para estoque, posicao historica reconstruida. [Registro de implementacao e testes](docs/registro-etapa-2026-09-18-comparativos.md).

Os cards KPI agora oferecem ajuda com formula, origem, unidade, referencia temporal e limites. Os controles de comparacao mostram periodos planejados e motivos de indisponibilidade sem consultar novamente o RM. Alteracoes de datas so afetam a leitura depois de aplicar filtros. [Ajuda operacional, estados e verificacoes](docs/registro-etapa-2026-09-18-ajuda-indicadores.md).

Graficos preservam zero, negativos e dados ausentes, sem fatias artificiais. Series interrompem lacunas internas; matriz distingue sinais e indisponibilidade. Todas as familias oferecem tabela de valores retornados e filtros aplicaveis por teclado; ampliacao possui foco/Escape. Isso nao certifica cobertura nem corrige zeros ja agregados na origem. [Verificacoes e limites dos graficos](docs/registro-etapa-2026-09-18-graficos.md).

O login nao carrega previamente painel, administracao ou graficos. Esses modulos, tabelas e auditoria sao carregados quando utilizados, com estado de falha e recarga explicita. O build inclui limites automaticos de tamanho (`npm run bundle:check`). A entrada passou de 727 kB para 208 kB de JavaScript; isso nao implica igual reducao no painel completo ou nas consultas RM. [Medicoes, testes e limites](docs/registro-etapa-2026-09-18-carregamento.md).

### Cache e atualizacao web

O service worker nao grava novos conteudos em CacheStorage e limpa apenas o cache legado do Equilibrio BI ao ativar. Offline apresenta aviso neutro, sem restaurar dados financeiros. HTML nao e armazenado; JS/CSS versionados podem usar cache HTTP, enquanto recursos sem hash sao revalidados. Arquivos ausentes retornam erro, nunca o HTML da aplicacao. [Politica, testes e limites](docs/registro-etapa-2026-09-21-cache-atualizacao.md). Validacao no proxy/navegadores de homologacao continua pendente.

### Exportacoes financeiras

O Excel contem todas as linhas do recorte consultado ate 5.000 registros. Acima disso, a aplicacao solicita filtros mais restritos e nao entrega arquivo parcial. A tabela envia sua pesquisa e ordenacao; mudar o recorte cancela downloads pendentes no navegador. O arquivo usa uma lista fixa de 22 colunas, independentemente das colunas ocultadas na tela. [Verificacoes e limites conhecidos](docs/registro-etapa-2026-09-18-exportacoes.md).

### Filtros e paginacao

Datas usam calendario real em `AAAA-MM-DD`, inicio inclusivo e fim inclusivo pelo limite exclusivo do dia seguinte. Intervalos invertidos e campos desconhecidos sao recusados. Os atalhos de mes/ano terminam hoje no calendario do navegador; filtrar o passado nao reconstroi saldo historico. [Contrato temporal e verificacoes](docs/registro-etapa-2026-09-18-datas-periodos.md).

Selecoes multiplas preservam nomes completos, inclusive virgulas, por parametros repetidos como `clientes[]=Nome%2C+Matriz`. Formato antigo separado por virgulas continua aceito sem reinterpretacao; misturar os dois formatos no mesmo filtro e invalido. Tabela e export compartilham ordenacao. Ordenar reinicia a pagina; se o total diminuir, a interface recua para uma pagina valida. Desempates usam campos existentes, mas a chave unica da origem e o snapshot ainda precisam de confirmacao. [Contrato e testes](docs/registro-etapa-2026-09-18-filtros-paginacao.md).

### Sessoes e isolamento

Cada requisicao autenticada confere usuario, perfil, vinculo, empresa ativa e revogacao no PostgreSQL. Clientes nao podem selecionar outra empresa. Somente o administrador geral seleciona clientes ativos. Logout revoga o token atual; troca/reset de senha e edicao do usuario invalidam as sessoes anteriores. Indisponibilidade da autenticacao bloqueia consultas, inclusive resultados em cache.

As migrations 002 e 003 foram aplicadas somente no PostgreSQL local em 17/09/2026. Ao publicar essa versao, os tokens anteriores exigirao novo login. Homologacao continua sem atualizacao nesta etapa. Consulte o [registro de seguranca e entrega](docs/registro-etapa-2026-09-17-autorizacao-entrega.md).

## CI/CD

O CI esta em `.github/workflows/ci.yml` e executa instalacao limpa, testes, typecheck, build e auditoria de vulnerabilidades altas/criticas. Em pushes na `main`, tambem publica um artefato com `dist`, `server` e arquivos de instalacao.

O CD esta em `.github/workflows/cd-vps.yml` e faz deploy em VPS de homologacao por SSH com releases versionados, symlink `current`, healthcheck e rollback automatico em caso de falha local. O rollback manual esta em `.github/workflows/rollback-vps.yml`.

Para ativar a homologacao, cadastrar os secrets no environment `homologation` do GitHub usando `atenza-hml-apps-01.atenza.cloud` como `VPS_HOST` e preparar `shared/.env` fora do Git. Detalhes em `docs/infraestrutura-cicd.md` e `docs/checklist-ativacao-cicd-vps.md`.

## Documentacao do projeto

- `docs/diagnostico-aderencia-atenza.md`
- `docs/backlog-adequacao-atenza.md`
- `docs/infraestrutura-cicd.md`
- `docs/checklist-ativacao-cicd-vps.md`
- `docs/postgres-local.md`
- `docs/roteiro-testes.md`
- `docs/perfis-permissoes.md`
- `docs/riscos.md`
- `docs/registro-etapa-2026-07-09.md`

## Seguranca

Protecao das credenciais e auditoria: [procedimento de operacao](docs/credenciais-auditoria-operacao.md). A versao atual exige migrations 002/003, chaves de credenciais configuradas e conversao autorizada das senhas legadas. `db:check` verifica essas condicoes sem escrever; `db:credentials` sem argumentos apenas inventaria. O banco local recebeu migrations e chaves; estava sem empresas, portanto nenhuma credencial real precisou ser convertida. Nada foi aplicado na homologacao.

LGPD e requisito de desenvolvimento, homologacao e producao. Consulte o [plano de adequacao e inventario](docs/lgpd-plano-adequacao.md). Responsabilidades contratuais e canal de privacidade ainda precisam ser definidos; nao ha declaracao de conformidade integral.

O arquivo `.env` nao deve ser versionado. O `.env.example` contem apenas placeholders. Antes de Go-Live, revisar obrigatoriamente as pendencias de seguranca registradas em `docs/backlog-adequacao-atenza.md` e `docs/riscos.md`.
