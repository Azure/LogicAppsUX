import { describe, expect, it, vi } from 'vitest';
import {
  artifactName,
  commentBody,
  eligible,
  environmentName,
  environmentNumber,
  finish,
  matchesRun,
  prepare,
  previewUrl,
  remove,
  selectArtifact,
} from './controller.mjs';

const sha = 'a'.repeat(40);
const newerSha = 'b'.repeat(40);
const repository = 'Azure/LogicAppsUX';
const pr = {
  number: 42,
  state: 'open',
  labels: [{ name: 'ephemeral' }],
  base: { ref: 'main', repo: { full_name: repository } },
  head: { sha, ref: 'feature', repo: { full_name: 'contributor/LogicAppsUX' } },
};
const run = {
  id: 10,
  run_number: 20,
  run_attempt: 2,
  workflow_id: 7,
  status: 'completed',
  conclusion: 'success',
  event: 'pull_request',
  head_sha: sha,
  head_branch: pr.head.ref,
  head_repository: pr.head.repo,
  repository: { full_name: repository },
};
const artifact = {
  id: 50,
  name: artifactName(run),
  size_in_bytes: 200,
  digest: `sha256:${'a'.repeat(64)}`,
  expires_at: '2099-01-01T00:00:00Z',
};
const published = { sha, runId: run.id, attempt: run.run_attempt, artifactId: artifact.id, hostname: 'example-pr42.azurestaticapps.net' };

function mocks() {
  return {
    pull: vi.fn().mockResolvedValue(structuredClone(pr)),
    eligible: (value) => eligible(value, repository, 'main'),
    build: vi.fn().mockResolvedValue(run),
    artifact: vi.fn().mockResolvedValue(artifact),
    published: vi.fn().mockResolvedValue(undefined),
    extract: vi.fn().mockResolvedValue(undefined),
    startDeployment: vi.fn().mockResolvedValue(100),
    comment: vi.fn().mockResolvedValue(undefined),
    deleteEnvironment: vi.fn().mockResolvedValue(undefined),
    inactivate: vi.fn().mockResolvedValue(undefined),
    hostname: vi.fn().mockResolvedValue(published.hostname),
    deploymentStatus: vi.fn().mockResolvedValue(undefined),
  };
}

describe('preview identity', () => {
  it('owns only canonical PR environment names and never default', () => {
    expect(environmentName(42)).toBe('pr42');
    expect(environmentNumber('pr42')).toBe(42);
    for (const name of ['default', 'production', 'pr0', 'pr042', 'pr-42', 'other42', 'pr9999999999999999999']) {
      expect(environmentNumber(name)).toBeUndefined();
    }
    for (const number of [0, -1, NaN, 1.1, '42', Number.MAX_SAFE_INTEGER]) {
      expect(() => environmentName(number)).toThrow();
    }
  });

  it('requires the correct repository, base branch, open state and exact label', () => {
    expect(eligible(pr, repository, 'main')).toBe(true);
    expect(eligible({ ...pr, state: 'closed' }, repository, 'main')).toBe(false);
    expect(eligible({ ...pr, labels: [{ name: 'Ephemeral' }] }, repository, 'main')).toBe(false);
    expect(eligible(pr, 'other/repo', 'main')).toBe(false);
    expect(eligible(pr, repository, 'dev')).toBe(false);
  });

  it('associates a fork run by workflow, event, base/head repositories, branch and exact head SHA', () => {
    expect(matchesRun(run, pr, 7, repository)).toBe(true);
    for (const change of [
      { workflow_id: 8 },
      { event: 'push' },
      { head_sha: newerSha },
      { head_branch: 'other' },
      { repository: { full_name: 'other/repo' } },
      { head_repository: { full_name: 'other/repo' } },
    ]) {
      expect(matchesRun({ ...run, ...change }, pr, 7, repository)).toBe(false);
    }
    expect(matchesRun(run, { ...pr, head: { ...pr.head, repo: null } }, 7, repository)).toBe(false);
  });

  it('requires one unexpired bounded artifact from the specific run attempt with a digest', () => {
    expect(selectArtifact([artifact], run)).toBe(artifact);
    for (const artifacts of [
      [],
      [artifact, artifact],
      [{ ...artifact, name: artifactName({ ...run, run_attempt: 1 }) }],
      [{ ...artifact, expired: true }],
      [{ ...artifact, expires_at: 'invalid' }],
      [{ ...artifact, expires_at: '2000-01-01T00:00:00Z' }],
      [{ ...artifact, size_in_bytes: 0 }],
      [{ ...artifact, size_in_bytes: 250 * 1024 * 1024 + 1 }],
      [{ ...artifact, digest: null }],
    ]) {
      expect(() => selectArtifact(artifacts, run)).toThrow();
    }
  });

  it('only emits HTTPS links to Azure Static Web Apps hosts', () => {
    expect(previewUrl(published.hostname)).toBe('https://example-pr42.azurestaticapps.net');
    for (const hostname of [
      'evil.test',
      'azurestaticapps.net.evil.test',
      'x.azurestaticapps.net/a',
      'x.azurestaticapps.net:443',
      undefined,
    ]) {
      expect(() => previewUrl(hostname)).toThrow();
    }
    expect(commentBody({ ...pr, head: { ...pr.head, sha: newerSha } }, 'Out of date', published)).toContain(
      `Deployed revision: \`${sha}\``
    );
  });
});

