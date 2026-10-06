/* global __dirname, require */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { test } = require('node:test');
const {
  assertAssets,
  assertEvidence,
  finalizeResult,
  runWorkspaceMultiRoot,
  validateHandoff,
  suiteId,
  expectedPhases,
  exactPhasesComplete,
  assertNoCallerFuncAdmission,
} = require('./workspace-multi-root');
const { SUITE_REGISTRY, normalizeSuiteSelection } = require('./e2e-cli-batch');
const {
  _test: { writeSuiteFinalEvidence, runDirectRegisteredSuite },
} = require('./run-e2e-cli');

const phaseFixtures = () =>
  expectedPhases.map((phaseId) => ({
    phaseId,
    complete: true,
    exitCode: 0,
    signal: null,
    cleanupVerified: true,
    diagnosticsError: '',
  }));

test('native family cannot run on a shared host; rejection precedes any native operation', async () => {
  await assert.rejects(runWorkspaceMultiRoot({}, {}), /isolated native consumer/);
});
test('caller-supplied Func path/hash cannot act as native bootstrap admission', () => {
  assertNoCallerFuncAdmission({});
  for (const env of [
    { LA_E2E_CLI_MULTI_ROOT_FUNC_SHA256: 'a'.repeat(64) },
    { LA_E2E_CLI_MULTI_ROOT_FUNC_PATH: path.resolve('unit-free-form-func') },
  ]) {
    assert.throws(() => assertNoCallerFuncAdmission(env), /not admission/);
  }
});
test('missing Data Mapper HTML/JS is a meaningful block, not command discovery pass', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-root-assets-unit-'));
  try {
    assert.throws(() => assertAssets(root));
    fs.mkdirSync(path.join(root, 'dist/vs-code-react/assets'), { recursive: true });
    fs.writeFileSync(path.join(root, 'dist/main.js'), 'fixture');
    fs.writeFileSync(path.join(root, 'dist/vs-code-react/index.html'), '<html>fixture</html>');
    assert.throws(() => assertAssets(root), /assets/);
    fs.writeFileSync(path.join(root, 'dist/vs-code-react/assets/fixture.js'), 'fixture');
    assertAssets(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
const passing = () => ({
  observationPassed: true,
  evidenceVerified: true,
  originalCodeClose: { code: 0, signal: null },
  diagnosticsVerified: true,
  cleanupVerified: true,
  errors: [],
  phaseResults: phaseFixtures(),
});
test('final result only passes after observation, evidence, ordinary native close, diagnostics and cleanup', () => {
  assert.equal(finalizeResult(passing()).complete, true);
  for (const field of ['observationPassed', 'evidenceVerified', 'diagnosticsVerified', 'cleanupVerified']) {
    assert.equal(finalizeResult({ ...passing(), [field]: false }).complete, false);
  }
  for (const originalCodeClose of [null, { code: 1, signal: null }, { code: 0, signal: 'SIGTERM' }]) {
    assert.equal(finalizeResult({ ...passing(), originalCodeClose }).complete, false);
  }
});
test('finalization retains both original and teardown errors and cannot promote a GUI observation pass', () => {
  const errors = ['original collection failed', 'ordinary close failed'];
  const result = finalizeResult({ ...passing(), errors });
  assert.equal(result.complete, false);
  assert.deepEqual(result.errors, errors);
});
test('missing observations, wrong Mapper, absent reload and partial population cannot credit evidence', () => {
  assert.throws(() => assertEvidence(undefined, '', ''));
  assert.throws(() => assertEvidence({ mapperOpened: false }, '', ''));
  assert.throws(
    () => assertEvidence({ mapperOpened: true, roots: ['a', 'b'], originalBoot: 'same', reloadedBoot: 'same' }, '', ''),
    /reload/
  );
  assert.throws(() =>
    assertEvidence(
      {
        mapperOpened: true,
        roots: ['a', 'b'],
        originalBoot: 'before',
        reloadedBoot: 'after',
        population: { complete: false },
      },
      '',
      ''
    )
  );
});
test('registration is additive and leaves baseline CLI labels untouched', () => {
  const root = path.resolve(__dirname, '..');
  const runner = fs.readFileSync(path.join(__dirname, 'run-e2e-cli.js'), 'utf8');
  assert.ok(runner.includes("process.argv.includes('--workspace-multi-root')"));
  const config = fs.readFileSync(path.join(root, '.vscode-test.mjs'), 'utf8');
  assert.ok(config.includes("'LA_E2E_CLI_MULTI_ROOT_HANDOFF'"));
  assert.ok(
    !config.includes("label: 'workspaceMultiRoot'"),
    'Supplementary native evidence must not alter canonical Mocha label/count baselines'
  );
  assert.ok(runner.includes('options.retainWorkspaceForSupplement && childEnv.LA_E2E_CLI_MULTI_ROOT_HANDOFF'));
  const family = fs.readFileSync(path.join(__dirname, 'workspace-multi-root.js'), 'utf8');
  assert.ok(family.includes('retainWorkspaceForSupplement: true'));
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(packageJson.scripts['test:e2e-cli:unit'].includes('workspaceMultiRoot.unit.js'));
});

test('shared family suite ID and selector agree with exactly bootstrap/create/reopen phases on both consumer OSes', () => {
  assert.equal(suiteId, 'workspaceMultiRoot');
  assert.deepEqual(expectedPhases, ['runtimeDependencyBootstrap:bootstrap', 'workspaceMultiRoot:create', 'workspaceMultiRoot:reopen']);
  for (const platform of ['win32', 'linux']) {
    const [registered] = normalizeSuiteSelection(suiteId, { platform });
    assert.equal(registered.id, suiteId);
    assert.deepEqual(registered.args, ['--workspace-multi-root']);
    assert.deepEqual(registered.expectedPhases, expectedPhases);
  }
  assert.deepEqual(SUITE_REGISTRY.workspaceMultiRoot.expectedPhases, expectedPhases);
});

test('phase reporting fails closed for missing, duplicate, unexpected, out-of-order or unsuccessful lifecycle phases', () => {
  const good = phaseFixtures();
  assert.equal(exactPhasesComplete(good), true);
  for (const phases of [
    undefined,
    [],
    [null],
    good.slice(1),
    [...good, good[0]],
    [...good].reverse(),
    good.map((phase, index) => (index === 0 ? { ...phase, phaseId: 'workspaceMultiRoot:bootstrap' } : phase)),
    good.map((phase, index) => (index === 2 ? { ...phase, complete: false } : phase)),
    good.map((phase, index) => (index === 1 ? { ...phase, exitCode: 1 } : phase)),
    good.map((phase, index) => (index === 2 ? { ...phase, signal: 'SIGTERM' } : phase)),
    good.map((phase, index) => (index === 2 ? { ...phase, cleanupVerified: false } : phase)),
    good.map((phase, index) => (index === 0 ? { ...phase, diagnosticsError: 'fixture original error' } : phase)),
  ]) {
    assert.equal(exactPhasesComplete(phases), false);
    assert.equal(finalizeResult({ ...passing(), phaseResults: phases }).complete, false);
  }
});

test('additive family does not expand legacy full-suite aliases or invent an OGF mapping', () => {
  for (const alias of ['linux', 'windows']) {
    assert.ok(!normalizeSuiteSelection(alias).some((suite) => suite.id === suiteId));
  }
  const family = fs.readFileSync(path.join(__dirname, 'workspace-multi-root.js'), 'utf8');
  assert.ok(family.includes("runVscodeTest(['--label', 'runtimeDependencyBootstrap']"));
  assert.ok(family.includes("phaseId: 'workspaceMultiRoot:reopen'"));
  assert.ok(!family.includes('ogfScenarios'));
});

test('batch terminal reports the exact family lifecycle and cannot credit blocked/failed native phases', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-root-terminal-unit-'));
  try {
    const context = {
      expectedPhaseIds: expectedPhases,
      phaseResultsPath: path.join(root, 'phases.jsonl'),
      cleanupLedgerPath: path.join(root, 'cleanup.json'),
      terminalResultPath: path.join(root, 'terminal.json'),
    };
    const finalize = (phases, exitCode) => {
      fs.writeFileSync(context.phaseResultsPath, phases.map((phase) => JSON.stringify(phase)).join('\n'));
      writeSuiteFinalEvidence({
        context,
        suite: SUITE_REGISTRY.workspaceMultiRoot,
        exitCode,
        signal: null,
        processCleanup: { verified: true },
      });
      return JSON.parse(fs.readFileSync(context.terminalResultPath, 'utf8'));
    };
    const good = finalize(phaseFixtures(), 0);
    assert.equal(good.suiteId, suiteId);
    assert.equal(good.complete, true);
    assert.equal(good.lifecycleFinalized, true);
    assert.deepEqual(
      good.phaseResults.map((phase) => phase.phaseId),
      expectedPhases
    );
    for (const phases of [
      phaseFixtures().slice(0, 1),
      phaseFixtures().map((phase, index) => (index === 2 ? { ...phase, complete: false, exitCode: 1 } : phase)),
      [...phaseFixtures(), phaseFixtures()[0]],
    ]) {
      assert.equal(finalize(phases, 1).complete, false);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('direct supplementary route invalidates stale terminal and uses exact registry phases/general finalization at ADO paths', async () => {
  const reportRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-root-direct-terminal-unit-'));
  try {
    const terminalPath = path.join(reportRoot, 'workspaceMultiRoot.terminal-result.json');
    fs.writeFileSync(terminalPath, JSON.stringify({ complete: true, stale: true }));
    const code = await runDirectRegisteredSuite(SUITE_REGISTRY.workspaceMultiRoot, {
      reportRoot,
      env: { BUILD_SOURCEVERSION: 'unit-source', BUILD_BUILDID: 'unit-run', SYSTEM_JOBID: 'unit-job' },
      runWrapper: async ({ suite, context, env }) => {
        assert.equal(
          JSON.parse(fs.readFileSync(terminalPath, 'utf8')).complete,
          false,
          'Old success must be invalidated before wrapper launch'
        );
        assert.equal(env.LA_E2E_CLI_DIRECT_WRAPPED_SUITE, 'workspaceMultiRoot');
        assert.equal(context.terminalResultPath, terminalPath);
        assert.deepEqual(context.expectedPhaseIds, expectedPhases);
        assert.equal(fs.existsSync(context.phaseResultsPath), false);
        fs.writeFileSync(
          context.phaseResultsPath,
          phaseFixtures()
            .map((phase) => JSON.stringify(phase))
            .join('\n')
        );
        // Explicit unit-owned observation fixture. Production uses actual
        // wrapper child-close and verifyNoOwnedDescendants observation.
        writeSuiteFinalEvidence({
          context,
          suite,
          exitCode: 0,
          signal: null,
          processCleanup: { verified: true, checkedAt: 'unit-observation' },
        });
        return { exitCode: 0, signal: null };
      },
    });
    assert.equal(code, 0);
    const terminal = JSON.parse(fs.readFileSync(terminalPath, 'utf8'));
    assert.equal(terminal.suiteId, 'workspaceMultiRoot');
    assert.equal(terminal.lifecycleFinalized, true);
    assert.equal(terminal.complete, true);
    assert.deepEqual(terminal.expectedPhaseIds, terminal.observedPhaseIds);
    const provenance = JSON.parse(fs.readFileSync(path.join(reportRoot, 'workspaceMultiRoot.terminal-invocation.json'), 'utf8'));
    assert.equal(provenance.accepted, true);
    assert.deepEqual(provenance.identity, { source: 'unit-source', run: 'unit-run', job: 'unit-job' });
    assert.ok(provenance.invocation && provenance.phaseResultsPath.includes(provenance.invocation));
  } finally {
    fs.rmSync(reportRoot, { recursive: true, force: true });
  }
});

test('direct exit zero with missing phases/finalization or unobserved cleanup stays failed', async () => {
  const reportRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-root-direct-negative-unit-'));
  try {
    for (const mode of ['missing-terminal-finalization', 'missing-phase', 'unobserved-cleanup', 'wrong-order']) {
      const code = await runDirectRegisteredSuite(SUITE_REGISTRY.workspaceMultiRoot, {
        reportRoot,
        env: {},
        runWrapper: async ({ context, suite }) => {
          if (mode !== 'missing-terminal-finalization') {
            const phases =
              mode === 'missing-phase' ? phaseFixtures().slice(0, 2) : mode === 'wrong-order' ? phaseFixtures().reverse() : phaseFixtures();
            fs.writeFileSync(context.phaseResultsPath, phases.map((phase) => JSON.stringify(phase)).join('\n'));
            writeSuiteFinalEvidence({
              context,
              suite,
              exitCode: 0,
              signal: null,
              processCleanup: { verified: mode !== 'unobserved-cleanup' },
            });
          }
          return { exitCode: 0, signal: null };
        },
      });
      assert.equal(code, 1, mode);
      const provenance = JSON.parse(fs.readFileSync(path.join(reportRoot, 'workspaceMultiRoot.terminal-invocation.json'), 'utf8'));
      assert.equal(provenance.accepted, false);
    }
  } finally {
    fs.rmSync(reportRoot, { recursive: true, force: true });
  }
});

test('wizard handoff rejects stale/wrong job, escaped root, changed Code, changed extensions and missing same app', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-root-handoff-unit-'));
  try {
    const appDir = path.join(root, 'workspace/app');
    fs.mkdirSync(appDir, { recursive: true });
    const wsFilePath = path.join(root, 'workspace/workspace.code-workspace');
    fs.writeFileSync(wsFilePath, JSON.stringify({ folders: [{ path: 'app' }] }));
    const code = path.join(root, 'Code.exe');
    fs.writeFileSync(code, 'unit-owned-nonexecutable-Code-fixture');
    const extensions = path.join(root, 'extensions');
    fs.mkdirSync(extensions);
    const context = {
      invocation: 'unit-invocation',
      identity: { source: 'unit-source', job: 'unit-job' },
      workspaceParent: fs.realpathSync(root),
      extensionsDir: extensions,
      startedUtc: new Date(Date.now() - 1000).toISOString(),
      requestedVersion: 'stable',
    };
    const value = {
      invocation: context.invocation,
      identity: context.identity,
      entry: { appType: 'standard', wfType: 'Stateful', parentDir: root, appDir, wsFilePath, createdAt: new Date().toISOString() },
      launch: {
        executable: fs.realpathSync(code),
        sha256: createHash('sha256').update(fs.readFileSync(code)).digest('hex'),
        version: 'unit-version',
        extensionsDir: extensions,
      },
    };
    assert.deepEqual(validateHandoff(value, context).entry, value.entry);
    assert.throws(() => validateHandoff({ ...value, invocation: 'stale' }, context), /Stale/);
    assert.throws(() => validateHandoff({ ...value, identity: { source: 'wrong', job: 'unit-job' } }, context), /Wrong job/);
    assert.throws(() => validateHandoff({ ...value, entry: { ...value.entry, appDir: os.tmpdir() } }, context), /escaped/);
    assert.throws(
      () => validateHandoff({ ...value, entry: { ...value.entry, createdAt: '2000-01-01T00:00:00Z' } }, context),
      /Stale wizard/
    );
    assert.throws(() => validateHandoff({ ...value, launch: { ...value.launch, sha256: 'a'.repeat(64) } }, context), /Code binary/);
    assert.throws(() => validateHandoff({ ...value, launch: { ...value.launch, extensionsDir: root } }, context), /extensions/);
    assert.throws(() => validateHandoff(value, { ...context, requestedVersion: 'other-version' }), /admitted version/);
    fs.writeFileSync(wsFilePath, JSON.stringify({ folders: [] }));
    assert.throws(() => validateHandoff(value, context), /same app/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
