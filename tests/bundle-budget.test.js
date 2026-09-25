import { describe, expect, it } from 'vitest';
import { checkBundleBudget, initialFiles } from '../scripts/lib/bundle-budget.mjs';

const manifest = {
  'index.html': { isEntry: true, file: 'index.js', imports: ['shared'], dynamicImports: ['charts'] },
  shared: { file: 'shared.js', imports: ['index.html'] },
  charts: { file: 'charts.js', imports: ['shared'] },
};
const sizes = { 'index.js': { bytes: 100000, gzipBytes: 30000 }, 'shared.js': { bytes: 10000, gzipBytes: 3000 }, 'charts.js': { bytes: 400000, gzipBytes: 100000 } };
describe('build budgets', () => {
  it('counts static dependencies once, excluding deferred modules', () => {
    expect(initialFiles(manifest)).toEqual(['index.js', 'shared.js']);
    expect(checkBundleBudget(manifest, sizes).initial).toEqual({ bytes: 110000, gzipBytes: 33000 });
  });
  it('accepts the budget boundary', () => {
    expect(checkBundleBudget(manifest, sizes, { initialBytes: 110000, initialGzipBytes: 33000, chunkBytes: 400000 }).violations).toEqual([]);
  });
  it.each(['initialBytes', 'initialGzipBytes', 'chunkBytes'])('rejects a regression in %s', key => {
    expect(checkBundleBudget(manifest, sizes, { initialBytes: 110000, initialGzipBytes: 33000, chunkBytes: 400000, [key]: 1 }).violations.length).toBeGreaterThan(0);
  });
  it('rejects a missing entry', () => expect(() => initialFiles({})).toThrow('Entrada principal'));
  it('rejects a missing static dependency', () => expect(() => initialFiles({ 'index.html': manifest['index.html'] })).toThrow('Dependencia ausente'));
  it('rejects missing size evidence', () => expect(() => checkBundleBudget(manifest, {})).toThrow('Tamanho ausente'));
});
