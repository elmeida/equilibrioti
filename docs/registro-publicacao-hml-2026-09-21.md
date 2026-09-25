# Publicacao de homologacao: Equilibrio BI

Data: 21/09/2026. Marca Equilibrio TI; governanca Atenza. Publicacao e preparacao da VPS, banco e HTTPS autorizadas pelo responsavel nesta etapa. Nao e liberacao de producao nem aceite financeiro.

## Resultado

- URL: https://equilibrio-bi-homologacao.atenza.digital
- VPS: `atenza-hml-apps-01.atenza.cloud`. Servico existente `equilibrioti.service`, agora executado por usuario de sistema exclusivo, sem root, em `127.0.0.1:3032`.
- Release final: `20260921-125622`, em `/var/www/equilibrio-bi-hml/releases/20260921-125622`, apontada por `current`.
- SHA-256 do pacote: `b65b1f7dbbe11b058e8f0877bacd70d31feb611699f95d584a9e395157196e47`.
- Release intermediaria compativel preservada: `20260921-124622`. Instalacao antiga preservada, com permissoes restritas. Nenhuma release excluida.

Publicadas as melhorias locais de autorizacao/isolamento, credenciais/auditoria, logos, exportacao, filtros/datas/paginacao, indicadores/ajuda, graficos, carregamento, cache e dependencias. Comparativos numericos reais continuam indisponiveis sem cobertura/versionamento das fontes. Nao habilitadas previsoes ou integracao por API RM.

## Situacao encontrada e tratada

O servico antigo reiniciava por falha de conexao ao PostgreSQL: apontava ao IP externo, enquanto a conexao interna funcionava. A porta antiga 3012 pertence atualmente a outro projeto. Nao foi reutilizada nem alterado esse outro projeto.

O Node global era 18.19.1. Foi instalado Node 22.23.2 em `/opt/atenza/equilibrio-bi/`, exclusivo desta aplicacao, com SHA-256 conferido contra a distribuicao oficial. O Node global nao foi alterado. Dependencias da release instaladas com lockfile; importacoes reais de imagem e Excel verificadas.

O schema `atenza.equilibrio_ti` possuia somente empresas/usuarios. Antes das alteracoes foram preservados arquivos, uploads, configuracao do servico e dump custom do schema. Catalogo e hashes conferidos. Aplicadas migrations 001/002/003 sem seed: duas empresas e tres usuarios antes/depois. Duas credenciais RM existentes foram cifradas, sem alterar seus valores de conexao ou as views.

Criado papel runtime exclusivo, sem superusuario, criacao de banco/papel ou bypass RLS. Verificacao efetiva: zero tabelas legiveis fora do schema do projeto; sem UPDATE/DELETE/TRUNCATE na auditoria. Proprietario de migrations separado do runtime. Credencial administrativa antiga nao e usada pelo servico novo.

O segredo de assinatura de sessao antigo nao atendia ao tamanho minimo exigido. Foi substituido por valor aleatorio forte, com copia protegida. Sessoes antigas deixam de ser validas e exigem novo login. Apos autorizacao expressa adicional, somente a senha do administrador existente (id 1) foi redefinida com valor aleatorio forte, hash bcrypt custo 12 e incremento de session_version. Operacao transacional registrada como `user.password_reset`, ator maintenance, request_id `ede02685-8ad6-4b8f-a05f-98668410fd4b`. Demais senhas preservadas. Nenhuma conta de Douglas ou Leonardo foi criada ou teve permissoes ampliadas. A nova senha nao integra esta documentacao ou o Git; troca pelo titular recomendada no primeiro acesso.

## HTTPS e proxy

Registro A exclusivo criado na Cloudflare com proxy ativo, apos confirmacao especifica do endereco. Certificado Let's Encrypt emitido na origem, valido ate 20/12/2026 e com renovacao gerenciada pelo Certbot. Configuracao Nginx exclusiva; apenas recarga apos teste de sintaxe. Avisos antigos de outros hosts foram observados, sem alterar suas configuracoes.

O teste publico identificou cabecalho de encaminhamento sem configuracao correspondente no Express. Correcao com `TRUST_PROXY_LOOPBACK=true`, desabilitada por padrao no codigo; backend ligado somente ao loopback. Nginx aceita `CF-Connecting-IP` somente dos intervalos oficiais da Cloudflare e substitui `X-Forwarded-For` pelo endereco verificado. Seis testes adicionados para limites de confianca, cabecalhos falsos e separacao de tentativas entre clientes. Revalidar a lista de redes em manutencoes futuras.

Cloudflare alterava o cache do worker para quatro horas. A rota exata `/sw.js` recebeu `no-store` no proxy; verificacao final publica retornou `Cache-Control: no-store` e `CF-Cache-Status: BYPASS`. HTML e APIs continuam sem armazenamento. O endereco recebe `X-Robots-Tag: noindex, nofollow, noarchive`.

## Validacoes

