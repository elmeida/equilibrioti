# Registro de etapa: dependencias e compatibilidade Excel

Data: 21/09/2026. Equilibrio BI, marca Equilibrio TI; governanca Atenza. Resultado: correcao local verificada (`fixed`) da dependencia vulneravel. Projeto em homologacao, sem publicacao nesta etapa.

## Diagnostico e alcance

O `npm audit --json` inicial apresentou dois alertas moderados, ambos originados do mesmo aviso GHSA-w5hq-g745-h8pq: UUID 8.3.2 e seu dependente ExcelJS 4.4.0. Nao eram duas falhas independentes. A sugestao automatica forcada reduziria ExcelJS para 3.4.0; ela nao foi aplicada.

A falha foi reproduzida diretamente no UUID resolvido pelo ExcelJS: v3/v5 aceitavam buffer de oito bytes com offset quatro e faziam escrita parcial sem erro. O invariante esperado e rejeitar limites invalidos antes de modificar o buffer.

Nao foi identificado caminho exploravel na exportacao atual. `server/app.js` exige autenticacao, `server/routes/titulos.js` aplica o contexto autorizado da empresa e consulta campos explicitos. `server/utils/titulosExport.js` cria uma planilha nova, sem receber arquivos XLSX ou configuracao de formatacao do usuario. O unico consumidor UUID encontrado no codigo Node do ExcelJS e a formatacao condicional estendida, com `v4()` sem buffer/offset. Ela sequer e adicionada pela exportacao atual. A classificacao e dependencia afetada presente, sem exploracao demonstrada pelo fluxo da aplicacao; nao houve evidencia de incidente ou vazamento.

## Correcao

- `package.json`: override de UUID 11.1.1 restrito a arvore do ExcelJS. Esta versao contem a correcao oficial e conserva a entrada CommonJS usada pelo ExcelJS.
- `package-lock.json`: somente UUID mudou de versao/integridade nesta etapa, de 8.3.2 para 11.1.1. ExcelJS permaneceu em 4.4.0; demais pacotes foram preservados em relacao ao inicio desta etapa.
- `tests/exceljs-dependency.test.js`: 23 novos testes resolvem UUID a partir do proprio ExcelJS, cobrindo inclusive uma eventual instalacao aninhada.
- Sem alteracoes na consulta financeira, na API de exportacao, na autenticacao, nas permissoes ou no isolamento entre empresas.

O override atravessa a faixa de versao originalmente declarada pelo ExcelJS. Por isso sua compatibilidade foi exercitada, nao presumida apenas pela ausencia de alertas. Reavaliar/remover o override quando uma atualizacao oficial do ExcelJS resolver a dependencia e passar pela mesma regressao. O limite de auditoria do CI continua `high`, sem alteracao silenciosa de politica; os novos testes executam no CI existente.

## Verificacoes e evidencias

| Verificacao | Resultado |
|---|---|
| Reproducao antes da correcao | v3/v5 fazem escrita parcial; controle normal v4 valido; cinco testes de exportacao aprovados |
| Novos testes na versao antiga | 12 falhas de limites v3/v5 reproduzem o defeito; sete casos v6 falham porque essa API nao existe em UUID 8; quatro controles aprovados |
| Importacao apos atualizar | UUID 11.1.1 carregado via CommonJS a partir do ExcelJS |
| Limites invalidos apos atualizar | v3/v5/v6 rejeitam buffer curto, offset excedente e negativo; Buffer e Uint8Array permanecem intactos |
| Controles validos | UUID com offset valido, bytes adjacentes preservados e v4 sem argumentos; XLSX com formatacao estendida gerado e reaberto |
| Regressao focada | `npm test -- --run tests/exceljs-dependency.test.js tests/titulos-export.test.js tests/server-authorization.test.js`: 95 testes aprovados |
| Quality gate local | `npm run ci:check`: 590 testes em 22 arquivos, typecheck, build, limites de tamanho e auditoria aprovados |
| Arvore instalada | `npm ls exceljs uuid --all`: ExcelJS 4.4.0 com UUID 11.1.1; sem versao antiga nessa arvore |
| Auditoria | Zero vulnerabilidades conhecidas reportadas pelo npm na consulta desta etapa; nao e garantia contra falhas desconhecidas ou futuras |
| Instalacao isolada | `npm ci --ignore-scripts` com copias de package.json/lockfile em diretorio temporario, sem modificar a instalacao ativa; 436 pacotes instalados e zero alertas de auditoria |
| Controle na instalacao isolada | CommonJS, geracao/reabertura de XLSX e rejeicao de limites invalidos v3/v5 aprovados usando os pacotes recem-instalados |

