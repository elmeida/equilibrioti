import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { checkBundleBudget } from './lib/bundle-budget.mjs';

const root = new URL('../dist/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('.vite/manifest.json', root), 'utf8'));
const sizes = {};
for (const file of new Set(Object.values(manifest).map(chunk => chunk.file))) {
  if (!file.startsWith('assets/') || file.includes('..') || !file.endsWith('.js')) throw new Error('Caminho inesperado no manifesto.');
  const data = await readFile(new URL(file, root));
  sizes[file] = { bytes: data.length, gzipBytes: gzipSync(data).length };
}
const report = checkBundleBudget(manifest, sizes);
console.log(JSON.stringify({ ...report, chunks: sizes }, null, 2));
if (report.violations.length) process.exitCode = 1;
