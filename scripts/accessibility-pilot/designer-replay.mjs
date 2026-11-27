import { randomUUID } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { access } from 'node:fs/promises';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { spawn } from 'node:child_process';

const root = fileURLToPath(new URL('../../', import.meta.url));
const sandboxExecutable = '/usr/bin/sandbox-exec';
const expectedDigest = '9d7436dadf8e2ebb85a5e2c447934a81d3fdb3658be17e4aeceea6087729bf90';
const sourceBase = '73c490dbd686270bf2204ed0a1ad296c9d9b0a3a';
const fixedOrigin = 'https://designer-preview.invalid';
const attemptRoot = join(root, 'accessibility-pilot', 'artifacts', 'designer-replay', 'attempts');
const sandboxProfile = ['(version 1)', '(allow default)', '(deny network*)', ''].join('\n');
const pilotJourneyIds = ['nested-graph', 'details-open-close', 'token-editing'];

const controls = {
  browserOffline: true,
  serviceWorkers: 'block',
  navigatorOnlineSignalOverride: true,
  allow: 'GET to exact verified static URLs only',
  webSockets: 'close without connecting',
  liveNetworkFallback: false,
  processNetworkPolicy: 'macOS sandbox-exec deny network*',
};

const writeReport = async (path, report) => {
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
};

const readReport = async (path) => {
  try {
    const report = JSON.parse(await readFile(path, 'utf8'));
    return report && typeof report === 'object' && !Array.isArray(report) ? report : null;
  } catch {
    return null;
  }
};

const parseLauncherArgs = (argv) => {
  const values = { pilot: false };
  for (const token of argv) {
    if (token === '--') {
      continue;
    }
    if (token === '--pilot') {
      if (values.pilot) {
        throw new Error('Duplicate argument "--pilot".');
      }
      values.pilot = true;
      continue;
    }
    throw new Error(`Unexpected argument "${token}".`);
  }
  return values;
};

const createScope = (inventory, pilotMode) => {
  const catalogJourneyIds = inventory.map(({ id }) => id);
  const requiredJourneyIds = pilotMode ? pilotJourneyIds : catalogJourneyIds;
  const requiredSet = new Set(requiredJourneyIds);
  return {
    mode: pilotMode ? 'pilot' : 'full',
    requiredJourneyIds,
    excludedJourneyIds: catalogJourneyIds.filter((id) => !requiredSet.has(id)),
    requiredFixtures: [...new Set(inventory.filter(({ id }) => requiredSet.has(id)).map(({ fixture }) => fixture))],
  };
};

const createInitialReport = async (pilotMode, attemptId) => {
  const inventory = JSON.parse(await readFile(join(root, 'accessibility-pilot', 'journey-inventory.json'), 'utf8'));
  const scope = createScope(inventory, pilotMode);
  const requiredSet = new Set(scope.requiredJourneyIds);
  return {
    attemptId,
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    expectedDigest,
    sourceBase,
    scope,
    controls,
    fixtureSmoke: [],
    product: {
      status: 'not_run',
      journeys: inventory.map(({ id, title, fixture }) =>
        requiredSet.has(id)
          ? { id, title, fixture, status: 'not_run' }
          : {
              id,
              title,
              fixture,
              status: 'not_run',
              notes: [`Excluded from ${scope.mode} scope; no attempt was made and no credit is applied.`],
            }
      ),
    },
  };
};

const isTerminalStatus = (status) => status === 'passed' || status === 'failed' || status === 'incomplete';
const toFailureExitCode = (code) => (Number.isInteger(code) && code !== 0 ? code : 1);
const nonemptyArray = (value) => Array.isArray(value) && value.length > 0;

const matchesAttempt = (report, initial) =>
  report?.attemptId === initial.attemptId &&
  report.expectedDigest === initial.expectedDigest &&
  report.sourceBase === initial.sourceBase &&
  Object.entries(initial.scope).every(([key, value]) => isDeepStrictEqual(report.scope?.[key], value));

const hasJourneyEvidence = ({ status, attempt, evidence }) =>
  status === 'passed' &&
  attempt?.failed === false &&
  nonemptyArray(evidence?.keyboard) &&
  nonemptyArray(evidence?.scans) &&
  nonemptyArray(evidence?.assertions) &&
  evidence.assertions.every((assertion) => assertion?.passed === true);

const hasPassingFixtures = (fixtures, required) =>
  Array.isArray(fixtures) &&
  fixtures.length === required.length &&
  required.every((name) => fixtures.some((row) => row?.fixture === name && row.status === 'passed'));

const hasCatalog = (journeys, initial, requirePass = false) =>
  Array.isArray(journeys) &&
  journeys.length === initial.product.journeys.length &&
  initial.product.journeys.every(({ id, fixture }) => {
    const row = journeys.find((journey) => journey?.id === id && journey.fixture === fixture);
    if (!row) {
      return false;
    }
    return initial.scope.requiredJourneyIds.includes(id)
      ? !requirePass || hasJourneyEvidence(row)
      : row.status === 'not_run' && !row.attempt && !row.evidence;
  });

