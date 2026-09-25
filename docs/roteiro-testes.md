# Roteiro de testes - Equilibrio BI

Data: 2026-07-09  
Objetivo: validar a versao atual antes de homologacao, deploy ou Go-Live.

## Testes tecnicos locais

| Teste | Comando / acao | Resultado esperado |
|---|---|---|
| Instalacao limpa | `npm ci` | Dependencias instaladas sem erro. |
| Typecheck | `npm run typecheck` | TypeScript sem erro. |
| Build | `npm run build` | `dist` gerado sem erro critico. |
| Auditoria alta/critica | `npm run audit:high` | Sem vulnerabilidades altas ou criticas. |
| Health da API | `GET /api/health` | `{ ok: true }`. |

## Login e sessao

1. Acessar tela de login.
2. Tentar login com usuario invalido.
3. Tentar login com usuario valido.
4. Validar carregamento de `/api/auth/me`.
5. Trocar senha com senha atual incorreta.
6. Trocar senha com senha atual correta.
7. Fazer logout.
8. Tentar acessar rotas autenticadas sem token.

## Perfil administrador

1. Acessar painel administrador.
2. Listar empresas.
3. Criar empresa de teste.
4. Testar conexao SQL Server com credenciais validas e invalidas.
5. Enviar logo de teste.
6. Editar empresa sem alterar senha do banco.
7. Criar usuario cliente vinculado.
8. Editar usuario.
9. Resetar senha.
10. Acessar painel como empresa/cliente.

## Perfil cliente

1. Validar carregamento do dashboard.
2. Aplicar e limpar filtros globais.
3. Validar abas: Visao Geral, Fluxo Financeiro, A Pagar x A Receber, Vencidos, Rankings, Inconsistencias e Tabela Analitica.
4. Validar estados de carregamento, erro e vazio.
5. Validar tabela analitica com busca, paginacao e ordenacao.
6. Validar exportacao.
7. Validar responsividade em desktop, tablet e celular.

## PWA e interface

1. Validar manifest e favicon.
2. Validar service worker sem cache indevido de `/api`.
3. Validar instalacao em ambiente HTTPS.
4. Validar contraste, alinhamento, legibilidade e textos em portugues do Brasil.
5. Confirmar White Label com marca Equilibrio TI na interface publica.

## Seguranca minima antes de Go-Live

1. Confirmar `.env` fora do Git.
2. Confirmar `JWT_SECRET` forte em producao.
3. Confirmar ausencia de usuarios/senhas padrao.
4. Confirmar CORS restrito.
5. Confirmar rate limit em login.
6. Confirmar uploads limitados e validados.
7. Confirmar HTTPS ativo.
8. Confirmar logs sem dados sensiveis.

## Nao validado nesta etapa

- Conexao real com VPS.
- Dominio e HTTPS.
- Backup e restore.
- Monitoramento.
- Bancos reais de producao/homologacao.
- Fluxo completo em ambiente externo.

## Atualizacao de 17/09/2026: sessao e entrega

Roteiros automatizados adicionais: `tests/server-authorization.test.js`, `tests/api-context.test.ts` e `tests/deploy.test.js`.

1. Cliente A tenta enviar empresa B no header e na query string; o primeiro acesso deve ser negado e a segunda tentativa nao deve mudar o vinculo.
2. Alternar A/B/A, com cache preenchido, e conferir que respostas nao se misturam.
3. Desativar usuario/empresa ou alterar permissao/vinculo; proxima requisicao deve perder o acesso anterior.
4. Encerrar uma sessao e confirmar que o mesmo token e recusado; outra sessao valida deve continuar funcionando.
5. Trocar/resetar senha e confirmar invalidacao de todos os tokens anteriores.
6. Simular indisponibilidade do cadastro; nao retornar dados financeiros por cache nem detalhes de conexao.
7. Cadastrar/listar empresas sem senha ou campos inesperados na resposta.
8. Iniciar com migration pendente e confirmar bloqueio sem executar alteracoes automaticamente.
9. Simular falha de restart e de healthcheck; restaurar link anterior, tentar reinicio e manter status de falha do deploy.

Esses testes nao usam PostgreSQL, SQL Server ou VPS reais. Repetir os criterios em ambiente local preparado e depois na homologacao autorizada; nao substituir conciliacao financeira nem aceite do cliente.
