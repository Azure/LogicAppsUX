import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { azureArguments, candidateNumbers, prepareJob, servicesFor } from './github.mjs';
import { artifactName, COMMENT_MARKER, commentBody, DEPLOYMENT_KIND } from './controller.mjs';

const sha = 'a'.repeat(40);
const repo = { owner: 'Azure', repo: 'LogicAppsUX' };
const repository = 'Azure/LogicAppsUX';
const pr = {
  number: 42,
  state: 'open',
  labels: [{ name: 'ephemeral' }],
  base: { repo: { full_name: repository }, ref: 'main' },
  head: { sha, ref: 'feature', repo: { full_name: 'fork/LogicAppsUX' } },
};
const run = {
  id: 10,
  workflow_id: 7,
  run_attempt: 1,
  run_number: 3,
  event: 'pull_request',
  status: 'completed',
  conclusion: 'success',
  head_sha: sha,
  head_branch: 'feature',
  head_repository: pr.head.repo,
  repository: { full_name: repository },
  pull_requests: [],
};
const context = {
  repo,
  eventName: 'workflow_run',
  serverUrl: 'https://github.com',
  runId: 99,
  payload: { workflow_run: { id: 10 }, repository: { default_branch: 'main' } },
};

function api() {
  const rest = {
    actions: {
      getWorkflow: vi.fn().mockResolvedValue({ data: { id: 7 } }),
      getWorkflowRun: vi.fn().mockResolvedValue({ data: run }),
      listWorkflowRuns: vi.fn(),
      listWorkflowRunArtifacts: vi.fn(),
      downloadArtifact: vi.fn(),
    },
    pulls: { get: vi.fn().mockResolvedValue({ data: structuredClone(pr) }), list: vi.fn() },
    repos: {
      listPullRequestsAssociatedWithCommit: vi.fn(),
      listDeployments: vi.fn(),
      createDeployment: vi.fn().mockResolvedValue({ data: { id: 123 } }),
      createDeploymentStatus: vi.fn(),
      listDeploymentStatuses: vi.fn(),
    },
    issues: { listComments: vi.fn(), updateComment: vi.fn(), createComment: vi.fn() },
  };
  return {
    rest,
    paginate: vi.fn(async (method) => {
      if (method === rest.repos.listPullRequestsAssociatedWithCommit) {
        return [pr];
      }
      if (method === rest.actions.listWorkflowRuns) {
        return [run];
      }
      return [];
    }),
  };
}

