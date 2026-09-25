# Matriz de riscos - Equilibrio BI

Data: 2026-07-09

| Risco | Severidade | Situacao atual | Mitigacao recomendada | Responsavel sugerido |
|---|---:|---|---|---|
| Segredo JWT padrao em fallback | Media | Mitigado inicialmente: runtime em modo `production` falha se `JWT_SECRET` estiver ausente, fraco ou padrao. | Validar secret real na VPS de homologacao e manter rotacao documentada. | Desenvolvimento/Infra |
| Usuarios/senhas iniciais em fallback | Media | Mitigado inicialmente: runtime em modo `production` exige senha admin e seed demo fica condicionado. | Validar `.env` de homologacao e remover seed demo se nao for necessario. | Desenvolvimento/Infra |
| CORS aberto | Media | Mitigado inicialmente: CORS usa `CORS_ORIGIN`. | Configurar dominio final na VPS. | Desenvolvimento/Infra |
| Token em query string na exportacao | Baixa | Mitigado: exportacao usa `fetch` com header `Authorization`. | Validar download em homologacao. | Desenvolvimento |
| Upload de logo sem limite/validacao forte | Media | Mitigado inicialmente: limite de tamanho e tipos PNG/JPG/WebP. | Garantir volume persistente e limpeza operacional na VPS. | Desenvolvimento/Infra |
| Senhas de banco de tenants em texto | Alta | Campo `db_password` fica no PostgreSQL. | Avaliar criptografia em repouso, KMS/secret manager ou controle operacional compensatorio. | Desenvolvimento/Infra |
| Falta de rate limit | Media | Mitigado inicialmente em login, troca/reset de senha. | Ajustar limites conforme homologacao e monitoramento. | Desenvolvimento |
| Deploy sem rollback definido | Media | Mitigado inicialmente: CD e rollback foram criados com releases versionados, symlink `current` e healthcheck. | Validar em VPS real, configurar secrets, processo, backup e permissao SSH. | Infra Atenza |
| Sem observabilidade formal | Media | Logs basicos no console. | Adicionar logs estruturados, request ID, monitoramento e alertas. | Desenvolvimento/Infra |
| Testes automatizados ainda basicos | Media | Suite inicial cobre health, CORS, autenticacao, permissao admin e payload invalido. | Ampliar cobertura com banco local, fluxos reais, exportacao e isolamento por tenant. | Desenvolvimento |
| Vulnerabilidade moderada `exceljs`/`uuid` | Media | `npm audit` aponta correcao apenas com `--force` quebradico. | Monitorar atualizacao segura de `exceljs`; evitar `--force` sem teste de exportacao. | Desenvolvimento |
| LGPD pendente | Media | Sistema trata usuarios, emails, credenciais e dados financeiros. | Criar politica/processo LGPD antes de publicacao externa. | Atenza/Cliente |

## Decisoes registradas

- Nesta etapa, o CI usa `npm audit --audit-level=high` para bloquear vulnerabilidades altas e criticas.
- A vulnerabilidade moderada em `exceljs`/`uuid` fica registrada para acompanhamento, pois a correcao automatica sugerida pelo npm envolve mudanca potencialmente quebradica.
- O hardening inicial nao substitui teste em homologacao com dominio, HTTPS, banco real e logs reais.
- Relatorios formais e anexos ao CRM devem usar o padrao Atenza quando houver marco de acompanhamento, homologacao, Go-Live ou aceite.