1. Quality gate anterior ao deploy: 590 testes, typecheck, build e auditoria aprovados. Apos ajuste de proxy: 596 testes em 23 arquivos, typecheck e auditoria aprovados, incluindo 108 testes focados de proxy/autorizacao/cache. Frontend compilado com API relativa, sem localhost; limites do bundle aprovados.
2. Na VPS: banco/migrations/chaves conferidos pelo comando `db:check`; biblioteca de imagens e geracao Excel funcionais; runtime sem privilegios administrativos; servico final ativo, contador de reinicios zero.
3. HTTPS publico via Cloudflare: pagina, JS, CSS, worker e healthcheck 200; APIs sem autenticacao e login invalido 401; arquivo JS ausente 404/JSON, nao HTML. HTML/API/worker com politicas de cache conferidas.
4. Duas fontes RM existentes: conexao e `SELECT TOP (0)` da consulta unificada aprovados, zero lancamentos extraidos. Isso verifica compatibilidade estrutural, nao valores, desempenho de consultas completas ou precisao financeira.
5. DNS respondeu em resolvedor publico e na VPS. O resolvedor da rede local ainda retornava NXDOMAIN para o novo nome; a tentativa visual no navegador local nao concluiu. HTTPS foi confirmado pela VPS com resolucao normal e externamente via IP Cloudflare resolvido, mantendo verificacao de certificado. Propagacao/caches locais podem atrasar o acesso.
6. Apos o reset autorizado, login real do administrador pelo HTTPS publico aprovado. APIs de sessao, empresas, usuarios e auditoria retornaram 200. Nas duas empresas, indicadores, grafico de status, tabela paginada e exportacao Excel retornaram 200 para o recorte de 03/08/2026. Arquivos Excel recebidos somente em memoria, com tipo e assinatura ZIP conferidos, sem divulgar linhas ou valores. Teste inicial solicitou pageSize=5, corretamente rejeitado com 400; corrigido para o minimo permitido de 10, a repeticao terminou sem falhas. Nao houve alteracao de dados RM. Logout retornou 200 e reutilizacao do token retornou 401. Isso confirma funcionamento das rotas, nao conciliacao financeira, navegacao visual completa ou aceite do cliente.

## Backup e recuperacao

Backup protegido na VPS: `/opt/atenza/backups/equilibrio-bi/20260921-124622`. Copia fora da VPS, com acesso local restrito ao usuario/SYSTEM: `C:\Users\herto\.atenza-backups\equilibrio-bi\20260921-124622\recovery-final.tar.gz`. Contem dados e segredos: nao enviar ao Git, CRM ou mensageria.

Hash da copia final conferido nas duas pontas: `4f5b62e4e932a4f8e455e01acecd02e1d127524f4b65ba109fce7b6904478f78`. Catalogo do dump validado; restore integral ainda nao ensaiado. Retencao, copia protegida independente adicional e custodia definitiva precisam de definicao.

O rollback de codigo deve usar release compativel com migrations e senhas cifradas. A intermediaria 124622 e compativel, mas anterior ao ajuste final do proxy. Nao voltar simplesmente ao diretorio legado: ele nao entende o novo formato de credenciais. Restaurar schema/configuracao exige janela, autorizacao, preservacao dos dados posteriores e teste em destino isolado. Nao restaurar o banco compartilhado inteiro.

## Git, CI/CD e pendencias

Publicacao feita por SSH com pacote verificado, sem commit/push. O remoto configurado e publico e a conta autenticada tem apenas leitura: `push=false`, `admin=false`; consulta aos secrets retornou 403. Nenhum workflow remoto estava listado. Nao e correto declarar CI/CD automatico ativado. Regularizar repositorio oficial/permissoes e revisar o destino/segredos do pipeline antes de ativa-lo.

Leonardo/Equilibrio TI: indicar validador, usar conta individual e fechar contrato/ajustes das views para identificacao unica de titulo/rateio, baixas parciais/estornos, datas, cobertura e relatorios de referencia. As views das duas conexoes existentes estao estruturalmente compativeis; nao pedir recriacao indiscriminada. Ainda nao ha divergencia financeira medida que justifique um patch SQL especifico.

Gestao: papeis de tratamento, canal de privacidade e retencao continuam pendentes; nao ha certificacao de conformidade LGPD integral. Infra/desenvolvimento: aceite visual pelo usuario, monitoramento, restore e ativacao rastreavel do CI/CD. Proxima etapa sugerida: troca da senha pelo titular e validacao assistida com Leonardo ou Douglas em conta individual, seguida da conciliacao RM e regularizacao do pipeline.

## Referencias

- [Distribuicao oficial Node.js](https://nodejs.org/dist/v22.23.2/SHASUMS256.txt).
- [Redes IPv4 Cloudflare](https://www.cloudflare.com/ips-v4/) e [redes IPv6 Cloudflare](https://www.cloudflare.com/ips-v6/), consultadas para limitar a confianca no proxy.
