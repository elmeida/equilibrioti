import { assertAuthMigrations } from './migrations.js';
import { closeAuthPool, getAuthPool } from './authPool.js';
import { assertStoredCredentials } from '../security/credential-maintenance.js';

try {
  await assertAuthMigrations();
  await assertStoredCredentials(getAuthPool());
  console.log('Versoes do banco de autenticacao conferidas, sem alteracoes.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await closeAuthPool();
}
