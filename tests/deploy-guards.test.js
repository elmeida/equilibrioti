import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { deploymentContext } from '../scripts/check-deploy-context.mjs';

const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
const guard = read('scripts/validate-vps-target.sh');
const env = {
  HML_CD_ENABLED: 'true', HML_AUTO_DEPLOY_ENABLED: 'true',
  GITHUB_REPOSITORY: 'elmeida/equilibrioti', GITHUB_REF: 'refs/heads/main',
  GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_SHA: 'a'.repeat(40),
};
const event = { workflow_run: {
  event: 'push', conclusion: 'success', head_branch: 'main', head_sha: 'b'.repeat(40),
  head_repository: { full_name: 'elmeida/equilibrioti' },
} };
const target = {
  VPS_HOST: 'atenza-hml-apps-01.atenza.cloud', VPS_USER: 'deploy-equilibrio',
  VPS_PORT: '22', VPS_APP_PATH: '/var/www/equilibrio-bi-hml', VPS_SERVICE_NAME: 'equilibrioti',
  VPS_NODE_BIN: '/opt/atenza/equilibrio-bi/node-v22.23.2-linux-x64/bin',
  VPS_RESTART_COMMAND: '', RUN_DB_MIGRATIONS: 'false', KEEP_RELEASES: '0',
  APP_HEALTHCHECK_URL: 'https://equilibrio-bi-homologacao.atenza.digital/api/health',
  RELEASE_ID: 'abcdef123456-123456-1', ROLLBACK_RELEASE_ID: '20260921-125622',
};
function validateTarget(overrides = {}, mode = 'deploy') {
  return spawnSync(bash, ['--noprofile', '--norc', '-s', '--', mode], {
    input: `set -euo pipefail\n${guard}\necho VALIDATED\n`, encoding: 'utf8', timeout: 20000,
    env: { ...process.env, ...target, ...overrides, MSYS_NO_PATHCONV: '1' },
  });
}

describe('origem de publicacao', () => {
  it('fixa o SHA do disparo manual, ignorando ref arbitraria no payload', () => {
    expect(deploymentContext(env, { inputs: { ref: 'other' } })).toBe(env.GITHUB_SHA);
  });
  it('usa o SHA exato do CI de push para main', () => {
    expect(deploymentContext({ ...env, GITHUB_EVENT_NAME: 'workflow_run' }, event)).toBe('b'.repeat(40));
  });
  it.each([
    ['HML_CD_ENABLED', ''], ['HML_CD_ENABLED', 'false'], ['HML_CD_ENABLED', 'TRUE'],
    ['GITHUB_REPOSITORY', 'fork/equilibrioti'], ['GITHUB_REF', 'refs/heads/atenza/test'],
    ['GITHUB_REF', 'refs/tags/main'], ['GITHUB_EVENT_NAME', 'pull_request'],
    ['GITHUB_SHA', 'main'], ['GITHUB_SHA', 'a'.repeat(40) + '\ninjected=true'],
  ])('recusa %s=%s', (key, value) => {
    expect(() => deploymentContext({ ...env, [key]: value }, event)).toThrow();
  });
  it.each([
    { event: 'workflow_dispatch' }, { event: 'pull_request' }, { conclusion: 'failure' },
    { conclusion: 'cancelled' }, { head_branch: 'other' }, { head_sha: 'main' },
    { head_repository: { full_name: 'fork/equilibrioti' } }, { head_repository: undefined },
  ])('recusa CI de origem inadequada: %j', change => {
    expect(() => deploymentContext({ ...env, GITHUB_EVENT_NAME: 'workflow_run' }, {
      workflow_run: { ...event.workflow_run, ...change },
    })).toThrow();
  });
  it('exige habilitacao separada do automatico e rejeita payload ausente', () => {
    expect(() => deploymentContext({ ...env, GITHUB_EVENT_NAME: 'workflow_run', HML_AUTO_DEPLOY_ENABLED: '' }, event)).toThrow();
    expect(() => deploymentContext({ ...env, GITHUB_EVENT_NAME: 'workflow_run' }, {})).toThrow();
  });
});

