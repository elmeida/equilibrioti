# LGPD: plano de adequacao e criterios de liberacao

Data: 17/09/2026. Projeto: Equilibrio BI. Produto White Label: Equilibrio TI. Governanca documental: Atenza. Status: adequacao em andamento, sem declaracao de conformidade integral.

## Diretriz obrigatoria

Por solicitacao do usuario, privacidade e protecao de dados sao requisitos de todo o projeto, inclusive desenvolvimento local, Docker, homologacao, integracoes, suporte, exportacoes e futuras analises preditivas. Nao se restringem a publicar uma politica ou obter um aceite generico.

A LGPD exige considerar finalidade, necessidade, transparencia, seguranca e responsabilizacao, assim como direitos dos titulares e registro das operacoes. As decisoes de base legal, retencao e responsabilidade devem ser aprovadas pelos responsaveis, com revisao juridica adequada. Referencia: [texto compilado da LGPD, especialmente arts. 6, 7, 18, 37 e 46](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm).

## Decisoes ainda nao existentes

O usuario confirmou em 17/09/2026 que ainda nao existe definicao contratual dos responsaveis pelo tratamento nem canal de privacidade do produto.

Nao atribuir automaticamente os papeis de controlador, operador ou suboperador a Atenza, Equilibrio TI ou clientes. Mapear quem decide finalidade e meios em cada operacao, inclusive administracao da plataforma e dados originados do RM, e formalizar instrucoes e responsabilidades. A marca White Label nao determina esses papeis. Referencia: [guia da ANPD sobre agentes de tratamento](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-para-definicoes-dos-agentes-de-tratamento-de-dados-pessoais-e-do-encarregado).

Nao publicar canal, razao social, CNPJ, base legal ou prazo de retencao inventados. Ainda sao necessarios: entidades juridicas envolvidas, responsabilidades por operacao, canal de atendimento, encarregado ou enquadramento aplicavel, operadores de infraestrutura, localizacao do armazenamento e condicoes contratuais.

## Inventario preliminar a partir do codigo

| Operacao | Dados e origem | Onde passam ou ficam | Pendencia |
|---|---|---|---|
| Autenticacao e administracao | Nome, e-mail, perfil, vinculo, hash de senha, horarios de cadastro/login | PostgreSQL de autenticacao; navegador recebe usuario publico e token | Definir finalidade/base legal, retencao de conta, exclusao e atendimento |
| Consulta financeira | CLIFOR, CODCFO, NUMERODOC, HISTORICO, NUMCHEQUE, CONTA, datas e valores das views RM | SQL Server do cliente, API, cache do processo e memoria do navegador | Classificar campos por cliente e retirar dados nao necessarios; texto livre pode conter informacoes indevidas |
| Filtros e pesquisa | Nomes, termos pesquisados e identificadores | URL da API e memoria; proxy pode registrar URL | Revisar logs de proxy/acesso e evitar persistencia dos termos |
| Exportacao | Registros financeiros do recorte solicitado | Arquivo Excel no dispositivo do usuario | Autorizar, registrar e orientar guarda/compartilhamento; arquivo baixado nao e apagado pelo logout |
| Configuracao de integracao | Host, banco, usuario e senha de conexao por empresa | PostgreSQL central e memoria do backend | Criptografar/cofre, rotacionar e restringir operadores; segredo ainda armazenado em texto |
| Sessao e revogacao | Identificador aleatorio do token, usuario, versao e expiracao | Token no localStorage; versao e revogacoes no PostgreSQL | Avaliar cookies HttpOnly e protecao contra XSS; revogacoes expiradas limpas em logout, rotina dedicada ainda pendente |
| Logos | Arquivo enviado pelo administrador | Diretorio de uploads e URL publica | Confirmar que so contem marca autorizada; reforcar verificacao real do arquivo |
| Infraestrutura e suporte | Logs, backups e eventuais evidencias de incidentes | Destinos reais ainda nao inventariados | Definir acesso, localizacao, prazo, descarte, restore e canais seguros |

Este inventario nao consultou lancamentos reais nem comprova ausencia de dados sensiveis em texto livre. Dados financeiros associados a uma pessoa exigem protecao; nao se deve confundir automaticamente essa categoria com a definicao legal especifica de dado pessoal sensivel.

## Controles ja implementados localmente

