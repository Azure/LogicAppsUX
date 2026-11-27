import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const journeyEvidence = {
  keyboard: [{ key: 'Tab' }],
  scans: [{ state: 'expanded' }],
  assertions: [{ name: 'Keyboard interaction completed', passed: true }],
};
const fullJourneyIds = ['nested-graph', 'details-open-close', 'action-discovery-insertion', 'token-editing', 'validation-recovery'];
const pilotJourneyIds = ['nested-graph', 'details-open-close', 'token-editing'];
const passingWorker = (override = '') => `
  import { readFileSync, writeFileSync } from 'node:fs';
  import { basename } from 'node:path';
  const arg = (key) => process.argv[process.argv.indexOf(key) + 1];
  const reportPath = arg('--report');
  const initial = JSON.parse(readFileSync(reportPath, 'utf8'));
  const report = {
    ...initial,
    status: 'passed',
    attemptId: basename(arg('--attempt')),
    actualDigest: arg('--digest'),
    finishedAt: new Date().toISOString(),
    fixtureSmoke: initial.scope.requiredFixtures.map((fixture) => ({ fixture, status: 'passed' })),
    product: {
      ...initial.product,
      journeys: initial.product.journeys.map((journey) =>
        initial.scope.requiredJourneyIds.includes(journey.id)
          ? { ...journey, status: 'passed', attempt: { failed: false }, evidence: ${JSON.stringify(journeyEvidence)} }
          : journey
      ),
    },
    launcherWiring: {
      hasPilot: process.argv.includes('--pilot'),
      launchedByLauncher: process.env.LAUX_DESIGNER_REPLAY_LAUNCHER === '1',
      tokenMatchesEnvironment: arg('--token') === process.env.LAUX_DESIGNER_REPLAY_TOKEN,
    },
  };
  ${override}
  writeFileSync(reportPath, JSON.stringify(report));
`;

