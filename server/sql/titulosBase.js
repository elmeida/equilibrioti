export const DATE_FIELDS = {
  vencimento: 'DTVENC',
  emissao: 'DTEMISSAO',
  baixa: 'DTBAIXA',
  criacao: 'DTCRICAO',
};

export const ORDER_FIELDS = {
  EMPRESA: 'EMPRESA',
  COLIGADA: 'EMPRESA',
  CODCOLIGADA: 'CODCOLIGADA',
  REF: 'REF',
  CODCFO: 'CODCFO',
  CLIFOR: 'CLIFOR',
  NUMERODOC: 'NUMERODOC',
  PAGREC: 'PAGREC',
  STATUS_FIN: 'STATUS_FIN',
  STATUS_BAIXA: 'STATUS_BAIXA',
  DTVENC: 'DTVENC',
  DTEMISSAO: 'DTEMISSAO',
  DTBAIXA: 'DTBAIXA',
  TIPODOC: 'TIPODOC',
  CCUSTO: 'CCUSTO',
  NATFINANCEIRA: 'NATFINANCEIRA',
  VLRRATEIO: 'VLRRATEIO',
  VLRBAIXA: 'VLRBAIXA',
  VLRORIGINAL: 'VLRORIGINAL',
  CONTA: 'CONTA',
};

const field = (column) => `V.${column} AS ${column}`;
const money = (column) => `TRY_CONVERT(decimal(19, 4), V.${column}) AS ${column}`;

export const baseColumns = `
  ${field('REF')},
  ${field('CODCFO')},
  ${field('CLIFOR')},
  ${field('NUMERODOC')},
  ${field('PAGREC')},
  ${field('STATUS_FIN')},
  ${field('STATUS_BAIXA')},
  ${field('ORIGEM')},
  ${field('HISTORICO')},
  ${field('DTCRICAO')},
  ${field('DTVENC')},
  ${field('DTEMISSAO')},
  ${field('DTBAIXA')},
  ${field('ANO_VENC')},
  ${field('MES_VENC')},
  ${field('ANO_EMIS')},
  ${field('MES_EMIS')},
  ${field('ANO_BAIXA')},
  ${field('MES_BAIXA')},
  ${field('CODTDO')},
  ${field('TIPODOC')},
  ${field('CODCCUSTO')},
  ${field('CCUSTO')},
  ${field('CODNATFINANCEIRA')},
  ${field('NATFINANCEIRA')},
  ${money('VLRRATEIO')},
  ${money('VLRBAIXA')},
  ${money('VLRORIGINAL')},
  ${money('VLRDESCONTO')},
  ${money('VLRJUROS')},
  ${money('VLRMULTA')},
  ${money('VLRISS')},
  ${money('VLRINSS')},
  ${money('VLRDEVOLUCAO')},
  ${money('VLRNOTACRED')},
  ${money('VLRNCADIANT')},
  ${money('VLRVINCULADO')},
  ${field('NUMCHEQUE')},
  ${field('CODCXA')},
  ${field('CONTA')}
`;

export const unifiedTitulosSql = `
  SELECT 1 AS CODCOLIGADA, COALESCE(NULLIF(LTRIM(RTRIM(G.NOMEFANTASIA)), ''), 'Empresa 1') AS EMPRESA, ${baseColumns}
  FROM dbo.PBI_TITULOSFINANCEIRO V
  LEFT JOIN dbo.GCOLIGADA G ON G.CODCOLIGADA = 1
  UNION ALL
  SELECT 2 AS CODCOLIGADA, COALESCE(NULLIF(LTRIM(RTRIM(G.NOMEFANTASIA)), ''), 'Empresa 2') AS EMPRESA, ${baseColumns}
  FROM dbo.PBI_TITULOSFINANCEIRO_COL2 V
  LEFT JOIN dbo.GCOLIGADA G ON G.CODCOLIGADA = 2
`;

export function baseSubquery(alias = 'TITULOS') {
  return `(${unifiedTitulosSql}) ${alias}`;
}
