# Changelog

Todas as mudancas relevantes deste projeto devem ser registradas aqui, seguindo versionamento semantico quando houver release.

## [Integracao para revisao] - 2026-09-25

- Conciliacao dos dez commits da main com a branch validada, mantendo os dois historicos.
- Selecao multipla, busca sem acentos, filtros sem corte em 50 opcoes e rolagem superior sincronizada com tela cheia.
- Lista administrativa simplificada, logos protegidas e teste explicito/auditado de conexao por empresa.
- Diagnosticos de estrutura e inconsistencias exclusivos do admin; rotas duplicadas eliminadas.
- Regra remota de exclusao de PREVISAO e inclusao de baixas parciais no rateio com baixa preservadas, com limites documentados.
- Aviso de armazenamento sem analytics ativo ou declaracao de conformidade LGPD integral.
- [Registro, testes, decisoes e limites](docs/registro-etapa-2026-09-25-integracao-main.md). Sem deploy ou alteracao de banco.

## [Compartilhamento para revisao] - 2026-09-25

- Consolidacao do trabalho local validado em branch separada, sem merge ou deploy.
- Guia de colaboracao e protecao de arquivos locais, evidencias, backups e scripts operacionais.
- CI para branches `atenza/**`; CD continua separado e condicionado a revisao antes da integracao.
- Dez commits da `main` remota precisam ser conciliados; nenhuma mudanca remota descartada.
- [Escopo, verificacoes e pendencias](docs/registro-etapa-2026-09-25-compartilhamento-git.md).

## [Nao publicado] - 2026-09-23

- Ampliacao individual de graficos e tabelas financeiras em dialogo de tela cheia, com Escape, controle de foco e preservacao dos controles da tabela analitica.
- Rankings detalhados em largura completa e ate 50 linhas, corrigindo o limite visual de 20 anunciado como Top 50.
- Avaliacao de responsividade/UI/UX na homologacao e backlog de filtros, navegacao, acessibilidade e acesso por empresa.
- Mudancas apenas locais, sem publicacao ou alteracao de views/bancos. [Registro e limites](docs/registro-etapa-2026-09-23-ui-ux-tela-cheia.md).

## [Nao publicado] - 2026-09-21

Nota de 21/09/2026: o codigo validado descrito nesta e nas etapas anteriores foi publicado em homologacao na release `20260921-125622`, sem release Git ou liberacao de producao. Titulos historicos preservados. [Registro de publicacao](docs/registro-publicacao-hml-2026-09-21.md).

### Publicacao de homologacao

- Preparacao autorizada do schema existente, backup protegido fora da VPS, cifragem de duas credenciais e preservacao de duas empresas/tres usuarios.
- Runtime exclusivo sem root, conexao PostgreSQL interna, HTTPS/Cloudflare e porta dedicada, sem alterar views ou outros projetos.
- Ajuste de confianca no proxy e cache do worker; 596 testes aprovados. Login real/aceite financeiro e CI/CD remoto continuam pendentes.

### Dependencias e exportacao Excel

- UUID transitivo do ExcelJS atualizado de 8.3.2 para 11.1.1 por override restrito, sem reduzir ExcelJS ou atualizar os demais pacotes.
- Falha de limites de buffer reproduzida na biblioteca e corrigida; nenhum caminho exploravel identificado na exportacao atual.
- 23 novos testes de limites e compatibilidade, 590 testes totais e build aprovados; auditoria npm sem vulnerabilidades conhecidas nesta consulta.
- Sem publicacao, banco ou views alterados. [Registro, evidencias e limites](docs/registro-etapa-2026-09-21-dependencias-excel.md).

### Cache e atualizacao web

- Worker sem novos caches de conteudo; remocao restrita ao legado do projeto, preservando caches de outras aplicacoes.
- Offline neutro e sem dados financeiros; registro do worker sem cache de atualizacao e sem recarga automatica de abas.
- HTML com no-store, codigo versionado com cache imutavel e recursos ausentes com 404, sem fallback HTML para JavaScript.
- 567 testes e 45 grupos de navegador aprovados nesta etapa, incluindo migracao real do worker e recuperacao online. Sem publicacao em HML. [Registro e limites](docs/registro-etapa-2026-09-21-cache-atualizacao.md).

## [Nao publicado] - 2026-09-18

### Carregamento sob demanda

