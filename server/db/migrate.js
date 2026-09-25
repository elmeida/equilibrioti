import dotenv from 'dotenv';
import { runAuthMigrations } from './migrations.js';
import { closeAuthPool } from './authPool.js';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

try {
  const result = await runAuthMigrations();
  if (result.applied.length) {
    console.log(`Migrations aplicadas em ${result.schema}: ${result.applied.join(', ')}`);
  } else {
    console.log(`Schema ${result.schema} ja esta atualizado.`);
  }
} catch {
  console.error('Falha ao aplicar migrations. Verifique o destino, a configuracao e as permissoes do banco.');
  process.exitCode = 1;
} finally {
  await closeAuthPool();
}
