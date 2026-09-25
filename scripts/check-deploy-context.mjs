import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function deploymentContext(env, event) {
  if (env.HML_CD_ENABLED !== 'true') throw new Error('CD de homologacao desativado.');
  if (env.GITHUB_REPOSITORY !== 'elmeida/equilibrioti' || env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error('Publicacao permitida somente na main do repositorio oficial.');
  }
  let sha;
  if (env.GITHUB_EVENT_NAME === 'workflow_dispatch') {
    sha = env.GITHUB_SHA;
  } else if (env.GITHUB_EVENT_NAME === 'workflow_run') {
    const run = event.workflow_run;
    if (env.HML_AUTO_DEPLOY_ENABLED !== 'true' || run?.event !== 'push'
      || run.conclusion !== 'success' || run.head_branch !== 'main'
      || run.head_repository?.full_name !== env.GITHUB_REPOSITORY) {
      throw new Error('CI de origem nao autorizado para publicacao automatica.');
    }
    sha = run.head_sha;
  } else {
    throw new Error('Evento nao autorizado.');
  }
  if (!/^[a-f0-9]{40}$/.test(sha ?? '')) throw new Error('Commit invalido.');
  return sha;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const sha = deploymentContext(process.env, JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')));
    appendFileSync(process.env.GITHUB_OUTPUT, `checkout_ref=${sha}\n`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
