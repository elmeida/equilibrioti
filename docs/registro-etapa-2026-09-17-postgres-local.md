# Registro de etapa: PostgreSQL compartilhado local

Data: 17/09/2026. Produto: Equilibrio BI, White Label Equilibrio TI. Governanca: Atenza. Ambiente do projeto: homologacao; intervencoes desta etapa exclusivamente locais.

## Autorizacao e diagnostico

O usuario orientou reaproveitar o PostgreSQL compartilhado e confirmou continuidade apos a proposta de conferir configuracao/permissoes, fazer backup e atualizar o banco existente. A verificacao encontrou `atenza-postgres-local`, porta `127.0.0.1:5432`, banco `equilibrio_auth`, schema `equilibrio_ti`, proprietario `equilibrio_auth_user`, migration 001 e zero empresas/usuarios. Nao era necessario criar outro banco ou container. A proposta anterior nesse sentido foi corrigida.

O `.env` legado ainda indicava o banco remoto. Seu conteudo foi preservado; os novos comandos locais usam arquivo separado e destino estrito. Nao houve conexao com esse banco remoto, homologacao ou RM.

## Executado

1. Removido o rascunho de Compose separado, nunca iniciado. Nenhum container, volume ou database criado.
2. Configuracao local em `.local/equilibrio-bi`, ignorada pelo Git e com ACL Windows restrita ao usuario atual. Geradas credencial de runtime, chave AES e segredo JWT exclusivos; sem valores em logs/documentos.
3. Backup custom do banco existente antes das alteracoes, com catalogo conferido e manifesto SHA-256. Nao inclui outros bancos do servidor.
4. Migrations 002 e 003 aplicadas em transacao, com bloqueio e proprietario preservado. Nenhuma senha do proprietario ou do administrador do PostgreSQL foi lida ou alterada.
5. Papel `equilibrio_app` dedicado a aplicacao, sem propriedade ou criacao de estruturas. Auditoria permite SELECT/INSERT, mas nao UPDATE/DELETE/TRUNCATE. Privilegios de outros projetos nao foram alterados.
6. Administrador local criado com senha aleatoria e evento de auditoria. Nenhuma empresa real ou demonstrativa cadastrada no schema de desenvolvimento. Nao houve conversao de credenciais reais: a tabela de empresas estava vazia.
7. `npm run dev` passou a iniciar os processos com a configuracao local. Comandos genericos de operacao continuam exigindo conferencia do destino; nao usar o `.env` legado para desenvolvimento.
8. Criado teste integrado repetivel, limitado ao banco local existente. Cadastros sinteticos usados somente em schema temporario criado pelo teste e removido ao final.

## Evidencias

- `npm run ci:check`: aprovado, 168 testes em 9 arquivos, typecheck e build aprovados, sem alertas altos/criticos. Permanecem 2 alertas moderados transitivos de uuid/ExcelJS e aviso de bundle de 688,67 kB.
- `npm run local:test`: 14 grupos aprovados com PostgreSQL real; migrations idempotentes, login, isolamento de empresa, acesso administrativo auditado, criptografia vinculada ao tenant, privilegios, rollback na falha da auditoria, versionamento de conexao, troca de senha, logout, bloqueio de empresa inativa e paginacao.
- Zero tentativas de conexao ao RM durante o teste; schema temporario removido. Erros HTTP 500 e eventos `audit_unavailable` nessa execucao foram induzidos para comprovar rollback, nao falhas remanescentes.
- `npm run local:check`: aprovado sem alteracao de dados.
- Aplicacao local iniciada: backend em `http://127.0.0.1:3001` e frontend existente em `http://127.0.0.1:5175`. Healthcheck, proxy, login com o administrador local, lista de empresas vazia e logout/revogacao conferidos por HTTP. Nenhuma sessao de teste deixada ativa.
- Conferencia final: migrations 001/002/003, zero empresas, um usuario e zero schemas temporarios. ACL restrita e exclusao dos arquivos locais pelo Git confirmadas.
- Evidencias locais sem segredos: `.local/equilibrio-bi/database-result.json` e `integration-result.json`. Backups e acesso inicial nao devem ser publicados ou enviados por mensageria.

## Limites e pendencias

- Backup teve catalogo validado; restore completo ainda nao ensaiado. Copia externa protegida, retencao, protecao do disco e custodia de chaves dependem da Infra/gestao.
- Runtime protegido nao significa auditoria imutavel contra proprietario/superusuario. Cluster compartilhado ainda exige governanca de acesso; privilegios PUBLIC de outros bancos nao foram revisados integralmente.
- Nenhum deploy, push, alteracao de infraestrutura remota ou comprovacao de CI/CD publicado. Pipeline existente permanece dependente da ativacao de homologacao.
- Testes nao certificam valores, regras de calculo ou desempenho de consultas RM. Conciliacao continua dependente de relatorios/contratos de dados dos clientes.
- LGPD parcial: responsabilidades contratuais, canal de privacidade, retencao e demais itens do plano continuam abertos. Nao declarar conformidade integral.

## Proxima etapa sugerida

Concluir protecoes administrativas independentes das views, com prioridade para validacao real dos arquivos de logo, seguida da tela de consulta da auditoria. Planejar tambem ensaio de restore em destino descartavel autorizado. Mensagem final ao Leonardo continua reservada para quando as frentes independentes forem concluidas, sem omitir dependencias de governanca/infraestrutura.