- Sessao/login separados do painel; administracao, graficos, tabelas e auditoria carregados conforme o uso, com estados acessiveis e recuperacao por recarga.
- Entrada reduzida de 727 kB para 208 kB de JavaScript; maior modulo com 405 kB. Volume total permanece semelhante; nao representa aceleracao de consultas RM.
- Limites de tamanho integrados ao build/CI existente. 532 testes e 58 grupos de navegador aprovados, incluindo build compilado, falha de modulo e contexto alterado durante importacao.
- Sem publicacao ou alteracoes de banco. [Registro e limites](docs/registro-etapa-2026-09-18-carregamento.md).

### Fidelidade e acessibilidade dos graficos

- Roscas sem inflacao de zero/angulo minimo; negativos usam barras e distribuicoes zeradas ou indisponiveis possuem estado explicito.
- Tabelas alternativas, filtros por teclado e ampliacao com foco/Escape; series preservam lacunas/nulos e matriz diferencia sinais/zero/ausencia.
- Agregados duplicados ficam indisponiveis; nomes de series nao interferem no periodo ou na leitura dos valores. Rotulos distinguem rateio e baixa.
- 524 testes e 52 grupos de navegador aprovados; sem consultas RM, banco ou publicacao. [Registro e limites](docs/registro-etapa-2026-09-18-graficos.md).

### Ajuda dos indicadores e estado comparativo

- Explicacoes dos KPIs com formula, unidade, origem, data de referencia e limites em dialogo acessivel por clique/teclado; foco e fechamento conferidos em celular/desktop.
- Planejamento de periodo anterior/ano anterior nos filtros aplicados, com duracoes e avisos; variacao continua indisponivel sem cobertura/versao da fonte.
- Modos nao disparam consultas extras; ajuda acompanha contexto e desaparece com falha ou encerramento da sessao.
- 485 testes e 42 grupos de navegador aprovados, sem RM/HML, migrations ou publicacao. [Registro](docs/registro-etapa-2026-09-18-ajuda-indicadores.md).

### Contratos de comparativos

- Planejamento compartilhado de periodo anterior/ano anterior, mes fechado/livre, anos bissextos e avisos de duracao/sobreposicao.
- Comparacao condicionada a completude, cobertura continua e contexto equivalente; estoque exige evidencia historica, sem presumir que status atual a forneca.
- Aritmetica decimal, razao com base positiva, pontos percentuais e uniao de categorias sem zeros artificiais. Dependencia decimal.js-light 2.5.1 explicita.
- 444 testes e 12 grupos de navegador demonstrativo aprovados, mais sete de datas operacionais. Contratos preparados, nao ativados sobre as bases RM. [Registro](docs/registro-etapa-2026-09-18-comparativos.md).

### Datas e periodos

- Validacao compartilhada de calendario, intervalos e campos de data; API recusa entradas invalidas antes de cache/conexao financeira e tela impede aplicacao.
- Datas civis parametrizadas com conversao SQL explicita; fim inclusivo preservado e agrupamento diario independente de fuso/horario de verao.
- 377 testes e sete grupos novos de navegador aprovados; limites temporais e historicos documentados, sem acesso RM/publicacao. [Registro](docs/registro-etapa-2026-09-18-datas-periodos.md).

### Estados de consulta do painel

- Carregamento, falha e nova tentativa por endpoint, sem manter resultados de filtros anteriores nem transformar indisponibilidade em zero.
- Descarte de respostas atrasadas, invalidacao de grafico ampliado, validacao estrutural de respostas e horario global apenas no sucesso completo.
- Ajuste de largura com filtros ativos em celulares; 326 testes e 28 grupos de navegador aprovados.
- Sem acesso RM/publicacao; snapshot e frescor da origem ainda nao certificados. [Registro e limites](docs/registro-etapa-2026-09-18-estados-painel.md).

### Revisao de indicadores

- Catalogo das formulas reais do backend separado dos contratos demonstrativos e das pendencias de conciliacao RM.
- Medias de atraso preservam fracao; razao baixa/rateio sem base positiva permanece indisponivel e contagens condicionais usam COUNT_BIG.
- Cards distinguem registros/nomes/numeros de identidades unicas e rateio de caixa; empresa de maior volume selecionada pelo valor.
- Retirado percentual global de registros afetados que somava ocorrencias potencialmente sobrepostas.
- 305 testes e cinco grupos visuais de indicadores aprovados; sem consulta RM/publicacao. [Registro e limites](docs/registro-etapa-2026-09-18-indicadores.md).

### Filtros e paginacao

