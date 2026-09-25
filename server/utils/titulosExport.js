import ExcelJS from 'exceljs';

export const EXPORT_ROW_LIMIT = 5000;
export const EXPORT_COLUMNS = Object.freeze([
  'EMPRESA', 'CODCOLIGADA', 'REF', 'CODCFO', 'CLIFOR', 'NUMERODOC', 'PAGREC',
  'STATUS_FIN', 'STATUS_BAIXA', 'DTVENC', 'DTEMISSAO', 'DTBAIXA', 'TIPODOC',
  'CCUSTO', 'NATFINANCEIRA', 'VLRRATEIO', 'VLRBAIXA', 'VLRORIGINAL',
  'VLRDESCONTO', 'VLRJUROS', 'VLRMULTA', 'CONTA',
]);

export async function buildTitulosWorkbook(rows) {
  if (rows.length > EXPORT_ROW_LIMIT) throw new RangeError('Export row limit exceeded');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Titulos');
  sheet.columns = EXPORT_COLUMNS.map(key => ({ header: key, key, width: 18 }));
  // Explicit projection keeps unexpected source fields out of downloaded files.
  for (const row of rows) sheet.addRow(EXPORT_COLUMNS.map(key => row[key] ?? null));
  return workbook.xlsx.writeBuffer();
}
