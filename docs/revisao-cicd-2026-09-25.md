# Revisao de CI/CD e ativacao controlada

Data: 25/09/2026. Equilibrio BI, marca Equilibrio TI; governanca Atenza.
Escopo: preparar codigo e revisar configuracao. Sem merge na main, deploy, acesso SSH,
alteracao de banco, views, DNS, credenciais ou permissoes nesta etapa.

Este documento substitui as orientacoes operacionais antigas de CI/CD. Os documentos
de julho e o registro de publicacao manual de setembro ficam preservados como historico.

## Atualizacao - protecoes aplicadas

Apos autorizacao de continuidade e confirmacao de acesso pelo proprietario, foram
salvas e relidas na interface do GitHub as configuracoes abaixo. Esta atualizacao
altera apenas controles do repositorio; nao houve merge, deploy nem acesso a VPS/banco.

- Regra classica `main` (ID 83717470), aplicada a uma branch: PR obrigatoria, uma
  aprovacao, descarte de aprovacoes antigas e aprovacao do ultimo push por outra pessoa.
- Check `Build e quality gate`, origem GitHub Actions, obrigatorio com branch atualizada.
- Conversas resolvidas; regras aplicadas tambem aos administradores. Force push e
  exclusao da main nao permitidos. Sem exigencia de deploy previo ao merge, evitando
  dependencia circular com publicacao exclusiva da main.
- Environment `homologation` criado (ID 22776553548), com aprovacao obrigatoria de
  `elmeida` e bypass administrativo desabilitado.
- Lista explicita de deployment: uma branch `main`, zero tags. Nao foi utilizada
  a opcao generica de permitir toda branch protegida.
- `Prevent self-review` permanece desmarcado no environment: o proprietario pode
  aprovar um disparo proprio de homologacao. Isso nao dispensa a revisao independente
  do codigo exigida na main. Separacao adicional de operadores/aprovadores pode ser
  definida antes da ativacao; nao foi delegado poder de aprovacao a outra conta.
- Nenhum secret ou variavel adicionado. `HML_CD_ENABLED` e
  `HML_AUTO_DEPLOY_ENABLED` permanecem ausentes; CD novo segue desativado por padrao.

Validacao por leitura das telas apos salvar. A API de protecao retornou 403 para a
integracao; nao foram ampliados seus acessos. Nao foi tentado um push proibido ou
deploy para testar as restricoes, pois isso alteraria o escopo desta etapa.

O codigo das novas travas ainda esta na PR #1, nao na main. Os workflows antigos
da main nao devem ser acionados; a ausencia de credenciais e a protecao do environment
sao barreiras adicionais enquanto a PR aguarda revisao. Nao aprovar execucoes pendentes
nem cadastrar a chave antes da preparacao operacional e da integracao revisada.

Proximo passo: revisao independente da PR pelo colaborador e fechamento das lacunas
operacionais (runtime das Actions, checksum, recuperacao compensatoria e ensaio de
backup/restore). Credenciais e primeiro deploy seguem sujeitos a autorizacao especifica.

## Diagnostico inicial confirmado no GitHub

Consulta anterior a aplicacao das protecoes, preservada como historico:

- Nenhum environment cadastrado, inclusive `homologation`.
- Nenhuma regra classica de protecao de branch e nenhum ruleset.
- Nenhum secret de Actions no repositorio ou environment.
- Nenhuma variavel de Actions no repositorio ou environment, inclusive habilitacao de CD.
- Repositorio publico. Nao publicar arquivos locais, dados de clientes ou evidencias reais.
- PR #1 continua sendo a via de revisao, sem integracao automatica na main nesta etapa.

CI implementado e executado nao significa CD ativado. A homologacao existente foi
publicada manualmente; estes workflows ainda precisam de ativacao e ensaio operacional.

## Ajustes implementados

1. CD e rollback desativados por padrao: exigem a variavel de repositorio
   `HML_CD_ENABLED=true`. Ausente ou diferente de `true`, o job e ignorado.
2. Automatico exige adicionalmente `HML_AUTO_DEPLOY_ENABLED=true`, CI bem-sucedido
   de evento push na main do repositorio oficial. CI de PR/fork ou disparo manual
   do CI nao autoriza deploy automatico.
3. Disparo manual somente pela main, sem escolher branch/tag arbitraria. Checkout
   usa SHA imutavel do evento; novo quality gate e verificacao da main antes do SSH.
   Commit ultrapassado falha. Nova alteracao da main apos essa verificacao continua
   possivel; nao se trata de bloqueio atomico da branch.
4. SSH exige `VPS_SSH_KNOWN_HOSTS` previamente conferido por canal independente.
   Removido o reconhecimento automatico via keyscan na hora da publicacao.
5. Chave temporaria com permissoes restritas, caminho pelo HOME real e limpeza final.
   Checkout sem persistir credenciais. CI concorrente cancela somente execucoes
   anteriores do mesmo evento/ref; deploy e rollback compartilham fila sem cancelamento.
6. Destino restrito ao host/path/servico de homologacao. Usuario root, comandos
   arbitrarios, caminhos de outro projeto e identificadores invalidos sao recusados
   antes de empacotar/conectar. Sem valores de secrets nas mensagens de rejeicao.
7. Runtime isolado Node 22 e servico `equilibrioti` reconciliados com o registro da VPS.
   Timeouts SSH/HTTP limitados e sudo sem prompt interativo.
