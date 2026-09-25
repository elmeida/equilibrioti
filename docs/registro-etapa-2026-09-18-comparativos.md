# Registro de etapa: contratos dos comparativos

Data: 18/09/2026. Equilibrio BI, marca Equilibrio TI; governanca Atenza. Desenvolvimento local; projeto permanece em homologacao.

## Entregas

- [Contrato comparison-v1](contrato-comparativos-2026-09-18.md), implementado em modulo compartilhado entre JavaScript e TypeScript, sem conexao de banco.
- Periodo anterior e ano anterior, bases mensal/livre explicitas, acumulado anual, ajuste bissexto, fechamento mensal, duracoes e avisos de sobreposicao/ajuste.
- Verificacao dos dois contextos, cobertura continua com deteccao de lacunas, completude da consulta e evidencia de reconstrucao para estoque historico. Sem evidencia, diferencas permanecem indisponiveis.
- Diferencas decimais precisas, base zero/negativa com motivo, taxas em pontos percentuais e razao relativa rotuladas separadamente. Categorias exclusivas preservadas sem zero artificial.
- Demonstracao local existente reutiliza regras comuns, mostra duracoes/avisos e trata limite inferior do calendario sem quebrar a tela. Nenhuma nova empresa/base ficticia criada, nenhuma carga no PostgreSQL.
- Declarada dependencia direta decimal.js-light 2.5.1, antes transitiva; lock atualizado. Demonstracao continua excluida do build publicado e sem acesso API/RM.

## Verificacoes

- 444 testes em 17 arquivos aprovados, incluindo 67 novos casos de comparativos e regressao dos contratos existentes. Casos de calendario em quatro fusos, cobertura interna, contextos divergentes, precisao decimal e categorias ausentes.
- 12 grupos de navegador da demonstracao aprovados, com origens externas e rotas API bloqueadas. Incluem fronteira do calendario, fevereiro fechado 28/29 dias, cobertura parcial, troca de contexto e telas 1440/768/390/320 px. Capturas em `tmp/demo-qa/`, evidencias locais nao publicadas.
- Sete grupos da interface operacional de datas aprovados novamente. Nenhuma consulta real de cliente foi executada.
- Typecheck/build aprovados. Bundle operacional permanece em 703,03 kB antes de gzip, sem inclusao do modulo demonstrativo; aviso de tamanho permanece.
- Auditoria no limiar configurado aprovada, ainda com dois alertas moderados transitivos uuid/ExcelJS. Nao aplicado downgrade forcado.
- Sem migrations, reinicio do backend, consulta RM/HML, alteracao de views, commit, push ou deploy. Credenciais e banco compartilhado local preservados.

O teste de largura aguarda o grafico concluir seu redimensionamento antes de medir overflow. A primeira medicao imediata capturava a largura anterior da legenda; a assercao final foi mantida, sem ocultar overflow via CSS ou ampliar timeout.

## Limites

As rotas reais ainda nao entregam cobertura, versao comum da carga e evidencia historica suficientes. O motor foi preparado e validado localmente, mas os comparativos numericos reais nao foram ativados. Metadata declarada nao equivale a prova da origem; autorizacao continua nas camadas existentes.

Precisao e integridade das views, chaves, aditividade de baixas/rateios, fuso de negocio, status passados e referencias de conciliacao continuam pendentes. Previsoes e saldo historico nao foram certificados.

LGPD: sem ampliacao de campos, copia de dados reais ou novos tratamentos nesta etapa. Responsabilidades, canal de privacidade, retencao e demais pendencias de governanca permanecem; nao ha declaracao de conformidade integral.

## Proxima etapa sugerida

Integrar aos cards operacionais a explicacao dos indicadores e o estado dos comparativos: periodos/duracoes, eixo temporal e motivo de indisponibilidade. Nao criar percentuais reais enquanto faltarem metadados; preservar dados atuais validos e falhas por bloco. Preparar essa interface com respostas simuladas de teste, sem cadastrar clientes ficticios no ambiente.

A mensagem consolidada para Leonardo continua reservada ao encerramento das frentes independentes. Ainda existem trabalhos locais, operacionais e de governanca alem das views.

## Atualizacao posterior

Ajuda dos KPIs e planejamento/indisponibilidade dos comparativos integrados na [etapa seguinte](registro-etapa-2026-09-18-ajuda-indicadores.md). Percentuais reais continuam nao ativados por falta dos metadados exigidos.
