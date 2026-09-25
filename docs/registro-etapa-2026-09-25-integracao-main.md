# Conciliacao da main e da branch de colaboracao

Data: 25/09/2026. Equilibrio BI, white label Equilibrio TI; governanca Atenza. Somente desenvolvimento.

## Historico e escopo

Integrados os dez commits entre `0cec5ad` e `34fea20` ao trabalho validado em `39ed03b`.
Merge com dois pais, sem reescrever historico ou substituir integralmente um lado.
Trabalho preparado em `atenza/integracao-main-20260925` e compartilhado pela mesma branch da PR #1,
`atenza/consolidacao-validada-20260925`, para preservar o ponto de entrada do colaborador.
Sem merge na main, publicacao da aplicacao, acesso a RM, migrations ou alteracao de credenciais.

## Decisoes de conciliacao

| Mudanca remota | Resultado integrado |
|---|---|
| 9902907: visibilidade, filtros e qualidade | Inconsistencias exclusivas do admin na interface e API; exclusao de TIPODOC PREVISAO nos indicadores, filtros, tabela e export. Diagnostico de estrutura verifica dbo e usa tenant/versao de conexao |
| 96580e6: acesso administrativo por empresa | Preservado via X-Empresa-Id validado, consulta ao cadastro atual e auditoria. Nao reintroduzidos token/tenant na URL nem alias de perfil fora do contrato admin/cliente |
| 9064a88: lista administrativa simplificada | Ordenacao por nome e colunas reduzidas, com logos validadas. Teste de conexao por acao explicita, somente empresa ativa, credencial decifrada no servidor, limite de chamadas e evento company.connection_test |
| 559b1d1: selecao de filtros | Selecionar todos os resultados visiveis/remover selecao, busca sem acentos, preservando AbortController e isolamento do contexto |
| 74e2414: indicador com baixa | Inclui Baixado e Baixado Parcialmente. Rotulo Rateio com baixa, ajuda explicita: linha parcial entra pelo rateio integral, nao pelo caixa pago. Parcial e subconjunto, nao somar novamente |
| 4c27b69: conta vazia | Sinaliza conta vazia/espacos somente em linhas Em Aberto |
| f6c804e: opcoes de filtro | Removido corte em 50 opcoes, mantidas consultas parametrizadas e ordenacao/busca sem acentos. Volume real/desempenho ainda precisa de medicao |
| 92401a5, de10c28, 34fea20: privacidade | Aviso unico em login/admin/painel, reabertura, tratamento de storage bloqueado, leitura versionada e informacao de homologacao. Sem analytics ativo: controles opcionais desabilitados, nenhuma autorizacao futura inferida |
| Rolagem superior de tabelas | Combinada com tela cheia, foco/Escape e 50 linhas de ranking; dimensoes contidas no dialogo |

Tres rotas de inconsistencias estavam duplicadas no codigo remoto; mantida uma implementacao por
endpoint. A diferenca entre somas de rateio/original permanece como informacao para conferir
granularidade, nao erro financeiro critico comprovado. Comparacao decimal com precisao 48; os totais
continuam leituras separadas, nao um snapshot conciliado. Alertas nao modificam arrays do cache.

Listar empresas nao abre conexoes RM em paralelo nem presume falha quando nao houve teste.
O teste explicito grava autorizacao na auditoria antes de consultar; falha da auditoria bloqueia a acao.
Mensagens do driver nao sao expostas. Nao foi alterada a conexao real de nenhuma empresa.

## Verificacoes

- 627 testes aprovados em 25 arquivos: 603 anteriores mais 24 regressoes de integracao.
- TypeScript, build e limites de bundle aprovados; entrada aproximada de 212 kB / 68 kB gzip.
- Auditoria npm: zero vulnerabilidades reportadas na execucao.
- Navegador Chromium, dados sinteticos e todas as APIs interceptadas, sem backend/banco real.
- Aviso de privacidade em 1440, 390 e 320 px: dimensoes, fundo opaco, reabertura e analytics inativo.
- Admin: ordenacao de empresas, teste somente por acao e selecao multipla com busca sem acentos.
- Ranking ampliado com 50 linhas nas tres larguras: rolagem superior/inferior sincronizada, Escape
  e retorno do foco; tabela analitica ampliavel para cliente.
- Cliente nao recebe aba nem dispara consultas de inconsistencias. API tambem recusa com 403.
- Nenhum erro de JavaScript nos cenarios executados. Evidencias sinteticas em `tmp/integration-qa`,
  fora do Git. Roteiro repetivel: `scripts/check-integration-ui.mjs`, com Playwright instalado ou
  `PLAYWRIGHT_PACKAGE_PATH` apontando a instalacao local.

Falhas encontradas e corrigidas durante a etapa: evento novo ausente da lista de auditoria; variaveis
de tema ausentes no aviso montado fora do painel. Houve ainda ajuste de porta/timeout e de seletor
no roteiro de navegador. Resultados finais acima sao das repeticoes aprovadas.

## Limites e proximos passos

Revisao da PR e configuracao do CD continuam pendentes. Nao fazer merge na main sem conferir
environment homologation, parametros, secrets, backup e recuperacao: o workflow preparado pode
disparar deploy apos CI da main. Nenhuma implantacao foi realizada nesta etapa.

Regras financeiras da main foram conciliadas no codigo, nao certificadas com lancamentos RM.
Permanecem com negocio/RM: granularidade, chaves, baixas/estornos, cobertura, relatorios de referencia
e conciliacao financeira. Nao solicitar recriacao generalizada de views.

Gestao: responsaveis pelo tratamento, canal de privacidade, retencao e aprovacao da politica definitiva.
O aviso de homologacao nao substitui essas definicoes e nao certifica conformidade LGPD integral.
Desenvolvimento: demais itens UX08-UX17 permanecem abertos quando nao explicitamente tratados aqui;
nao foi feita auditoria integral de acessibilidade, dispositivos fisicos ou desempenho com dados reais.

Proxima etapa sugerida: revisao conjunta da PR e preparacao controlada da integracao na main,
com o acionamento de homologacao tratado separadamente.
