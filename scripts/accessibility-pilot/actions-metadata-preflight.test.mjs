import assert from 'node:assert/strict';
import test from 'node:test';
import { preflightWorkflowRunMetadata, producerPath } from './actions-metadata-preflight.mjs';

const headSha = 'a'.repeat(40);
const repo = { id: 1001, full_name: 'Azure/LogicAppsUX' };

function fixture() {
  const head = { repo, sha: headSha, ref: 'pilot' };
  const association = { id: 6001, number: 42, head, base: { repo } };
  const pr = { ...association, head: { ...head }, state: 'open', user: { login: 'takyyon' } };
  const workflow = { id: 501, path: producerPath };
  const run = {
    id: 7001,
    run_attempt: 2,
    workflow_id: workflow.id,
    path: `${producerPath}@refs/pull/42/merge`,
    event: 'pull_request',
    status: 'completed',
    head_sha: headSha,
    head_branch: head.ref,
    repository: repo,
    head_repository: repo,
    pull_requests: [association],
  };
  const event = { id: run.id, run_attempt: run.run_attempt, head_sha: headSha, workflow_id: workflow.id };
  const context = { eventName: 'workflow_run', payload: { action: 'completed', repository: repo, workflow_run: event } };
  const github = {
    rest: {
      actions: {
        getWorkflow: async () => ({ data: workflow }),
        getWorkflowRun: async () => ({ data: run }),
      },
      pulls: { get: async () => ({ data: pr }) },
    },
  };
  return { github, context, event, run, pr, association, workflow };
}

test('a current same-repo run matches metadata but stays held', async () => {
  assert.deepEqual(await preflightWorkflowRunMetadata(fixture()), {
    status: 'held',
    pullNumber: 42,
    headSha,
    runId: 7001,
    runAttempt: 2,
  });
});

for (const [name, change, reason] of [
  [
    'non-completion event',
    ({ context }) => {
      context.payload.action = 'requested';
    },
    'unexpected event',
  ],
  [
    'event in another repository',
    ({ context }) => {
      context.payload.repository = { ...repo, full_name: 'other/LogicAppsUX' };
    },
    'unexpected repository',
  ],
  [
    'missing attempt',
    ({ event }) => {
      delete event.run_attempt;
    },
    'missing producer run or attempt',
  ],
  [
    'newer run attempt',
    ({ run }) => {
      run.run_attempt += 1;
    },
    'producer run or attempt mismatch',
  ],
  [
    'mismatched run head',
    ({ event }) => {
      event.head_sha = 'b'.repeat(40);
    },
    'producer run or attempt mismatch',
  ],
  [
    'different producer',
    ({ workflow }) => {
      workflow.id += 1;
    },
    'unexpected producer workflow',
  ],
  [
    'fork head repository',
    ({ run }) => {
      run.head_repository = { ...repo, id: 9090 };
    },
    'producer run or attempt mismatch',
  ],
  [
    'no PR association',
    ({ run }) => {
      run.pull_requests = [];
    },
    'missing, ambiguous or mismatched PR association',
  ],
  [
    'ambiguous PR association',
    ({ run, association }) => {
      run.pull_requests.push({ ...association, number: 43 });
    },
    'missing, ambiguous or mismatched PR association',
  ],
  [
    'closed PR',
    ({ pr }) => {
      pr.state = 'closed';
    },
    'PR closed or outside the self-only pilot',
  ],
  [
    'different PR author',
    ({ pr }) => {
      pr.user.login = 'other';
    },
    'PR closed or outside the self-only pilot',
  ],
  [
    'different PR ID',
    ({ pr }) => {
      pr.id += 1;
    },
    'PR closed or outside the self-only pilot',
  ],
  [
    'force-pushed head',
    ({ pr }) => {
      pr.head.sha = 'b'.repeat(40);
    },
    'PR head is stale',
  ],
]) {
  test(`preflight rejects ${name}`, async () => {
    const input = fixture();
    change(input);
    assert.deepEqual(await preflightWorkflowRunMetadata(input), { status: 'rejected', reason });
  });
}

test('metadata API failure rejects without including the API response in the result', async () => {
  const input = fixture();
  input.github.rest.pulls.get = async () => {
    throw new Error('redacted response');
  };
  assert.deepEqual(await preflightWorkflowRunMetadata(input), {
    status: 'rejected',
    reason: 'authoritative GitHub metadata unavailable',
  });
});
