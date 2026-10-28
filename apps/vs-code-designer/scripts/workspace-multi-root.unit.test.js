/* global __dirname, require */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { test } = require('node:test');
const { formatErrorForDiagnostics } = require('./e2e-cli-diagnostics');
const {
  assertAssets,
  assertEvidence,
  finalizeResult,
  runWorkspaceMultiRoot,
  validateHandoff,
  suiteId,
  expectedPhases,
  exactPhasesComplete,
  assertFreshPhaseJournal,
  assertNoCallerFuncAdmission,
  retainedIdentityExitFacts,
  caseExecutionMode,
  createMultiRootDiagnosticRoot,
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
test('diagnostics root creation creates an absent configured parent', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-root-diagnostics-unit-'));
  try {
    const parent = path.join(root, 'nested', 'diagnostics');
    const diagnosticRoot = createMultiRootDiagnosticRoot(parent);
    assert.equal(path.dirname(diagnosticRoot), parent);
    assert.equal(fs.statSync(diagnosticRoot).isDirectory(), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test('diagnostic error formatting preserves actionable stack frames', () => {
  const error = new Error('synthetic multi-root failure');
  error.stack = 'Error: synthetic multi-root failure\n    at unitMultiRootCaller (workspace-multi-root.unit.test.js:1:1)';
  assert.match(formatErrorForDiagnostics(error), /unitMultiRootCaller/);
});
test('isolated flag alone cannot authorize the unresolved retained native cleanup gate', async () => {
  await assert.rejects(runWorkspaceMultiRoot({}, { LA_E2E_CLI_MULTI_ROOT_ISOLATED: '1' }), /native finalization blocked/);
});
test('explicit isolated diagnostic execution never authorizes native-clean acceptance', () => {
  assert.deepEqual(
    caseExecutionMode({
      LA_E2E_CLI_MULTI_ROOT_ISOLATED: '1',
      LA_E2E_CLI_MULTI_ROOT_DIAGNOSTIC_ONLY: '1',
    }),
    { diagnosticOnly: true, acceptanceAuthorized: false }
  );
  assert.throws(() => caseExecutionMode({ LA_E2E_CLI_MULTI_ROOT_DIAGNOSTIC_ONLY: '1' }), /isolated native worker/);
  assert.throws(() => caseExecutionMode({ LA_E2E_CLI_MULTI_ROOT_ISOLATED: '1' }), /native finalization blocked/);
  assert.deepEqual(caseExecutionMode({ LA_E2E_CLI_MULTI_ROOT_ISOLATED: '1', LA_E2E_CLI_SUITE_WRAPPER_CHILD: '1' }), {
    diagnosticOnly: false,
    acceptanceAuthorized: true,
  });
  const callerModel = { ...passing(), originalProcessClosureVerified: true, processClosureProof: 'retained-original-identities' };
  const final = finalizeResult(callerModel);
  assert.equal(final.originalProcessClosureVerified, false);
  assert.equal(final.processClosureProof, 'original-identities-unverified');
  assert.equal(final.complete, false);
});

test('review repro: exited root and live retained former child reparented to PID1 cannot prove cleanup', () => {
  const exe = path.resolve('unit-owned-func');
  const retained = [
    { pid: 10, parentPid: 2, creationIdentity: 'root-birth', executable: path.resolve('unit-owned-Code') },
    { pid: 20, parentPid: 10, creationIdentity: 'child-birth', executable: exe },
  ];
  const after = [{ ...retained[1], parentPid: 1 }];
  const verdict = retainedIdentityExitFacts(retained, after);
  assert.equal(verdict.cleanupVerified, false);
  assert.equal(verdict.reason, 'retained-native-identity-still-alive');
});

test('exited intermediate parent, reused PID, missing birth and inaccessible native identity are not verified', () => {
  const retained = [
    { pid: 10, parentPid: 2, creationIdentity: 'root', executable: path.resolve('unit-Code') },
    { pid: 20, parentPid: 10, creationIdentity: 'middle', executable: path.resolve('unit-shell') },
    { pid: 30, parentPid: 20, creationIdentity: 'child', executable: path.resolve('unit-Azurite-node') },
  ];
  for (const after of [
    [{ ...retained[2], parentPid: 1 }],
    [{ ...retained[2], parentPid: 1, creationIdentity: 'reused' }],
    [{ ...retained[2], creationIdentity: '' }],
    [{ ...retained[2], executable: '' }],
    undefined,
  ]) {
    assert.equal(retainedIdentityExitFacts(retained, after).cleanupVerified, false);
  }
  assert.equal(retainedIdentityExitFacts([{ ...retained[2], creationIdentity: '' }], []).cleanupVerified, false);
  const absent = retainedIdentityExitFacts(retained, []);
  assert.equal(absent.retainedSetAbsent, true);
  assert.equal(absent.cleanupVerified, false, 'Known-set absence cannot establish unobserved case ownership coverage');
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
test('final result stays blocked even with observation/phase/ordinary-close booleans until live retained ownership coverage exists', () => {
  assert.equal(finalizeResult(passing()).complete, false);
  assert.equal(finalizeResult(passing()).retainedCaseCleanupVerified, false);
  const contained = finalizeResult(passing(), { acceptanceAuthorized: true });
  assert.equal(contained.complete, true);
  assert.equal(contained.retainedCaseCleanupVerified, true);
  assert.equal(contained.originalProcessClosureVerified, false);
  assert.equal(contained.processClosureProof, 'outer-containment-pending');
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
  const workspace = { wsFilePath: path.resolve('unit.code-workspace'), appDir: path.resolve('a') };
  assert.throws(() => assertEvidence(undefined, '', ''));
  assert.throws(() => assertEvidence({ mapperOpened: false }, '', ''));
  assert.throws(
    () =>
      assertEvidence(
        {
          mapperOpened: true,
          initialWindow: {
            targetId: 'unit-target',
            boot: 'same',
            state: { ready: true, title: 'unit - Visual Studio Code', roots: ['a'], timeOrigin: 1 },
          },
          roots: ['a', 'b'],
          originalBoot: 'same',
          reloadedBoot: 'same',
        },
        '',
        '',
        workspace
      ),
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
  assert.ok(runner.includes('shouldRetainDeferredWorkspaceForOuterContainment('));
  assert.ok(runner.includes('Boolean(env.LA_E2E_CLI_MULTI_ROOT_HANDOFF)'));
  const family = fs.readFileSync(path.join(__dirname, 'workspace-multi-root.js'), 'utf8');
  assert.ok(family.includes('retainWorkspaceForSupplement: true'));
  assert.ok(
    family.includes("'--remote-debugging-port=0'") &&
      family.includes("require('../out/test/e2e/cdpClient')") &&
      family.indexOf('const child = spawn(') < family.indexOf('const cdpPort = await waitForDevToolsActivePort(') &&
      family.includes('process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT = String(cdpPort)') &&
      !family.includes('async function waitForDevToolsActivePort(') &&
      !family.includes("env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT || '9527'"),
    'The regular-window observer must use the shared profile-scoped CDP discovery rather than race, duplicate it or attach to a stale window'
  );
  const nativeUi = fs.readFileSync(path.join(root, 'src/test/e2e/workspaceMultiRoot.test.ts'), 'utf8');
  const sharedWorkbench = fs.readFileSync(path.join(root, 'src/test/e2e/workbenchCdpActions.ts'), 'utf8');
  assert.ok(
    nativeUi.includes('connectToOwnedRegularWorkbench({') &&
      nativeUi.includes('reloadOwnedRegularWorkbench(') &&
      nativeUi.includes("event.kind === 'activation'") &&
      nativeUi.includes('fs.realpathSync(event.roots[0]) === fs.realpathSync(workspace.appDir)') &&
      sharedWorkbench.includes('titleSegments.some((segment) => expectedSegments.has(segment))') &&
      sharedWorkbench.includes('`${workspaceTitle} (workspace)`') &&
      sharedWorkbench.includes("assert.equal(cdp.targetId, targetId, 'Reload continuation must retain the original window target')"),
    'Multi-root must delegate exact workspace/window ownership and same-target reload to the shared regular-workbench lifecycle'
  );
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

test('wrapper-created empty phase journal is fresh while prior phase content is rejected', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'la-multi-root-phase-control-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const phaseFile = path.join(root, 'phases.jsonl');
  assert.doesNotThrow(() => assertFreshPhaseJournal(phaseFile));
  fs.writeFileSync(phaseFile, '');
  assert.doesNotThrow(() => assertFreshPhaseJournal(phaseFile));
  fs.writeFileSync(phaseFile, ' \t\n');
  assert.throws(() => assertFreshPhaseJournal(phaseFile), /must be fresh/);
  fs.writeFileSync(phaseFile, `${JSON.stringify({ phaseId: expectedPhases[0] })}\n`);
  assert.throws(() => assertFreshPhaseJournal(phaseFile), /must be fresh/);
});

test('full-suite aliases include the supported family without inventing an OGF mapping', () => {
  for (const alias of ['linux', 'windows']) {
    assert.ok(normalizeSuiteSelection(alias, { platform: alias === 'windows' ? 'win32' : 'linux' }).some((suite) => suite.id === suiteId));
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
        processCleanup: { verified: true, retainedOriginalIdentitiesVerified: true },
      });
      return JSON.parse(fs.readFileSync(context.terminalResultPath, 'utf8'));
    };
    const good = finalize(phaseFixtures(), 0);
    assert.equal(good.suiteId, suiteId);
    assert.equal(good.complete, true);
    assert.equal(good.cleanupVerified, true);
    assert.equal(good.originalProcessClosureVerified, true);
    assert.equal(good.processClosureProof, 'retained-original-identities');
    assert.equal(good.diagnosticsError, '');
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
    const workspaceRoot = path.join(reportRoot, 'missing', 'workspaces');
    fs.writeFileSync(terminalPath, JSON.stringify({ complete: true, stale: true }));
    const code = await runDirectRegisteredSuite(SUITE_REGISTRY.workspaceMultiRoot, {
      reportRoot,
      env: {
        BUILD_SOURCEVERSION: 'unit-source',
        BUILD_BUILDID: 'unit-run',
        SYSTEM_JOBID: 'unit-job',
        LA_E2E_CLI_WORKSPACE_ROOT: workspaceRoot,
      },
      runWrapper: async ({ suite, context, env }) => {
        assert.equal(fs.statSync(workspaceRoot).isDirectory(), true);
        assert.equal(
          JSON.parse(fs.readFileSync(terminalPath, 'utf8')).complete,
          false,
          'Old success must be invalidated before wrapper launch'
        );
        assert.equal(env.LA_E2E_CLI_DIRECT_WRAPPED_SUITE, 'workspaceMultiRoot');
        assert.equal(typeof context.invocation, 'string');
        assert.ok(context.invocation.length > 0);
        assert.equal(context.reportsRoot, path.resolve(reportRoot));
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
          processCleanup: { verified: true, retainedOriginalIdentitiesVerified: true, checkedAt: 'unit-observation' },
        });
        return { exitCode: 0, signal: null };
      },
    });
    assert.equal(code, 1, 'The legacy direct supplementary route still lacks owned-root provenance finalization');
    const terminal = JSON.parse(fs.readFileSync(terminalPath, 'utf8'));
    assert.equal(terminal.suiteId, 'workspaceMultiRoot');
    assert.equal(terminal.lifecycleFinalized, true);
    assert.equal(terminal.complete, false);
    assert.equal(terminal.cleanupVerified, false);
    assert.equal(terminal.originalProcessClosureVerified, true);
    assert.equal(terminal.processClosureProof, 'retained-original-identities');
    const cleanup = JSON.parse(fs.readFileSync(path.join(reportRoot, 'workspaceMultiRoot.cleanup-ledger.json'), 'utf8'));
    assert.equal(cleanup.verified, false);
    assert.equal(cleanup.processTreeVerified, true);
    assert.equal(cleanup.processCleanup.verified, true);
    assert.deepEqual(terminal.expectedPhaseIds, terminal.observedPhaseIds);
    const provenance = JSON.parse(fs.readFileSync(path.join(reportRoot, 'workspaceMultiRoot.terminal-invocation.json'), 'utf8'));
    assert.equal(provenance.accepted, false);
    assert.deepEqual(provenance.identity, { source: 'unit-source', run: 'unit-run', job: 'unit-job' });
    assert.ok(provenance.invocation && provenance.phaseResultsPath.includes(provenance.invocation));
    assert.equal(terminal.invocation, provenance.invocation);
    assert.equal(cleanup.invocation, provenance.invocation);
  } finally {
    fs.rmSync(reportRoot, { recursive: true, force: true });
  }
});

test('direct supplementary route invalidates stale evidence before workspace-root setup', async () => {
  const reportRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'multi-root-direct-setup-failure-unit-'));
  try {
    const terminalPath = path.join(reportRoot, 'workspaceMultiRoot.terminal-result.json');
    const cleanupPath = path.join(reportRoot, 'workspaceMultiRoot.cleanup-ledger.json');
    const blockingFile = path.join(reportRoot, 'workspace-root-blocker');
    fs.writeFileSync(terminalPath, JSON.stringify({ complete: true, stale: true }));
    fs.writeFileSync(cleanupPath, JSON.stringify({ verified: true, stale: true }));
    fs.writeFileSync(blockingFile, 'not-a-directory');
    let wrapperCalled = false;
    await assert.rejects(
      runDirectRegisteredSuite(SUITE_REGISTRY.workspaceMultiRoot, {
        reportRoot,
        env: { LA_E2E_CLI_WORKSPACE_ROOT: path.join(blockingFile, 'child') },
        runWrapper: async () => {
          wrapperCalled = true;
          return { exitCode: 0, signal: null };
        },
      }),
      /ENOENT|ENOTDIR|EEXIST/
    );
    assert.equal(wrapperCalled, false);
    const terminal = JSON.parse(fs.readFileSync(terminalPath, 'utf8'));
    const cleanup = JSON.parse(fs.readFileSync(cleanupPath, 'utf8'));
    const provenance = JSON.parse(fs.readFileSync(path.join(reportRoot, 'workspaceMultiRoot.terminal-invocation.json'), 'utf8'));
    assert.equal(terminal.complete, false);
    assert.equal(cleanup.verified, false);
    assert.equal(terminal.invocation, provenance.invocation);
    assert.equal(cleanup.invocation, provenance.invocation);
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
