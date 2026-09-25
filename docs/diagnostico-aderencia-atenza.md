# Diagnostico de aderencia Atenza - Equilibrio BI

Data: 2026-07-09  
Projeto: Equilibrio BI / Equilibrio TI  
Tipo: dashboard web White Label com API propria  
Referencia: `C:\Projetos\Documentações\00_Guias\_INSTRUCAO_RAPIDA_DOCUMENTACAO_ATENZA_ANEXAR.md`

## Resultado executivo

O projeto esta parcialmente aderente ao padrao Atenza.

Pontos positivos: a base compila, esta em Git, usa variaveis de ambiente, possui interface White Label da Equilibrio TI, tem autenticacao, perfis, filtros, dashboard, exportacao, PWA e separacao entre frontend/backend.

Lacunas tratadas nesta etapa: documentacao viva em `docs/`, README, changelog, `.env.example` saneado, scripts de qualidade, workflow de CI, workflow de CD para VPS, rollback manual e hardening inicial de seguranca sem dependencia da VPS.

Lacunas ainda pendentes antes de producao: validacao do CD em VPS de homologacao, cadastro de secrets, hardening de seguranca restante, observabilidade, backup, HTTPS/dominio, CORS com dominio final, tratamento seguro de credenciais de tenants e validacao com bancos reais.

## Aderencia por criterio

| Criterio Atenza | Status | Evidencia / acao |
|---|---:|---|
| Git oficial e historico | Parcial | Repositorio Git em `origin https://github.com/elmeida/equilibrioti.git`; sem branch/PR de adequacao nesta etapa. |
| README com instrucoes | Atendido | `README.md` criado. |
| Documentacao viva em `docs` | Atendido inicial | Diagnostico, backlog, riscos, perfis, testes, infraestrutura e registro da etapa criados. |
| `.env.example` sem segredo real | Atendido inicial | Valores reais removidos e placeholders documentados. |
| Credenciais fora do Git | Atendido inicial | `.env` esta ignorado e nao versionado; runtime em modo `production` bloqueia `JWT_SECRET` fraco/padrao e `AUTH_ADMIN_PASSWORD` ausente/padrao. |
| Build validado | Atendido | `npm run build` executado com sucesso. |
| Auditoria de dependencias | Parcial | Vulnerabilidades altas/criticas corrigidas; restou risco moderado em `exceljs`/`uuid`. |
| CI/CD | Atendido inicial | `.github/workflows/ci.yml`, `.github/workflows/cd-vps.yml` e `.github/workflows/rollback-vps.yml` criados. Ativacao real depende dos secrets e da VPS. |
| White Label Equilibrio TI | Atendido inicial | Interface, manifest, favicon e textos publicos usam Equilibrio BI/Equilibrio TI. |
| Documentos formais Atenza | Pendente sob demanda | Relatorios formais devem ser gerados pelos templates oficiais Atenza quando houver envio ao cliente/CRM. |
| Login, perfis e permissoes | Parcial | Perfis `admin` e `cliente` existem; matriz inicial criada e rotas sensiveis possuem rate limit inicial. |
| LGPD e privacidade | Pendente | Projeto trata usuarios, credenciais e dados financeiros; exige politica/processo antes de publicacao externa. |
| Deploy com rollback | Atendido inicial | CD por SSH com releases versionados, symlink `current`, healthcheck e rollback manual. Falta validar em VPS real. |
| Observabilidade | Pendente | Logs basicos existem; faltam logs estruturados, monitoramento, alertas e rotina de incidente. |

## Tecnologias identificadas

- React 19, TypeScript, Vite 7, Recharts e Lucide React.
- Node.js com Express 5, JWT, bcryptjs e Zod.
- PostgreSQL para autenticacao, empresas e usuarios.
- SQL Server via `mssql` para dados financeiros por empresa.
- PWA com `manifest.webmanifest` e `public/sw.js`.

## Telas e fluxos identificados

- Login.
- Painel administrador.
- Cadastro de empresas/tenants.
- Cadastro de usuarios.
- Impersonacao/acesso ao painel de cliente pelo administrador.
- Dashboard financeiro com abas de visao geral, fluxo, pagar/receber, vencidos, rankings, inconsistencias e tabela analitica.
- Filtros globais, filtros contextuais, exportacao e troca de senha.

## Pontos de atencao

1. `server/auth/init.js` agora bloqueia senha admin padrao no runtime em modo `production` e deixa seed demo condicionado ao ambiente/configuracao.
2. `server/auth/middleware.js` agora bloqueia `JWT_SECRET` ausente/fraco/padrao no runtime em modo `production`.
3. `server/index.js` restringe CORS por `CORS_ORIGIN`; validar origem final na VPS.
4. A exportacao passou a usar `fetch` autenticado com header `Authorization`, sem token na query string.
5. Upload de logos agora possui limite de tamanho e aceita apenas PNG, JPG ou WebP.
6. Senhas de banco dos tenants ainda sao armazenadas em texto no PostgreSQL; avaliar criptografia/secret manager.
7. Ha testes automatizados iniciais para health, CORS, autenticacao, permissao admin e payload invalido; cobertura ainda deve ser ampliada.
8. Deploy e rollback de homologacao foram automatizados em GitHub Actions, mas dependem de ativacao com secrets e validacao em VPS real.
9. Backup e observabilidade ainda dependem da organizacao das VPSs.

## Conclusao

O projeto esta em boa base tecnica, mas ainda nao deve ser tratado como pronto para producao Atenza sem validacao em VPS real, hardening restante, backup, observabilidade e banco real. A partir desta adequacao, o repositorio ficou preparado para acompanhamento, CI/CD e evolucao controlada.