const isValidPass = (report, initial) =>
  matchesAttempt(report, initial) &&
  report.actualDigest === initial.expectedDigest &&
  Number.isFinite(Date.parse(report.finishedAt)) &&
  hasPassingFixtures(report.fixtureSmoke, initial.scope.requiredFixtures) &&
  hasCatalog(report.product?.journeys, initial, true);

const finalizeAsFailure = async (reportPath, initial, report, reason, errorMessage) => {
  const current = matchesAttempt(report, initial) ? report : initial;
  const reportedJourneys = Array.isArray(current.product?.journeys) ? current.product.journeys : [];
  // Keep the launcher's catalog even if the worker report is lost or only partly written.
  const journeys = initial.product.journeys.map((journey) => {
    if (!initial.scope.requiredJourneyIds.includes(journey.id)) {
      return journey;
    }
    return reportedJourneys.find((row) => row?.id === journey.id && row.fixture === journey.fixture) ?? journey;
  });
  const finished = {
    ...current,
    status: 'failed',
    finishedAt: new Date().toISOString(),
    product: { ...initial.product, ...current.product, journeys },
    launcher: {
      ...(current.launcher ?? {}),
      failed: true,
      reason,
      error: errorMessage,
    },
  };
  await writeReport(reportPath, finished);
};

const waitForChild = (child) =>
  new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });

const run = async () => {
  const parsedArgs = parseLauncherArgs(process.argv.slice(2));
  await access(sandboxExecutable, fsConstants.X_OK);
  await mkdir(attemptRoot, { recursive: true });
  const attempt = await mkdtemp(join(attemptRoot, 'attempt-'));
  const reportPath = join(attempt, 'runtime-report.json');
  const workerPath = join(root, 'scripts', 'accessibility-pilot', 'designer-runtime.mjs');
  const launcherToken = randomUUID();
  const initial = await createInitialReport(parsedArgs.pilot, basename(attempt));
  await writeReport(reportPath, initial);

  console.log(`Designer replay artifacts: ${relative(root, attempt)}`);

  let interruptedSignal = null;
  let child;
  const onSignal = (signal) => {
    interruptedSignal = signal;
    if (child && child.pid && !child.killed) {
      child.kill(signal);
    }
  };
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, onSignal);
  }
  try {
    child = spawn(
      sandboxExecutable,
      [
        '-p',
        sandboxProfile,
        process.execPath,
        workerPath,
        '--root',
        root,
        '--attempt',
        attempt,
        '--report',
        reportPath,
        '--digest',
        expectedDigest,
        '--source-base',
        sourceBase,
        '--origin',
        fixedOrigin,
        ...(parsedArgs.pilot ? ['--pilot'] : []),
        '--token',
        launcherToken,
      ],
      {
        cwd: root,
        stdio: 'inherit',
        env: {
          ...process.env,
          LAUX_DESIGNER_REPLAY_LAUNCHER: '1',
          LAUX_DESIGNER_REPLAY_TOKEN: launcherToken,
        },
      }
    );
    const { code, signal } = await waitForChild(child);
    const report = await readReport(reportPath);
    if (interruptedSignal) {
      await finalizeAsFailure(reportPath, initial, report, 'interrupted', `Interrupted by ${interruptedSignal}`);
      process.exitCode = 130;
      return;
    }
    if (!report) {
      await finalizeAsFailure(reportPath, initial, report, 'missing-report', 'Worker exited without a readable runtime report object.');
      process.exitCode = toFailureExitCode(code);
      return;
    }
    if (!isTerminalStatus(report.status)) {
      await finalizeAsFailure(
        reportPath,
        initial,
        report,
        'non-terminal-report',
        `Worker exited with status "${report.status ?? 'missing'}"; expected passed, failed, or incomplete.`
      );
      process.exitCode = toFailureExitCode(code);
      return;
    }
    // A worker can write a passing report before it finishes shutting down.
    if (report.status === 'passed' && (code !== 0 || signal)) {
      const signalText = signal ? ` (signal: ${signal})` : '';
      await finalizeAsFailure(reportPath, initial, report, 'worker-exit', `Worker exited with code ${code ?? 'null'}${signalText}`);
      process.exitCode = toFailureExitCode(code);
    } else if (report.status === 'passed' && !isValidPass(report, initial)) {
      await finalizeAsFailure(
        reportPath,
        initial,
        report,
        'invalid-pass-report',
        'Worker claimed a pass without a matching, complete result for this attempt and scope.'
      );
      process.exitCode = 1;
    } else if (report.status !== 'passed') {
      if (!matchesAttempt(report, initial) || !hasCatalog(report.product?.journeys, initial)) {
        await finalizeAsFailure(
          reportPath,
          initial,
          report,
          'invalid-report',
          'Worker report did not match the attempt and journey catalog.'
        );
      }
      process.exitCode = toFailureExitCode(code);
    }
  } catch (error) {
    await finalizeAsFailure(reportPath, initial, await readReport(reportPath), 'launcher-error', error.message);
    process.exitCode = 1;
  } finally {
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.off(signal, onSignal);
    }
  }
};

run().catch((error) => {
  console.error('Designer replay launcher failed:', error.message);
  process.exitCode = 1;
});
