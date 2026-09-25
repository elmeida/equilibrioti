# Credenciais protegidas e auditoria: operacao

Data: 17/09/2026. Equilibrio BI / Equilibrio TI. Governanca Atenza. Implementado localmente, sem ativacao em homologacao.

## Protecao das credenciais

As senhas RM de novos cadastros e alteracoes sao cifradas com AES-256-GCM antes da gravacao. O identificador da empresa, a versao do formato e o identificador da chave fazem parte dos dados autenticados. Copiar um envelope para outra empresa ou modificar seus componentes invalida a leitura. A senha em claro existe transitoriamente no backend/driver para abrir a conexao, nunca na resposta administrativa ou auditoria.

Nao foi criado algoritmo criptografico proprio: o projeto usa as primitivas do runtime e verifica autenticidade antes de devolver a senha decifrada. Referencia: [API crypto do Node.js, Cipheriv/Decipheriv e AAD](https://nodejs.org/api/crypto.html).

Campos de configuracao:

- `TENANT_CREDENTIAL_ACTIVE_KEY`: identificador da chave usada nas novas gravacoes.
- `TENANT_CREDENTIAL_KEYS`: objeto JSON com identificadores e respectivas chaves de 32 bytes em base64 canonico.
- Chaves exclusivas por ambiente, distintas de `JWT_SECRET`, fora do Git, logs e documentos. O `.env.example` contem apenas campos vazios, sem chave utilizavel.
- Nao gerar/redefinir automaticamente a chave ao iniciar. Perda das chaves impede recuperar as senhas armazenadas e pode exigir novas credenciais RM.

O codigo suporta um conjunto de chaves para rotacao, mas nao provisiona um cofre externo. Infra deve definir armazenamento protegido, acesso minimo, custodia, backup e recuperacao das chaves separados do backup do banco. O conjunto configurado precisa conter as chaves antigas enquanto existirem envelopes ou backups que dependam delas.

## Preparacao autorizada de banco existente

Nenhum comando de escrita abaixo foi executado nesta etapa. Confirmar primeiro o destino, backup/restore, janela, custodia das chaves e autorizacao. O banco local de desenvolvimento deve ser exclusivo do projeto; nao apontar ao banco remoto para contornar a indisponibilidade local.

1. Preparar as chaves no ambiente e conservar as chaves anteriores quando houver rotacao.
2. Aplicar migrations pendentes, incluindo `003_credentials_audit.sql`, somente apos autorizacao. Essa migration cria auditoria e versao de conexao, mas nao converte senhas.
3. Executar `node server/db/credentials.js --check`: transacao somente leitura, total de credenciais legadas e de chaves antigas, sem imprimir senhas ou nomes de clientes.
4. Apos aprovacao especifica da conversao, executar `node server/db/credentials.js --apply`. O comando cifra as senhas legadas ou recifra envelopes de chave antiga, incrementa a versao da conexao e audita cada alteracao na mesma transacao. Falha em qualquer item reverte o lote.
5. Executar `npm run db:check`. A verificacao do deploy e do startup agora tambem bloqueia credenciais legadas, corrompidas ou inacessiveis por falta de chave; nao ha fallback para texto puro.
6. Validar login, acesso por empresa, consultas, auditoria, exportacao e recuperacao no ambiente local. Publicar em homologacao somente com aprovacao e chaves distribuidas a todas as instancias.

`npm run db:credentials` sem argumentos equivale a verificacao em leitura. O script de inspecao de fontes tambem usa a chave para o tenant selecionado. A opcao explicita `--legacy-env` continua lendo credencial de ambiente, sem associar automaticamente a um cliente.

## Rotacao e recuperacao

1. Acrescentar a nova chave ao conjunto de todas as instancias antes de torna-la ativa ou recifrar.
2. Marcar a nova chave como ativa e executar a verificacao. Preparar/autorizar a recifragem com o mesmo comando de conversao.
3. Conferir funcionamento por tenant e estrategia de restore antes de retirar uma chave antiga. Backups anteriores podem continuar dependendo dela.
4. Mudancas de empresa incrementam `connection_version`; consultas e caches passam a usar essa versao. O processo local fecha o pool anterior. Outras instancias descartam a versao antiga na proxima consulta do tenant.
5. Requisicoes ja em andamento podem falhar durante a troca; conexao atrasada nao substitui a nova e resposta de versao antiga nao alimenta o cache da versao nova.

Nao fazer downgrade para codigo que trata o envelope como senha em texto. Rollback de codigo nao desfaz a conversao. Preservar versao compativel ou preparar restauracao controlada com backup e chaves. Backups legados com senhas em texto continuam sensiveis; sua retencao/descarte precisa de decisao explicita.

## Eventos auditados

Campos gravados: horario do banco, identificador do autor e tipo de ator, empresa, acao, recurso, resultado e identificador de correlacao. Sem nomes, e-mails, senhas, envelopes, tokens, IP, termos pesquisados, SQL, payloads ou valores financeiros. Identificadores ainda exigem protecao e politica de retencao.

| Evento | Semantica |
|---|---|
| company.create / company.update | Cadastro/alteracao e auditoria na mesma transacao |
| user.create / user.update | Cadastro/permissoes e auditoria na mesma transacao |
| user.password_reset / user.password_change | Troca de senha/versao de sessao e auditoria na mesma transacao |
| session.logout | Revogacao do token e auditoria na mesma transacao |
| admin.tenant_access | Acesso autorizado do administrador geral ao contexto; nao atesta conclusao da consulta |
| financial.export | Autorizacao registrada antes de ler/exportar; nao comprova que o usuario recebeu ou abriu o arquivo |
| credentials.reencrypt | Conversao/rotacao administrativa explicita, ator maintenance e correlacao da execucao |

Falha da auditoria impede confirmar mutacoes ou iniciar os acessos/exportacoes cobertos. Falhas das mutacoes tentam registrar resultado `failed` depois do rollback. Se o banco estiver indisponivel, resta um evento operacional minimo `audit_unavailable`, sem mensagem bruta. Validacoes rejeitadas antes da transacao, falhas de login, uploads e teste de conexao ainda nao possuem cobertura completa de auditoria.

A conversao CLI registra ator de manutencao, nao identidade humana verificada. A autorizacao da operacao deve ser vinculada ao identificador de correlacao no registro de mudanca. Definir identidade operacional rastreavel antes de automatizar conversoes.

## Consulta e acesso

`GET /api/admin/auditoria`: somente administrador geral. Parametros opcionais `before` (ID anterior), `empresa_id` e `limit` (1 a 100; padrao 50). Retorno com `rows` e cursor `next`. Paginacao por ID, sem exportacao irrestrita. Tela dedicada ainda nao implementada.

A aplicacao nao possui endpoints para editar ou excluir eventos. A migration revoga escrita destrutiva de PUBLIC, mas isso NAO torna a tabela imutavel para seu proprietario/superusuario. Antes da ativacao, separar papel de migration do papel de runtime, limitar privilegios e testar acesso. Armazenamento externo resistente a alteracao, retencao, descarte e monitoramento continuam pendentes.

## Limites da entrega

Criptografia de senha nao substitui TLS, protecao do host, cofre, backup, MFA, validacao de uploads ou isolamento real testado com PostgreSQL/RM. Flags TLS existentes foram preservadas; a politica de transporte de cada cliente ainda deve ser conferida. Esta etapa nao certifica conformidade integral com LGPD.
