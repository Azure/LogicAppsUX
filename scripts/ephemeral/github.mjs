import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import {
  BUILD_WORKFLOW,
  COMMENT_MARKER,
  DEPLOYMENT_KIND,
  MAX_ARCHIVE_BYTES,
  commentBody,
  eligible,
  environmentName,
  environmentNumber,
  matchesRun,
  selectArtifact,
} from './controller.mjs';

const execute = promisify(execFile);
const statePath = '.ephemeral-state.json';
const archivePath = '.ephemeral-artifact.zip';

export async function azure(args) {
  try {
    const { stdout } = await execute('az', [...args, '--only-show-errors', '--output', 'json'], { maxBuffer: 10 * 1024 * 1024 });
    return JSON.parse(stdout.trim() || 'null');
  } catch (error) {
    // Never propagate stdout from listSecrets, or credential-bearing child-process errors.
    throw new Error(
      `Azure preview operation (${args.slice(0, 3).join(' ')}) failed, exit ${error.code ?? 'unknown'}. Verify the configured resource, capacity, and federated identity permissions.`
    );
  }
}

export function azureArguments(env = process.env) {
  const values = ['EPHEMERAL_RESOURCE_GROUP', 'EPHEMERAL_STATIC_WEB_APP', 'EPHEMERAL_SUBSCRIPTION_ID'].map((key) => {
    const value = env[key];
    if (!value || value.startsWith('-') || !/^[a-zA-Z0-9_.()-]+$/.test(value)) {
      throw new Error(`Missing or invalid ${key}. See apps/Standalone/EPHEMERAL.md.`);
    }
    return value;
  });
  return ['--resource-group', values[0], '--name', values[1], '--subscription', values[2]];
}

export async function environments(client = azure) {
  const result = await client(['staticwebapp', 'environment', 'list', ...azureArguments()]);
  if (!Array.isArray(result)) {
    throw new Error('Azure returned an invalid preview environment list.');
  }
  return result.map((item) => {
    const name = item?.buildId ?? item?.name;
    if (typeof name !== 'string') {
      throw new Error('Azure returned an environment without a build identifier.');
    }
    return { name, hostname: item.hostname };
  });
}

export async function candidateNumbers({ github, context, azureClient = azure }) {
  const repo = context.repo;
  const payload = context.payload;
  if (context.eventName === 'pull_request_target') {
    const pr = payload.pull_request;
    if (pr.labels.some(({ name }) => name === 'ephemeral') || (payload.action === 'unlabeled' && payload.label.name === 'ephemeral')) {
      return [pr.number];
    }
    return [];
  }
  if (context.eventName === 'workflow_run') {
    const { data: workflow } = await github.rest.actions.getWorkflow({ ...repo, workflow_id: BUILD_WORKFLOW });
    const { data: run } = await github.rest.actions.getWorkflowRun({ ...repo, run_id: payload.workflow_run.id });
    if (run.workflow_id !== workflow.id || run.event !== 'pull_request' || run.repository.full_name !== `${repo.owner}/${repo.repo}`) {
      throw new Error('Unexpected preview build origin.');
    }
    const associated = run.pull_requests?.length
      ? run.pull_requests
      : await github.paginate(github.rest.repos.listPullRequestsAssociatedWithCommit, { ...repo, commit_sha: run.head_sha, per_page: 100 });
    const candidates = [];
    for (const item of associated) {
      const { data: pr } = await github.rest.pulls.get({ ...repo, pull_number: item.number });
      if (pr.base.repo.full_name === `${repo.owner}/${repo.repo}` && matchesRun(run, pr, workflow.id, `${repo.owner}/${repo.repo}`)) {
        candidates.push(pr.number);
      }
    }
    if (candidates.length > 1) {
      throw new Error('Preview build is associated with multiple matching PRs; reconcile an explicit PR number.');
    }
    return candidates;
  }
  if (payload.inputs?.pr_number) {
    const number = Number(payload.inputs.pr_number);
    environmentName(number);
    return [number];
  }
  const prs = await github.paginate(github.rest.pulls.list, { ...repo, state: 'open', per_page: 100 });
  const numbers = new Set(prs.filter((pr) => pr.labels.some(({ name }) => name === 'ephemeral')).map((pr) => pr.number));
  for (const item of await environments(azureClient)) {
    const number = environmentNumber(item.name);
    if (number !== undefined) {
      numbers.add(number);
    }
  }
  if (numbers.size > 256) {
    throw new Error('Too many preview candidates for a GitHub matrix. Remove unused ephemeral labels.');
  }
  return [...numbers];
}