- Listas com nomes contendo virgulas usam parametros repetidos sem alterar o valor selecionado; compatibilidade legada preservada e mistura ambigua rejeitada.
- Ordenacao comum entre tabela/export, incluindo desconto/juros/multa, com desempates pelos campos disponiveis e indicacao acessivel do sentido.
- Paginacao valida inteiros e limites antes da consulta; ordenacao volta a primeira pagina e ultima pagina removida e recuperada automaticamente.
- 287 testes, 13 grupos de navegador e 16 grupos PostgreSQL locais aprovados. Chave unica das views e snapshot/conciliacao RM permanecem pendentes.
- [Registro e limites](docs/registro-etapa-2026-09-18-filtros-paginacao.md).

### Completude das exportacoes

- Exportacao acima de 5.000 registros retorna aviso sem arquivo parcial; ate o limite mantem todas as linhas e cabecalhos fixos, inclusive sem resultados.
- Busca e ordenacao da tabela enviadas ao export; lista explicita de campos e geracao do XLSX antes de iniciar resposta.
- Cancelamento ao mudar recorte/contexto, erro acessivel e apenas uma acao de exportacao na tabela analitica.
- Verificacao anterior de logos/auditoria concluida localmente; suite ampliada para 224 testes. Sem acesso RM ou publicacao.
- [Registro, evidencias e limites](docs/registro-etapa-2026-09-18-exportacoes.md). Filtros com virgulas, desempate estavel e exportacoes maiores continuam no backlog.

### Logos e consulta de auditoria

- Upload com decodificacao/normalizacao WebP, limites de bytes/resolucao, metadados removidos e evento de auditoria; validacao publica tambem para imagens legadas.
- Referencias de logos limitadas a caminhos locais, incluindo copias do navegador; logos externas bloqueadas sem reescrever cadastros. Extensoes maiusculas preservadas.
- Fila limitada de decodificacao e cache interno de logos; formulario com erro inline, previa e controle de envio; proxy local de uploads.
- Tela administrativa de auditoria com filtros, paginacao correta, detalhes, recuperacao de erro e descarte de respostas antigas.
- Testes de conteudo/API/navegador e 16 grupos PostgreSQL reais ampliados. Sem alteracao remota ou publicacao.

### PostgreSQL compartilhado local

- Reaproveitado `equilibrio_auth.equilibrio_ti` no container compartilhado existente, sem novo banco/container ou alteracao dos demais projetos.
- Backup local antes das migrations 002/003, catalogo/hash conferidos; restore completo ainda pendente.
- Configuracao local protegida fora do Git, chaves exclusivas, runtime separado do proprietario e administrador local sem seed de empresas.
- `dev` e comandos `local:*` usam destino fixo local, sem carregar a configuracao remota legada.
- 168 testes automatizados e 14 grupos integrados PostgreSQL reais aprovados; schema sintetico removido, zero tentativas RM. Build e quality gate aprovados, 2 alertas moderados permanecem.
- Sem deploy, push, conversao de credenciais reais ou acesso a homologacao nesta etapa. Registros abaixo preservam o historico anterior a aplicacao local.

### Credenciais protegidas e auditoria

- AES-256-GCM com vinculacao ao tenant, conjunto de chaves e conversao/rotacao explicita; nenhuma senha real convertida.
- Migration 003 preparada, nao aplicada. Startup/db:check recusam credenciais legadas ou inacessiveis; nenhum fallback silencioso para texto puro.
- Auditoria transacional de empresas, usuarios, senhas e logout; autorizacao registrada antes de exportar ou acessar tenant como administrador.
- Endpoint de auditoria restrito, paginado e sem dados financeiros/segredos; retencao e privilegios operacionais pendentes.
- Pools e cache versionados por conexao; descarte de conexoes antigas e tratamento de concorrencia.
- 157 testes locais aprovados. Procedimento de operacao e backlog/LGPD atualizados, sem deploy ou migration.

### Autorizacao, entrega e privacidade

- Autorizacao com cadastro atual, empresa ativa, versao de sessao e revogacao por token; cliente nao pode selecionar outro tenant.
- Logout remoto, invalidacao apos troca/reset de senha e edicao de usuario, validacao de cadastros e respostas de empresas sem credenciais.
- Migration 002 preparada, nao aplicada; startup apenas verifica versoes. Comandos explicitos db:check e db:init.
- Correcao de porta SCP, recuperacao apos falha de restart e verificacao de schema antes de trocar release.
- Atualizacoes compativeis de dependencias: auditoria reduzida de 15 alertas (8 altos) para 2 moderados; nenhuma mudanca forcada de ExcelJS.
- LGPD promovida a requisito transversal; papeis contratuais e canal ainda inexistentes, conforme informado pelo usuario. Plano e inventario registrados sem declaracao de conformidade integral.
- Erros internos minimizados, identificador de correlacao e expiracao automatica do cache financeiro em memoria.
- 126 testes locais aprovados; nenhum deploy, migration ou acesso a bases reais nesta etapa.

