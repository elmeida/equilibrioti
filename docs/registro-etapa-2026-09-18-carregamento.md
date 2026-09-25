# Registro de etapa: carregamento inicial sob demanda

Data: 18/09/2026. Equilibrio BI, marca Equilibrio TI; governanca Atenza. Somente desenvolvimento local; projeto permanece em homologacao.

## Entregas

- Separacao entre sessao/login (`App`) e painel financeiro (`BIDashboard`). A verificacao de sessao e o descarte por revisao de contexto foram preservados.
- Administracao e painel financeiro carregados apos a identificacao do perfil/contexto. Graficos carregados ao montar uma aba que os utiliza; tabelas somente na primeira aba que as utiliza; auditoria somente ao abri-la.
- Modulos carregados com React lazy/Suspense e barreira de erro. Estados de carregamento e falha possuem nome acessivel; falha de grafico nao retira os indicadores ja disponiveis. Recuperacao explicita por recarga da pagina, sem ciclos automaticos.
- O cache do carregador guarda codigo, nao respostas financeiras, empresa, filtros ou credenciais. Props e consultas continuam no contexto corrente; logout e troca de empresa desmontam a tela anterior mesmo com importacao pendente.
- Manifesto de build e verificacao automatica de tamanho adicionados. `npm run build` inclui `bundle:check`; o CI existente ja chama esse build por `ci:check`. Nao houve ativacao ou execucao remota do pipeline.
- Limites iniciais: 260.000 bytes de JavaScript inicial, 85.000 bytes gzip estimado e 500.000 bytes por modulo. Dependencias estaticas transitivas sao somadas uma vez; modulos dinamicos nao sao contados como entrada, mas possuem limite individual. O limite do compilador nao foi elevado para ocultar avisos.

## Medicao

Valores de arquivos compilados locais, nao tempos de resposta do RM ou Core Web Vitals de clientes reais. kB abaixo usa 1.000 bytes. Gzip e estimativa calculada sobre os arquivos; a transferencia real depende do servidor/proxy.

| Medida | Antes | Depois |
|---|---:|---:|
| JavaScript inicial da entrada/login, sem compressao | 727.428 bytes | 208.269 bytes |
| JavaScript inicial, gzip estimado | 216.993 bytes | 66.705 bytes |
| Maior modulo, sem compressao | 727.428 bytes | 404.713 bytes |
| Aviso de modulo acima de 500 kB | Presente | Ausente |

Reducao de aproximadamente 71,4% no JavaScript inicial e 69,3% na estimativa gzip. O build de teste com API na propria origem mediu 208.248 bytes na entrada; a pequena diferenca corresponde a configuracao publica de URL.

O total de todos os modulos e aproximadamente 731 kB. Nao houve eliminacao desse volume: ele foi distribuido conforme o uso. A primeira abertura do painel com graficos ainda requer aproximadamente 690 kB de JavaScript somando entrada e dependencias; nao deve ser anunciada como 71% mais rapida. Grafico: aproximadamente 405 kB; painel: 71 kB; administracao: 21 kB; tabelas: 13 kB; auditoria: 7 kB, alem de dependencias compartilhadas.

## Verificacoes

- 532 testes em 20 arquivos aprovados, incluindo oito casos novos de limites, dependencias transitivas/ciclicas, exclusao dos modulos adiados e ausencia de evidencias de tamanho.
- Regressao dos 52 grupos anteriores de navegador aprovada no servidor local: contexto (13), indicadores (5), estados por bloco (10), datas (7), ajuda KPI (7) e graficos (10).
- Seis grupos novos sobre build compilado: entrada sem codigo protegido/API; cliente sem administracao/tabela antecipada; auditoria independente dos graficos; falha e recarga por teclado em 320 px; logout entre abas durante importacao; troca de empresa com grafico ainda pendente.
- `scripts/check-lazy-loading-ui.mjs` gera build de teste com API relativa e abre um preview temporario apenas em 127.0.0.1. Todas as APIs sao interceptadas com respostas sinteticas; origens externas sao bloqueadas. Browser e preview encerrados ao terminar. Nao cadastra empresas ficticias nem consulta bancos.
- Service worker desabilitado nesses cenarios para medir as requisicoes dos modulos sem interferencia de cache. Nao representa validacao de funcionamento offline, atualizacao de PWA ou distribuicao em HML.
- Capturas da entrada e falha recuperavel em `tmp/lazy-loading-qa/`, conferidas visualmente. Erro de download do modulo e induzido no teste de recuperacao; demais cenarios sem erros de execucao.
- Typecheck/build, limites de tamanho e auditoria sem alertas altos/criticos aprovados. Dois alertas moderados transitivos uuid/ExcelJS permanecem.
- Sem alteracao de backend, banco, migrations, views ou conexoes; sem commit, push, deploy ou acesso a RM/HML. Aplicacao local em `http://127.0.0.1:5175`.

## Limites e proxima etapa

Carregamento sob demanda nao e autorizacao: o backend continua responsavel por validar perfil e empresa em cada operacao. Falha de modulo oferece recarga completa, que perde filtros e rascunhos mantidos apenas em memoria. A barreira depende de a entrada principal ter carregado; nao cobre indisponibilidade integral do site.

O service worker existente nao foi alterado. Proxima etapa sugerida: revisar cache e atualizacao da aplicacao, restringindo o que pode persistir no navegador e evitando retorno de HTML como modulo ou mistura de versoes apos publicacao. Incluir verificacoes de offline/atualizacao e limites alinhados a LGPD antes de validar o comportamento em homologacao.

Conciliacao RM, cobertura/versionamento dos dados, comparativos numericos reais, aceite dos clientes, restore e ativacao remota de CI/CD continuam pendentes. Papeis, canal e retencao LGPD precisam de definicao; esta etapa nao certifica conformidade integral. Ainda existem frentes independentes das views, portanto a mensagem consolidada para Leonardo permanece reservada.
