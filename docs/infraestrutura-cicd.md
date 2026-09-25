# Infraestrutura e CI/CD - Equilibrio BI

> Atualizacao 25/09/2026: consulte a [revisao vigente](revisao-cicd-2026-09-25.md).
> CD desativado por padrao, destino restrito, sem migrations, sem keyscan e sem limpeza
> automatica. Os exemplos abaixo sao historicos e nao devem ser executados como roteiro atual.

Data: 2026-07-14

Atualizacao 21/09/2026: homologacao publicada manualmente em https://equilibrio-bi-homologacao.atenza.digital, servico `equilibrioti.service`, porta interna 3032, releases em `/var/www/equilibrio-bi-hml`. Migrations 001/002/003 e conversao das credenciais aplicadas com backup e autorizacao. O workflow ainda nao foi ativado; a conta GitHub atual nao tem escrita no remoto. [Estado real e limites](registro-publicacao-hml-2026-09-21.md). Exemplos/pendencias anteriores abaixo sao historicos e devem ser reconciliados antes de configurar o CD.

## Estado atual

O repositorio possui CI e CD configurados por GitHub Actions para a fase de homologacao.

O CI esta em `.github/workflows/ci.yml` e executa:

1. Checkout do codigo.
2. Setup Node.js 22.
3. `npm ci`.
4. `npm run ci:check`.
5. Publicacao do artefato `equilibrio-bi-build` em push para `main`.

O `ci:check` executa:

1. Testes automatizados.
2. Typecheck e build otimizado.
3. Auditoria de vulnerabilidades altas/criticas.

O CD esta em `.github/workflows/cd-vps.yml` e executa deploy na VPS de homologacao quando:

1. O workflow `CI` termina com sucesso na branch `main`.
2. O deploy e acionado manualmente por `workflow_dispatch`.

O rollback manual de homologacao esta em `.github/workflows/rollback-vps.yml`.

## Modelo de deploy implementado

O deploy para a VPS de homologacao usa SSH e releases versionados.

Fluxo:

1. GitHub Actions valida o codigo com `npm run ci:check`.
2. Um pacote `.tar.gz` e gerado com `dist`, `server`, `package.json`, `package-lock.json` e `.env.example`.
3. O pacote e enviado para a VPS por SSH/SCP.
4. A VPS cria uma pasta em `releases/<sha>-<run_number>`.
5. O release usa o `.env` de homologacao localizado em `shared/.env`, fora do Git.
6. Uploads persistentes ficam em `shared/uploads/empresas`.
7. O symlink `current` passa a apontar para o release novo.
8. O processo e reiniciado por `VPS_RESTART_COMMAND`, systemd ou PM2.
9. O endpoint `/api/health` e validado.
10. Se o healthcheck local falhar, o script tenta rollback automatico para o release anterior.

## Estrutura esperada na VPS

Exemplo usando `/var/www/equilibrio-bi-hml`:

```text
/var/www/equilibrio-bi-hml
|-- current -> releases/<release-ativo>
|-- releases
|   |-- <release-1>
|   `-- <release-2>
`-- shared
    |-- .env
    `-- uploads
        `-- empresas
```

O arquivo `shared/.env` deve ser criado manualmente na VPS antes do primeiro deploy real.

## Secrets obrigatorios no GitHub

Configurar no environment `homologation` em `Settings > Secrets and variables > Actions`.

Host de homologacao mapeado:

- `atenza-hml-apps-01.atenza.cloud`

Obrigatorios:

- `VPS_HOST`: `atenza-hml-apps-01.atenza.cloud`.
- `VPS_USER`: usuario SSH usado no deploy.
- `VPS_SSH_KEY`: chave privada SSH do deploy.
- `VPS_APP_PATH`: caminho da aplicacao na VPS de homologacao, por exemplo `/var/www/equilibrio-bi-hml`.

Recomendados:

- `VPS_PORT`: porta SSH. Se vazio, usa `22`.
- `VPS_SSH_KNOWN_HOSTS`: fingerprint conhecido da VPS. Se vazio, o workflow usa `ssh-keyscan`.
- `VPS_SERVICE_NAME`: nome do servico systemd/PM2. Se vazio, usa `equilibrio-bi-hml`.
- `VPS_RESTART_COMMAND`: comando customizado de restart, por exemplo `sudo systemctl restart equilibrio-bi-hml`.
- `APP_HEALTHCHECK_URL`: URL publica de healthcheck da homologacao, por exemplo `https://hml.dominio.com.br/api/health`.

Se o restart usar `sudo systemctl`, o usuario de deploy precisa permissao para reiniciar o servico sem interacao de senha, ou o deploy ficara travado/falhara no GitHub Actions.

## Variaveis do `.env` de homologacao

Variaveis esperadas em `/var/www/equilibrio-bi-hml/shared/.env`:

