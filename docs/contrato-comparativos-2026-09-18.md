# Contrato de comparativos temporais

Data: 18/09/2026. Equilibrio BI, marca Equilibrio TI; governanca Atenza.
Versao inicial do contrato: `comparison-v1`. Implementacao compartilhada em `server/analytics/comparisons.js`, com declaracoes TypeScript adjacentes. Nao e aceite financeiro das views RM.

## Escopo e integracao

O modulo puro planeja intervalos, verifica compatibilidade/cobertura e calcula diferencas decimais. Nao consulta bancos, nao autoriza usuarios, nao cria empresas e nao altera a fonte atual. As rotas financeiras reais ainda nao fornecem o conjunto de metadados exigido e nao foram ligadas a esse modulo nesta etapa.

A demonstracao local existente reutiliza planejamento, cobertura e aritmetica basica, mantendo seu contrato ficticio separado. Ela nao valida o RM nem passa a representar bases reais. Nao houve cadastro de empresas ou carga de dados no PostgreSQL.

## Planejamento dos periodos

`planComparison(period, mode, basis)` recebe datas civis com limites inclusivos. Inicio/fim devem existir no calendario, estar ordenados e ser compativeis com o contrato SQL de filtros. Intervalos abertos nao permitem comparacao. Comparacao fora dos anos suportados e recusada, nunca deslocada para 1900 ou outro ano.

| Entrada | Regra |
|---|---|
| `mode=none` | Sem periodo anterior; nao ha variacao |
| `previous`, `basis=range` | Intervalo imediatamente anterior com o mesmo numero de dias inclusivos |
| `previous`, `basis=month` | Inicio no dia 1; mesmo dia de corte do mes anterior, limitado ao ultimo dia valido |
| Mes fechado, `basis=month` | Mes anterior fechado completo, mesmo com duracao diferente |
| `year`, `basis=range` | Mesmas datas no ano anterior; 29/02 ajustado para 28/02 quando necessario |
| `year`, `basis=month` | Mesmo mes/corte do ano anterior; mes fechado permanece fechado, inclusive fevereiro de 28 para 29 dias |
| Acumulado anual | Intervalo 01/01 ate corte com `mode=year`, `basis=range`; o corte nao e alongado para compensar dia bissexto |

O padrao do modulo e `range`. O consumidor deve informar `month` explicitamente: iniciar no dia 1 nao torna todo intervalo livre um recorte mensal. Somente a demonstracao antiga mantem a inferencia mensal para compatibilidade com seus controles.

O resultado inclui os dois intervalos, duracoes inclusivas e avisos `unequal-days`, `calendar-adjusted` e `overlapping-periods`. Diferenca de duracao nao e escondida nem normalizada automaticamente. Intervalos longos comparados com o ano anterior podem se sobrepor: o aviso deve ser exibido. Comparacoes sobrepostas nao sao amostras independentes.

| Exemplo | Periodo anterior |
|---|---|
| 01-17/09/2026, mensal | 01-17/08/2026: 17 e 17 dias |
| 01-17/09/2026, livre | 15-31/08/2026: 17 e 17 dias |
| 01-30/03/2026, mensal parcial | 01-28/02/2026: 30 e 28 dias, ajuste informado |
| 01-28/02/2025, mes fechado, ano anterior | 01-29/02/2024: 28 e 29 dias |
| 29/02/2024, livre, ano anterior | 28/02/2023: um dia em cada lado |

Nenhum planejamento usa o relogio atual implicitamente. O consumidor define o corte e o tipo de periodo. Mes corrente incompleto deve ter o corte explicito; cobertura ainda precisa ser verificada, mesmo que as datas sejam validas.

## Elegibilidade obrigatoria

`comparePeriods` exige, nos dois resultados:

- Sucesso e `complete=true`: uma resposta parcial, truncada ou ainda carregando nao e comparavel.
- Datas exatamente iguais aos intervalos planejados. Dados de outra consulta nao podem ser reaproveitados silenciosamente.
- Contexto conhecido e igual: empresa, indicador, versao da regra, filtros dimensionais, versao comum da carga, fuso, campo de data, unidade, natureza de fluxo/estoque e moeda quando monetaria.
- Cobertura `verified` por intervalos explicitos. Trechos adjacentes/sobrepostos podem formar cobertura continua; lacunas internas bloqueiam, mesmo que MIN/MAX alcancem as extremidades. Ausencia de linhas ou uma lista vazia nao comprovam cobertura.
- Para estoque, evidencia `historical=true` de posicao reconstruida, fornecida pela camada confiavel de origem. Status corrente do titulo nao atende a essa condicao.
- Valores decimais validos; nulos e ausencia de valor nao sao zero.

