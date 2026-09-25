# Registro de etapa: credenciais e auditoria

Data: 17/09/2026. Equilibrio BI. Marca Equilibrio TI; governanca documental Atenza. Projeto em homologacao, alteracoes somente locais.

## O que foi feito

- Criptografia autenticada das senhas de conexao, vinculada a empresa e com suporte a rotacao de chave.
- Conversao explicita de credenciais legadas, verificacao sem escrita e bloqueio de startup/deploy com credencial desprotegida ou chave ausente.
- Migration 003 preparada: versao da conexao e tabela de auditoria; nao aplicada.
- Registro de cadastros, alteracoes, trocas de senha e logout na mesma transacao da operacao. Falha da auditoria impede confirmacao.
- Registro previo de acessos administrativos a empresas e autorizacao de exportacoes, sem conteudo financeiro, payloads ou segredos.
- Consulta de auditoria restrita ao administrador geral, com paginacao e filtro por empresa.
- Descarte de pools antigos, protecao contra conexoes atrasadas e cache financeiro separado por versao da conexao.
- Inspecao de fontes adaptada para credenciais cifradas; seed explicito nao grava mais senha RM em texto.

## Validacao

157 testes aprovados em 8 arquivos: os 126 anteriores preservados e 31 novos cenarios. Incluem adulteracao de envelope, empresa incorreta, rotacao/chave ausente, leitura sem escrita, rollback da conversao, auditoria minima/atomica, acesso restrito, exportacao bloqueada sem auditoria e concorrencia dos pools/cache.

Os testes usam PostgreSQL/SQL Server simulados e exercitam primitivas reais de criptografia e rotas reais da aplicacao. Nao comprovam execucao das migrations, privilegios reais do PostgreSQL, TLS RM, desempenho sob carga, restore ou regras financeiras.

O comando completo de qualidade local verifica testes, tipagem, compilacao e auditoria alta/critica. Permanecem dois alertas moderados relativos a uuid/ExcelJS e aviso de pacote JavaScript maior que 500 kB. Nenhuma dependencia foi atualizada nesta rodada.

## O que nao foi alterado

Nao houve consulta a bases reais, conversao de senha real, criacao de chave operacional, alteracao do `.env` real, migration, Docker, VPS, deploy, commit ou push. Nenhuma formula financeira ou view foi alterada. Documentacao registrada nos arquivos locais; nao publicada no Git remoto.

## Pendencias por frente

- Desenvolvimento: tela de auditoria, cobertura de demais eventos, MFA/recuperacao, uploads, exportacao sem truncamento e evolucao dos indicadores.
- Infra: PostgreSQL local exclusivo do projeto, cofre/custodia de chaves, papeis de banco separados, TLS e teste de backup/restore. Aplicacao das migrations e conversao somente apos autorizacao.
- Gestao: contratos, papeis de tratamento, canal LGPD, retencao e descarte. Ausencia dessas definicoes confirmada pelo usuario; nao inventadas.
- Leonardo/clientes: dicionario/contratos de dados e lacunas reais das views, alem de referencias para conciliacao; sem nova solicitacao nesta rodada.

M04 e M05 avancaram, mas nao estao integralmente concluidos: controles escritos e testados localmente ainda precisam de ativacao/validacao integrada e itens complementares.

## Proxima etapa sugerida

Preparar o ambiente PostgreSQL/Docker local isolado e o roteiro de testes integrados das migrations, auditoria e criptografia. E possivel criar os arquivos de configuracao e verificacao sem alterar bancos existentes; execucao de migrations/conversao deve ser autorizada com destino confirmado. Em paralelo, completar a exportacao e a tela de auditoria sem depender das views.

A mensagem final ao Leonardo permanece para o encerramento das frentes independentes. Ainda ha pendencias de desenvolvimento, infraestrutura e governanca LGPD, portanto nao restam apenas ajustes em views.

Referencias: [operacao de credenciais/auditoria](credenciais-auditoria-operacao.md), [plano LGPD](lgpd-plano-adequacao.md), [backlog](backlog-evolucao-multiempresa-analytics-2026-09-17.md).
