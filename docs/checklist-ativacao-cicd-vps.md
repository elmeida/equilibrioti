# Checklist de ativacao CI/CD - VPS de homologacao

Data: 2026-07-14

Atualizacao 21/09/2026: publicacao manual de homologacao concluida em infraestrutura existente, com SSH, backup, migrations, runtime restrito e HTTPS. O checklist abaixo e historico do plano de CI/CD, nao evidencia de execucao do workflow. GitHub permanece sem acesso de escrita pela conta atual. Consulte o [registro atual](registro-publicacao-hml-2026-09-21.md) antes de executar preparacao ou migrations novamente.

## GitHub

- [ ] Confirmar que `.github/workflows/ci.yml` esta versionado na branch principal.
- [ ] Confirmar que `.github/workflows/cd-vps.yml` esta versionado na branch principal.
- [ ] Confirmar que `.github/workflows/rollback-vps.yml` esta versionado na branch principal.
- [ ] Criar environment `homologation` no GitHub.
- [ ] Se aplicavel, exigir aprovacao manual para deploy no environment `homologation`.
- [ ] Cadastrar secrets obrigatorios: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_APP_PATH`.
- [ ] Cadastrar secrets recomendados: `VPS_PORT`, `VPS_SSH_KNOWN_HOSTS`, `VPS_SERVICE_NAME`, `VPS_RESTART_COMMAND`, `APP_HEALTHCHECK_URL`.

## VPS

- [ ] Confirmar acesso SSH ao host `atenza-hml-apps-01.atenza.cloud`.
- [ ] Criar usuario de deploy.
- [ ] Cadastrar chave publica em `authorized_keys`.
- [ ] Criar pasta base da aplicacao, preferencialmente `/var/www/equilibrio-bi-hml`.
- [ ] Criar `shared/.env` de homologacao fora do Git.
- [ ] Configurar processo com systemd ou PM2.
- [ ] Configurar HTTPS e reverse proxy.
- [ ] Validar acesso local ao PostgreSQL de autenticacao.
- [ ] Validar que `/api/health` responde localmente na VPS.
- [ ] Configurar backup de banco e uploads.

## Primeiro deploy

- [ ] Executar workflow `CI` ou abrir PR para validar quality gate.
- [ ] Executar workflow `CD - VPS Homologacao` manualmente.
- [ ] Validar artefato implantado na VPS.
- [ ] Validar `/api/health`.
- [ ] Validar login.
- [ ] Validar dashboard.
- [ ] Validar exportacao.
- [ ] Registrar deploy no historico do projeto/CRM quando aplicavel.

## Rollback

- [ ] Confirmar que existem pelo menos dois releases na pasta `releases`.
- [ ] Testar workflow `Rollback - VPS Homologacao` em ambiente controlado.
- [ ] Registrar procedimento operacional para rollback em homologacao.