### Isolamento no navegador e confiabilidade das consultas

- Contexto de sessao/empresa centralizado, limpeza de cache e cancelamento de requisicoes na troca de empresa, login e logout, inclusive entre abas.
- Cache financeiro somente em memoria e descarte de respostas atrasadas, incluindo exportacoes e operacoes administrativas.
- Reinicializacao da interface na mudanca de contexto e validacao dos metadados locais da empresa.
- Busca de filtros corrigida, tabela com tratamento de erro/repeticao e exportacao respeitando a pesquisa atual.
- 72 testes aprovados no total, incluindo 17 novos; 8 grupos de verificacoes da interface normal com API interceptada. Sem acesso a bases reais nesta etapa.
- Backlog e registro de etapa atualizados; mensagem final ao Leonardo adiada ate concluir as frentes independentes das views.

### Fontes reais e avaliacao de APIs

- Correcao de escopo apos esclarecimento do usuario: avaliacao de APIs apenas documental; piloto, benchmark, criacao de contas e migracao nao autorizados. INT02-INT06 preservados somente como possibilidades fora da execucao atual.

- Inspecao de fontes somente em leitura, sem bootstrap, com selecao explicita de tenant ou configuracao legada.
- Relatorios locais sem credenciais, fora do Git, e testes de protecao/encerramento das conexoes.
- Inventario das views acessiveis e roteiro de conciliacao; valores reais ainda nao conciliados.
- Pesquisa oficial de APIs RM, requisitos de usuario de integracao por cliente e fluxo de prova de cobertura, isolamento e desempenho.
- Backlog ampliado com INT01-INT06; nenhuma API de cliente ativada nem fonte atual substituida.

### Etapa 0: especificacao e demonstracao

- Modo local `npm run demo`, exclusivo de desenvolvimento, sem API ou bancos reais.
- Massa sintetica de dois tenants com rateio, baixa parcial, encargos, estorno, cancelamento e historico.
- Prototipo de comparativos, cards explicativos, faixas de atraso, detalhe e exportacao CSV.
- Contratos iniciais de acesso e indicadores, perguntas para integracao RM e testes com oraculos conhecidos.
- Historico e pendencias do backlog preservados; seguranca real e conciliacao RM continuam pendentes.

## [Nao publicado] - 2026-07-09

### Adicionado

- Documentacao viva do projeto no padrao Atenza em `docs/`.
- Workflow inicial de CI com build, auditoria alta/critica e artefato de deploy.
- Scripts `typecheck`, `audit:high` e `ci:check`.
- Registro de diagnostico, backlog, riscos, perfis, roteiro de testes e infraestrutura.
- Rate limit inicial para login, troca de senha e reset administrativo de senha.
- Migrations versionadas para o schema PostgreSQL de autenticacao.
- Comando `npm run db:migrate`.
- Testes automatizados com Vitest e Supertest para smoke/security checks do servidor.
- Documentacao de PostgreSQL local para desenvolvimento.

### Alterado

- `.env.example` saneado para remover valores reais ou sensiveis.
- `.gitignore` reforcado para arquivos locais de ambiente e caches.
- `package-lock.json` atualizado via `npm audit fix` sem `--force`.
- Producao passa a bloquear `JWT_SECRET` fraco/padrao e senha admin ausente/padrao.
- Seed demo condicionado por ambiente/configuracao.
- CORS passa a usar lista de origens permitidas.
- Exportacao passa a baixar Excel via `fetch` autenticado, sem token na URL.
- Upload de logo passa a limitar tamanho e aceitar apenas PNG, JPG ou WebP.
- Backend passa a exportar `createApp()` separado do bootstrap para permitir testes sem subir servidor.

### Riscos conhecidos

- Vulnerabilidade moderada transiente em `uuid` via `exceljs`; a correcao automatica disponivel exige `npm audit fix --force` com mudanca potencialmente quebradica indicada pelo npm.
- Pendencias de seguranca antes de producao: validar hardening em homologacao, definir HTTPS/dominio, revisar armazenamento de `db_password`, observabilidade e backup.
