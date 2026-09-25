export const bundleLimits = { initialBytes: 260000, initialGzipBytes: 85000, chunkBytes: 500000 };

export function initialFiles(manifest) {
  if (!manifest['index.html']?.isEntry) throw new Error('Entrada principal ausente no manifesto.');
  const visited = new Set(), files = new Set();
  function visit(key) {
    if (visited.has(key)) return;
    visited.add(key);
    const chunk = manifest[key];
    if (!chunk?.file) throw new Error(`Dependencia ausente: ${key}`);
    files.add(chunk.file);
    for (const dependency of chunk.imports || []) visit(dependency);
  }
  visit('index.html');
  return [...files];
}

export function checkBundleBudget(manifest, sizes, limits = bundleLimits) {
  const files = initialFiles(manifest);
  const initial = files.reduce((sum, file) => {
    if (!sizes[file]) throw new Error(`Tamanho ausente: ${file}`);
    return { bytes: sum.bytes + sizes[file].bytes, gzipBytes: sum.gzipBytes + sizes[file].gzipBytes };
  }, { bytes: 0, gzipBytes: 0 });
  const violations = [];
  if (initial.bytes > limits.initialBytes) violations.push('JavaScript inicial excede o limite sem compressao.');
  if (initial.gzipBytes > limits.initialGzipBytes) violations.push('JavaScript inicial excede o limite gzip.');
  for (const [file, size] of Object.entries(sizes)) {
    if (size.bytes > limits.chunkBytes) violations.push(`Modulo acima do limite: ${file}`);
  }
  return { initial, files, limits, violations };
}