- Isolamento por empresa na autorizacao, inclusive antes de acessar cache; cliente nao seleciona outro tenant e administrador geral seleciona explicitamente.
- Verificacao do usuario/perfil/vinculo atuais, empresa ativa, revogacao de token e versao de sessao.
- Token reduzido a identificador do usuario, versao, identificador da sessao e datas; sem nome, e-mail ou permissoes copiadas no token.
- Logout local descarta cache e contexto; revogacao individual e solicitada ao servidor. Falha de rede nao e apresentada como revogacao confirmada.
- Troca/reset de senha e edicao de usuario invalidam sessoes anteriores.
- Dados financeiros sem cache persistente no sessionStorage; API responde com `Cache-Control: private, no-store`.
- Cache financeiro do servidor limitado a 256 entradas, com remocao automatica ao expirar o prazo. Rotas atuais usam prazos de 4 ou 8 minutos; esses prazos tecnicos nao definem retencao legal dos bancos, backups ou arquivos exportados.
- Respostas de cadastro/listagem de empresas sem senha de conexao e sem campos fora da lista permitida.
- Erros inesperados sem SQL, payload, credenciais ou detalhes internos em resposta/log do tratamento central; identificador aleatorio permite correlacao. Isso nao substitui auditoria de acesso nem revisao dos logs externos.
- Testes com dados controlados e bancos simulados, sem copiar bases de clientes para desenvolver esta etapa.

Os controles novos de servidor exigem a migration 002 e testes integrados antes de serem considerados ativos em homologacao. Nada foi publicado ou migrado nesta etapa.

## Backlog obrigatorio

| ID | Prioridade | Entrega e criterio | Responsabilidade proposta / status |
|---|---|---|---|
| LG01 | P0 | Formalizar papeis, instrucoes, finalidades, bases legais, canal de privacidade e contratos de tratamento por operacao | Gestao Atenza/Equilibrio TI e clientes, com revisao juridica; decisao pendente |
| LG02 | P0 | Completar registro de operacoes e inventario por campo/fonte/destinatario; justificar cada campo exibido/exportado | Desenvolvimento e responsaveis pelos dados; preliminar acima |
| LG03 | P0 | Proteger segredos armazenados, validar acesso minimo, transporte seguro, backups e isolamento integrado | Desenvolvimento/Infra; parcial, vinculado a M02-M06 e SC01/SC05 |
| LG04 | P0 | Definir retencao e descarte por categoria, incluindo contas, auditoria, exports, caches, backups e encerramento de contrato | Gestao/Infra/Desenvolvimento; sem prazos legais presumidos ou exclusoes automaticas de dados RM |
| LG05 | P0 | Aprovar aviso de privacidade e atendimento a direitos: identificacao proporcional, registro, triagem, encaminhamento e resposta segura | Responsaveis definidos em LG01; canal inexistente, nao publicar aviso ficticio |
| LG06 | P0 | Plano de resposta a incidentes, contatos, avaliacao, preservacao de evidencias e comunicacoes conforme regras aplicaveis | Gestao/Infra; elaborar e ensaiar, sem inventar dispensa ou prazo |
| LG07 | P1 | Auditar acessos administrativos, exports e alteracoes com autor, tenant, acao, resultado e correlacao; sem conteudo financeiro/senhas | Desenvolvimento; M05 e SC05, persistencia/retencao pendentes |
| LG08 | P1 | Avaliar riscos das comparacoes/predicoes e necessidade de relatorio de impacto; evitar treinamento cruzado e reidentificacao | Gestao/Desenvolvimento; antes de liberar PR03-PR05 |
| LG09 | P0 | Inventariar hospedagem, suporte, fornecedores, localizacoes e eventual transferencia internacional; aprovar garantias aplicaveis | Gestao/Infra; nao verificado |

## Criterios antes da validacao com clientes reais

1. Identificar responsavel por cada tratamento, autorizacao para a finalidade de homologacao e pessoas com acesso.
2. Validar isolamento integrado, credenciais de leitura, transporte seguro e nao exposicao em logs/exports.
3. Utilizar recorte minimo necessario e procedimento de descarte/retencao aprovado; nao assumir que homologacao autoriza copia irrestrita.
4. Disponibilizar informacoes de privacidade e canal real aprovados conforme o papel de cada agente.
5. Registrar excecoes, riscos e aceite dos responsaveis. Nao apresentar projeto como integralmente aderente enquanto houver lacunas.

