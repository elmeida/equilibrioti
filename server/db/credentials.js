import 'dotenv/config';
import { getAuthPool, closeAuthPool } from './authPool.js';
import { assertAuthMigrations } from './migrations.js';
import { maintainCredentials } from '../security/credential-maintenance.js';

try {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length && !['--check', '--apply'].includes(args[0]))) {
    throw new Error('Use --check para leitura ou --apply somente apos autorizacao e backup.');
  }
  await assertAuthMigrations();
  const report = await maintainCredentials(getAuthPool(), { apply: args[0] === '--apply' });
  console.log(JSON.stringify(report));
} catch {
  console.error('Operacao de credenciais nao concluida. Verifique configuracao, chaves e migrations.');
  process.exitCode = 1;
} finally { await closeAuthPool(); }
