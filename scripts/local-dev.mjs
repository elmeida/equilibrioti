import { spawnSync } from 'node:child_process';
import { prepareLocalFiles, readLocalEnvironment, root, isolatedProcessEnvironment } from './lib/local-environment.mjs';

const commands = {
  check: ['runtime', 'server/db/check.js'],
  init: ['runtime', 'scripts/local-admin.mjs'],
  server: ['runtime', 'server/index.js'],
  test: ['runtime', 'scripts/check-local-db.mjs'],
};
try {
  const action = process.argv[2];
  if (action === 'prepare' && process.argv.length === 3) {
    await prepareLocalFiles();
    console.log('Configuracao local criada em .local/equilibrio-bi. Segredos nao exibidos; .env atual preservado.');
  } else if (action === 'client' && process.argv.length === 3) {
    const env = await readLocalEnvironment();
    const child = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5175'], { cwd: root, env: isolatedProcessEnvironment(env), stdio: 'inherit' });
    process.exitCode = child.status ?? 1;
  } else if (action === 'migrate' && process.argv.length === 3) {
    const child = spawnSync(process.execPath, ['scripts/local-database.mjs', '--apply'], { cwd: root, stdio: 'inherit' });
    process.exitCode = child.status ?? 1;
  } else if (commands[action] && process.argv.length === 3) {
    const [kind, script] = commands[action];
    const env = await readLocalEnvironment(kind);
    const child = spawnSync(process.execPath, [script], { cwd: root, env: isolatedProcessEnvironment(env), stdio: 'inherit' });
    process.exitCode = child.status ?? 1;
  } else throw new Error('Use prepare, check, migrate, init, test, client ou server.');
} catch (error) {
  console.error(error.code === 'ENOENT' ? 'Configuracao local ausente. Execute local:prepare.' : 'Operacao local nao concluida. Confira destino e configuracao; nenhum segredo foi exibido.');
  process.exitCode = 1;
}
