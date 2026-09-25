import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../scripts/deploy-vps.sh', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const rollback = readFileSync(new URL('../scripts/rollback-vps.sh', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const remote = source.split("<<'REMOTE_SCRIPT'\n")[1].split('\nREMOTE_SCRIPT')[0];
const restartBlock = remote.slice(remote.indexOf('restart_app()'), remote.indexOf('\nSERVER_PORT='));
const healthBlock = remote.slice(remote.indexOf('for attempt in'), remote.indexOf('\nif [ "$KEEP_RELEASES"'));
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
const dirs = [];
function run(code) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'equilibrio-deploy-test-'));
  dirs.push(dir);
  return spawnSync(bash, ['--noprofile', '--norc', '-s'], {
    input: code, encoding: 'utf8', cwd: dir, timeout: 20000,
    env: { ...process.env, VPS_RESTART_COMMAND: '', MSYS_NO_PATHCONV: '1' },
  });
}
afterEach(() => {
  for (const dir of dirs.splice(0)) {
    const resolved = path.resolve(dir);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('equilibrio-deploy-test-')) {
      throw new Error('Unsafe test cleanup path');
    }
    rmSync(resolved, { recursive: true, force: true });
  }
});

describe('entrega de homologacao sem VPS', () => {
  it('scripts mantem sintaxe bash valida', () => {
    for (const script of [source, rollback]) {
      const result = spawnSync(bash, ['-n'], { input: script, encoding: 'utf8', timeout: 20000 });
      expect(result.status, result.stderr).toBe(0);
    }
  });
  it('scp recebe -P e ssh recebe -p sem compartilhar flags de porta', () => {
    expect(source).toContain('SCP_OPTS=("${SSH_COMMON_OPTS[@]}" -P "$VPS_PORT")');
    expect(source).toContain('SSH_OPTS=("${SSH_COMMON_OPTS[@]}" -p "$VPS_PORT")');
    expect(source).toContain('scp "${SCP_OPTS[@]}"');
  });
  it('confere migrations antes de alterar release atual', () => {
    expect(remote.indexOf('npm run db:check')).toBeLessThan(remote.indexOf('ln -sfn "$RELEASE_PATH" "$CURRENT_LINK"'));
    expect(remote).toContain('if [ "$RUN_DB_MIGRATIONS" = "true" ]; then\n  npm run db:migrate\nfi');
  });
  it('reinicio bem sucedido nao aciona recuperacao', () => {
    const result = run(`set -euo pipefail
previous_release=/previous
CURRENT_LINK=/current
VPS_RESTART_COMMAND='exit 0'
ln() { echo UNEXPECTED_ROLLBACK; }
${restartBlock}
echo SUCCESS
`);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('SUCCESS');
    expect(result.stdout).not.toContain('UNEXPECTED_ROLLBACK');
  });
  it('falha de reinicio com set -e restaura link e tenta reiniciar versao anterior', () => {
    const result = run(`set -euo pipefail
previous_release=/previous
CURRENT_LINK=/current
VPS_RESTART_COMMAND='echo RESTART; exit 1'
ln() { printf 'RESTORE %s\\n' "$*"; }
${restartBlock}
`);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('RESTORE -sfn /previous /current');
    expect(result.stdout.match(/RESTART/g)).toHaveLength(2);
    expect(result.stderr).toContain('Intervencao necessaria');
  });
  it('falha de primeira instalacao nao inventa recuperacao', () => {
    const result = run(`set -euo pipefail
previous_release=''
CURRENT_LINK=/current
VPS_RESTART_COMMAND='exit 1'
ln() { echo UNEXPECTED_ROLLBACK; }
${restartBlock}
`);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Sem release anterior');
    expect(result.stdout).not.toContain('UNEXPECTED_ROLLBACK');
  });
  it('falha de healthcheck recupera release anterior e encerra como falha', () => {
    const result = run(`set -euo pipefail
previous_release=/previous
CURRENT_LINK=/current
SERVER_PORT=3001
VPS_RESTART_COMMAND='echo RESTART; exit 0'
ln() { printf 'RESTORE %s\\n' "$*"; }
curl() { return 1; }
sleep() { :; }
${restartBlock}
${healthBlock}
`);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('RESTORE -sfn /previous /current');
    expect(result.stdout.match(/RESTART/g)).toHaveLength(2);
  });
});
