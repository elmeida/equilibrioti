import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { buildTitulosWorkbook, EXPORT_COLUMNS } from '../server/utils/titulosExport.js';

async function read(rows) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await buildTitulosWorkbook(rows));
  return workbook.getWorksheet('Titulos');
}

describe('arquivo financeiro completo e com colunas explicitas', () => {
  it('recorte vazio ainda possui todos os cabecalhos', async () => {
    const sheet = await read([]);
    expect(sheet.rowCount).toBe(1);
    expect(sheet.getRow(1).values.slice(1)).toEqual(EXPORT_COLUMNS);
  });
  it.each([1, 5000])('mantem todas as %s linhas sem corte', async count => {
    const sheet = await read(Array.from({ length: count }, (_, i) => ({ REF: `ref-${i}`, VLRRATEIO: i })));
    expect(sheet.rowCount).toBe(count + 1);
    expect(sheet.getRow(count + 1).getCell(3).value).toBe(`ref-${count - 1}`);
  });
  it('rejeita 5001 linhas em vez de gerar arquivo parcial', async () => {
    await expect(buildTitulosWorkbook(Array(5001).fill({}))).rejects.toThrow(RangeError);
  });
  it('preserva numeros, datas, nulos e texto parecido com formula sem executa-lo', async () => {
    const date = new Date('2026-09-18T00:00:00Z');
    const sheet = await read([{ NUMERODOC: '=1+1', CLIFOR: '+SUM(A1)', DTVENC: date, VLRRATEIO: -123.4567, VLRBAIXA: 0, HISTORICO: 'private-not-exported', db_password: 'secret' }]);
    const value = key => sheet.getRow(2).getCell(EXPORT_COLUMNS.indexOf(key) + 1).value;
    expect(value('NUMERODOC')).toBe('=1+1');
    expect(value('CLIFOR')).toBe('+SUM(A1)');
    expect(value('DTVENC')).toEqual(date);
    expect(value('VLRRATEIO')).toBe(-123.4567);
    expect(value('VLRBAIXA')).toBe(0);
    expect(value('DTBAIXA')).toBeNull();
    expect(JSON.stringify(sheet.getSheetValues())).not.toMatch(/private-not-exported|secret|db_password/);
  });
});
