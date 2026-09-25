import fs from 'node:fs/promises';
import path from 'node:path';
import { localDir, readLocalEnvironment } from './lib/local-environment.mjs';
import { assertExistingDatabase, backupLocalDatabase, migrationSql, localSql, provisionRuntime } from './lib/local-postgres.mjs';

try {
  if (process.argv[2] !== '--apply' || process.argv.length !== 3) throw new Error('Exige --apply e autorizacao previa.');
  const env = await readLocalEnvironment();
  assertExistingDatabase();
  const backup = await backupLocalDatabase();
  console.log('Backup local criado e catalogo conferido. Nenhum outro banco foi incluido.');
  localSql(await migrationSql());
  await provisionRuntime(env);
  const versions = localSql('SELECT version FROM equilibrio_ti.schema_migrations ORDER BY version').split('\n');
  await fs.writeFile(path.join(localDir, 'database-result.json'), JSON.stringify({ at: new Date().toISOString(), database: 'equilibrio_auth', schema: 'equilibrio_ti', backup, versions, runtimeRole: 'equilibrio_app' }, null, 2), { mode: 0o600 });
  console.log(`Banco existente atualizado. Migrations: ${versions.join(', ')}. Acesso da aplicacao separado do proprietario.`);
} catch {
  console.error('Atualizacao local interrompida. Confira Docker local, destino, backup e configuracao. Nenhuma senha foi exibida.');
  process.exitCode = 1;
}
