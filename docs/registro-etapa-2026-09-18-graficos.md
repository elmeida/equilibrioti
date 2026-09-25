# Registro de etapa: fidelidade e acessibilidade dos graficos

Data: 18/09/2026. Equilibrio BI, marca Equilibrio TI; governanca Atenza. Desenvolvimento local; projeto permanece em homologacao.

## Entregas

- Removidos os valores visuais artificiais das roscas e o angulo minimo que inflava categorias pequenas. Zero com registros nao recebe fatia. Rosca somente com valores conhecidos, nao negativos e soma positiva finita; negativos ou valores ausentes usam representacao alternativa.
- Distribuicoes inteiramente zeradas ou indisponiveis recebem estado textual, sem escala numerica arbitraria. Resumo e tabela mantem os valores individuais. Contagem ausente nao vira zero; contagens sao identificadas como registros, nao titulos unicos.
- Tabelas alternativas em todas as familias de graficos operacionais: categoria, serie mensal/diaria, encargos e matriz. Cabecalhos semanticos, regiao rolavel por teclado e filtros por botoes com nome acessivel/estado selecionado. Nenhum novo campo pessoal ou armazenamento financeiro foi adicionado.
- Series preservam nulos, zero e valores negativos. Eixo de referencia zero e pontos isolados visiveis; lacunas internas de calendario interrompem as linhas. Um marcador identifica o inicio de cada lacuna, sem alocar todos os dias de intervalos extensos. Nenhuma cobertura e inferida antes/depois dos dados retornados.
- Agrupamento de series isola nomes de empresas das propriedades de controle: nomes com ponto, colchetes ou nomes reservados nao alteram periodo ou caminho do valor. Agregados duplicados para o mesmo periodo/serie ficam indisponiveis, sem sobrescrita silenciosa ou soma presumida.
- Matriz distingue positivo, negativo, zero e indisponivel por sinal/texto, alem da cor. Intensidade considera magnitude absoluta; duplicidade de ano/mes fica indisponivel. Coordenadas invalidas nao sao desenhadas; validacao contratual completa da resposta continua pendente.
- Ampliacao usa dialogo nativo com titulo acessivel, fechamento por Escape/botao, foco contido e retorno ao acionador. Mudanca de filtro continua descartando a copia anterior. Nomes longos quebram linha; resumo e tabela nao se sobrepoem em celular.
- Rotulos distinguem rateio por vencimento de baixa por data de baixa. A faixa de vencimento e apresentada como valor de rateio em aberto, nao quantidade de titulos. O criterio de evolucao diaria reutiliza dias civis do contrato temporal.

## Verificacoes

- 524 testes em 19 arquivos aprovados, incluindo 39 novos casos de valores ausentes/invalidos, zeros, sinais, nomes reservados, duplicidades, lacunas, ano bissexto e matriz.
- Dez grupos novos de navegador aprovados: proporcao sem zero artificial, ausencia versus zero, series/lacunas, filtro por teclado, foco/Escape, negativos na ampliacao, distribuicao zerada, matriz e tabelas, celular 390 px e tema escuro/modal 320 px.
- Regressao dos 42 grupos anteriores aprovada: contexto (13), indicadores (5), estados por bloco (10), datas (7) e ajuda KPI (7). O teste de preservacao de empresa passou a consultar a tabela acessivel, sem depender da quebra do nome no eixo.
- APIs interceptadas com respostas sinteticas em memoria e origens externas bloqueadas. Nenhum cadastro de empresa ficticia, acesso RM, consulta ao PostgreSQL ou alteracao das conexoes reais.
- Capturas conferidas em `tmp/chart-values-qa/`; roteiro `scripts/check-chart-values-ui.mjs`. Sem erros de execucao nos cenarios verificados. Nao equivale a auditoria integral com leitores de tela.
- Typecheck/build aprovados. Bundle principal aproximadamente 728 kB antes de gzip; aviso acima de 500 kB permanece.
- Auditoria de dependencias sem alertas altos/criticos; dois alertas moderados transitivos uuid/ExcelJS permanecem. Nao aplicada atualizacao automatica com quebra de compatibilidade.
- Sem alteracoes de backend/API, banco, migrations, views, CI/CD remoto ou publicacao. Aplicacao local em `http://127.0.0.1:5175`.

## Limites

A apresentacao preserva a informacao recebida. Zeros ja produzidos pelo SQL (inclusive COALESCE no comparativo legado de rateio/baixa) nao podem ser reconhecidos como ausencia no navegador. Agregacoes SQL, precisao/moeda, granularidade de rateio e conciliacao RM continuam dependendo de contratos e evidencias da origem.

Tabelas e ampliacao apresentam apenas os dados retornados. Rankings limitados no backend (como TOP 15 de conta, documento e origem) nao passam a representar todas as categorias da fonte. Nenhuma nova consulta ou exportacao foi criada nesta etapa.

Comparativos numericos reais, cobertura/versionamento da carga, historico de saldos e aceite dos clientes continuam pendentes. LGPD exige ainda definicoes de papeis, canal, retencao e demais medidas de governanca; nao ha declaracao de conformidade integral. Restore, ativacao/validacao remota do CI/CD e outras pendencias operacionais permanecem.

## Proxima etapa sugerida

Melhorar o carregamento inicial: medir e separar os modulos carregados sob demanda, principalmente graficos e administracao, preservando autenticacao, isolamento entre empresas e tratamento de falhas de carregamento. Conferir tamanho transferido e regressao local, sem depender das views ou publicar em homologacao.

A mensagem consolidada para Leonardo permanece reservada ao fim das frentes independentes. Ainda nao restam apenas ajustes em views.
