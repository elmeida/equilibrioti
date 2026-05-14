import { sql } from '../db/pool.js';
import { DATE_FIELDS } from '../sql/titulosBase.js';

const scalarFilters = {
  coligada: 'EMPRESA',
  empresa: 'EMPRESA',
  tipo: 'PAGREC',
  statusFin: 'STATUS_FIN',
  statusBaixa: 'STATUS_BAIXA',
};

const multiFilters = {
  clientes: 'CLIFOR',
  centrosCusto: 'CCUSTO',
  naturezas: 'NATFINANCEIRA',
  tiposDocumento: 'TIPODOC',
  contas: 'CONTA',
  origens: 'ORIGEM',
};

export function parseArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

export function bindInput(request, name, value) {
  if (value instanceof Date) {
    request.input(name, sql.DateTime2, value);
    return;
  }
  if (typeof value === 'number') {
    request.input(name, sql.Decimal(19, 4), value);
    return;
  }
  request.input(name, sql.NVarChar, value);
}

function bindDateOnly(request, name, value) {
  request.input(name, sql.Date, value);
}

export function buildFilters(query, request, prefix = 'f') {
  const clauses = ['1 = 1'];
  let index = 0;

  for (const [key, column] of Object.entries(scalarFilters)) {
    const value = query[key];
    if (value && value !== 'Todos' && value !== 'Todas') {
      const name = `${prefix}${index++}`;
      clauses.push(`${column} = @${name}`);
      bindInput(request, name, value);
    }
  }

  for (const [key, column] of Object.entries(multiFilters)) {
    const values = parseArray(query[key]);
    if (values.length) {
      const names = values.map((value) => {
        const name = `${prefix}${index++}`;
        bindInput(request, name, value);
        return `@${name}`;
      });
      clauses.push(`${column} IN (${names.join(', ')})`);
    }
  }

  const dateField = DATE_FIELDS[query.dateField] || DATE_FIELDS.vencimento;
  if (query.startDate) {
    const name = `${prefix}${index++}`;
    clauses.push(`${dateField} >= @${name}`);
    bindDateOnly(request, name, query.startDate);
  }
  if (query.endDate) {
    const name = `${prefix}${index++}`;
    clauses.push(`${dateField} < DATEADD(day, 1, @${name})`);
    bindDateOnly(request, name, query.endDate);
  }

  if (query.search) {
    const name = `${prefix}${index++}`;
    clauses.push(`(
      CLIFOR LIKE @${name}
      OR NUMERODOC LIKE @${name}
      OR REF LIKE @${name}
      OR HISTORICO LIKE @${name}
      OR CCUSTO LIKE @${name}
      OR NATFINANCEIRA LIKE @${name}
    )`);
    bindInput(request, name, `%${query.search}%`);
  }

  return clauses.join(' AND ');
}

export function jsonRows(recordset) {
  return recordset.map((row) => {
    const out = {};
    for (const [key, value] of Object.entries(row)) {
      out[key] = value && typeof value === 'object' && 'toNumber' in value ? value.toNumber() : value;
    }
    return out;
  });
}
