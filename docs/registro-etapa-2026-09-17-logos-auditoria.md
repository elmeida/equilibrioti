# Registro de etapa: logos e consulta de auditoria

Data: 17/09/2026. Produto: Equilibrio BI, White Label Equilibrio TI. Governanca documental: Atenza. Somente desenvolvimento local; projeto continua em homologacao.

## Diagnostico e limite da correcao

O upload anterior confiava no MIME informado pelo navegador e gravava bytes sem decodificar. A reproducao isolada aceitou SVG declarado como PNG/JPEG/WebP. Isso demonstrou aceitacao indevida de conteudo, nao execucao de script no navegador sob MIME raster. O diretorio publico tambem nao aplicava verificacao de conteudo, e os cadastros aceitavam referencias externas de logo.

Invariante adotada: publicar somente pixels raster decodificados e normalizados; nao permitir que referencias de logos iniciem requisicoes externas pelo navegador. Manter PNG/JPEG/WebP validos, resposta de upload `{url}`, campo multipart `logo`, referencias locais existentes e acesso publico as imagens de marca. Arquivos armazenados e cadastros existentes nao foram reescritos ou removidos.

## Implementado

1. Decodificacao por sharp, comparacao do formato real com MIME declarado, rejeicao de conteudo falso/truncado, limite de 2 MB e 4096 x 4096 pixels. Saida WebP de ate 1024 x 1024, preservando proporcao, sem metadados originais nem payload anexado.
2. Nomes aleatorios, gravacao exclusiva, diretorio compartilhado entre escrita/leitura e publicacao apenas apos normalizacao. Upload autorizado somente para administrador, limitado a 10 envios/minuto por conta e dois uploads simultaneos no processo.
3. Leitura publica valida e normaliza tambem imagens raster legadas, sem alterar originais. Bloqueia arquivos ativos, falsos, caminhos invalidos, symlinks de arquivo e arquivos ausentes sem cair na pagina principal. Content-Type explicito e `nosniff`.
4. Compatibilidade com extensoes maiusculas. Decodificacao com duas tarefas simultaneas e fila limitada de 16, evitando falhas no carregamento normal de varias logos. Cache interno de logos normalizadas limitado a 32 entradas/16 MB, com validade de 60 segundos e verificacao de tamanho/data do arquivo.
5. Referencias locais verificadas no cadastro, na autenticacao e nas copias do navegador. URLs externas, relativas a protocolo, data URLs, caminhos ativos/API e travessia rejeitados. Cadastros administrativos com referencia incompativel apresentam logo bloqueada; o valor original permanece no banco ate correcao explicita. URLs externas anteriormente aceitas precisam ser substituidas por envio/local antes de salvar a empresa.
6. Evento `company.logo_upload` registra autor e correlacao, sem arquivo, caminho, imagem ou segredo no evento. Se a auditoria falhar, o arquivo criado pela propria requisicao e removido; falha de limpeza gera evento operacional minimo.
7. Formulario com formatos permitidos, erro inline, bloqueio de salvamento durante envio, atualizacao segura dos campos e previa local da imagem. Proxy de desenvolvimento inclui uploads.
8. Tela de auditoria exclusiva do administrador, com empresa por ID, acao, resultado, datas e correlacao. Mostra horario local, responsavel por ID, empresa, resultado e detalhes. Paginacao por cursor, ultima pagina sem cursor falso, atualizacao, estado vazio, erro/repeticao e cancelamento de respostas antigas.
9. Filtros validados no servidor; cursor limitado ao bigint do PostgreSQL e SQL parametrizado. Periodo usa inicio inclusivo e fim exclusivo; o formulario converte o ultimo dia selecionado para o inicio do dia seguinte no fuso do navegador.

## Evidencias de validacao

