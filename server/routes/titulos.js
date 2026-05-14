import { Router } from 'express';
import ExcelJS from 'exceljs';
import { getPoolForEmpresa, sql } from '../db/pool.js';
import { baseSubquery, DATE_FIELDS, ORDER_FIELDS } from '../sql/titulosBase.js';
import { bindInput, buildFilters, jsonRows } from '../utils/queryBuilder.js';
import { getCache, setCache } from '../utils/cache.js';
import { requireEmpresa } from '../auth/middleware.js';

const router = Router();
router.use(requireEmpresa);
const SHORT_TTL = 4 * 60 * 1000;
const FILTER_TTL = 8 * 60 * 1000;

async function runFiltered(req, sqlText, options = {}) {
  const ttl = options.ttl ?? SHORT_TTL;
  const cacheKey = `titulos:${req.empresaId}:${req.originalUrl}:${sqlText}`;
  if (req.query.refresh !== '1' && ttl > 0) {
    const cached = getCache(cacheKey);
    if (cached) return cached;
  }
  const pool = await getPoolForEmpresa(req.empresaId);
  const request = pool.request();
  const where = buildFilters(req.query, request);
  const result = await request.query(sqlText.replaceAll('__WHERE__', where));
  const rows = options.raw ? result.recordset : jsonRows(result.recordset);
  if (ttl > 0) setCache(cacheKey, rows, ttl);
  return rows;
}

function monthExpr(column) {
  return `CONVERT(char(7), ${column}, 120)`;
}

function vencimentoBucket(req) {
  if (req.query.startDate && req.query.endDate) {
    const start = new Date(`${req.query.startDate}T00:00:00`);
    const end = new Date(`${req.query.endDate}T00:00:00`);
    const days = (end.getTime() - start.getTime()) / 86400000;
    if (days >= 0 && days <= 31) return `CONVERT(char(10), DTVENC, 120)`;
  }
  return monthExpr('DTVENC');
}

router.get('/kpis', async (req, res, next) => {
  try {
    const rows = await runFiltered(req, `
      SELECT
        COALESCE(SUM(VLRRATEIO), 0) AS totalFinanceiro,
        COALESCE(SUM(CASE WHEN PAGREC = 'A Pagar' THEN VLRRATEIO ELSE 0 END), 0) AS totalPagar,
        COALESCE(SUM(CASE WHEN PAGREC = 'A Receber' THEN VLRRATEIO ELSE 0 END), 0) AS totalReceber,
        COALESCE(SUM(CASE WHEN PAGREC = 'A Receber' THEN VLRRATEIO ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN PAGREC = 'A Pagar' THEN VLRRATEIO ELSE 0 END), 0) AS saldoLiquido,
        COALESCE(SUM(CASE WHEN STATUS_FIN = 'Em Aberto' THEN VLRRATEIO ELSE 0 END), 0) AS totalAberto,
        COALESCE(SUM(CASE WHEN STATUS_FIN = 'Baixado' THEN VLRRATEIO ELSE 0 END), 0) AS totalBaixado,
        COALESCE(SUM(CASE WHEN STATUS_FIN = 'Baixado Parcialmente' THEN VLRRATEIO ELSE 0 END), 0) AS totalBaixadoParcialmente,
        COUNT_BIG(*) AS quantidadeTitulos,
        COALESCE(SUM(VLRRATEIO) / NULLIF(COUNT_BIG(*), 0), 0) AS ticketMedio,
        SUM(CASE WHEN STATUS_FIN = 'Em Aberto' AND DTVENC < CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS titulosVencidosAberto,
        COALESCE(SUM(CASE WHEN STATUS_FIN = 'Em Aberto' AND DTVENC < CAST(GETDATE() AS date) THEN VLRRATEIO ELSE 0 END), 0) AS valorVencidoAberto,
        SUM(CASE WHEN STATUS_FIN = 'Em Aberto' AND DTVENC >= CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS titulosAVencer,
        COALESCE(SUM(CASE WHEN STATUS_FIN = 'Em Aberto' AND DTVENC >= CAST(GETDATE() AS date) THEN VLRRATEIO ELSE 0 END), 0) AS valorAVencer,
        COALESCE(SUM(VLRJUROS), 0) AS juros,
        COALESCE(SUM(VLRMULTA), 0) AS multas,
        COALESCE(SUM(VLRDESCONTO), 0) AS descontos,
        COALESCE(SUM(VLRBAIXA), 0) AS valorBaixa,
        COALESCE(SUM(VLRRATEIO), 0) - COALESCE(SUM(VLRBAIXA), 0) AS diferencaRateadoBaixado,
        COALESCE(SUM(VLRBAIXA) / NULLIF(SUM(VLRRATEIO), 0), 0) AS percentualBaixado,
        COUNT_BIG(DISTINCT CLIFOR) AS clientesUnicos,
        COUNT_BIG(DISTINCT NUMERODOC) AS documentosUnicos,
        SUM(CASE WHEN VLRRATEIO = 0 OR VLRRATEIO IS NULL THEN 1 ELSE 0 END) AS titulosValorZerado,
        COALESCE(SUM(CASE WHEN DTBAIXA > DTVENC THEN VLRRATEIO ELSE 0 END), 0) AS valorBaixadoAtraso,
        COALESCE(SUM(CASE WHEN DTBAIXA <= DTVENC THEN VLRRATEIO ELSE 0 END), 0) AS valorBaixadoPrazo,
        COALESCE(AVG(CASE WHEN STATUS_FIN = 'Em Aberto' AND DTVENC < CAST(GETDATE() AS date) THEN DATEDIFF(day, DTVENC, GETDATE()) END), 0) AS mediaDiasAtraso,
        COALESCE(MAX(CASE WHEN STATUS_FIN = 'Em Aberto' AND DTVENC < CAST(GETDATE() AS date) THEN DATEDIFF(day, DTVENC, GETDATE()) END), 0) AS maiorAtrasoDias
      FROM ${baseSubquery()}
      WHERE __WHERE__
    `);
    res.json(rows[0] || {});
  } catch (err) {
    next(err);
  }
});