Revisao adicional somente de leitura nao identificou bypass ou regressao concreta no escopo. Foram conferidos mais 88 casos nas distribuicoes CommonJS, ESM e browser do UUID, executadas sob Node 22.16.0; isso nao equivale a execucao em navegador real nem amplia a contagem principal de 590 testes do projeto. Nao foram testadas outras versoes do Node nesta etapa.

Os arquivos financeiros continuam preservando cabecalhos, recorte vazio, ate 5.000 registros, datas, valores negativos/zero, nulos e texto parecido com formula. Campos inesperados continuam excluidos e 5.001 registros continuam rejeitados. O teste de formatacao condicional estendida exercita a chamada UUID real do ExcelJS, alem do fluxo comum que nao a utiliza.

## Limites e pendencias

- Testes com dados sinteticos em memoria e consultas simuladas; sem cadastro de empresas ficticias, acesso PostgreSQL/RM/HML ou conciliacao financeira real.
- Sem abertura manual no Microsoft Excel, nova rodada visual de navegador ou execucao remota de CI/CD. Nenhuma tela foi alterada. A instalacao isolada desabilitou scripts de terceiros e nao certifica a instalacao completa de modulos nativos em outro sistema operacional.
- A instalacao ainda emite avisos de descontinuacao de dependencias transitivas antigas (inflight, lodash.isequal, rimraf, glob e fstream). Eles nao sao os dois alertas de seguranca tratados e devem permanecer no acompanhamento da cadeia do ExcelJS. Nao houve atualizacao ampla dessas bibliotecas.
- Nenhum commit, push, deploy, migration ou alteracao de ambiente remoto. Processos ja abertos podem manter bibliotecas antigas em memoria ate reinicio controlado; os testes usaram novos processos. A correcao nao foi aplicada aos processos de homologacao.
- Papeis contratuais, canal de privacidade e retencao dependem da gestao Atenza/Equilibrio TI; nao se declara conformidade LGPD integral.
- Leonardo/Equilibrio TI: permanecem as definicoes das views e amostras para conciliacao. Infra/Atenza: ativacao CI/CD, publicacao autorizada e recuperacao operacional continuam pendentes.

## Proxima etapa sugerida

Preparar a rotina e os testes de recuperacao do PostgreSQL local compartilhado: conferir o plano de backup, integridade, catalogo e custodia das chaves, com ensaio de restore somente em destino descartavel previamente autorizado. Nao sobrescrever o banco ativo nem criar outro container. A execucao que criar/remover destino ou restaurar dados exige autorizacao especifica.

Ainda nao restam apenas ajustes nas views. A mensagem consolidada para Leonardo continua reservada ao encerramento das frentes independentes.

## Fontes e manutencao

- [Aviso oficial UUID: GHSA-w5hq-g745-h8pq](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq).
- [Release oficial UUID 11.1.1 com a correcao retroportada](https://github.com/uuidjs/uuid/releases/tag/v11.1.1).
- Consulta ao registro npm: ExcelJS 4.4.0 era a versao estavel informada; UUID 11.1.1 declarava entradas `node.require` e `node.import`. Revalidar a situacao nas proximas atualizacoes.
