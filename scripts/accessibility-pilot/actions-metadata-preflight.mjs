const repo = { owner: 'Azure', repo: 'LogicAppsUX' };
const repository = `${repo.owner}/${repo.repo}`.toLowerCase();
const workflowFile = 'laux-accessibility-producer.yml';
export const producerPath = `.github/workflows/${workflowFile}`;

const isId = (value) => Number.isSafeInteger(value) && value > 0;
const isSha = (value) => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const isSameRepo = (value, id) => value?.id === id && value?.full_name?.toLowerCase() === repository;
const reject = (reason) => ({ status: 'rejected', reason });

function matchesProducer(run, event, workflowId, repositoryId) {
  // The run endpoint can append @ref to the workflow file path.
  return (
    run?.id === event.id &&
    run.run_attempt === event.run_attempt &&
    run.workflow_id === workflowId &&
    run.path?.split('@', 1)[0] === producerPath &&
    run.event === 'pull_request' &&
    run.status === 'completed' &&
    isSha(run.head_sha) &&
    run.head_sha === event.head_sha &&
    isSameRepo(run.repository, repositoryId) &&
    isSameRepo(run.head_repository, repositoryId)
  );
}

function matchesHead(association, run, repositoryId) {
  return association?.head?.repo?.id === repositoryId && association.head.sha === run.head_sha && association.head.ref === run.head_branch;
}

// This only checks a snapshot of GitHub metadata. It grants no authority to accept artifacts or take action on the PR.
export async function preflightWorkflowRunMetadata({ github, context }) {
  const { action, repository: eventRepo, workflow_run: event } = context.payload;
  if (context.eventName !== 'workflow_run' || action !== 'completed') {
    return reject('unexpected event');
  }
  if (!isId(eventRepo?.id) || !isSameRepo(eventRepo, eventRepo.id)) {
    return reject('unexpected repository');
  }
  if (!isId(event?.id) || !isId(event.run_attempt)) {
    return reject('missing producer run or attempt');
  }
  try {
    const { data: workflow } = await github.rest.actions.getWorkflow({ ...repo, workflow_id: workflowFile });
    if (!isId(workflow?.id) || workflow.path !== producerPath || event.workflow_id !== workflow.id) {
      return reject('unexpected producer workflow');
    }

    // Read the latest run, not the event's historical attempt. A newer attempt makes that event stale.
    const { data: run } = await github.rest.actions.getWorkflowRun({ ...repo, run_id: event.id });
    if (!matchesProducer(run, event, workflow.id, eventRepo.id)) {
      return reject('producer run or attempt mismatch');
    }

    // Do not infer PR identity from a commit shared by multiple PRs or guess when GitHub omits its association.
    const [association] = run.pull_requests ?? [];
    if (
      run.pull_requests?.length !== 1 ||
      !isId(association?.id) ||
      !isId(association.number) ||
      association.base?.repo?.id !== eventRepo.id ||
      !matchesHead(association, run, eventRepo.id)
    ) {
      return reject('missing, ambiguous or mismatched PR association');
    }

    const { data: pr } = await github.rest.pulls.get({ ...repo, pull_number: association.number });
    if (
      pr?.id !== association.id ||
      pr.number !== association.number ||
      pr.state !== 'open' ||
      pr.user?.login?.toLowerCase() !== 'takyyon' ||
      !isSameRepo(pr.base?.repo, eventRepo.id) ||
      !isSameRepo(pr.head?.repo, eventRepo.id)
    ) {
      return reject('PR closed or outside the self-only pilot');
    }
    if (!matchesHead(pr, run, eventRepo.id)) {
      return reject('PR head is stale');
    }

    return { status: 'held', pullNumber: pr.number, headSha: run.head_sha, runId: run.id, runAttempt: run.run_attempt };
  } catch {
    // Do not print API exception messages or response bodies into the Actions log.
    return reject('authoritative GitHub metadata unavailable');
  }
}
