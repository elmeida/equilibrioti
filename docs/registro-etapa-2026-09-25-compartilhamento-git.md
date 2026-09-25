# Compartilhamento do codigo validado

Data: 25/09/2026. Produto Equilibrio BI, marca Equilibrio TI, governanca Atenza.

## Escopo

Preparar e compartilhar o trabalho local para desenvolvimento conjunto. Sem publicacao de aplicacao,
acesso a RM, alteracao de banco, migration, mudanca de credenciais ou permissoes nesta etapa.
O convite de colaborador depende do aceite do destinatario; o acesso Git e independente da aplicacao.

## Divergencia preservada

Base local: `0cec5ad`. `main` remota apos fetch: `34fea20`, dez commits adiante.
As mudancas remotas abrangem filtros, regras de indicadores, qualidade, acesso administrativo e
consentimento/privacidade. O trabalho local altera varios dos mesmos arquivos e adiciona controles
de isolamento, auditoria, testes e paineis ampliaveis. Nenhuma linha de trabalho deve ser descartada.

Destino de compartilhamento: `atenza/consolidacao-validada-20260925`, com proposta de integracao em
rascunho. A base validada e compartilhada sem afirmar compatibilidade com a `main` atual.

## Verificacao local

- `npm run ci:check`: 603 testes aprovados em 24 arquivos, TypeScript e build aprovados.
- Limites de bundle aprovados; entrada de aproximadamente 208 kB / 67 kB gzip.
- Auditoria npm nesta execucao: zero vulnerabilidades reportadas.
- Evidencias temporarias, artefatos gerados, relatorio de acompanhamento e scripts pontuais de
  homologacao excluidos do envio. `.env` e `.local/` permanecem privados.
- CI preparado para pushes `atenza/**`, permitindo testar esta branch sem acionar CD da `main`.
- Gitleaks 8.30.1, binario oficial com checksum verificado: nenhum segredo detectado no pacote
  selecionado (aproximadamente 1,06 MB). Conferencia adicional dos 164 arquivos alterados contra
  senhas/chaves da configuracao local: nenhuma correspondencia, sem exibir valores.
- Repeticao em copia limpa fora do workspace, sem `.env` ou `.local`: `npm ci` e
  `npm run ci:check` aprovados, com os mesmos 603 testes e auditoria sem vulnerabilidades reportadas.

Essas verificacoes nao substituem conciliacao financeira, teste de integracao das duas branches,
ensaio de restore ou aceite dos usuarios. Nenhum teste real de banco foi reexecutado nesta etapa.

## Pendencias e proxima etapa

Desenvolvimento: reconciliar os dez commits remotos com esta branch em trabalho separado, preservando
regras financeiras, isolamento, filtros e requisitos de privacidade; repetir testes e revisao visual.
Infraestrutura: confirmar os parametros reais do CD antes de qualquer merge que possa ativa-lo.
Gestao: responsabilidades, canal de privacidade e retencao continuam pendentes.
RM/negocio: contrato das views e conciliacao permanecem com os respectivos responsaveis.

Consultar [guia de colaboracao](../CONTRIBUTING.md). Os registros historicos de etapas sem commit/push
continuam validos para suas datas; este compartilhamento nao altera o estado da homologacao.