describe('trusted GitHub adapter', () => {
  it('resolves absent fork PR associations using the run SHA, never artifact metadata', async () => {
    const github = api();
    expect(await candidateNumbers({ github, context })).toEqual([42]);
    expect(github.paginate).toHaveBeenCalledWith(github.rest.repos.listPullRequestsAssociatedWithCommit, {
      ...repo,
      commit_sha: sha,
      per_page: 100,
    });
    expect(github.rest.actions.downloadArtifact).not.toHaveBeenCalled();
  });

  it('uses recorded PR associations when present and re-reads the live PR', async () => {
    const github = api();
    github.rest.actions.getWorkflowRun.mockResolvedValue({ data: { ...run, pull_requests: [{ number: 42 }] } });
    expect(await candidateNumbers({ github, context })).toEqual([42]);
    expect(github.paginate).not.toHaveBeenCalled();
    expect(github.rest.pulls.get).toHaveBeenCalledWith({ ...repo, pull_number: 42 });
  });

  it.each([{ event: 'push' }, { workflow_id: 123 }, { repository: { full_name: 'wrong/repo' } }])(
    'rejects a forged run origin',
    async (change) => {
      const github = api();
      github.rest.actions.getWorkflowRun.mockResolvedValue({ data: { ...run, ...change } });
      await expect(candidateNumbers({ github, context })).rejects.toThrow('origin');
      expect(github.paginate).not.toHaveBeenCalled();
    }
  );

  it('does not associate a stale, wrong-base or deleted-fork head', async () => {
    for (const change of [
      { head: { ...pr.head, sha: 'b'.repeat(40) } },
      { head: { ...pr.head, repo: null } },
      { base: { ...pr.base, repo: { full_name: 'other/repo' } } },
    ]) {
      const github = api();
      github.rest.pulls.get.mockResolvedValue({ data: { ...pr, ...change } });
      expect(await candidateNumbers({ github, context })).toEqual([]);
    }
  });

  it('fails closed on ambiguous associations or API failure', async () => {
    const github = api();
    github.paginate.mockResolvedValue([pr, { ...pr, number: 43 }]);
    await expect(candidateNumbers({ github, context })).rejects.toThrow('multiple');
    github.paginate.mockRejectedValue(new Error('GitHub unavailable'));
    await expect(candidateNumbers({ github, context })).rejects.toThrow('GitHub unavailable');
  });

  it('reconciles explicit removal even after the label is no longer present', async () => {
    const github = api();
    const removal = {
      ...context,
      eventName: 'pull_request_target',
      payload: { pull_request: { ...pr, labels: [] }, action: 'unlabeled', label: { name: 'ephemeral' } },
    };
    expect(await candidateNumbers({ github, context: removal })).toEqual([42]);
    expect(await candidateNumbers({ github, context: { ...removal, payload: { ...removal.payload, label: { name: 'other' } } } })).toEqual(
      []
    );
  });

  it('validates manual PR numbers before using them in shell or environment outputs', async () => {
    const github = api();
    for (const value of ['default', '../42', '42; echo x', '-1', '0', '1.2']) {
      await expect(
        candidateNumbers({
          github,
          context: { ...context, eventName: 'workflow_dispatch', payload: { inputs: { pr_number: value } } },
        })
      ).rejects.toThrow();
    }
    expect(
      await candidateNumbers({
        github,
        context: { ...context, eventName: 'workflow_dispatch', payload: { inputs: { pr_number: '42' } } },
      })
    ).toEqual([42]);
  });

  it('chooses the newest matching build rather than a previous success or merge SHA', async () => {
    const github = api();
    const newest = { ...run, id: 11, run_number: 4, conclusion: 'failure' };
    github.paginate.mockResolvedValue([run, newest, { ...run, id: 12, run_number: 5, head_sha: 'b'.repeat(40) }]);
    const services = servicesFor({ github, context });
    expect(await services.build(pr)).toBe(newest);
    expect(github.paginate).toHaveBeenCalledWith(
      github.rest.actions.listWorkflowRuns,
      expect.objectContaining({ head_sha: sha, event: 'pull_request' })
    );
  });

  it('lists artifacts only on the selected run and requires its attempt-specific name', async () => {
    const github = api();
    const artifact = {
      id: 5,
      name: artifactName(run),
      expires_at: '2099-01-01T00:00:00Z',
      size_in_bytes: 10,
      digest: `sha256:${'a'.repeat(64)}`,
    };
    github.paginate.mockResolvedValue([artifact]);
    expect(await servicesFor({ github, context }).artifact(run)).toBe(artifact);
    expect(github.paginate).toHaveBeenCalledWith(github.rest.actions.listWorkflowRunArtifacts, { ...repo, run_id: 10, per_page: 100 });
  });

  it('updates only its own bot-marker comment and never a human spoof', async () => {
    const github = api();
    const own = { id: 4, user: { login: 'github-actions[bot]' }, body: `${COMMENT_MARKER}\nOld` };
    github.paginate.mockResolvedValue([{ id: 3, user: { login: 'human' }, body: `${COMMENT_MARKER}\nSpoof` }, own]);
    await servicesFor({ github, context }).comment(pr, 'Ready');
    expect(github.rest.issues.updateComment).toHaveBeenCalledWith(expect.objectContaining({ comment_id: 4 }));
    expect(github.rest.issues.createComment).not.toHaveBeenCalled();
  });

  it('does not auto-merge or wait for unrelated required checks when recording a preview', async () => {
    const github = api();
    const services = servicesFor({ github, context });
    expect(await services.startDeployment({ number: 42, sha, environment: 'pr42' })).toBe(123);
    expect(github.rest.repos.createDeployment).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: sha,
        auto_merge: false,
        required_contexts: [],
        transient_environment: true,
        production_environment: false,
        environment: 'standalone-pr42',
      })
    );
    expect(github.rest.repos.createDeploymentStatus).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'in_progress', auto_inactive: false })
    );
  });

  it('requires explicit Azure resource arguments and never falls back to CLI defaults', () => {
    const env = {
      EPHEMERAL_RESOURCE_GROUP: 'previews',
      EPHEMERAL_STATIC_WEB_APP: 'laux-previews',
      EPHEMERAL_SUBSCRIPTION_ID: 'test-subscription',
    };
    expect(azureArguments(env)).toEqual(['--resource-group', 'previews', '--name', 'laux-previews', '--subscription', 'test-subscription']);
    for (const value of ['', '--unexpected', 'name; echo x', 'bad\nname']) {
      expect(() => azureArguments({ ...env, EPHEMERAL_STATIC_WEB_APP: value })).toThrow();
    }
  });
});

