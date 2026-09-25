import dotenv from 'dotenv';
import pg from 'pg';
import sql from 'mssql';
import { mkdir, writeFile } from 'node:fs/promises';
import { inspectSources, inspectionSucceeded, parseOptions } from './lib/source-inspection.mjs';

dotenv.config({ quiet: true });

try {
  const options = parseOptions(process.argv.slice(2));
  const report = await inspectSources({ env: process.env, PgClient: pg.Client, SqlPool: sql.ConnectionPool, options });
  const output = new URL('../tmp/source-inspection/', import.meta.url);
  await mkdir(output, { recursive: true });
  const text = `${JSON.stringify(report, null, 2)}\n`;
  await writeFile(new URL('latest.json', output), text, { mode: 0o600 });
  console.log(JSON.stringify({
    generatedAt: report.generatedAt, catalog: report.catalog,
    rm: {
      ...report.rm,
      columns: undefined,
      columnCount: report.rm.columns?.length,
      objects: report.rm.columns ? [...new Set(report.rm.columns.map(column => column.objectName))] : undefined,
    },
    financialValuesValidated: false,
    evidence: 'tmp/source-inspection/latest.json',
  }, null, 2));
  if (!inspectionSucceeded(report)) process.exitCode = 2;
} catch {
  console.error('Nao foi possivel executar a inspecao. Use --tenant ID ou --legacy-env; confira a configuracao e a pasta de evidencias local.');
  process.exitCode = 1;
}