Esses metadados devem vir do backend/adaptador autorizado, nunca de afirmacao livre enviada pelo navegador. `sourceVersion` representa a mesma edicao/carga dos dados nos dois lados, nao apenas a versao do schema. `filtersKey` deve representar filtros dimensionais canonicos, sem incluir as datas distintas planejadas. O modulo verifica igualdade; nao gera esses identificadores nem comprova que a fonte falou a verdade.

A verificacao de empresa e uma defesa de consistencia, nao substitui autenticacao, autorizacao multiempresa, conexao isolada e controles de cache existentes. Nenhum metadado recebido do cliente pode ampliar acesso.

`historical=true` pressupoe contrato aprovado de saldo inicial/eventos, baixas parciais, estornos/cancelamentos e data de corte. Um booleano isolado nao produz evidencia financeira. A integracao real ainda precisa implementar e testar essa proveniencia.

Falha de elegibilidade retorna `status=unavailable`, motivo especifico e diferencas nulas. Os valores originais nao sao alterados; o consumidor pode manter o atual valido, acompanhado do motivo da comparacao indisponivel.

## Aritmetica e apresentacao

`decimalChange` e a primitiva matematica, sem verificacao de cobertura. Consumidores reais devem usar `comparePeriods` para aplicar as condicoes anteriores.

- Valores de entrada sao strings decimais canonicas, sem separador de milhar, virgula ou notacao exponencial. Aceitam ate 38 digitos inteiros e 18 casas decimais; numeros JSON sao recusados para nao ocultar arredondamento binario anterior. A origem deve preservar o decimal antes de serializar, nao converter um numero ja impreciso em texto.
- Diferenca absoluta = atual menos anterior. Saida decimal textual, sem arredondar moeda no motor.
- Razao relativa = diferenca / anterior somente quando anterior > 0. E uma fracao: `0.2` corresponde a 20%. Saida arredondada em 12 casas, half-up. Arredondamento de exibicao monetaria e tolerancia RM continuam contratos separados.
- Base anterior zero/negativa mantem diferenca absoluta, com razao relativa nula e motivo. Zero contra zero nao fabrica 0%.
- Taxas entram como fracoes. De 0.08 para 0.10: diferenca 0.02, dois pontos percentuais e razao relativa 0.25. Os rotulos nao sao intercambiaveis.
- Contagens exigem inteiros nao negativos. Valores monetarios e taxas negativas nao sao recortados ou convertidos em positivos.
- Crescimento/reducao nao significa automaticamente melhora/piora. O motor nao aplica cores ou julgamento de desempenho.

Usada `decimal.js-light` 2.5.1 com precisao interna de 80 digitos, ja presente transitivamente e agora declarada como dependencia direta. Isso nao certifica precisao do agregado RM nem recupera casas perdidas em rotas legadas que retornam numeros.

## Categorias e series

`alignCategories` faz uniao por ID, preservando categorias exclusivas do anterior ou do atual. Nao cruza empresas nem cria chaves a partir de nomes. IDs duplicados e valores invalidos sao recusados; colecoes nao sao modificadas.

Ausencia permanece `null`, com presenca de cada lado explicita. So um contrato de origem pode afirmar que categoria ausente em universo integral corresponde a zero; nesse caso o adaptador deve fornecer zero explicito. As views ainda precisam de identificadores/granularidade conciliados para essa integracao.

A demonstracao preserva dias excedentes nas series, com nulo fora do intervalo do outro lado. Alinhamento ordinal de dias nao representa a mesma data civil, nem dispensa datas e duracoes visiveis.

## Criterios para a proxima integracao

1. Cards devem mostrar ambos os periodos, duracoes, eixo temporal e avisos do plano.
2. Sem metadados reais suficientes, mostrar comparacao indisponivel com motivo; nao calcular automaticamente a partir de dois KPIs legados.
3. Ajuda contextual deve identificar formula, unidade, origem, versao, corte e limites, distinguindo registros, titulos, fluxo e estoque.
4. Testes devem manter isolamento de contexto, descarte de respostas antigas e falhas por bloco, inclusive ao trocar modo de comparacao.
5. Conciliacao e aceite RM continuam separados. Nao ativar previsoes nem apresentar saldo historico como validado por estes testes locais.