describe('reconciliation', () => {
  it('validates/extracts then rechecks the live PR before starting a deployment', async () => {
    const services = mocks();
    const state = await prepare(42, services);
    expect(state).toMatchObject({ action: 'deploy', environment: 'pr42', sha, runId: 10, artifactId: 50, deploymentId: 100 });
    expect(services.extract).toHaveBeenCalledWith(run, artifact);
    expect(services.pull).toHaveBeenCalledTimes(2);
    expect(services.extract.mock.invocationCallOrder[0]).toBeLessThan(services.pull.mock.invocationCallOrder[1]);
    expect(services.pull.mock.invocationCallOrder[1]).toBeLessThan(services.startDeployment.mock.invocationCallOrder[0]);
  });

  it('does not redeploy a successfully published identical artifact', async () => {
    const services = mocks();
    services.published.mockResolvedValue(published);
    expect(await prepare(42, services)).toEqual({ action: 'none' });
    expect(services.artifact).not.toHaveBeenCalled();
    expect(services.extract).not.toHaveBeenCalled();
    expect(services.startDeployment).not.toHaveBeenCalled();
    expect(services.comment).toHaveBeenCalledWith(pr, 'Ready for local-workflow testing.', published);
  });

  it.each([undefined, { ...run, status: 'in_progress' }])('reports a pending current build without publishing', async (build) => {
    const services = mocks();
    services.build.mockResolvedValue(build);
    expect(await prepare(42, services)).toEqual({ action: 'none' });
    expect(services.extract).not.toHaveBeenCalled();
    expect(services.comment).toHaveBeenCalled();
  });

  it('reports unsuccessful builds instead of falling back to another revision', async () => {
    const services = mocks();
    services.build.mockResolvedValue({ ...run, conclusion: 'failure' });
    await expect(prepare(42, services)).rejects.toThrow('failure');
    expect(services.startDeployment).not.toHaveBeenCalled();
  });

  it.each(['artifact', 'extract'])('propagates %s rejection and never starts a deployment', async (method) => {
    const services = mocks();
    services[method].mockRejectedValue(new Error('Rejected'));
    await expect(prepare(42, services)).rejects.toThrow('Rejected');
    expect(services.startDeployment).not.toHaveBeenCalled();
  });

  it('does not publish an older build when a new head arrives during extraction', async () => {
    const services = mocks();
    services.extract.mockImplementation(async () => {
      services.pull.mockResolvedValue({ ...pr, head: { ...pr.head, sha: newerSha } });
    });
    expect(await prepare(42, services)).toEqual({ action: 'none' });
    expect(services.startDeployment).not.toHaveBeenCalled();
    expect(services.deleteEnvironment).not.toHaveBeenCalled();
  });

  it.each([
    { ...pr, state: 'closed' },
    { ...pr, labels: [] },
  ])('cleans up when eligibility is lost during extraction', async (changed) => {
    const services = mocks();
    services.extract.mockImplementation(async () => services.pull.mockResolvedValue(changed));
    expect(await prepare(42, services)).toEqual({ action: 'none' });
    expect(services.deleteEnvironment).toHaveBeenCalledWith(42);
    expect(services.startDeployment).not.toHaveBeenCalled();
  });

  it('rechecks delayed cleanup and preserves a relabeled or reopened preview', async () => {
    const services = mocks();
    services.pull.mockResolvedValueOnce({ ...pr, labels: [] });
    expect(await prepare(42, services)).toEqual({ action: 'none' });
    expect(services.deleteEnvironment).not.toHaveBeenCalled();
    expect(services.inactivate).not.toHaveBeenCalled();
  });

  it('does not turn lookup failures into deletion or deletion failures into success', async () => {
    const services = mocks();
    services.pull.mockRejectedValueOnce(new Error('403'));
    await expect(remove(42, services)).rejects.toThrow('403');
    expect(services.deleteEnvironment).not.toHaveBeenCalled();
    services.pull.mockResolvedValue({ ...pr, state: 'closed' });
    services.deleteEnvironment.mockRejectedValue(new Error('Azure failure'));
    await expect(remove(42, services)).rejects.toThrow('Azure failure');
    expect(services.inactivate).not.toHaveBeenCalled();
    expect(services.comment).not.toHaveBeenCalled();
  });

  it('records the actual deployed revision, even if the head changes during upload', async () => {
    const services = mocks();
    const state = await prepare(42, services);
    services.pull.mockResolvedValue({ ...pr, head: { ...pr.head, sha: newerSha } });
    await finish(state, true, services);
    expect(services.deploymentStatus).toHaveBeenCalledWith(100, 'success', previewUrl(published.hostname));
    expect(services.comment.mock.lastCall[1]).toContain('out of date');
    expect(services.comment.mock.lastCall[2].sha).toBe(sha);
  });

  it.each([
    { ...pr, state: 'closed' },
    { ...pr, labels: [] },
  ])('removes a preview closed or unlabeled during upload', async (changed) => {
    const services = mocks();
    const state = await prepare(42, services);
    services.pull.mockResolvedValue(changed);
    await finish(state, true, services);
    expect(services.deploymentStatus).toHaveBeenCalledWith(100, 'inactive');
    expect(services.deleteEnvironment).toHaveBeenCalledWith(42);
    expect(services.hostname).not.toHaveBeenCalled();
  });

  it('marks deployment failures without claiming a known-good current revision', async () => {
    const services = mocks();
    const state = await prepare(42, services);
    await expect(finish(state, false, services)).rejects.toThrow('deployment failed');
    expect(services.deploymentStatus).toHaveBeenCalledWith(100, 'failure');
    expect(services.comment.mock.lastCall[1]).toContain('partially updated');
    expect(services.hostname).not.toHaveBeenCalled();
  });

  it('surfaces comment failure without deleting a successful deployment', async () => {
    const services = mocks();
    const state = await prepare(42, services);
    services.comment.mockRejectedValue(new Error('GitHub unavailable'));
    await expect(finish(state, true, services)).rejects.toThrow('GitHub unavailable');
    expect(services.deploymentStatus).toHaveBeenCalledWith(100, 'success', previewUrl(published.hostname));
    expect(services.deleteEnvironment).not.toHaveBeenCalled();
  });
});