Aviso publicado no aplicativo deve seguir Equilibrio TI. Documentos formais enviados aos parceiros seguem templates Atenza. Este arquivo e um registro tecnico interno, nao substitui politica aprovada ou parecer juridico.

## Atualizacao incremental: credenciais e auditoria

17/09/2026, posterior ao inventario acima: senhas de conexao passam a ser cifradas em novas gravacoes; ferramenta explicita de conversao/rotacao preparada, sem execucao. LG03 avancou no codigo, mas bases e backups existentes nao foram convertidos. Chaves ainda nao foram provisionadas e o cofre/backup/TLS dependem da Infra.

LG07: persistencia minima de auditoria implementada para alteracoes administrativas, senha/logout, acesso de admin ao tenant e autorizacao de exportacao. Mutacoes e evento confirmados na mesma transacao; leitura restrita ao administrador geral. Sem nomes/e-mails/payloads/segredos nos eventos. Identificadores continuam exigindo retencao e acesso controlados. Nao foi definida exclusao automatica sem politica aprovada.

Migration 003 nao aplicada. Controle de privilegios do banco, resistencia a adulteracao por proprietario/superusuario, cobertura de eventos restantes, identidade humana da manutencao e retencao continuam pendentes. Responsabilidades contratuais e canal de privacidade continuam inexistentes, conforme informado pelo usuario. [Escopo e limites operacionais](credenciais-auditoria-operacao.md).

## Atualizacao posterior: ambiente local compartilhado

17/09/2026: migrations 002/003 aplicadas somente ao banco local existente, apos autorizacao e backup. Chaves locais provisionadas em arquivos fora do Git, com ACL Windows restrita. Runtime separado do proprietario, sem UPDATE/DELETE/TRUNCATE na auditoria, validado com PostgreSQL real. LG03/LG07 avancam localmente; nao ha equivalencia automatica com homologacao ou producao.

Nao foram copiados clientes ou dados financeiros para desenvolvimento; cadastros sinteticos ficaram somente em schema de teste removido. O schema de desenvolvimento tem apenas administrador local e nenhuma empresa. Backup do banco foi conferido por catalogo/hash, sem ensaio completo de restore. Chaves/copia independente protegida, retencao, transporte remoto, governanca do cluster e controles contra administradores privilegiados continuam pendentes. Arquivos locais restritos nao substituem cofre e protecao do host. [Registro da etapa](registro-etapa-2026-09-17-postgres-local.md).

## Atualizacao posterior: logos e consulta de auditoria

LG03: upload de imagem normalizado e limitado, metadados originais removidos e referencias externas de logo bloqueadas inclusive no contexto do navegador. Nao ha analise automatica do conteudo visual para identificar dados pessoais. Logos continuam publicas e devem conter apenas identidade de marca. Cadastros/arquivos legados nao foram reescritos; referencias bloqueadas exigem correcao explicita.

LG07: administrador geral pode consultar eventos por empresa/acao/resultado/periodo/correlacao, sem nomes/e-mails adicionais na tela. Upload gera evento minimo; falha de auditoria impede resposta de sucesso e tenta remover somente o arquivo recem-criado. Queda abrupta ainda pode deixar orfao, sem exclusao automatica nao aprovada. Retencao, custodia, MFA e protecao contra administradores privilegiados continuam pendentes. [Registro e limites](registro-etapa-2026-09-17-logos-auditoria.md).

## Atualizacao de 18/09/2026: exportacoes

LG02 parcial: lista de 22 campos financeiros ja existentes agora e explicita na geracao do arquivo; campos inesperados e historico livre nao sao incluidos. Resultado superior a 5.000 linhas e bloqueado com aviso, sem arquivo parcial. Geracao em memoria, sem arquivo temporario financeiro no servidor e sem cache HTTP. Cancelamento no navegador evita downloads antigos apos mudar recorte/contexto, mas nao equivale a cancelamento da consulta SQL.

LG07: auditoria continua registrando autorizacao antes da leitura, sem conteudo financeiro/filtros pessoais. Nao comprova geracao nem recebimento do arquivo; eventos de desfecho seguem pendentes. Justificativa de cada campo, permissao especifica, custodia/retencao dos downloads e definicoes contratuais/canal continuam abertos. [Registro da etapa](registro-etapa-2026-09-18-exportacoes.md).
