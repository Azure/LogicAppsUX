export const BUILD_WORKFLOW = 'standalone-ephemeral-build.yml';
export const LABEL = 'ephemeral';
export const COMMENT_MARKER = '<!-- standalone-ephemeral -->';
export const DEPLOYMENT_KIND = 'standalone-ephemeral';
export const MAX_ARCHIVE_BYTES = 250 * 1024 * 1024;

export function environmentName(number) {
  if (!Number.isSafeInteger(number) || number <= 0 || `pr${number}`.length > 16) {
    throw new Error('Invalid ephemeral PR number.');
  }
  return `pr${number}`;
}

export function environmentNumber(name) {
  if (!/^pr[1-9][0-9]*$/.test(name)) {
    return undefined;
  }
  const number = Number(name.slice(2));
  return Number.isSafeInteger(number) && name.length <= 16 ? number : undefined;
}

export function eligible(pr, repository, branch) {
  return (
    pr.state === 'open' &&
    pr.base.repo.full_name === repository &&
    pr.base.ref === branch &&
    pr.labels.some((label) => label.name === LABEL)
  );
}

export function matchesRun(run, pr, workflowId, repository) {
  return (
    run.workflow_id === workflowId &&
    run.event === 'pull_request' &&
    run.repository?.full_name === repository &&
    run.head_repository?.full_name === pr.head.repo?.full_name &&
    !!pr.head.repo &&
    run.head_branch === pr.head.ref &&
    run.head_sha === pr.head.sha &&
    /^[a-f0-9]{40}$/.test(run.head_sha)
  );
}

export function artifactName(run) {
  return `standalone-ephemeral-${run.id}-${run.run_attempt}-${run.head_sha}`;
}

export function selectArtifact(artifacts, run, now = Date.now()) {
  const matches = artifacts.filter((artifact) => artifact.name === artifactName(run));
  if (matches.length !== 1) {
    throw new Error('Expected exactly one preview artifact for this build attempt. Rerun the preview build.');
  }
  const artifact = matches[0];
  const expires = Date.parse(artifact.expires_at);
  if (artifact.expired || !Number.isFinite(expires) || expires <= now) {
    throw new Error('The preview artifact expired. Rerun the preview build.');
  }
  if (!Number.isSafeInteger(artifact.size_in_bytes) || artifact.size_in_bytes <= 0 || artifact.size_in_bytes > MAX_ARCHIVE_BYTES) {
    throw new Error('Preview archive exceeds the 250 MiB limit or has an invalid size.');
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(artifact.digest ?? '')) {
    throw new Error('Preview artifact is missing its SHA-256 digest.');
  }
  return artifact;
}

export function previewUrl(hostname) {
  if (typeof hostname !== 'string' || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.azurestaticapps\.net$/.test(hostname)) {
    throw new Error('Azure returned an unexpected preview hostname.');
  }
  return `https://${hostname}`;
}

export function commentBody(pr, message, published) {
  const link = published
    ? `\n\n[Open local-only preview](${previewUrl(published.hostname)})\n\nDeployed revision: \`${published.sha}\`.`
    : '';
  return `${COMMENT_MARKER}\n## Standalone preview\n\n${message}\n\nCurrent PR revision: \`${pr.head.sha}\`.${link}\n\nLocal workflows only. Azure sign-in, live Azure resources, and the development-only template proxy are not available. This preview runs PR code; do not enter credentials or sensitive workflow data.`;
}

// Every entry point reconciles current state, not the event's possibly stale snapshot.
export async function prepare(number, services) {
  environmentName(number);
  let pr = await services.pull(number);
  if (!services.eligible(pr)) {
    await remove(number, services);
    return { action: 'none' };
  }

  const run = await services.build(pr);
  if (!run || run.status !== 'completed') {
    await services.comment(pr, 'Waiting for a successful build of the current PR revision.', await services.published(number));
    return { action: 'none' };
  }
  if (run.conclusion !== 'success') {
    await services.comment(
      pr,
      'The current preview build did not succeed. The last successful preview, if shown, is unchanged.',
      await services.published(number)
    );
    throw new Error(`Preview build ${run.id} finished with ${run.conclusion}.`);
  }

  const published = await services.published(number);
  if (published?.runId === run.id && published?.attempt === run.run_attempt && published?.sha === run.head_sha) {
    await services.comment(pr, 'Ready for local-workflow testing.', published);
    return { action: 'none' };
  }

  const artifact = await services.artifact(run);
  await services.extract(run, artifact);
  pr = await services.pull(number);
  if (!services.eligible(pr)) {
    await remove(number, services);
    return { action: 'none' };
  }
  if (pr.head.sha !== run.head_sha) {
    await services.comment(pr, 'A newer commit arrived during preparation; waiting for its build.', published);
    return { action: 'none' };
  }
  const state = {
    action: 'deploy',
    number,
    sha: run.head_sha,
    runId: run.id,
    attempt: run.run_attempt,
    artifactId: artifact.id,
    environment: environmentName(number),
  };
  state.deploymentId = await services.startDeployment(state);
  return state;
}

export async function remove(number, services) {
  const pr = await services.pull(number);
  if (services.eligible(pr)) {
    return;
  }
  await services.deleteEnvironment(number);
  await services.inactivate(number);
  await services.comment(pr, 'Preview removed because the PR is closed or no longer has the `ephemeral` label.');
}

export async function finish(state, succeeded, services) {
  if (state.action !== 'deploy') {
    return;
  }
  if (!succeeded) {
    await services.deploymentStatus(state.deploymentId, 'failure');
    const pr = await services.pull(state.number);
    await services.comment(
      pr,
      'Preview deployment failed. A partially updated environment may exist; rerun reconciliation before using it.'
    );
    if (!services.eligible(pr)) {
      await remove(state.number, services);
    }
    throw new Error('Standalone preview deployment failed.');
  }
  const pr = await services.pull(state.number);
  if (!services.eligible(pr)) {
    await services.deploymentStatus(state.deploymentId, 'inactive');
    await remove(state.number, services);
    return;
  }
  const host = await services.hostname(state.number);
  const published = { ...state, hostname: host };
  await services.deploymentStatus(state.deploymentId, 'success', previewUrl(host));
  await services.comment(
    pr,
    pr.head.sha === state.sha
      ? 'Ready for local-workflow testing.'
      : 'This preview is out of date: a newer commit arrived during deployment. Waiting for its build.',
    published
  );
}