describe('preparation failure reporting', () => {
  const message = 'The current preview build did not succeed. The last successful preview, if shown, is unchanged.';
  const published = {
    kind: DEPLOYMENT_KIND,
    number: 42,
    sha: 'b'.repeat(40),
    hostname: 'example-pr42.azurestaticapps.net',
  };

  beforeEach(() => {
    vi.stubEnv('EPHEMERAL_PR_NUMBER', '42');
    vi.stubEnv('EPHEMERAL_RESOURCE_GROUP', 'preview-group');
    vi.stubEnv('EPHEMERAL_STATIC_WEB_APP', 'preview-site');
    vi.stubEnv('EPHEMERAL_SUBSCRIPTION_ID', 'preview-subscription');
  });
  afterEach(() => vi.unstubAllEnvs());

  function failedBuild(previousBody = `${COMMENT_MARKER}\nOld`) {
    const github = api();
    github.paginate.mockImplementation(async (method) => {
      if (method === github.rest.actions.listWorkflowRuns) {
        return [{ ...run, conclusion: 'failure' }];
      }
      if (method === github.rest.repos.listDeployments) {
        return [{ id: 8, payload: published }];
      }
      if (method === github.rest.issues.listComments) {
        return [{ id: 4, user: { login: 'github-actions[bot]' }, body: previousBody }];
      }
      return [];
    });
    github.rest.repos.listDeploymentStatuses.mockResolvedValue({ data: [{ state: 'success' }] });
    return {
      github,
      context,
      core: { setOutput: vi.fn() },
      azureClient: vi.fn().mockResolvedValue([{ buildId: 'pr42', hostname: published.hostname }]),
    };
  }

  it('keeps the targeted failed-build comment and last successful preview details', async () => {
    const options = failedBuild();
    await expect(prepareJob(options)).rejects.toThrow('Preview build 10 finished with failure.');
    expect(options.github.rest.issues.updateComment).toHaveBeenCalledTimes(1);
    expect(options.github.rest.issues.updateComment).toHaveBeenCalledWith({
      ...repo,
      comment_id: 4,
      body: commentBody(pr, message, published),
    });
    expect(options.github.rest.issues.createComment).not.toHaveBeenCalled();
    expect(options.core.setOutput).not.toHaveBeenCalled();
  });

  it('does not replace an already matching failure comment on a later reconciliation', async () => {
    const options = failedBuild(commentBody(pr, message, published));
    await expect(prepareJob(options)).rejects.toThrow('Preview build 10 finished with failure.');
    expect(options.github.rest.issues.updateComment).not.toHaveBeenCalled();
    expect(options.github.rest.issues.createComment).not.toHaveBeenCalled();
    expect(options.core.setOutput).not.toHaveBeenCalled();
  });

  it('still reports failures that the controller has not reported', async () => {
    const options = failedBuild();
    const error = new Error('GitHub build lookup unavailable');
    options.github.rest.actions.getWorkflow.mockRejectedValue(error);
    await expect(prepareJob(options)).rejects.toBe(error);
    expect(options.github.rest.issues.updateComment).toHaveBeenCalledTimes(1);
    expect(options.github.rest.issues.updateComment).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.stringContaining('Preview reconciliation failed.') })
    );
    expect(options.azureClient).not.toHaveBeenCalled();
    expect(options.core.setOutput).not.toHaveBeenCalled();
  });

  it('only considers a failure reported after its comment is successfully written', async () => {
    const options = failedBuild();
    const error = new Error('GitHub comment update unavailable');
    options.github.rest.issues.updateComment.mockRejectedValueOnce(error).mockResolvedValueOnce({});
    await expect(prepareJob(options)).rejects.toBe(error);
    expect(options.github.rest.issues.updateComment).toHaveBeenCalledTimes(2);
    expect(options.github.rest.issues.updateComment).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ body: expect.stringContaining('Preview reconciliation failed.') })
    );
    expect(options.core.setOutput).not.toHaveBeenCalled();
  });
});

describe('workflow trust wiring', () => {
  const trusted = readFileSync(new URL('../../.github/workflows/standalone-ephemeral.yml', import.meta.url), 'utf8');
  const build = readFileSync(new URL('../../.github/workflows/standalone-ephemeral-build.yml', import.meta.url), 'utf8');

  it('never executes PR dependencies or PR refs in a credential-bearing workflow', () => {
    expect(trusted).not.toMatch(/pnpm |npm |pull_request\.head|checkout.*refs\/pull/);
    expect(trusted.match(/ref: \$\{\{ github.event.repository.default_branch \}\}/g)).toHaveLength(2);
    expect(trusted).toContain('skip_app_build: true');
    expect(trusted).toContain('skip_api_build: true');
    expect(trusted).toContain('deployment_environment: ${{ steps.prepare.outputs.environment }}');
  });

  it('keeps PR builds secretless, with read-only permissions and no cached publish state', () => {
    expect(build).not.toMatch(/secrets\.|id-token:|: write|azure\/login|actions\/cache/);
    expect(build).toContain('persist-credentials: false');
    expect(build).toContain('ref: ${{ github.event.pull_request.head.sha }}');
    expect(build).toContain('build:ephemeral --filter=standalone');
  });

  it('serializes all mutations per PR without canceling an active cleanup', () => {
    expect(trusted).toContain('group: standalone-ephemeral-pr-${{ matrix.pr }}');
    expect(trusted).toContain('cancel-in-progress: false');
    expect(trusted).toContain('fail-fast: false');
    expect(trusted).toContain('unlabeled, closed');
    expect(trusted).toContain('schedule:');
    expect(trusted).toContain("if: always() && steps.prepare.outputs.deploy == 'true'");
  });
});