const createHarness = async (t, runtimeSource) => {
  const root = await mkdtemp(join(tmpdir(), 'laux-replay-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const scripts = join(root, 'scripts', 'accessibility-pilot');
  const pilot = join(root, 'accessibility-pilot');
  await mkdir(scripts, { recursive: true });
  await mkdir(pilot);
  const launcher = join(scripts, 'designer-replay.mjs');
  await copyFile(new URL('./designer-replay.mjs', import.meta.url), launcher);
  await copyFile(new URL('../../accessibility-pilot/journey-inventory.json', import.meta.url), join(pilot, 'journey-inventory.json'));
  if (runtimeSource) {
    await writeFile(join(scripts, 'designer-runtime.mjs'), runtimeSource);
  }
  return { root, launcher, attempts: join(pilot, 'artifacts', 'designer-replay', 'attempts') };
};

const readAttemptReport = async (attemptsPath) => {
  const [attempt] = await readdir(attemptsPath);
  return JSON.parse(await readFile(join(attemptsPath, attempt, 'runtime-report.json'), 'utf8'));
};

for (const [name, terminate, exitCode, diagnostic] of [
  ['worker exits nonzero', 'process.exitCode = 7;', 7, /code 7/],
  ['worker terminates by signal', "process.kill(process.pid, 'SIGTERM');", 1, /signal: SIGTERM/],
]) {
  test(
    `launcher fails a stored pass and preserves journey evidence when the ${name}`,
    { skip: process.platform !== 'darwin' },
    async (t) => {
      const { root, launcher, attempts } = await createHarness(t, `${passingWorker()}\n${terminate}`);

      const result = spawnSync(process.execPath, [launcher], { cwd: root, encoding: 'utf8', timeout: 10_000 });
      assert.ifError(result.error);
      assert.equal(result.status, exitCode, result.stderr);
      const report = await readAttemptReport(attempts);
      assert.equal(report.status, 'failed');
      assert.equal(report.launcher.reason, 'worker-exit');
      assert.match(report.launcher.error, diagnostic);
      assert.deepEqual(
        report.product.journeys.map(({ id }) => id),
        fullJourneyIds
      );
      assert.deepEqual(report.product.journeys[0].evidence, journeyEvidence);
    }
  );
}

for (const [name, launcherArgs, expectedScope, expectedRequiredJourneyIds] of [
  ['defaults to full scope', [], 'full', fullJourneyIds],
  ['accepts bare delimiter for full scope', ['--'], 'full', fullJourneyIds],
  ['accepts bare delimiter before pilot', ['--', '--pilot'], 'pilot', pilotJourneyIds],
]) {
  test(`launcher wires ${name} to the runtime worker`, { skip: process.platform !== 'darwin' }, async (t) => {
    const { root, launcher, attempts } = await createHarness(t, passingWorker());

    const result = spawnSync(process.execPath, [launcher, ...launcherArgs], { cwd: root, encoding: 'utf8', timeout: 10_000 });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    const report = await readAttemptReport(attempts);
    assert.equal(report.status, 'passed');
    assert.equal(report.scope.mode, expectedScope);
    assert.deepEqual(report.scope.requiredJourneyIds, expectedRequiredJourneyIds);
    assert.equal(report.product.journeys.length, fullJourneyIds.length);
    const excludedJourneys = report.product.journeys.filter((journey) => !expectedRequiredJourneyIds.includes(journey.id));
    assert.ok(
      excludedJourneys.every(
        (journey) =>
          journey.status === 'not_run' &&
          (expectedScope !== 'pilot' ||
            (Array.isArray(journey.notes) &&
              journey.notes.some((note) => note.includes('Excluded from pilot scope; no attempt was made and no credit is applied.'))))
      )
    );
    assert.equal(report.launcherWiring.hasPilot, expectedScope === 'pilot');
    assert.equal(report.launcherWiring.launchedByLauncher, true);
    assert.equal(report.launcherWiring.tokenMatchesEnvironment, true);
  });
}

for (const [name, override] of [
  ['only changes the top-level status', 'Object.assign(report, initial, { status: "passed" });'],
  ['reports the wrong scope', 'report.scope.mode = "full";'],
  ['reports another attempt', 'report.attemptId = "attempt-other";'],
  ['omits a required fixture result', 'report.fixtureSmoke.pop();'],
  ['omits a required journey result', 'report.product.journeys.shift();'],
  ['omits required assertion evidence', 'report.product.journeys[0].evidence.assertions = [];'],
  ['includes a failed assertion', 'report.product.journeys[0].evidence.assertions[0].passed = false;'],
  ['credits an excluded journey', 'report.product.journeys[2].status = "passed";'],
]) {
  test(`launcher rejects an exit-zero pass that ${name}`, { skip: process.platform !== 'darwin' }, async (t) => {
    const { root, launcher, attempts } = await createHarness(t, passingWorker(override));
    const result = spawnSync(process.execPath, [launcher, '--pilot'], { cwd: root, encoding: 'utf8', timeout: 10_000 });
    assert.ifError(result.error);
    assert.equal(result.status, 1, result.stderr);
    const report = await readAttemptReport(attempts);
    assert.equal(report.status, 'failed');
    assert.equal(report.launcher.reason, 'invalid-pass-report');
    assert.equal(report.scope.mode, 'pilot');
    assert.deepEqual(
      report.product.journeys.map(({ id }) => id),
      fullJourneyIds
    );
    assert.deepEqual(
      report.product.journeys.filter(({ id }) => !pilotJourneyIds.includes(id)).map(({ status }) => status),
      ['not_run', 'not_run']
    );
  });
}

for (const [name, action] of [
  ['missing', 'unlinkSync(reportPath);'],
  ['malformed', 'writeFileSync(reportPath, "{");'],
  ['not an object', 'writeFileSync(reportPath, "[]");'],
]) {
  test(`launcher retains the catalog when the worker report is ${name}`, { skip: process.platform !== 'darwin' }, async (t) => {
    const { root, launcher, attempts } = await createHarness(
      t,
      `import { unlinkSync, writeFileSync } from 'node:fs';
      const reportPath = process.argv[process.argv.indexOf('--report') + 1];
      ${action}`
    );
    const result = spawnSync(process.execPath, [launcher, '--pilot'], { cwd: root, encoding: 'utf8', timeout: 10_000 });
    assert.ifError(result.error);
    assert.equal(result.status, 1, result.stderr);
    const report = await readAttemptReport(attempts);
    assert.equal(report.status, 'failed');
    assert.equal(report.launcher.reason, 'missing-report');
    assert.equal(report.scope.mode, 'pilot');
    assert.deepEqual(
      report.product.journeys.map(({ id }) => id),
      fullJourneyIds
    );
    assert.ok(report.product.journeys.every(({ status }) => status === 'not_run'));
    assert.match(report.product.journeys[2].notes[0], /Excluded from pilot scope/);
    assert.match(report.product.journeys[4].notes[0], /Excluded from pilot scope/);
  });
}

test(
  'launcher restores a missing catalog row without discarding matching journey evidence',
  { skip: process.platform !== 'darwin' },
  async (t) => {
    const { root, launcher, attempts } = await createHarness(t, passingWorker('report.status = "failed"; report.product.journeys.pop();'));
    const result = spawnSync(process.execPath, [launcher, '--pilot'], { cwd: root, encoding: 'utf8', timeout: 10_000 });
    assert.ifError(result.error);
    assert.equal(result.status, 1, result.stderr);
    const report = await readAttemptReport(attempts);
    assert.equal(report.launcher.reason, 'invalid-report');
    assert.deepEqual(
      report.product.journeys.map(({ id }) => id),
      fullJourneyIds
    );
    assert.deepEqual(report.product.journeys[0].evidence, journeyEvidence);
    assert.equal(report.product.journeys.at(-1).status, 'not_run');
  }
);

for (const [name, launcherArgs, diagnostic] of [
  ['unsupported flag', ['--bogus'], /Unexpected argument "--bogus"/],
  ['duplicate pilot flag', ['--pilot', '--pilot'], /Duplicate argument "--pilot"/],
  ['unexpected positional token', ['pilot'], /Unexpected argument "pilot"/],
]) {
  test(`launcher rejects ${name}`, { skip: process.platform !== 'darwin' }, async (t) => {
    const { root, launcher, attempts } = await createHarness(t);
    const result = spawnSync(process.execPath, [launcher, ...launcherArgs], { cwd: root, encoding: 'utf8', timeout: 10_000 });
    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Designer replay launcher failed:/);
    assert.match(result.stderr, diagnostic);
    await assert.rejects(() => readdir(attempts), { code: 'ENOENT' });
  });
}