describe('parametros antes de qualquer conexao', () => {
  it.each(['deploy', 'rollback'])('aceita apenas destino de homologacao em %s', mode => {
    const result = validateTarget({}, mode);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('VALIDATED');
  });
  it.each([
    ['VPS_HOST', 'production.example'], ['VPS_USER', 'root'], ['VPS_USER', "user'; touch /tmp/pwn; '"],
    ['VPS_PORT', '0'], ['VPS_PORT', '65536'], ['VPS_PORT', '-1'], ['VPS_PORT', "22\nanything"],
    ['VPS_APP_PATH', '/'], ['VPS_APP_PATH', '/var/www/another-project'],
    ['VPS_SERVICE_NAME', 'another-project'], ['VPS_NODE_BIN', '/usr/bin'],
    ['VPS_NODE_BIN', '/opt/atenza/equilibrio-bi/node-v18.19.1-linux-x64/bin'],
    ['VPS_RESTART_COMMAND', 'anything'], ['RUN_DB_MIGRATIONS', 'true'], ['KEEP_RELEASES', '5'],
    ['APP_HEALTHCHECK_URL', 'http://localhost:3001/api/health'],
    ['RELEASE_ID', '../other'], ['RELEASE_ID', ''], ['RELEASE_ID', "x'; exit 0; '"],
    ['RELEASE_ID', 'x\ny'], ['RELEASE_ID', 'a'.repeat(101)],
  ])('bloqueia %s sem expor o valor', (name, value) => {
    const result = validateTarget({ [name]: value });
    expect(result.status).toBe(1);
    expect(result.stderr.trim()).toBe(`Parametro de homologacao invalido: ${name}`);
    expect(result.stdout).not.toContain('VALIDATED');
  });
  it.each(['', '..', '../another', '/tmp/release', "x'y"] )('recusa rollback sem release explicito seguro: %s', value => {
    expect(validateTarget({ ROLLBACK_RELEASE_ID: value }, 'rollback').status).toBe(1);
  });
  it('scripts carregam guardas antes de acesso remoto', () => {
    for (const name of ['deploy', 'rollback']) {
      const script = read(`scripts/${name}-vps.sh`);
      expect(script.indexOf('validate-vps-target.sh')).toBeLessThan(script.indexOf('\nssh '));
      expect(script).toContain('SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/');
      expect(script).toContain('export PATH="$VPS_NODE_BIN:$PATH"');
      expect(script).not.toContain('npm run db:migrate');
    }
  });
  it('SSH sem fingerprint falha antes de escrever chave', () => {
    const result = spawnSync(bash, ['--noprofile', '--norc', '-s'], {
      input: read('scripts/setup-deploy-ssh.sh'), encoding: 'utf8', timeout: 20000,
      env: { ...process.env, ...target, VPS_SSH_KEY: 'test-only', VPS_SSH_KNOWN_HOSTS: '' },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('VPS_SSH_KNOWN_HOSTS');
    expect(result.stderr).not.toContain('test-only');
  });
  it('novos scripts possuem sintaxe bash valida', () => {
    for (const script of [guard, read('scripts/setup-deploy-ssh.sh')]) {
      expect(spawnSync(bash, ['-n'], { input: script, encoding: 'utf8' }).status).toBe(0);
    }
  });
  it('workflows nunca usam keyscan, til em env, migrations ou retenção destrutiva', () => {
    for (const name of ['cd-vps', 'rollback-vps']) {
      const workflow = read(`.github/workflows/${name}.yml`);
      expect(workflow).toContain("vars.HML_CD_ENABLED == 'true'");
      expect(workflow).toContain("github.ref == 'refs/heads/main'");
      expect(workflow).toContain('persist-credentials: false');
      expect(workflow).toContain('secrets.VPS_SSH_KNOWN_HOSTS');
      expect(workflow).not.toContain('ssh-keyscan');
      expect(workflow).not.toContain('SSH_KEY_PATH: ~');
      expect(workflow).not.toContain('inputs.ref');
      expect(workflow).not.toContain('inputs.run_migrations');
    }
    expect(read('.github/workflows/cd-vps.yml')).toContain("KEEP_RELEASES: '0'");
  });
});