describe('Azure lifecycle adapter', () => {
  beforeEach(() => {
    vi.stubEnv('EPHEMERAL_RESOURCE_GROUP', 'preview-group');
    vi.stubEnv('EPHEMERAL_STATIC_WEB_APP', 'preview-site');
    vi.stubEnv('EPHEMERAL_SUBSCRIPTION_ID', 'preview-subscription');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('sweeps labelled PRs and canonical orphan environments, never default or unrelated slots', async () => {
    const github = api();
    github.paginate.mockResolvedValue([pr, { ...pr, number: 43, labels: [] }]);
    const azureClient = vi.fn().mockResolvedValue([{ name: 'default' }, { name: 'pr42' }, { name: 'pr55' }, { name: 'unrelated' }]);
    expect(await candidateNumbers({ github, context: { ...context, eventName: 'schedule' }, azureClient })).toEqual([42, 55]);
    expect(azureClient).toHaveBeenCalledWith(['staticwebapp', 'environment', 'list', ...azureArguments()]);
  });

  it('deletes only the explicit owned slot in the configured resource', async () => {
    const github = api();
    const azureClient = vi
      .fn()
      .mockResolvedValueOnce([{ name: 'default' }, { name: 'pr42' }])
      .mockResolvedValueOnce(null);
    await servicesFor({ github, context, azureClient }).deleteEnvironment(42);
    expect(azureClient.mock.calls[1][0]).toEqual([
      'staticwebapp',
      'environment',
      'delete',
      ...azureArguments(),
      '--environment-name',
      'pr42',
      '--yes',
    ]);
  });

  it('uses the Azure CLI buildId rather than the optional resource name', async () => {
    const github = api();
    const azureClient = vi
      .fn()
      .mockResolvedValueOnce([
        { buildId: 'default', name: 'pr99' },
        { buildId: 'pr42', hostname: 'example-pr42.azurestaticapps.net' },
      ])
      .mockResolvedValueOnce(null);
    await servicesFor({ github, context, azureClient }).deleteEnvironment(42);
    expect(azureClient.mock.calls[1][0]).toContain('pr42');
    azureClient.mockReset().mockResolvedValue([{ buildId: 'default', name: 'pr42' }]);
    await servicesFor({ github, context, azureClient }).deleteEnvironment(42);
    expect(azureClient).toHaveBeenCalledTimes(1);
  });

  it('treats absence as idempotent but never treats list/delete failures as absence', async () => {
    const github = api();
    const azureClient = vi.fn().mockResolvedValue([]);
    await servicesFor({ github, context, azureClient }).deleteEnvironment(42);
    expect(azureClient).toHaveBeenCalledTimes(1);
    azureClient.mockRejectedValue(new Error('Azure 403'));
    await expect(servicesFor({ github, context, azureClient }).deleteEnvironment(42)).rejects.toThrow('Azure 403');
    azureClient
      .mockReset()
      .mockResolvedValueOnce([{ name: 'pr42' }])
      .mockRejectedValueOnce(new Error('Delete failed'));
    await expect(servicesFor({ github, context, azureClient }).deleteEnvironment(42)).rejects.toThrow('Delete failed');
  });

  it('does not report an older success as the actual deployment after a newer failure', async () => {
    const github = api();
    const payload = { kind: 'standalone-ephemeral', number: 42, sha };
    github.paginate.mockResolvedValue([
      { id: 8, payload },
      { id: 7, payload },
    ]);
    github.rest.repos.listDeploymentStatuses.mockResolvedValue({ data: [{ state: 'failure' }] });
    const azureClient = vi.fn().mockResolvedValue([{ name: 'pr42', hostname: 'example-pr42.azurestaticapps.net' }]);
    expect(await servicesFor({ github, context, azureClient }).published(42)).toBeUndefined();
    expect(github.rest.repos.listDeploymentStatuses).toHaveBeenCalledTimes(1);
    github.rest.repos.listDeploymentStatuses.mockResolvedValue({ data: [{ state: 'success' }] });
    expect(await servicesFor({ github, context, azureClient }).published(42)).toMatchObject({
      sha,
      hostname: 'example-pr42.azurestaticapps.net',
    });
  });
});
