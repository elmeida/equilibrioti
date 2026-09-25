# Backlog de adequacao Atenza - Equilibrio BI

Data de abertura: 2026-07-09  
Criticidade geral: alta antes de Go-Live

## Prioridade 0 - antes de producao

| Item | Tipo | Responsavel sugerido | Status |
|---|---|---|---|
| Exigir `JWT_SECRET`, `AUTH_ADMIN_PASSWORD` e credenciais de banco em producao, sem fallback inseguro. | Seguranca | Desenvolvimento | Atendido inicial; validar em homologacao |
| Remover ou proteger seeds com usuarios/senhas padrao em `server/auth/init.js`. | Seguranca | Desenvolvimento | Atendido inicial; seed demo condicionado |
| Restringir CORS por `CORS_ORIGIN` e ambiente. | Seguranca | Desenvolvimento/Infra | Atendido inicial; validar dominio final |
| Adicionar rate limit em login, troca/reset de senha e rotas administrativas. | Seguranca | Desenvolvimento | Atendido inicial |
| Remover token em query string na exportacao ou trocar por fluxo autenticado seguro. | Seguranca | Desenvolvimento | Atendido |
| Validar upload de logos por tipo, tamanho e extensao; armazenar em volume persistente. | Seguranca/Infra | Desenvolvimento/Infra | Atendido inicial; volume depende da VPS |
| Avaliar criptografia de `db_password` dos tenants ou uso de cofre de segredos. | Seguranca | Desenvolvimento/Infra | Pendente |
| Definir dominio, HTTPS, reverse proxy e porta publica na VPS. | Infra | Infra Atenza | Pendente |
| Criar `.env` de homologacao diretamente na VPS ou em secret manager, nunca no Git. | Infra/Seguranca | Infra Atenza | Pendente |
| Definir processo de execucao na VPS: systemd, PM2 ou container. | Infra | Infra Atenza | Pendente |
| Definir backup do PostgreSQL de autenticacao e do volume `server/uploads`. | Sustentacao | Infra Atenza | Pendente |

## Prioridade 1 - homologacao controlada

| Item | Tipo | Responsavel sugerido | Status |
|---|---|---|---|
| Criar deploy automatico para homologacao apos definir VPS e secrets. | CI/CD | Desenvolvimento/Infra | Atendido inicial; falta cadastrar secrets e validar em VPS real |
| Criar rollback documentado com artefato anterior. | CI/CD | Desenvolvimento/Infra | Atendido inicial; workflow manual criado |
| Criar migrations versionadas para o schema PostgreSQL. | Banco | Desenvolvimento | Atendido inicial |
| Documentar API interna com rotas, parametros e respostas principais. | Documentacao | Desenvolvimento | Pendente |
| Criar testes automatizados minimos para login, permissao e rotas principais. | Qualidade | Desenvolvimento | Atendido inicial; ampliar cobertura |
| Criar politica de privacidade/LGPD para publicacao se houver acesso externo. | LGPD | Atenza/Cliente | Pendente |
| Definir plano de sustentacao com responsaveis, SLA, backup e incidentes. | Operacao | Atenza | Pendente |
| Configurar logs estruturados e identificador de requisicao. | Observabilidade | Desenvolvimento | Pendente |
| Monitorar uptime, erros e espaco em disco da VPS. | Observabilidade | Infra Atenza | Pendente |
| Reaproveitar PostgreSQL compartilhado local e rodar migrations. | Infra dev | Desenvolvimento | Preparado em 17/09/2026: banco existente, migrations 001-003, runtime separado e testes integrados; restore completo pendente |

## Prioridade 2 - melhoria continua

| Item | Tipo | Responsavel sugerido | Status |
|---|---|---|---|
| Reduzir bundle inicial com code splitting. | Performance | Desenvolvimento | Pendente |
| Adicionar testes E2E dos fluxos criticos. | Qualidade | Desenvolvimento | Pendente |
| Revisar responsividade visual com evidencias em desktop/tablet/mobile. | UI/UX | Desenvolvimento | Pendente |
| Padronizar mensagens de erro e empty states restantes. | UI/UX | Desenvolvimento | Pendente |
| Gerar relatorios formais Atenza quando houver marco de acompanhamento, homologacao ou Go-Live. | Documentacao formal | Atenza | Sob demanda |

## Observacoes

- O CI inicial foi criado com auditoria em nivel alto porque o npm ainda aponta vulnerabilidade moderada em `exceljs`/`uuid` cuja correcao automatica exige mudanca potencialmente quebradica.
- Nao executar `npm audit fix --force` sem validar impacto de exportacao Excel.
- CI/CD para VPS de homologacao foi implementado com GitHub Actions, releases versionados, healthcheck e rollback. A ativacao real ainda depende de dominio/subdominio de homologacao, usuario SSH, caminho, processo, `.env` de homologacao e politica de acesso.
