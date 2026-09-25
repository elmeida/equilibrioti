# Matriz de perfis e permissoes - Equilibrio BI

Data inicial: 2026-07-09. Atualizacao: 2026-09-17.

## Perfis identificados

| Perfil | Descricao | Acesso principal |
|---|---|---|
| `admin` | Administrador da plataforma | Painel admin, empresas, usuarios e acesso ao painel de clientes. |
| `cliente` | Usuario vinculado a uma empresa | Dashboard financeiro da propria empresa. |
| Publico | Usuario sem sessao | Login e health check publico. |

## Permissoes por area

| Area / acao | Publico | Cliente | Admin |
|---|---:|---:|---:|
| Login | Sim | Sim | Sim |
| Health check `/api/health` | Sim | Sim | Sim |
| Visualizar dashboard financeiro | Nao | Sim, da empresa vinculada | Sim, ao selecionar empresa |
| Aplicar filtros e consultar dados | Nao | Sim | Sim, ao selecionar empresa |
| Exportar dados | Nao | Sim | Sim, ao selecionar empresa |
| Trocar propria senha | Nao | Sim | Sim |
| Gerenciar empresas | Nao | Nao | Sim |
| Testar conexao SQL Server | Nao | Nao | Sim |
| Upload de logo da empresa | Nao | Nao | Sim |
| Gerenciar usuarios | Nao | Nao | Sim |
| Resetar senha de usuario | Nao | Nao | Sim |
| Impersonar/acessar como empresa | Nao | Nao | Sim |

## Regras tecnicas encontradas

- Rotas `/api/admin/*` exigem autenticacao e perfil `admin`.
- Rotas `/api/titulos/*` exigem autenticacao e empresa selecionada/vinculada.
- Usuario `admin` pode informar `X-Empresa-Id` para operar no contexto de uma empresa.
- Usuario `cliente` usa a empresa vinculada ao proprio cadastro.

## Pendencias

1. Perfil `admin` representa o administrador geral, conforme pedido do usuario. Administrador restrito por grupo nao foi implementado e nao deve receber esse perfil.
2. Senha nova/reset com minimo de 8 caracteres; ampliar politica e revisar expiracao conforme homologacao.
3. Definir se reset de senha deve exigir troca no primeiro acesso.
4. Registrar auditoria para acoes administrativas sensiveis.
5. Validar isolamento de dados por empresa em todas as consultas e exportacoes.
6. Exportacao usa Authorization, sem token por query string. Validar fluxo completo em homologacao.

## Controles implementados em 17/09/2026

- Toda requisicao verifica cadastro atual, usuario ativo, perfil conhecido, vinculo/empresa ativa para cliente, versao de sessao e revogacao individual do token.
- O admin precisa selecionar uma empresa ativa por identificador valido. Cliente que envia identificador de outra empresa recebe 403; selecao por query string nao muda seu vinculo.
- Autorizacao ocorre antes do cache financeiro. Falha do PostgreSQL retorna indisponibilidade sem liberar acesso por cache.
- Logout revoga apenas a sessao atual; troca/reset de senha ou edicao de usuario incrementam versao e invalidam sessoes anteriores.
- Em falha de rede no logout, o navegador apaga a sessao local e informa que a revogacao remota nao foi confirmada.
- Respostas administrativas de empresas usam lista explicita de campos, sem senha de conexao. Protecao das credenciais armazenadas continua pendente.
- A migration 002 e obrigatoria para executar a nova versao e nao foi aplicada. Validacao atual: testes de rotas reais com persistencia simulada, nao certificacao em bancos reais.
- Requisicoes ja autorizadas e em execucao nao sao desfeitas retroativamente pela revogacao. Proximas requisicoes precisam passar pela verificacao atual.