export function servicesFor({ github, context, azureClient = azure }) {
  const repo = context.repo;
  const repository = `${repo.owner}/${repo.repo}`;
  const branch = context.payload.repository.default_branch;
  const pull = async (number) => (await github.rest.pulls.get({ ...repo, pull_number: number })).data;
  const deployments = async (number) =>
    (
      await github.paginate(github.rest.repos.listDeployments, {
        ...repo,
        environment: `standalone-${environmentName(number)}`,
        per_page: 100,
      })
    ).filter((deployment) => deployment.payload?.kind === DEPLOYMENT_KIND && deployment.payload.number === number);
  const deploymentStatus = async (id, state, url) => {
    await github.rest.repos.createDeploymentStatus({
      ...repo,
      deployment_id: id,
      state,
      environment_url: url,
      log_url: `${context.serverUrl}/${repository}/actions/runs/${context.runId}`,
      auto_inactive: false,
    });
  };
  const hostname = async (number) => {
    const environment = (await environments(azureClient)).find((item) => item.name === environmentName(number));
    if (!environment?.hostname) {
      throw new Error('Azure did not return a deployed preview hostname.');
    }
    return environment.hostname;
  };

  return {
    pull,
    eligible: (pr) => eligible(pr, repository, branch),
    hostname,
    deploymentStatus,
    async build(pr) {
      const { data: workflow } = await github.rest.actions.getWorkflow({ ...repo, workflow_id: BUILD_WORKFLOW });
      const runs = await github.paginate(github.rest.actions.listWorkflowRuns, {
        ...repo,
        workflow_id: workflow.id,
        event: 'pull_request',
        head_sha: pr.head.sha,
        per_page: 100,
      });
      return runs
        .filter((run) => matchesRun(run, pr, workflow.id, repository))
        .sort((a, b) => b.run_number - a.run_number || b.run_attempt - a.run_attempt)[0];
    },
    async artifact(run) {
      const artifacts = await github.paginate(github.rest.actions.listWorkflowRunArtifacts, { ...repo, run_id: run.id, per_page: 100 });
      return selectArtifact(artifacts, run);
    },
    async extract(run, artifact) {
      const { data } = await github.rest.actions.downloadArtifact({ ...repo, artifact_id: artifact.id, archive_format: 'zip' });
      const bytes = Buffer.from(data);
      if (bytes.length > MAX_ARCHIVE_BYTES || `sha256:${createHash('sha256').update(bytes).digest('hex')}` !== artifact.digest) {
        throw new Error('Preview archive size or SHA-256 digest did not match GitHub metadata.');
      }
      await writeFile(archivePath, bytes, { flag: 'wx' });
      await execute('python3', ['scripts/ephemeral/validate.py', archivePath, '.ephemeral-site'], { maxBuffer: 1024 * 1024 });
    },
    async published(number) {
      const environment = (await environments(azureClient)).find((item) => item.name === environmentName(number));
      if (!environment) {
        return undefined;
      }
      const [deployment] = await deployments(number);
      if (deployment) {
        const { data: statuses } = await github.rest.repos.listDeploymentStatuses({ ...repo, deployment_id: deployment.id, per_page: 1 });
        if (statuses[0]?.state === 'success') {
          return { ...deployment.payload, hostname: environment.hostname };
        }
      }
      return undefined;
    },
    async startDeployment(state) {
      const { data } = await github.rest.repos.createDeployment({
        ...repo,
        ref: state.sha,
        environment: `standalone-${state.environment}`,
        auto_merge: false,
        required_contexts: [],
        transient_environment: true,
        production_environment: false,
        description: 'Local-only Standalone PR preview',
        payload: { ...state, kind: DEPLOYMENT_KIND },
      });
      if (!data.id) {
        throw new Error('GitHub did not create the preview deployment record.');
      }
      await deploymentStatus(data.id, 'in_progress');
      return data.id;
    },
    async deleteEnvironment(number) {
      if ((await environments(azureClient)).some((item) => item.name === environmentName(number))) {
        await azureClient([
          'staticwebapp',
          'environment',
          'delete',
          ...azureArguments(),
          '--environment-name',
          environmentName(number),
          '--yes',
        ]);
      }
    },
    async inactivate(number) {
      for (const deployment of await deployments(number)) {
        await deploymentStatus(deployment.id, 'inactive');
      }
    },
    async comment(pr, message, published) {
      const body = commentBody(pr, message, published);
      const comments = await github.paginate(github.rest.issues.listComments, { ...repo, issue_number: pr.number, per_page: 100 });
      const own = comments.find((comment) => comment.user?.login === 'github-actions[bot]' && comment.body?.startsWith(COMMENT_MARKER));
      if (own) {
        if (own.body !== body) {
          await github.rest.issues.updateComment({ ...repo, comment_id: own.id, body });
        }
      } else {
        await github.rest.issues.createComment({ ...repo, issue_number: pr.number, body });
      }
    },
  };
}

export async function prepareJob({ github, context, core, azureClient = azure }) {
  const { prepare } = await import('./controller.mjs');
  const services = servicesFor({ github, context, azureClient });
  const number = Number(process.env.EPHEMERAL_PR_NUMBER);
  environmentName(number);
  let state;
  let reported = false;
  try {
    state = await prepare(number, {
      ...services,
      async comment(...args) {
        await services.comment(...args);
        reported = true;
      },
    });
  } catch (error) {
    if (!reported) {
      const pr = await services.pull(number);
      await services.comment(
        pr,
        'Preview reconciliation failed. Check the Reconcile Standalone Ephemeral workflow logs; rerun it after resolving the error.'
      );
    }
    throw error;
  }
  await writeFile(statePath, JSON.stringify(state));
  if (state.action === 'deploy') {
    core.setOutput('environment', state.environment);
    core.setOutput('deploy', 'true');
  }
}

export async function publishToken({ core }) {
  const token = await azure(['staticwebapp', 'secrets', 'list', ...azureArguments(), '--query', 'properties.apiKey']);
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('Azure returned no SWA deployment token.');
  }
  core.setSecret(token);
  core.setOutput('token', token);
}

export async function finishJob({ github, context }) {
  const { finish } = await import('./controller.mjs');
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  await finish(state, process.env.EPHEMERAL_UPLOAD_RESULT === 'success', servicesFor({ github, context }));
}
