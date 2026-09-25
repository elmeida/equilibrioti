# Registro de etapa: cache, atualizacao e funcionamento offline

Data: 21/09/2026. Equilibrio BI, marca Equilibrio TI; governanca Atenza. Implementacao e testes locais. Projeto permanece em homologacao, sem publicacao nesta etapa.

## Diagnostico

O service worker anterior armazenava respostas GET fora de `/api/`, incluindo uploads de logos, HTML, arquivos externos e respostas de erro. Nao respeitava automaticamente a politica HTTP `no-store` das logos ao copiar respostas para CacheStorage. Seu fallback podia devolver o HTML principal quando faltava um arquivo JavaScript, CSS ou imagem. A ativacao tambem excluia caches sem limitar a limpeza ao projeto.

No servidor, arquivos ausentes podiam cair no fallback da aplicacao e receber HTML com status de sucesso. Isso era especialmente inadequado para modulos carregados sob demanda apos uma atualizacao.

## Entregas

- Worker passa a operar sem CacheStorage para novos conteudos: nao pre-carrega nem grava consultas, exports, uploads, HTML ou arquivos da aplicacao. Requisicoes que nao sejam navegacao GET para `/` ou `/index.html` da propria origem seguem diretamente pelo navegador.
- Ativacao remove somente caches cujo nome comeca com `equilibrioti-financeiro-`. O teste parte de uma versao antiga instalada e confirma a limpeza, preservando um cache de outra aplicacao na mesma origem.
- Navegacao solicita HTML da rede sem armazenamento. Falha de rede retorna documento offline neutro, com status 503, `no-store`, sem scripts, fontes externas, dados financeiros, identificacao de cliente ou reflexo dos parametros da URL.
- Aviso offline usa marca Equilibrio TI e oferece tentativa explicita por teclado. Nao ha painel financeiro offline nem sincronizacao de operacoes em segundo plano.
- Registro do worker usa `updateViaCache: 'none'`. Nao foi adicionado recarregamento automatico ao trocar o controlador, preservando rascunhos de abas abertas.
- Entrega estatica separada em `server/web/staticApp.js`: HTML recebe `no-store`; worker, manifesto e recursos publicos sem hash recebem `no-cache`; somente JS/CSS com hash no nome dentro de `/assets` recebem cache HTTP publico imutavel de um ano.
- Recursos ausentes, namespaces reservados e requisicoes que esperam JSON nao recebem o HTML da aplicacao. Arquivo de versao antiga indisponivel retorna 404 e aciona a recuperacao explicita do modulo, em vez de ser substituido por conteudo incorreto.
- `X-Content-Type-Options: nosniff` aplicado na entrega estatica. Politicas `private, no-store` das APIs e `no-store` das logos foram preservadas. Nenhuma regra financeira, permissao de empresa ou consulta ao RM foi alterada.

## Verificacoes

- 567 testes em 21 arquivos aprovados, incluindo 35 novos casos para instalacao/ativacao, limpeza restrita, rotas excluidas, offline, erros HTTP, cabecalhos e arquivos ausentes.
- Seis grupos novos com service worker realmente ativo: migracao do cache legado; nova versao sem recarga involuntaria; ausencia de persistencia de respostas; falha/recuperacao de modulo; offline sem dados antigos; retorno online com revalidacao da sessao.
- Regressao de 39 grupos anteriores: contexto/isolamento (13), estados por bloco (10), graficos (10) e carregamento compilado (6). Total de 45 grupos de navegador executados nesta etapa. Demais roteiros visuais mantem os registros das etapas anteriores, sem alegacao de nova execucao aqui.
- `scripts/check-web-cache-ui.mjs` compila com API relativa e usa servidor temporario somente em 127.0.0.1, com a mesma entrega estatica do projeto e APIs sinteticas. O navegador bloqueia origens externas; nenhum acesso RM/PostgreSQL ou cadastro de clientes ficticios.
- Teste aguarda a conclusao do estado `activated`, nao apenas `controllerchange`, antes de conferir a limpeza assincrona. Uma segunda versao do worker e exercitada com rascunho de e-mail preenchido e sem recarregamento espontaneo.
- Capturas em `tmp/web-cache-qa/`, com aviso offline conferido em desktop e celular 320 px. Servidor temporario e navegador encerrados ao final dos testes.
- `npm run ci:check` aprovado: testes, typecheck, build, limites de tamanho e auditoria de dependencias. Entrada permanece perto de 208 kB; maior modulo perto de 405 kB, sem aviso acima de 500 kB.
- Auditoria sem alertas altos/criticos; os dois alertas moderados transitivos uuid/ExcelJS permanecem. Nao foi aplicada correcao forcada com quebra de compatibilidade.
- Sem migration, alteracao de banco, conexao RM/HML, commit, push ou deploy. Servidor local existente em `http://127.0.0.1:5175` preservado. Worker e politica de entrega foram exercitados no build compilado temporario, nao ativados em homologacao.

## Limites e LGPD

Estas medidas reduzem persistencia indevida no navegador, mas nao certificam conformidade integral. Token de sessao e metadados de empresa continuam usando o armazenamento existente, nao modificado nesta etapa. Dados ja renderizados podem permanecer em memoria de uma aba aberta; nao ha apagamento de downloads, capturas, historico ou caches HTTP legados de todo o navegador. Nenhum cache de outra aplicacao foi removido.

O cache HTTP de longa duracao fica restrito ao codigo estatico versionado; demais recursos publicos sem hash podem ser armazenados com revalidacao obrigatoria. HTML, APIs e logos de clientes recebem no-store. A limpeza do CacheStorage legado ocorre quando a nova versao do worker consegue instalar e ativar. Dispositivos que ainda nao receberam a atualizacao nao foram saneados por estes testes.

Abas abertas podem continuar executando a versao anterior ate recarga. Nao foi implementada retencao de assets de releases antigos no servidor nem compatibilidade automatica entre versoes da API. Arquivos antigos indisponiveis falham explicitamente, e nao se promete atualizacao sem interrupcao. Validar cabecalhos efetivos do proxy, HTTPS, distribuicao e navegadores alvo apos autorizacao para homologacao.

Papeis contratuais, canal de privacidade, retencao, restore e demais frentes LGPD/operacionais continuam pendentes. A consulta financeira real, cobertura da fonte e conciliacao com RM nao foram certificadas.

## Proxima etapa sugerida

Analisar e tratar os alertas moderados da cadeia uuid/ExcelJS sem regressao nas exportacoes: verificar alcancabilidade, alternativas compativeis e testes dos arquivos gerados antes de atualizar dependencias. Nao aplicar atualizacao forcada ou reducao de versao sem avaliacao.

Ainda nao restam apenas ajustes nas views. A mensagem consolidada para Leonardo continua reservada ao encerramento das frentes independentes.

## Referencias tecnicas

- Distincao entre proibicao de armazenamento, revalidacao e cache imutavel: [MDN, Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control).
- Verificacao de atualizacao sem consultar o cache HTTP do worker: [MDN, updateViaCache](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/updateViaCache).
- Ciclo de instalacao e ativacao: [MDN, Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).
