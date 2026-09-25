import dotenv from 'dotenv';
import { createApp } from './app.js';
import { assertAuthMigrations } from './db/migrations.js';
import { getAuthPool } from './db/authPool.js';
import { assertStoredCredentials } from './security/credential-maintenance.js';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const port = Number(process.env.SERVER_PORT || 3001);
const host = process.env.SERVER_HOST || '0.0.0.0';

assertAuthMigrations()
  .then(() => assertStoredCredentials(getAuthPool()))
  .then(() => {
    const app = createApp();
    app.listen(port, host, () => {
      console.log(`Equilibrio BI em http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Falha ao inicializar autenticacao.', error);
    process.exit(1);
  });