router.get('/graficos/evolucao-vencimento', async (req, res, next) => {
  try {
    const bucket = vencimentoBucket(req);
    const rows = await runFiltered(req, `
      SELECT ${bucket} AS mes, PAGREC AS serie, COALESCE(SUM(VLRRATEIO), 0) AS valor, COUNT_BIG(*) AS quantidade
      FROM ${baseSubquery()}
      WHERE __WHERE__ AND DTVENC IS NOT NULL
      GROUP BY ${bucket}, PAGREC
      ORDER BY mes
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/graficos/evolucao-baixa', async (req, res, next) => {
  try {
    const rows = await runFiltered(req, `
      SELECT ${monthExpr('DTBAIXA')} AS mes, STATUS_FIN AS serie, COALESCE(SUM(VLRBAIXA), 0) AS valor, COUNT_BIG(*) AS quantidade
      FROM ${baseSubquery()}
      WHERE __WHERE__ AND DTBAIXA IS NOT NULL
      GROUP BY ${monthExpr('DTBAIXA')}, STATUS_FIN
      ORDER BY mes
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/graficos/pagar-receber', async (req, res, next) => {
  try {
    const rows = await runFiltered(req, `
      SELECT PAGREC AS nome, COALESCE(SUM(VLRRATEIO), 0) AS valor, COUNT_BIG(*) AS quantidade
      FROM ${baseSubquery()}
      WHERE __WHERE__
      GROUP BY PAGREC
      ORDER BY valor DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/graficos/status', async (req, res, next) => {
  try {
    const rows = await runFiltered(req, `
      SELECT STATUS_FIN AS nome, COALESCE(SUM(VLRRATEIO), 0) AS valor, COUNT_BIG(*) AS quantidade
      FROM ${baseSubquery()}
      WHERE __WHERE__
      GROUP BY STATUS_FIN
      ORDER BY valor DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/graficos/coligadas', async (req, res, next) => {
  try {
    const rows = await runFiltered(req, `
      SELECT EMPRESA AS nome, COALESCE(SUM(VLRRATEIO), 0) AS valor, COUNT_BIG(*) AS quantidade
      FROM ${baseSubquery()}
      WHERE __WHERE__
      GROUP BY EMPRESA
      ORDER BY EMPRESA
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/graficos/:tipo', async (req, res, next) => {
  const specs = {
    contas: { field: 'CONTA', limit: 15 },
    tiposDocumento: { field: 'TIPODOC', limit: 15 },
    origens: { field: 'ORIGEM', limit: 15 },
    faixasVencimento: { special: 'faixas' },
    matrizCalor: { special: 'matriz' },
    comparativoColigadas: { special: 'coligadasMes' },
    encargosMes: { special: 'encargos' },
    previstoRealizado: { special: 'previstoRealizado' },
  };
  const spec = specs[req.params.tipo];
  if (!spec) return res.status(404).json({ error: 'Gráfico não encontrado.' });

  try {
    let query;
    if (spec.field) {
      query = `
        SELECT TOP (${spec.limit}) COALESCE(NULLIF(${spec.field}, ''), 'Não informado') AS nome,
               COALESCE(SUM(VLRRATEIO), 0) AS valor,
               COUNT_BIG(*) AS quantidade
        FROM ${baseSubquery()}
        WHERE __WHERE__
        GROUP BY COALESCE(NULLIF(${spec.field}, ''), 'Não informado')
        ORDER BY valor DESC
      `;
    } else if (spec.special === 'faixas') {
      query = `
        SELECT faixa AS nome, COALESCE(SUM(VLRRATEIO), 0) AS valor, COUNT_BIG(*) AS quantidade
        FROM (
          SELECT *,
            CASE
              WHEN DTVENC < DATEADD(day, -90, CAST(GETDATE() AS date)) THEN 'Vencido há mais de 90 dias'
              WHEN DTVENC < DATEADD(day, -60, CAST(GETDATE() AS date)) THEN 'Vencido entre 61 e 90 dias'
              WHEN DTVENC < DATEADD(day, -30, CAST(GETDATE() AS date)) THEN 'Vencido entre 31 e 60 dias'
              WHEN DTVENC < CAST(GETDATE() AS date) THEN 'Vencido entre 1 e 30 dias'
              WHEN DTVENC = CAST(GETDATE() AS date) THEN 'Vence hoje'
              WHEN DTVENC <= DATEADD(day, 7, CAST(GETDATE() AS date)) THEN 'A vencer em até 7 dias'
              WHEN DTVENC <= DATEADD(day, 15, CAST(GETDATE() AS date)) THEN 'A vencer entre 8 e 15 dias'
              WHEN DTVENC <= DATEADD(day, 30, CAST(GETDATE() AS date)) THEN 'A vencer entre 16 e 30 dias'
              ELSE 'A vencer acima de 30 dias'
            END AS faixa
          FROM ${baseSubquery()}
        ) X
        WHERE __WHERE__ AND STATUS_FIN = 'Em Aberto' AND DTVENC IS NOT NULL
        GROUP BY faixa
      `;
    } else if (spec.special === 'matriz') {
      query = `
        SELECT YEAR(DTVENC) AS ano, MONTH(DTVENC) AS mes, COALESCE(SUM(VLRRATEIO), 0) AS valor
        FROM ${baseSubquery()}
        WHERE __WHERE__ AND DTVENC IS NOT NULL
        GROUP BY YEAR(DTVENC), MONTH(DTVENC)
        ORDER BY ano, mes
      `;
    } else if (spec.special === 'coligadasMes') {
      query = `
        SELECT ${monthExpr('DTVENC')} AS mes, EMPRESA AS serie, COALESCE(SUM(VLRRATEIO), 0) AS valor
        FROM ${baseSubquery()}
        WHERE __WHERE__ AND DTVENC IS NOT NULL
        GROUP BY ${monthExpr('DTVENC')}, EMPRESA
        ORDER BY mes
      `;
    } else if (spec.special === 'encargos') {
      query = `
        SELECT ${monthExpr('DTVENC')} AS mes, COALESCE(SUM(VLRJUROS), 0) AS juros, COALESCE(SUM(VLRMULTA), 0) AS multas, COALESCE(SUM(VLRDESCONTO), 0) AS descontos
        FROM ${baseSubquery()}
        WHERE __WHERE__ AND DTVENC IS NOT NULL
        GROUP BY ${monthExpr('DTVENC')}
        ORDER BY mes
      `;
    } else {
      query = `
        SELECT COALESCE(v.mes, b.mes) AS mes, COALESCE(v.previsto, 0) AS previsto, COALESCE(b.realizado, 0) AS realizado
        FROM (
          SELECT ${monthExpr('DTVENC')} AS mes, SUM(VLRRATEIO) AS previsto
          FROM ${baseSubquery()}
          WHERE __WHERE__ AND DTVENC IS NOT NULL
          GROUP BY ${monthExpr('DTVENC')}
        ) v
        FULL OUTER JOIN (
          SELECT ${monthExpr('DTBAIXA')} AS mes, SUM(VLRBAIXA) AS realizado
          FROM ${baseSubquery()}
          WHERE __WHERE__ AND DTBAIXA IS NOT NULL
          GROUP BY ${monthExpr('DTBAIXA')}
        ) b ON v.mes = b.mes
        ORDER BY mes
      `;
    }
    res.json(await runFiltered(req, query));
  } catch (err) { next(err); }
});

router.get('/rankings/:tipo', async (req, res, next) => {
  const specs = {
    clientes: { field: 'CLIFOR' },
    'centros-custo': { field: 'CCUSTO' },
    naturezas: { field: 'NATFINANCEIRA' },
  };
  const spec = specs[req.params.tipo];
  if (!spec) return res.status(404).json({ error: 'Ranking não encontrado.' });

  try {
    const rows = await runFiltered(req, `
      SELECT TOP (50)
        COALESCE(NULLIF(${spec.field}, ''), 'Não informado') AS nome,
        COUNT_BIG(*) AS quantidade,
        COALESCE(SUM(VLRRATEIO), 0) AS totalRateio,
        COALESCE(SUM(VLRBAIXA), 0) AS totalBaixa,
        COALESCE(SUM(CASE WHEN STATUS_FIN = 'Em Aberto' THEN VLRRATEIO ELSE 0 END), 0) AS totalAberto,
        COALESCE(SUM(CASE WHEN STATUS_FIN = 'Baixado' THEN VLRRATEIO ELSE 0 END), 0) AS totalBaixado,
        COALESCE(SUM(CASE WHEN STATUS_FIN = 'Em Aberto' AND DTVENC < CAST(GETDATE() AS date) THEN VLRRATEIO ELSE 0 END), 0) AS totalVencido,
        COALESCE(SUM(VLRRATEIO) / NULLIF(COUNT_BIG(*), 0), 0) AS ticketMedio,
        COALESCE(SUM(VLRRATEIO) / NULLIF(SUM(SUM(VLRRATEIO)) OVER (), 0), 0) AS percentual
      FROM ${baseSubquery()}
      WHERE __WHERE__
      GROUP BY COALESCE(NULLIF(${spec.field}, ''), 'Não informado')
      ORDER BY totalRateio DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/analises', async (req, res, next) => {
  try {
    const rows = await runFiltered(req, `
      WITH F AS (
        SELECT * FROM ${baseSubquery()} WHERE __WHERE__
      ),
      T AS (SELECT SUM(VLRRATEIO) total FROM F),
      TopClientes AS (
        SELECT TOP (10) CLIFOR, SUM(VLRRATEIO) valor FROM F GROUP BY CLIFOR ORDER BY valor DESC
      ),
      AtrasoCliente AS (
        SELECT TOP (1) CLIFOR, AVG(DATEDIFF(day, DTVENC, DTBAIXA)) media
        FROM F WHERE DTBAIXA > DTVENC GROUP BY CLIFOR ORDER BY media DESC
      ),
      CustoVencido AS (
        SELECT TOP (1) CCUSTO, SUM(VLRRATEIO) valor
        FROM F WHERE STATUS_FIN = 'Em Aberto' AND DTVENC < CAST(GETDATE() AS date)
        GROUP BY CCUSTO ORDER BY valor DESC
      )
      SELECT
        COALESCE((SELECT SUM(valor) FROM TopClientes) / NULLIF((SELECT total FROM T), 0), 0) AS concentracaoTop10,
        (SELECT COUNT(*) FROM F WHERE DTBAIXA > DTVENC) AS qtdAtraso,
        COALESCE((SELECT SUM(VLRRATEIO) FROM F WHERE DTBAIXA > DTVENC), 0) AS valorAtraso,
        COALESCE((SELECT AVG(DATEDIFF(day, DTVENC, DTBAIXA)) FROM F WHERE DTBAIXA > DTVENC), 0) AS mediaAtraso,
        (SELECT CLIFOR FROM AtrasoCliente) AS clienteMaiorAtrasoMedio,
        COALESCE((SELECT media FROM AtrasoCliente), 0) AS maiorAtrasoMedio,
        (SELECT CCUSTO FROM CustoVencido) AS centroMaiorValorVencido,
        COALESCE((SELECT valor FROM CustoVencido), 0) AS valorCentroMaiorVencido,
        COALESCE((SELECT SUM(CASE WHEN STATUS_FIN = 'Baixado' THEN 1 ELSE 0 END) * 1.0 / NULLIF(COUNT(*), 0) FROM F), 0) AS pctBaixado,
        COALESCE((SELECT SUM(CASE WHEN STATUS_FIN = 'Em Aberto' THEN 1 ELSE 0 END) * 1.0 / NULLIF(COUNT(*), 0) FROM F), 0) AS pctAberto,
        COALESCE((SELECT SUM(CASE WHEN STATUS_FIN = 'Baixado Parcialmente' THEN 1 ELSE 0 END) * 1.0 / NULLIF(COUNT(*), 0) FROM F), 0) AS pctBaixadoParcial
    `);
    res.json(rows[0] || {});
  } catch (err) { next(err); }
});

router.get('/tabela', async (req, res, next) => {
  try {
    const cacheKey = `titulos:${req.empresaId}:filtros:${req.originalUrl}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);
    const pool = await getPoolForEmpresa(req.empresaId);
    const request = pool.request();
    const where = buildFilters(req.query, request);
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 25), 10), 100);
    const offset = (page - 1) * pageSize;
    const sortBy = ORDER_FIELDS[req.query.sortBy] || 'DTVENC';
    const sortDir = String(req.query.sortDir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    request.input('offset', sql.Int, offset);
    request.input('pageSize', sql.Int, pageSize);

    const result = await request.query(`
      SELECT COUNT_BIG(*) AS total
      FROM ${baseSubquery()}
      WHERE ${where};

      SELECT
        EMPRESA, CODCOLIGADA, REF, CODCFO, CLIFOR, NUMERODOC, PAGREC, STATUS_FIN, STATUS_BAIXA,
        DTVENC, DTEMISSAO, DTBAIXA, TIPODOC, CCUSTO, NATFINANCEIRA, VLRRATEIO,
        VLRBAIXA, VLRORIGINAL, VLRDESCONTO, VLRJUROS, VLRMULTA, CONTA,
        HISTORICO, ORIGEM, CODTDO, CODCCUSTO, CODNATFINANCEIRA, VLRISS, VLRINSS,
        VLRDEVOLUCAO, VLRNOTACRED, VLRNCADIANT, VLRVINCULADO, NUMCHEQUE, CODCXA,
        DATEDIFF(day, DTEMISSAO, DTVENC) AS diasEmissaoVencimento,
        DATEDIFF(day, DTVENC, DTBAIXA) AS diasVencimentoBaixa,
        CASE
          WHEN STATUS_FIN = 'Em Aberto' AND DTVENC < CAST(GETDATE() AS date) THEN CONCAT('Em atraso há ', DATEDIFF(day, DTVENC, GETDATE()), ' dias')
          WHEN DTBAIXA > DTVENC THEN CONCAT('Baixado com atraso de ', DATEDIFF(day, DTVENC, DTBAIXA), ' dias')
          WHEN DTBAIXA <= DTVENC THEN 'Baixado no prazo'
          ELSE 'Sem baixa'
        END AS situacaoAtraso
      FROM ${baseSubquery()}
      WHERE ${where}
      ORDER BY ${sortBy} ${sortDir}
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    `);

    res.json({
      total: Number(result.recordsets[0][0]?.total || 0),
      page,
      pageSize,
      rows: jsonRows(result.recordsets[1] || []),
    });
  } catch (err) { next(err); }
});

router.get('/vencidos', async (req, res, next) => {
  try {
    const rows = await runFiltered(req, `
      SELECT TOP (100)
        EMPRESA, CLIFOR, NUMERODOC, PAGREC, DTVENC,
        DATEDIFF(day, DTVENC, GETDATE()) AS diasAtraso,
        VLRRATEIO, STATUS_FIN, CCUSTO, NATFINANCEIRA
      FROM ${baseSubquery()}
      WHERE __WHERE__ AND STATUS_FIN = 'Em Aberto' AND DTVENC < CAST(GETDATE() AS date)
      ORDER BY diasAtraso DESC, VLRRATEIO DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

function inconsistencySql(selectPrefix = '') {
  return `
    ${selectPrefix}
    FROM ${baseSubquery('B')}
    CROSS APPLY (VALUES
      ('Atenção', 'Valor rateado zerado', 'Título sem valor financeiro rateado; pode ser ajuste, rateio complementar ou cadastro incompleto.', 'VLRRATEIO', CONVERT(varchar(80), VLRRATEIO), 'Validar se o rateio zerado é esperado.', CASE WHEN VLRRATEIO = 0 THEN 1 ELSE 0 END),
      ('Crítico', 'Valor rateado nulo', 'Título sem VLRRATEIO; pode afetar diretamente os indicadores financeiros.', 'VLRRATEIO', NULL, 'Corrigir ou validar valor do rateio.', CASE WHEN VLRRATEIO IS NULL THEN 1 ELSE 0 END),
      ('Crítico', 'Data de vencimento vazia', 'Título sem vencimento não entra corretamente em análises de prazo e atraso.', 'DTVENC', NULL, 'Informar data de vencimento.', CASE WHEN DTVENC IS NULL THEN 1 ELSE 0 END),
      ('Crítico', 'Tipo financeiro vazio', 'Título sem PAGREC impede separar contas a pagar e a receber.', 'PAGREC', PAGREC, 'Informar A Pagar ou A Receber.', CASE WHEN NULLIF(PAGREC, '') IS NULL THEN 1 ELSE 0 END),
      ('Crítico', 'Baixado sem data de baixa', 'Título baixado sem DTBAIXA pode distorcer realizado e prazo de liquidação.', 'DTBAIXA', NULL, 'Validar baixa financeira.', CASE WHEN STATUS_FIN = 'Baixado' AND DTBAIXA IS NULL THEN 1 ELSE 0 END),
      ('Crítico', 'Em aberto com data de baixa', 'Título em aberto com DTBAIXA preenchida indica conflito entre status e liquidação.', 'DTBAIXA', CONVERT(varchar(30), DTBAIXA, 103), 'Revisar status financeiro.', CASE WHEN STATUS_FIN = 'Em Aberto' AND DTBAIXA IS NOT NULL THEN 1 ELSE 0 END),
      ('Crítico', 'Baixa maior que rateio', 'Valor baixado acima do rateio pode distorcer percentual baixado e realizado.', 'VLRBAIXA', CONVERT(varchar(80), VLRBAIXA), 'Validar valores baixados.', CASE WHEN VLRBAIXA > VLRRATEIO THEN 1 ELSE 0 END),
      ('Atenção', 'Rateio diferente do original', 'Diferença entre VLRRATEIO e VLRORIGINAL pode ser esperada, mas merece conferência.', 'VLRORIGINAL', CONVERT(varchar(80), VLRORIGINAL), 'Conferir composição do rateio.', CASE WHEN VLRRATEIO <> VLRORIGINAL THEN 1 ELSE 0 END),
      ('Atenção', 'Em aberto vencido há mais de 90 dias', 'Título antigo em aberto aumenta risco de atraso e merece cobrança/conferência.', 'DTVENC', CONVERT(varchar(30), DTVENC, 103), 'Priorizar análise de vencidos antigos.', CASE WHEN STATUS_FIN = 'Em Aberto' AND DTVENC < DATEADD(day, -90, CAST(GETDATE() AS date)) THEN 1 ELSE 0 END),
      ('Atenção', 'Baixado com atraso', 'Título liquidado após o vencimento; impacta análise de pontualidade.', 'DTBAIXA', CONVERT(varchar(30), DTBAIXA, 103), 'Avaliar recorrência de atraso.', CASE WHEN DTBAIXA > DTVENC THEN 1 ELSE 0 END),
      ('Atenção', 'Baixado com VLRBAIXA zerado', 'Título baixado sem valor de baixa pode distorcer realizado.', 'VLRBAIXA', CONVERT(varchar(80), VLRBAIXA), 'Validar valor de baixa.', CASE WHEN STATUS_FIN = 'Baixado' AND ISNULL(VLRBAIXA, 0) = 0 THEN 1 ELSE 0 END),
      ('Informativo', 'Cliente/fornecedor vazio', 'Campo cadastral ausente; afeta agrupamentos por cliente/fornecedor.', 'CLIFOR', CLIFOR, 'Informar cliente/fornecedor.', CASE WHEN NULLIF(CLIFOR, '') IS NULL THEN 1 ELSE 0 END),
      ('Informativo', 'Centro de custo vazio', 'Campo cadastral ausente; afeta análise por centro de custo.', 'CCUSTO', CCUSTO, 'Informar centro de custo.', CASE WHEN NULLIF(CCUSTO, '') IS NULL THEN 1 ELSE 0 END),
      ('Informativo', 'Natureza financeira vazia', 'Campo cadastral ausente; afeta análise por natureza financeira.', 'NATFINANCEIRA', NATFINANCEIRA, 'Informar natureza financeira.', CASE WHEN NULLIF(NATFINANCEIRA, '') IS NULL THEN 1 ELSE 0 END),
      ('Informativo', 'Conta vazia', 'Campo cadastral ausente; afeta análise por conta financeira.', 'CONTA', CONTA, 'Informar conta financeira.', CASE WHEN NULLIF(CONTA, '') IS NULL THEN 1 ELSE 0 END),
      ('Informativo', 'Número do documento vazio', 'Campo cadastral ausente; dificulta rastreabilidade documental.', 'NUMERODOC', NUMERODOC, 'Informar número do documento.', CASE WHEN NULLIF(NUMERODOC, '') IS NULL THEN 1 ELSE 0 END),
      ('Informativo', 'Origem vazia', 'Campo cadastral ausente; afeta análise por origem.', 'ORIGEM', ORIGEM, 'Informar origem.', CASE WHEN NULLIF(ORIGEM, '') IS NULL THEN 1 ELSE 0 END),
      ('Informativo', 'Tipo de documento vazio', 'Campo cadastral ausente; afeta análise por tipo de documento.', 'TIPODOC', TIPODOC, 'Informar tipo de documento.', CASE WHEN NULLIF(TIPODOC, '') IS NULL THEN 1 ELSE 0 END)
    ) V(severidade, tipo, explicacao, campo, valorAtual, sugestao, aplica)
    WHERE V.aplica = 1 AND __WHERE__
  `;
}

router.get('/inconsistencias/resumo', async (req, res, next) => {
  try {
    const rows = await runFiltered(req, `
      SELECT severidade, tipo, COUNT_BIG(*) AS quantidade, COUNT_BIG(DISTINCT CONCAT(EMPRESA, '|', REF, '|', NUMERODOC)) AS registrosAfetados
      ${inconsistencySql('')}
      GROUP BY severidade, tipo
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/inconsistencias/v2', async (req, res, next) => {
  try {
    const rows = await runFiltered(req, `
      SELECT TOP (300)
        severidade, tipo, explicacao, EMPRESA, REF, CLIFOR, NUMERODOC, PAGREC,
        STATUS_FIN, STATUS_BAIXA, DTVENC, DTBAIXA, VLRRATEIO, VLRBAIXA,
        campo, valorAtual, sugestao
      ${inconsistencySql('')}
      ORDER BY CASE severidade WHEN 'Crítico' THEN 1 WHEN 'Atenção' THEN 2 ELSE 3 END, tipo
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/inconsistencias', async (req, res, next) => {
  try {
    const rows = await runFiltered(req, `
      SELECT TOP (200)
        severidade, tipo, explicacao, EMPRESA, REF, CLIFOR, NUMERODOC, PAGREC,
        STATUS_FIN, STATUS_BAIXA, DTVENC, DTBAIXA, VLRRATEIO, VLRBAIXA,
        campo, valorAtual, sugestao
      ${inconsistencySql('')}
      ORDER BY CASE severidade WHEN 'Crítico' THEN 1 WHEN 'Atenção' THEN 2 ELSE 3 END, tipo
    `);
    res.json(rows);
  } catch (err) { next(err); }
});


router.get('/filtros/:tipo', async (req, res, next) => {
  const fields = {
    clientes: 'CLIFOR',
    'centros-custo': 'CCUSTO',
    naturezas: 'NATFINANCEIRA',
    contas: 'CONTA',
    'tipos-documento': 'TIPODOC',
    origens: 'ORIGEM',
    coligadas: 'EMPRESA',
    empresas: 'EMPRESA',
    status: 'STATUS_FIN',
    'status-baixa': 'STATUS_BAIXA',
  };
  const field = fields[req.params.tipo];
  if (!field) return res.status(404).json({ error: 'Filtro não encontrado.' });

  try {
    const cacheKey = `titulos:${req.empresaId}:filtro:${req.params.tipo}:${req.query.q || ''}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);
    const pool = await getPoolForEmpresa(req.empresaId);
    const request = pool.request();
    const term = String(req.query.q || '').trim();
    let where = `NULLIF(${field}, '') IS NOT NULL`;
    if (term) {
      request.input('term', sql.NVarChar, `%${term}%`);
      where += ` AND ${field} LIKE @term`;
    }
    const result = await request.query(`
      SELECT TOP (50) ${field} AS value, COUNT_BIG(*) AS total
      FROM ${baseSubquery()}
      WHERE ${where}
      GROUP BY ${field}
      ORDER BY total DESC, value
    `);
    const rows = jsonRows(result.recordset);
    setCache(cacheKey, rows, FILTER_TTL);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/export', async (req, res, next) => {
  try {
    const pool = await getPoolForEmpresa(req.empresaId);
    const request = pool.request();
    const where = buildFilters(req.query, request);
    const result = await request.query(`
      SELECT TOP (5000)
        EMPRESA, CODCOLIGADA, REF, CODCFO, CLIFOR, NUMERODOC, PAGREC, STATUS_FIN, STATUS_BAIXA,
        DTVENC, DTEMISSAO, DTBAIXA, TIPODOC, CCUSTO, NATFINANCEIRA, VLRRATEIO,
        VLRBAIXA, VLRORIGINAL, VLRDESCONTO, VLRJUROS, VLRMULTA, CONTA
      FROM ${baseSubquery()}
      WHERE ${where}
      ORDER BY DTVENC DESC
    `);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Titulos');
    sheet.columns = Object.keys(result.recordset[0] || { EMPRESA: '' }).map((key) => ({ header: key, key, width: 18 }));
    sheet.addRows(result.recordset);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="titulos-financeiros.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

router.post('/grafico-filtro', (req, res) => {
  res.json({ filters: req.body || {} });
});

export default router;