- Testes de conteudo: PNG/JPEG/WebP validos, metadados removidos, MIME falso, imagem truncada, MIME divergente, payload anexado, bytes/dimensoes excessivas, multipart extra, autorizacao, falha de auditoria, legado, caminhos invalidos e extensoes maiusculas.
- Seis imagens simultaneas e acessos repetidos verificados sem rejeicao do carregamento normal; filas acima do limite permanecem sujeitas a 503 controlado.
- Testes de API: permissao administrativa, filtros/cursor, ausencia de cache da auditoria e bloqueio de logos externas nas copias antigas de contexto.
- PostgreSQL real: 16 grupos integrados, incluindo upload/evento e filtros combinados. Cadastros sinteticos somente em schema temporario e arquivos em diretorio temporario, removidos ao final; sem RM.
- Navegador: 7 grupos com API interceptada, cobrindo detalhes, navegacao de paginas, filtros/estado vazio, recuperacao de erro, resposta atrasada, desktop/escuro/mobile e formulario de logo. Evidencias em `tmp/admin-qa/`; nao sao dados de clientes.
- Servidor local reiniciado com as alteracoes; `scripts/check-local-admin.mjs` aprovado no endereco `http://127.0.0.1:5175`: login real, filtro de auditoria, cursor fora do limite, logo legada normalizada, bloqueio de formato ativo e logout. A primeira tentativa HTTP durante a lentidao nao concluiu; a repeticao foi aprovada. Nenhuma empresa foi criada por essa verificacao.
- Rodada inicial de `npm run ci:check`: 208 testes, typecheck, build e auditoria de dependencias aprovados. Teste focado apos ajustes de compatibilidade: 31 casos de logos aprovados. Permanecem 2 alertas moderados e aviso de bundle (696,45 kB na compilacao conferida).
- Repeticao final ampliada para 212 testes: 207 passaram e 5 testes antigos de entrega excederam os limites de tempo. Outra tentativa tambem teve timeouts de inicializacao. Uma execucao sequencial direta, sem carregar o `.env` legado e com maiores prazos do runner, ainda apresentou 3 falhas por tempo/encerramento nos processos Bash e foi interrompida. As assercoes e os scripts de entrega nao foram modificados para produzir aprovacao.
- Resultado: implementacao local concluida, mas verificacao final integral pendente (`blocked` no criterio de verificacao completa). Nao declarar o quality gate final aprovado. Evidencias de PostgreSQL e navegador permaneceram aprovadas. Testes nao representam execucao do pipeline remoto nem validacao de calculos RM.
- A ultima tentativa isolada de typecheck tambem permaneceu sem conclusao e foi interrompida durante a lentidao local. O typecheck/build da rodada inicial foram aprovados; nao equivalem a nova aprovacao integral apos os ultimos ajustes. Nao foram alterados limites/assercoes persistentes dos testes nem encerrados processos de outros projetos.

## Limites e pendencias

- Validacao de imagem nao equivale a antivirus nem identifica dados pessoais no conteudo visual. A finalidade e impedir publicacao de bytes/formato indevidos e remover metadados tecnicos.
- Arquivo e banco nao compartilham transacao atomica: queda abrupta pode deixar arquivo orfao. Quotas por armazenamento, reconciliacao/retencao de orfaos e limites distribuidos entre multiplos processos continuam pendentes. Nao apagar arquivos de clientes automaticamente sem politica aprovada.
- Logos sao imagens publicas de marca, nao anexos privados. Nao armazenar documentos ou imagens confidenciais nesse recurso. Dados financeiros nao usam esse cache.
- Antes de publicar em homologacao, confirmar que `/uploads/empresas` passa pelo backend e nao por alias estatico do proxy que contorne a validacao. Verificar instalacao nativa do sharp no Linux da VPS. Nada foi publicado nesta etapa.
- Auditoria nao e imutavel contra proprietario/superusuario. Retencao, MFA, eventos complementares, identificacao humana da manutencao e definicoes contratuais/canal LGPD permanecem abertos.
- Restore completo, duas vulnerabilidades moderadas transitivas e tamanho do bundle seguem no backlog. Nenhuma alteracao em views, RM ou infraestrutura remota.

## Proxima etapa sugerida

Primeiro concluir o quality gate em execucao local estavel, investigando os timeouts sem alterar assercoes ou tocar em outros projetos. Depois, UX05/LG02: revisar limite e completude das exportacoes, feedback ao usuario e minimizacao dos campos exportados, com testes locais. Conciliacao real dos calculos continua dependente das referencias RM. Mensagem final ao Leonardo permanece adiada enquanto houver frentes independentes.

Arquivos centrais: `server/security/logos.js`, `logo-reference.js`, `audit-query.js`, `server/routes/admin.js`, `server/app.js`, `src/components/AdminAudit.tsx`, `src/AdminApp.tsx`, referencias de logo na autenticacao/contexto e proxy Vite. Testes adicionados em `tests/logos.test.js`, `tests/audit-query.test.js`, `scripts/check-admin-ui.mjs`; testes de autorizacao/contexto e PostgreSQL ampliados.

## Revalidacao em 18/09/2026

A pendencia de verificacao local integral registrada acima foi encerrada: 212 testes aprovados com prazos padrao, typecheck/build e auditoria de dependencias aprovados. Nao foi necessario alterar assercoes ou aumentar timeouts. A rodada posterior de exportacoes ampliou a suite para 224 casos. As restricoes de homologacao/Linux, restore, LGPD e dependencias permanecem. [Continuacao e evidencias](registro-etapa-2026-09-18-exportacoes.md).

## Referencias tecnicas

- [sharp: construtor, validacao de entrada e limites](https://sharp.pixelplumbing.com/api-constructor/).
- [sharp: saida e tratamento de metadados](https://sharp.pixelplumbing.com/api-output/).
