# Registro de etapa: revisao de indicadores financeiros

Data: 18/09/2026. Equilibrio BI, marca Equilibrio TI; governanca Atenza. Somente desenvolvimento local. Projeto permanece em homologacao.

## Entregas

- [Catalogo dos 26 KPIs e limites das analises](catalogo-indicadores-backend-2026-09-18.md), com formula implementada, granularidade, datas, precisao, nulos, fontes e pendencias de aceite. Contratos sinteticos anteriores preservados, sem declara-los equivalentes a dados reais.
- Contagens rotuladas como registros, media de rateio por linha, nomes/numeros distintos em vez de clientes/documentos unicos. IDs da API mantidos por compatibilidade.
- Medias de atraso convertem DATEDIFF para decimal antes de AVG em tres pontos. Falta de amostra preserva null; media 1,5 e exibida sem truncar para 1. Contagens condicionais de KPIs usam COUNT_BIG, retornando zero em consulta vazia bem-sucedida.
- Razao baixa/rateio retorna null quando denominador nao e positivo. Interface diferencia valor indisponivel de zero real; nao limita excesso a 100% nem esconde numeradores negativos. Esta regra nao foi estendida automaticamente a todas as rotas legadas de rankings/analises.
- Empresa de maior volume escolhida por valor, independentemente da ordem alfabetica da serie. Lista original nao e modificada.
- Retirados os cards que somavam registros afetados de regras diferentes e apresentavam percentual global de registros distintos. Ocorrencias por severidade continuam visiveis; nao inventada deduplicacao sem chave da origem.
- Resumos de fluxo passam a dizer rateio/baixa no recorte, sem chama-los de caixa realizado certificado. Renomeacao integral dos graficos e contrato temporal de fluxo/estoque continuam pendentes.

## Verificacoes

- 305 testes em 14 arquivos aprovados. Testes novos cobrem razao/nulos/zero/excesso, maior volume, sobreposicao de alertas, rotulos e renderizacao dos cards; testes das rotas verificam SQL emitido e transporte de null/fracoes usando bancos simulados.
- Oraculo sintetico de titulo com dois rateios e baixa repetida demonstra por que contagem de linhas/soma de baixa nao comprovam titulo unico ou residual. Valores em unidades inteiras de quatro casas no teste. Nao e execucao do SQL Server nem prova de repeticao nos clientes reais.
- Cinco grupos de navegador focados nos indicadores aprovados, com APIs interceptadas e origens externas bloqueadas. Capturas desktop e celulares 390/320 px em `tmp/metrics-qa/`. Nenhum dado real de cliente usado.
- Regressao de contexto/filtros/exportacao: 13 grupos de navegador adicionais aprovados. Verificacao HTTP local de login/auditoria/logos aprovada, com logout ao final.
- Typecheck/build finais aprovados, com aviso de bundle de 698,45 kB antes de gzip. Auditoria sem altos/criticos no limiar configurado; dois alertas moderados transitivos uuid/ExcelJS permanecem.
- Backend local reiniciado com as alteracoes; frontend em `http://127.0.0.1:5175`. Sem migration, leitura RM, mudanca de views, push ou deploy. Testes PostgreSQL da etapa anterior continuam como evidencia historica; nao equivalem a execucao destas formulas no RM.

## O que nao foi certificado

Baixas parciais continuam fora dos agregados que filtram somente Em Aberto. VLRBAIXA nao foi presumido como principal nem evento aditivo por rateio. Nao se implementou residual por subtracao generica. Saldo historico, cancelamentos/estornos, tolerancia de arredondamento, moeda e fuso dependem do contrato e de exemplos RM.

Rankings/concentracao agrupam nomes e ainda possuem regras legadas para base vazia/negativa. O campo `registrosAfetados` por regra permanece na API com limites de identidade/concatenacao, mas nao fundamenta mais os cards de contagem unica global.

A formatacao dos KPIs nao encerra D06: o carregador pode preservar resultados anteriores em erro e outros componentes ainda tratam ausencias como zero. Proxima etapa deve tratar falha/atualizacao por bloco, descarte de valores de filtros anteriores e distincoes entre sem movimento, indisponivel e dado desatualizado.

LGPD permanece transversal: somente fixtures locais isoladas, sem ampliacao de dados pessoais, nem conteudo financeiro em logs. Responsabilidades contratuais, canal, retencao, custodia e justificativa de campos continuam pendentes. Nao ha declaracao de conformidade integral.

## Proxima etapa

D06/UX06: estados de dados confiaveis no painel. Em falha ou mudanca de recorte, nao exibir resultado antigo como atual nem ausencia como zero; tratar estados por bloco e testar respostas fora de ordem/erros parciais. Depois continuar contratos temporais e frentes independentes restantes.

A mensagem consolidada para Leonardo fica para quando as frentes independentes terminarem. O catalogo ja organiza perguntas de chaves, granularidade, aditividade, eventos, datas e referencias sem solicitar recriacao de views indiscriminadamente.

## Atualizacao posterior

Os estados por bloco e o descarte de resultados anteriores foram implementados na [etapa seguinte](registro-etapa-2026-09-18-estados-painel.md). O diagnostico acima retrata o momento desta revisao; snapshot/frescor e validacao integral de campos continuam pendentes.
