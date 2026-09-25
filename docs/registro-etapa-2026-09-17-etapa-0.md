# Registro de acompanhamento: etapa 0

Data: 17/09/2026. Projeto: Equilíbrio BI. Marca do produto: Equilíbrio TI. Governança: Atenza. Ambiente do projeto: homologação.

## O que foi feito

- Especificação inicial das permissões por empresa e dos contratos de origem e indicadores.
- Testes controlados de baixas parciais, estornos, rateios, períodos e separação do contexto simulado.
- Protótipo local separado, com comparações, explicações de indicadores, filtros, exportação e estados de indisponibilidade.
- Atualização do backlog, README e histórico de alterações.

## Bases reais e dados de teste

O usuário confirmou que a aplicação já possui bases de empresas reais conectadas. As duas empresas fictícias são apenas uma bancada de testes com resultados conhecidos, não novas empresas cadastradas nas bases reais. Não substituem as conexões existentes nem comprovam a correção dos cálculos do RM.

Não foram alterados dados, conexões, permissões reais, infraestrutura ou ambiente de homologação. Não houve consulta às bases reais nem confirmação de sua conectividade atual. Nenhum deploy, migração, commit ou push foi executado nesta etapa.

## Verificações

| Verificação | Resultado |
|---|---|
| Instalação das dependências pelo lockfile | Concluída |
| Testes automatizados | 33 aprovados em 2 arquivos |
| Compilação normal | Aprovada; permanece aviso de pacote JavaScript acima de 500 kB |
| Compilação em modo demonstrativo | Bloqueada intencionalmente para impedir publicação |
| Interface demonstrativa | 10 grupos de verificações aprovados, incluindo filtros, perfis simulados, CSV, erros e larguras de 320, 390 e 768 px |
| Inspeção visual | Capturas desktop e 320 px revisadas |
| Separação da demonstração | Nenhuma chamada à API, sessão persistida, service worker ou erro de execução durante o teste |
| Auditoria de dependências | Reprovada: 15 vulnerabilidades reportadas, sendo 8 altas, 6 moderadas e 1 baixa; sem atualização forçada |
| Conciliação RM e isolamento real no backend | Não executados |

As evidências locais da interface ficam em `tmp/demo-qa/`. A demonstração pode ser iniciada com `npm run demo`; nesta sessão foi disponibilizada em http://127.0.0.1:5174/. Ela não representa o ambiente real da aplicação.

## Próxima etapa sugerida

1. Inventariar as empresas e fontes reais já configuradas, sem registrar credenciais nos documentos.
2. Confirmar acesso somente de leitura e escolher um recorte de empresa/período para comparar aplicação, views e relatório RM de referência.
3. Identificar as views e definições efetivamente faltantes e consolidar a solicitação ao Leonardo, sem bloquear o que já pode ser validado.
4. Prosseguir com as correções de isolamento e cache do backlog, cobrindo o backend real com testes; tratar as vulnerabilidades antes de considerar os controles de CI aprovados.

O marco local foi entregue, mas os itens de conciliação, segurança real e aceite do cliente continuam abertos. Referências: [contratos](contratos-etapa-0.md) e [backlog](backlog-evolucao-multiempresa-analytics-2026-09-17.md).
