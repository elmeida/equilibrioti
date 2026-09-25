import { ensureAuthSchema } from '../auth/init.js';
import { closeAuthPool } from './authPool.js';

try {
  await ensureAuthSchema();
  console.log('Banco de autenticacao preparado e cadastro inicial verificado.');
} catch {
  console.error('Falha ao preparar autenticacao. Verifique a configuracao e as permissoes do banco.');
  process.exitCode = 1;
} finally {
  await closeAuthPool();
}