- `NODE_ENV=production`
- `APP_ENV=homologation`
- `SERVER_PORT`
- `CORS_ORIGIN`
- `JWT_SECRET`
- `AUTH_DB_HOST`
- `AUTH_DB_PORT`
- `AUTH_DB_DATABASE`
- `AUTH_DB_SCHEMA`
- `AUTH_DB_USER`
- `AUTH_DB_PASSWORD`
- `AUTH_RATE_LIMIT_WINDOW_MS`
- `AUTH_RATE_LIMIT_MAX`
- `LOGO_UPLOAD_MAX_BYTES`
- `SEED_DEMO_TENANT`
- `SEED_DEMO_USER_PASSWORD`, apenas se seed demo for usado em ambiente controlado.

Observacao: `NODE_ENV=production` aqui e uma configuracao tecnica para executar o build otimizado e servir o `dist`. O ambiente do projeto continua sendo homologacao.

As credenciais SQL Server/TOTVS dos clientes devem ser cadastradas por processo controlado. Nao devem ser colocadas no repositorio nem nos logs do pipeline.

## Primeiro deploy de homologacao

1. Criar usuario SSH de deploy na VPS.
2. Configurar chave publica em `~/.ssh/authorized_keys`.
3. Criar a pasta base da aplicacao:

```bash
sudo mkdir -p /var/www/equilibrio-bi-hml/shared/uploads/empresas
sudo chown -R <usuario-deploy>:<grupo> /var/www/equilibrio-bi-hml
```

4. Criar `/var/www/equilibrio-bi-hml/shared/.env` com as variaveis reais de homologacao.
5. Configurar systemd ou PM2.
6. Configurar Nginx/Caddy/Traefik com HTTPS e proxy para `SERVER_PORT`.
7. Cadastrar os secrets no environment `homologation` do GitHub.
8. Rodar manualmente `CD - VPS Homologacao` pelo GitHub Actions.
9. Validar `/api/health`, login, dashboard e exportacao.

## Systemd

Existe um exemplo em `deploy/systemd/equilibrio-bi.service`.

Fluxo sugerido na VPS:

```bash
sudo cp deploy/systemd/equilibrio-bi.service /etc/systemd/system/equilibrio-bi-hml.service
sudo systemctl daemon-reload
sudo systemctl enable equilibrio-bi-hml
sudo systemctl start equilibrio-bi-hml
```

Antes de usar, ajustar `User`, `Group`, `WorkingDirectory` e caminho do `npm` conforme a VPS.

## Migrations

Por padrao, o CD nao executa migrations automaticamente.

Atualizacao de 17/09/2026: o inicio normal do backend tambem nao executa migrations nem seed. O deploy agora executa `npm run db:check` antes de trocar a release ativa, bloqueando a publicacao se o banco nao estiver preparado. A migration 002 de sessoes/empresas esta preparada no repositorio, mas nao foi executada.

No deploy manual pelo GitHub Actions, o input `run_migrations` pode ser marcado como `true` para executar:

```bash
npm run db:migrate
```

Usar com cuidado mesmo em homologacao e preferir backup antes de migrations que alterem estrutura.

## Rollback

O rollback pode ser feito pelo workflow `Rollback - VPS Homologacao`.

Opcoes:

1. Informar um `release_id` especifico.
2. Deixar vazio para voltar ao release anterior ao atual.

O rollback troca o symlink `current`, reinicia o processo e valida `/api/health`.

O deploy automatizado passou a recuperar o link anterior e tentar reinicia-lo tambem quando o proprio comando de restart falha. A copia por SCP usa `-P` para a porta, enquanto SSH usa `-p`. Os testes locais exercitam falhas por comandos controlados; nenhum deploy ou rollback real foi executado nesta etapa.

Rollback de codigo nao reverte migrations. Antes de ativar a migration 002, aprovar backup, janela e estrategia de reversao. Voltar a codigo anterior tambem remove as novas verificacoes de sessao, portanto nao considerar equivalentes as garantias de seguranca.

## Desenvolvimento local com PostgreSQL

O desenvolvimento local deve usar PostgreSQL na maquina do desenvolvedor para a base de autenticacao.

O banco de homologacao nao deve ser dependencia do fluxo local, pois pode estar bloqueado para acesso externo.

Referencias:

- `docs/postgres-local.md`
- Comando: `npm run db:migrate`

## Pendencias fora do pipeline

Mesmo com CI/CD de homologacao implementado, ainda dependem de decisao/infraestrutura:

1. Dominio ou subdominio de homologacao.
2. Certificado HTTPS.
3. Politica de acesso SSH.
4. Caminho definitivo para aplicacoes Atenza na VPS.
5. Backup do PostgreSQL de autenticacao.
6. Backup do volume de uploads.
7. Monitoramento de uptime, disco, CPU, memoria e logs.
8. Estrategia segura para credenciais dos bancos dos clientes.
9. Pipeline separado de producao/Go-Live, quando o projeto sair da homologacao.
