# PostgreSQL local para desenvolvimento

Data inicial: 2026-07-09. Atualizacao: 2026-09-17.

## Contexto

O banco usado anteriormente era de homologacao e pode ficar bloqueado para acesso externo. A partir desta adequacao, o desenvolvimento local deve usar um PostgreSQL instalado na maquina do desenvolvedor para autenticacao, usuarios, empresas e configuracao dos tenants.

Esse PostgreSQL local nao substitui o SQL Server/TOTVS RM dos clientes. Ele guarda apenas a base operacional do Equilibrio BI.

## Banco existente confirmado em 17/09/2026

- Container compartilhado: `atenza-postgres-local`, Docker Desktop local.
- Host: `127.0.0.1` (porta publicada somente em loopback)
- Porta: `5432`
- Database: `equilibrio_auth`
- Schema: `equilibrio_ti`
- Proprietario preservado: `equilibrio_auth_user`; senha e privilegios anteriores nao alterados.
- Usuario da aplicacao: `equilibrio_app`, sem propriedade, superusuario, criacao de banco/schema ou administracao de papeis.
- Migrations 001, 002 e 003 aplicadas. Encontrado vazio; apos preparacao, zero empresas e um administrador local.

## Operacao nesta maquina

Nao criar outro container, banco ou volume. O rascunho de Compose separado foi removido antes de qualquer execucao. O `.env` antigo aponta para ambiente remoto e foi preservado; os comandos `local:*` usam exclusivamente `.local/equilibrio-bi/runtime.env`.

```powershell
npm run local:check
npm run local:test
npm run dev
```

`dev` inicia backend local em 127.0.0.1:3001 e frontend em 127.0.0.1:5175 (Vite escolhe outra porta se ocupada). Tambem podem ser iniciados separadamente com `local:server` e `local:client`. A senha inicial esta em `.local/equilibrio-bi/admin.json`; nao e exibida em logs ou registrada no Git. Nao ha empresas ficticias no schema de desenvolvimento nem importacao de clientes reais.

### Preparacao autorizada

Os comandos abaixo ja foram executados nesta maquina. Nao repetir `local:prepare`: ele recusa sobrescrever configuracao existente e nunca rotaciona segredos silenciosamente.

```powershell
npm run local:prepare
npm run local:migrate
npm run local:init
```

`local:prepare`: gera senha exclusiva, JWT e chave AES locais; restringe a ACL do diretorio ao usuario Windows atual antes de gravar. Nenhuma senha do PostgreSQL compartilhado e lida ou trocada. Arquivos fora do Git; ACL local nao equivale a cofre externo nem substitui protecao do disco/host.

`local:migrate`: confirma Docker Desktop, container, porta, database e proprietario. Faz backup custom do banco `equilibrio_auth`, confere catalogo e SHA-256, aplica migrations em transacao com bloqueio e preserva o proprietario. Cria o papel runtime se ausente; caso exista, exige a credencial local e perfil restrito, sem redefinir senha. Concede acesso apenas aos objetos necessarios do projeto, sem alterar bancos de outros projetos. Exige autorizacao previa para cada nova intervencao.

`local:init`: cria somente o administrador local e seu evento de auditoria em transacao; nao altera senha de conta existente. Nao habilita seed de empresas.

O runtime pode ler/inserir auditoria, mas UPDATE, DELETE e TRUNCATE sao negados. O proprietario e superusuarios continuam tecnicamente capazes de alterar dados; nao e armazenamento imutavel. O papel e dedicado, mas esta em um cluster compartilhado: privilegios PUBLIC de outros bancos nao foram modificados nem auditados integralmente.

### Backup e recuperacao

Backups e manifestos SHA-256 ficam em `.local/equilibrio-bi/backups/`; evidencias em `database-result.json` e `integration-result.json`. O catalogo do backup foi validado; restauracao completa ainda precisa de ensaio em destino descartavel previamente autorizado. Nao restaurar por cima do banco ativo sem aprovacao. Preservar chaves junto da estrategia de recuperacao, com acesso restrito e copia protegida independente; retencao ainda depende de definicao da gestao. Nao enviar esses arquivos a repositorios ou mensageria.

### Testes integrados

`local:test` confirma o mesmo destino, cria um schema aleatorio `equilibrio_test_<id>`, aplica migrations e executa 14 grupos de verificacoes com PostgreSQL real e HTTP local. Usa apenas cadastros sinteticos nesse schema, bloqueia conexoes SQL Server durante o teste e remove somente o schema que a propria execucao criou. Testa isolamento de acesso, cifragem por tenant, revogacao, privilegios de auditoria, rollback transacional e paginacao. Nao certifica calculos financeiros, RM, TLS remoto ou CI/CD publicado.

## Comandos genericos para outros ambientes

Os comandos `db:*` abaixo usam a configuracao selecionada por `DOTENV_CONFIG_PATH` ou `.env`. Nao usar o `.env` legado desta maquina para operacao local. Eles continuam disponiveis para operacao controlada, apos confirmar ambiente e autorizacao.

## Rodar migrations

Com o `.env` configurado:

```powershell
npm run db:migrate
```

Esse comando altera o banco: cria o schema, a tabela de controle `schema_migrations`, as tabelas `empresas` e `usuarios`, os indices e as estruturas das migrations posteriores. Executar somente depois de confirmar destino e autorizar a preparacao. Nesta etapa, somente o banco local recebeu as migrations, por `local:migrate`.

A migration 002 acrescenta versao de sessao no usuario, estado ativo da empresa e tabela de sessoes revogadas. Bancos existentes receberao empresas ativas por padrao; validar os cadastros antes da liberacao. Tokens antigos nao sao aceitos pela nova versao.

## Criacao do admin local

O servidor nao executa mais migrations ou bootstrap ao iniciar. Para a preparacao explicita de um banco local novo, com `AUTH_ADMIN_PASSWORD` preenchido e autorizacao para executar migrations/cadastro inicial:

```powershell
npm run db:init
```

Esse comando aplica migrations e cria o admin apenas se ainda nao existir. Com senha vazia em desenvolvimento, nao cria o admin. Para conferir sem escrever no banco, use `npm run db:check`. O servidor recusa iniciar quando houver migration pendente.

## Seed demo

O seed demo de empresa/usuario fica desligado por padrao.

Para habilitar em ambiente local controlado:

```env
SEED_DEMO_TENANT=true
SEED_DEMO_USER_PASSWORD=senha-local-do-usuario-demo
DB_HOST=localhost-ou-host-sqlserver-dev
DB_PORT=1433
DB_DATABASE=base_demo
DB_USER=usuario_demo
DB_PASSWORD=senha-local-do-sqlserver-demo
```

Nao habilitar seed demo em producao. A flag so e consumida pelo comando explicito `db:init`, nao pelo inicio normal da aplicacao. Manter desligada no desenvolvimento com clientes reais.

## Validacoes

```powershell
npm test
npm run db:check
npm run dev
```

O `npm test` nao depende do PostgreSQL local: cobre rotas com bancos simulados, contexto do navegador e scripts de entrega sem VPS. A validacao integrada e separada, por `npm run local:test`, e ja foi executada no banco compartilhado local. Nao reabrir o PostgreSQL remoto publicamente para substituir o ambiente local.
