# Colaboracao no Equilibrio BI

Produto white label Equilibrio TI; governanca Atenza. Ambiente atual: homologacao, nao producao.

## Versao de trabalho

O trabalho local validado em 25/09/2026 e compartilhado em `atenza/consolidacao-validada-20260925`.
A base desta branch e `0cec5ad`. A `main` remota observada e `34fea20`, com dez commits adicionais.
Nao substituir uma versao pela outra, nem resolver conflitos automaticamente escolhendo um lado.
A proposta de integracao permanece em rascunho ate conciliar as mudancas e repetir os testes.

```powershell
git fetch origin
git switch --track origin/atenza/consolidacao-validada-20260925
npm ci
npm run ci:check
npm run demo
```

Executar a troca de branch em clone novo ou com o trabalho proprio preservado. O modo demo usa dados
sinteticos isolados e nao se conecta a RM/PostgreSQL; nao valida os valores financeiros dos clientes.

## Ambiente e acesso

- Node.js conforme `package.json`. `npm ci` usa o lockfile compartilhado.
- Na maquina de desenvolvimento atual, reutilizar o PostgreSQL compartilhado do Docker, banco
  `equilibrio_auth`, schema `equilibrio_ti`. Nao criar novo container por padrao.
- Em outra maquina, definir um destino local proprio antes de preparar o banco. Nao copiar o `.env`
  legado nem os segredos da maquina original. Consulte [PostgreSQL local](docs/postgres-local.md).
- `npm run local:check` confere o destino; migrations, seeds e comandos de manutencao exigem destino
  confirmado e autorizacao. Nao executar scripts operacionais contra homologacao por tentativa.
- Convite GitHub nao concede acesso a dados, infraestrutura ou administrador da aplicacao.
  Solicitar contas individuais e privilegios minimos pelos canais aprovados.

## Fluxo de contribuicao

1. Criar branch `atenza/<assunto>` a partir da base acordada para a tarefa.
2. Manter mudanca focada, testes correspondentes, changelog e backlog atualizados.
3. Executar `npm run ci:check`. Testes unitarios usam fontes simuladas; conciliacao RM e aceite
   financeiro sao verificacoes separadas.
4. Abrir pull request e aguardar revisao. Nao fazer force-push na `main` nem sobrescrever trabalho alheio.
5. Separar merge e publicacao. O CD preparado pode disparar apos CI aprovado na `main`; revisar
   environment, secrets, destino, backup e rollback antes de integrar os workflows.

## Repositorio publico

Nunca enviar `.env`, chaves, senhas, tokens, backups, uploads, capturas com dados reais, exports
financeiros ou relatorios internos. `.local/`, `tmp/`, `output/` e scripts pontuais de homologacao
ficam fora do Git. Os testes compartilhados devem usar somente dados sinteticos.

Nao declarar conformidade LGPD integral: responsabilidades, canal de privacidade e retencao ainda
dependem de definicao formal. Nao alterar regras financeiras para apenas fazer totais coincidirem.