8. Removida execucao de migrations pelo deploy. `db:check` continua obrigatorio;
   migrations futuras exigem procedimento separado, backup e autorizacao.
9. Rollback exige release explicito, caminho canonico e verificacao de schema antes
   de trocar current. Nao seleciona mais release por data, que poderia estar incompleto.
10. Sem limpeza automatica de releases. Nenhuma versao de recuperacao e apagada pelo
    script; retencao manual e monitoramento de disco ainda precisam de politica.
11. Uploads persistentes excluidos do pacote de codigo; credenciais e dados de clientes
    nao integram os artefatos de CI/CD. Publicacao continua sujeita a revisao de conteudo.

## Configuracao a aprovar antes de ativar

Responsavel: administrador do repositorio e Infra Atenza. Planejamento original;
main e environment ja aplicados conforme atualizacao acima. Credenciais e ativacao pendentes.

| Controle | Configuracao proposta / criterio de aceite |
|---|---|
| Protecao main | PR obrigatoria, uma aprovacao independente, dispensar aprovacao antiga apos novos commits, resolver conversas, CI `Build e quality gate` obrigatorio e branch atualizada |
| Escrita protegida | Bloquear exclusao/force push; definir explicitamente excecoes administrativas, sem bypass silencioso |
| Environment | Criar `homologation`, permitir exclusivamente branch `main` (nao tags), exigir aprovacao de responsavel definido |
| Credenciais | Somente secrets do environment protegido, nao secrets globais de repositorio |
| Usuario SSH | Dedicado, nao root; escrita somente na aplicacao e sudo restrito ao restart de `equilibrioti` |
| Chave do host | Confirmar fingerprint por console/canal confiavel antes de cadastrar known_hosts; porta alternativa exige entrada compativel |
| Ativacao inicial | Manter as duas variaveis ausentes/false. Somente apos revisao, habilitar CD manual; automatico permanece false ate ensaio e aceite |

Secrets do environment:

- `VPS_HOST`: host de homologacao ja mapeado.
- `VPS_USER`: conta dedicada de deploy, ainda a confirmar/preparar.
- `VPS_SSH_KEY`: chave exclusiva dessa conta, nunca em mensagens, Git ou relatorios.
- `VPS_SSH_KNOWN_HOSTS`: entrada OpenSSH conferida independentemente.
- `VPS_APP_PATH`: `/var/www/equilibrio-bi-hml`.
- `VPS_PORT`: opcional, padrao 22.

Parametros fixos do workflow: servico `equilibrioti`, Node em
`/opt/atenza/equilibrio-bi/node-v22.23.2-linux-x64/bin` e healthcheck HTTPS da homologacao.
Revalidar esses caminhos/versoes na preparacao autorizada da VPS. Nao cadastrar
`VPS_RESTART_COMMAND`, `VPS_SERVICE_NAME` ou `APP_HEALTHCHECK_URL` como secrets antigos.
As duas variaveis de habilitacao sao de **repositorio**, pois o `if` do job e avaliado
antes da disponibilizacao de variaveis do environment.

As travas no YAML nao substituem protecoes no GitHub: quem altera workflows sem
revisao pode remover uma trava. Por isso, nao habilitar CD nem disponibilizar a chave
antes de proteger branch e environment.

## Validacao e limites

679 testes em 26 arquivos aprovados em copia limpa instalada pelo lockfile, incluindo
52 novos testes de protecoes. Origem, entradas invalidas, SSH sem fingerprint,
sintaxe Bash e recuperacao de falha do deploy exercitados sem rede VPS e sem banco.
Os tres workflows passaram no actionlint 1.7.12; distribuicao oficial conferida por
SHA-256 (ShellCheck/Pyflakes nao executados). Diff verificado pelo Gitleaks sem
segredos detectados. TypeScript, build e limites de bundle aprovados; auditoria npm
sem vulnerabilidades reportadas. Resultado do CI remoto registrado na PR.

Ainda nao validados operacionalmente:

- Acesso da conta dedicada, ownership de releases/uploads/env, sudo e isolamento
  dos demais projetos. Usuario de deploy e usuario do servico podem precisar de grupo comum.
- Backup/restore recente e compatibilidade da release de retorno com schema e criptografia.
- Rollback manual real: ainda precisa ensaio de falha do alvo e recuperacao compensatoria.
- Healthcheck publico falho marca deploy como falha, mas nao desfaz automaticamente
  a troca ja saudavel no teste local. Definir tratamento de falha de proxy/DNS separadamente.
- Checksum do pacote no destino, fixacao de Actions por SHA e politica de atualizacao.
- Retencao de releases, alertas de disco, monitoramento e recuperacao apos interrupcao do SSH.

Esses itens impedem declarar CD pronto para operacao automatica. A implementacao
atual e uma preparacao controlada, nao certificacao de disponibilidade ou LGPD integral.
Nenhum teste financeiro com RM foi repetido nesta etapa.

## Proxima etapa

Revisar PR com Douglas, preservando protecoes da main/environment e CD desligado.
Depois preparar e ensaiar publicacao/rollback com backup e autorizacao especifica.
Leonardo segue responsavel pela validacao de negocio e contrato das views ja mapeados;
nenhuma nova alteracao de view foi solicitada por esta revisao de CI/CD.

Referencias oficiais consultadas em 25/09/2026:

- [Environments e protecoes](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
- [Eventos e workflow_run](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [Sintaxe e permissoes](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
