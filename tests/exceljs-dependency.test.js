import { createRequire } from 'node:module';
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

// Resolve the dependency from ExcelJS, including a possible nested installation.
const requireFromExcel = createRequire(import.meta.resolve('exceljs'));
const uuid = requireFromExcel('uuid');
const buffers = [
  ['Uint8Array', size => new Uint8Array(size).fill(170)],
  ['Buffer', size => Buffer.alloc(size, 170)],
];

function generate(method, buffer, offset) {
  return method === 'v6'
    ? uuid.v6({}, buffer, offset)
    : uuid[method]('export-control', uuid[method].DNS, buffer, offset);
}

describe('UUID resolvido pelo ExcelJS: GHSA-w5hq-g745-h8pq', () => {
  for (const method of ['v3', 'v5', 'v6']) {
    for (const [kind, allocate] of buffers) {
      it.each([[8, 4], [16, 1], [16, -1]])(
        `${method} rejeita ${kind} com tamanho %s e offset %s sem escrita parcial`,
        (size, offset) => {
          const buffer = allocate(size);
          const before = Array.from(buffer);
          expect(() => generate(method, buffer, offset)).toThrow(RangeError);
          expect(Array.from(buffer)).toEqual(before);
        },
      );
    }

    it(`${method} preserva uso valido com offset e bytes adjacentes`, () => {
      const buffer = Buffer.alloc(24, 170);
      expect(generate(method, buffer, 4)).toBe(buffer);
      const value = uuid.stringify(buffer, 4);
      expect(uuid.validate(value)).toBe(true);
      expect(uuid.version(value)).toBe(Number(method.slice(1)));
      expect(Array.from(buffer.subarray(0, 4))).toEqual([170, 170, 170, 170]);
      expect(Array.from(buffer.subarray(20))).toEqual([170, 170, 170, 170]);
    });
  }

  it('mantem v4 sem parametros via CommonJS, como usado pelo ExcelJS', () => {
    const values = Array.from({ length: 10 }, () => uuid.v4());
    expect(new Set(values).size).toBe(10);
    for (const value of values) {
      expect(uuid.validate(value)).toBe(true);
      expect(uuid.version(value)).toBe(4);
    }
  });

  it('gera e reabre XLSX com a formatacao estendida que usa UUID', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Controle');
    sheet.addRows([[10], [20]]);
    sheet.addConditionalFormatting({
      ref: 'A1:A2',
      rules: [{
        type: 'dataBar', gradient: false,
        cfvo: [{ type: 'min' }, { type: 'max' }],
        color: { argb: 'FF008800' },
      }],
    });
    const data = await workbook.xlsx.writeBuffer();
    const id = sheet.conditionalFormattings[0].rules[0].x14Id;
    expect(id).toMatch(/^\{[0-9A-F-]{36}\}$/);
    expect(uuid.version(id.slice(1, -1).toLowerCase())).toBe(4);
    const restored = new ExcelJS.Workbook();
    await restored.xlsx.load(data);
    const read = restored.getWorksheet('Controle');
    expect(read.getCell('A2').value).toBe(20);
    expect(read.conditionalFormattings[0].rules[0].type).toBe('dataBar');
    expect(read.conditionalFormattings[0].rules[0].gradient).toBe(false);
  });
});
