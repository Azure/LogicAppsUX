/* global __dirname, process, require, structuredClone */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { SUITE_REGISTRY } = require('./e2e-cli-batch');
const {
  evaluateLifecycleAcceptance,
  isProcessCleanupAccepted,
  isTerminalProcessClosureAccepted,
} = require('./vscode-lifecycle-acceptance');
const { assertFamilyLifecycleTerminal } = require('./family-lifecycle-terminal');
const { assertSuccessfulMsnTerminal } = require('./e2e-cli-terminal');
const { _test: runner } = require('./run-e2e-cli');

function fixture(platform = 'win32') {
  const invocation = 'policy-control';
  const proof = (source, observedAt) => ({ source, invocation, observedAt, receipt: `${source}-receipt`, verified: true });
  const installationRoot = path.join(__dirname, 'fixtures', 'ms-dotnettools.csharp-policy-control');
  const lifecycleEvidence = {
    schemaVersion: 1,
    invocation,
    rootPid: 101,
    beforeRecoveryAt: 50,
    shutdown: { ...proof('logicapps-owned-shutdown', 10), ownedProcesses: [{ pid: 103, startTimeTicks: '12346' }] },
    resources: { ...proof('logicapps-resource-probe', 20), checked: ['runtime', 'design-time', 'ports', 'locks'] },
    startup: {
      ...proof('logicapps-subsequent-startup', 30),
      launchId: 'synthetic-next-launch',
      actualInvocation: 'synthetic-separate-invocation',
      extensionHostPid: 201,
      nativeIdentity: {
        ownershipComplete: true,
        observedAtUtc: new Date(29).toISOString(),
        processes: [
          {
            pid: 201,
            startTimeTicks: '335',
            metadataStatus: 'captured',
            commandSummary: { sha256: 'd'.repeat(64) },
          },
        ],
      },
    },
    survivorOwners: [
      {
        pid: 102,
        startTimeTicks: '12345',
        commandSha256: 'a'.repeat(64),
        source: 'validated-installed-payload',
        invocation,
        receipt: 'original-extension-launch-receipt',
        extensionId: 'ms-dotnettools.csharp',
        installationRoot,
        executable: path.join(installationRoot, '.roslyn', 'Microsoft.CodeAnalysis.LanguageServer.exe'),
        installationSHA256: 'b'.repeat(64),
        payloadSHA256: 'c'.repeat(64),
        processClass: 'csharp-roslyn-language-server',
        productRole: 'independent-dependency',
      },
    ],
  };
  const closure = {
    mechanism: platform === 'linux' ? 'linux-subreaper' : 'windows-job-object',
    rootPid: 101,
    rootExitCode: 0,
    rootSignal: null,
    receiptValidated: true,
    hostOutcomeMatches: true,
    infrastructureCleanupVerified: true,
    forcedTerminationAttempted: true,
    forcedTerminationSucceeded: true,
    postTerminationActiveProcessCount: 0,
    escapedDescendants: [],
    metadataCapturedAtUtc: new Date(50).toISOString(),
    verified: false,
    retainedOriginalIdentitiesVerified: false,
    activeContainedProcessCount: 1,
    activeContainedProcessesDiagnosticsValid: true,
    activeContainedProcessesTruncated: false,
    activeContainedProcesses: [
      {
        pid: 102,
        startTimeTicks: '12345',
        metadataStatus: 'captured',
        imageName: 'Roslyn.exe',
        executablePath: path.join(installationRoot, '.roslyn', 'Microsoft.CodeAnalysis.LanguageServer.exe'),
        commandSummary: { sha256: 'a'.repeat(64) },
      },
    ],
    lifecycleEvidence,
  };
  if (platform === 'linux') {
    for (const record of [
      ...lifecycleEvidence.shutdown.ownedProcesses,
      ...lifecycleEvidence.survivorOwners,
      ...lifecycleEvidence.startup.nativeIdentity.processes,
      ...closure.activeContainedProcesses,
    ]) {
      record.identity = {
        platform: 'linux',
        kind: 'linux-proc-start',
        startTimeTicks: record.startTimeTicks,
        bootId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        clockTicksPerSecond: 100,
      };
    }
    closure.activeContainedProcesses[0].executablePath = closure.activeContainedProcesses[0].executablePath.replace(/\.exe$/, '');
    closure.activeContainedProcesses[0].commandSummary.hashEncoding = 'linux-proc-cmdline-nul-bytes';
    lifecycleEvidence.startup.nativeIdentity.processes[0].commandSummary.hashEncoding = 'linux-proc-cmdline-nul-bytes';
    lifecycleEvidence.shutdown.ownedProcesses[0].commandSha256 = 'e'.repeat(64);
    lifecycleEvidence.survivorOwners[0].executable = lifecycleEvidence.survivorOwners[0].executable.replace(/\.exe$/, '');
  }
  return closure;
}

test('every canonical Linux and Windows lane applies the same exception policy with its own native identity domain', () => {
  for (const suite of Object.values(SUITE_REGISTRY)) {
    for (const platform of suite.platforms) {
      const closure = fixture(platform === 'linux' ? 'linux' : 'win32');
      assert.equal(isProcessCleanupAccepted(closure), true);
      if (closure.mechanism === 'linux-subreaper') {
        for (const mutate of [
          (c) => {
            delete c.activeContainedProcesses[0].identity;
          },
          (c) => {
            delete c.lifecycleEvidence.shutdown.ownedProcesses[0].commandSha256;
          },
          (c) => {
            c.lifecycleEvidence.survivorOwners[0].identity.bootId = 'ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee';
          },
          (c) => {
            delete c.lifecycleEvidence.startup.nativeIdentity.processes[0].identity;
          },
          (c) => {
            c.lifecycleEvidence.survivorOwners[0].executable += '.exe';
          },
          (c) => {
            c.lifecycleEvidence.resources.observedAt = 51;
          },
        ]) {
          const negative = fixture('linux');
          mutate(negative);
          assert.equal(isProcessCleanupAccepted(negative), false);
        }
      }
    }
  }
});
test('independent dependency with unaffected startup separates product pass from sticky recovery', () => {
  const closure = fixture();
  assert.deepEqual(evaluateLifecycleAcceptance(closure, closure.lifecycleEvidence), {
    schemaVersion: 1,
    product: 'passed',
    infrastructure: 'recovered',
    recovered: true,
    accepted: true,
    reason: 'independent-dependency-recovered',
  });
  assert.equal(isProcessCleanupAccepted(closure), true);
  assert.equal(closure.verified, false, 'Recovery is not ordinary original closure');
  assert.equal(closure.retainedOriginalIdentitiesVerified, false);
});

test('dependency exception requires all proofs; Roslyn basename cannot waive blocking effects or unknown ownership', () => {
  for (const mutate of [
    (c) => {
      c.lifecycleEvidence.resources.verified = false;
    },
    (c) => {
      c.lifecycleEvidence.shutdown.verified = false;
    },
    (c) => {
      c.lifecycleEvidence.shutdown.ownedProcesses.push({ pid: 102, startTimeTicks: '12345' });
    },
    (c) => {
      c.forcedTerminationSucceeded = false;
    },
    (c) => {
      c.postTerminationActiveProcessCount = 1;
    },
    (c) => {
      c.escapedDescendants = [102];
    },
    (c) => {
      c.lifecycleEvidence.resources.checked = ['ports'];
    },
    (c) => {
      c.lifecycleEvidence.startup.verified = false;
    },
    (c) => {
      delete c.lifecycleEvidence.startup.nativeIdentity;
    },
    (c) => {
      c.lifecycleEvidence.startup.actualInvocation = c.lifecycleEvidence.invocation;
    },
    (c) => {
      c.lifecycleEvidence.resources.observedAt = 60;
    },
    (c) => {
      delete c.lifecycleEvidence.beforeRecoveryAt;
    },
    (c) => {
      c.lifecycleEvidence.rootPid = 999;
    },
    (c) => {
      c.lifecycleEvidence.survivorOwners[0].productRole = 'logicapps';
    },
    (c) => {
      c.lifecycleEvidence.survivorOwners[0].productRole = 'shared-runtime';
    },
    (c) => {
      c.lifecycleEvidence.survivorOwners[0].productRole = 'unknown';
    },
    (c) => {
      c.lifecycleEvidence.survivorOwners[0].extensionId = 'ms-azuretools.vscode-azurelogicapps';
    },
    (c) => {
      c.lifecycleEvidence.survivorOwners[0].startTimeTicks = 'reused-pid';
    },
    (c) => {
      c.lifecycleEvidence.survivorOwners[0].commandSha256 = 'b'.repeat(64);
    },
    (c) => {
      c.lifecycleEvidence.survivorOwners[0].executable = path.join(__dirname, 'func.exe');
    },
    (c) => {
      c.lifecycleEvidence.survivorOwners[0].source = 'basename-guess';
    },
    (c) => {
      c.lifecycleEvidence.survivorOwners = [];
    },
    (c) => {
      c.activeContainedProcesses[0].metadataStatus = 'identity-only';
    },
    (c) => {
      c.activeContainedProcessesTruncated = true;
    },
    (c) => {
      c.activeContainedProcessCount = 2;
    },
    (c) => {
      c.receiptValidated = false;
    },
    (c) => {
      c.hostOutcomeMatches = false;
    },
    (c) => {
      c.rootExitCode = 125;
    },
  ]) {
    const closure = fixture();
    mutate(closure);
    assert.equal(isProcessCleanupAccepted(closure), false);
  }
  const retainedMsnFunc = fixture();
  retainedMsnFunc.activeContainedProcesses[0].imageName = 'func.exe';
  retainedMsnFunc.lifecycleEvidence.survivorOwners[0].productRole = 'shared-runtime';
  assert.equal(evaluateLifecycleAcceptance(retainedMsnFunc, retainedMsnFunc.lifecycleEvidence).product, 'failed');
});

test('containment failure stays separate even when actual product startup passed', () => {
  const closure = fixture();
  closure.infrastructureCleanupVerified = false;
  const verdict = evaluateLifecycleAcceptance(closure, closure.lifecycleEvidence);
  assert.equal(verdict.product, 'passed');
  assert.equal(verdict.infrastructure, 'failed');
  assert.equal(verdict.accepted, false);
});

test('real subsequent startup may follow separately recorded independent recovery', () => {
  const closure = fixture();
  closure.lifecycleEvidence.startup.observedAt = 60;
  assert.equal(isProcessCleanupAccepted(closure), true);
  closure.lifecycleEvidence.shutdown.observedAt = 55;
  assert.equal(isProcessCleanupAccepted(closure), false, 'Shutdown cannot be established after recovery concealed its resources');
});

test('capture barrier, zero exit, and success-shaped serialized verdict are not product proof', () => {
  const closure = fixture();
  delete closure.lifecycleEvidence;
  closure.lifecycleAcceptance = { accepted: true, product: 'passed' };
  assert.equal(isProcessCleanupAccepted(closure), false);
  assert.equal(evaluateLifecycleAcceptance(closure).product, 'unverified');
  closure.verified = true;
  assert.equal(isProcessCleanupAccepted(closure), false, 'Cannot hide sticky force under verified:true');
});

test('every registered lane uses the same process verdict; ordered family and MSN validators recompute it', () => {
  assert.equal(
    Object.values(SUITE_REGISTRY).reduce((lanes, suite) => lanes + suite.platforms.length, 0),
    23
  );
  for (const [suiteId, suite] of Object.entries(SUITE_REGISTRY)) {
    const closure = fixture();
    const phaseResults = suite.expectedPhases.map((phaseId) => ({
      phaseId,
      complete: true,
      exitCode: 0,
      signal: null,
      cleanupVerified: true,
      diagnosticsError: '',
      bodyAssertionsPassed: true,
      processCleanup: structuredClone(closure),
    }));
    const terminal = {
      suiteId,
      complete: true,
      lifecycleFinalized: true,
      exitCode: 0,
      signal: null,
      cleanupVerified: true,
      originalProcessClosureVerified: false,
      processClosureProof: 'original-identities-unverified',
      processCleanup: closure,
      diagnosticsError: '',
      phaseCompleteness: true,
      expectedPhaseIds: suite.expectedPhases,
      observedPhaseIds: suite.expectedPhases,
      missingPhaseIds: [],
      unexpectedPhaseIds: [],
      duplicatePhaseIds: [],
      blockedPhaseIds: [],
      phaseResults,
    };
    assert.equal(isTerminalProcessClosureAccepted(terminal), true, suiteId);
    const native = { label: suiteId, outcome: 'success', passing: 1, total: 1, failing: 0, pending: 0 };
    if (
      [
        'msnWeatherLifecycle',
        'httpTimeoutLifecycle',
        'statelessVariablesLifecycle',
        'runAfterPersistenceLifecycle',
        'workspaceArtifactRegeneration',
        'workspaceMultiRoot',
      ].includes(suiteId)
    ) {
      assertFamilyLifecycleTerminal(native, terminal, suiteId);
      const invalid = structuredClone(terminal);
      invalid.phaseResults[0].processCleanup.lifecycleEvidence.resources.verified = false;
      assert.throws(() => assertFamilyLifecycleTerminal(native, invalid, suiteId));
    }
    if (suiteId === 'msnWeatherLifecycle') {
      assertSuccessfulMsnTerminal(native, terminal);
      const invalid = structuredClone(terminal);
      invalid.processCleanup.lifecycleEvidence.startup.verified = false;
      assert.throws(() => assertSuccessfulMsnTerminal(native, invalid));
    }
  }
});

test('registered direct runner and outer terminal producer consume the same retained-evidence verdict', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-policy-runner-'));
  try {
    const model = fixture();
    const receiptPath = path.join(root, 'original-receipt.json');
    fs.writeFileSync(
      receiptPath,
      JSON.stringify({
        schemaVersion: 1,
        mechanism: process.platform === 'win32' ? 'windows-job-object' : 'linux-subreaper',
        containmentEstablished: true,
        rootPid: model.rootPid,
        rootExitCode: 0,
        rootSignal: null,
        containmentEmpty: false,
        retainedOriginalIdentitiesVerified: false,
        escapedDescendants: [],
        activeContainedProcessCount: 1,
        activeContainedProcessesTruncated: false,
        activeContainedProcesses: [
          {
            ...model.activeContainedProcesses[0],
            commandSummary: { argumentCount: 1, safeMarkers: [], scriptOrModuleBasenames: ['Roslyn.dll'], sha256: 'a'.repeat(64) },
          },
        ],
        metadataCapturedAtUtc: model.metadataCapturedAtUtc,
        forcedTerminationAttempted: true,
        forcedTerminationSucceeded: true,
        postTerminationActiveProcessCount: 0,
      })
    );
    for (const affectedStartup of [false, true]) {
      const evidence = structuredClone(model.lifecycleEvidence);
      evidence.startup.verified = !affectedStartup;
      const closure = runner.readContainmentReceipt(receiptPath, 125, null, evidence, {
        LA_E2E_CLI_EXTENSIONS_DIR: path.dirname(evidence.survivorOwners[0].installationRoot),
      });
      assert.equal(closure.verified, false);
      assert.equal(closure.infrastructureCleanupVerified, true);
      assert.equal(isProcessCleanupAccepted(closure), !affectedStartup);
      const reportRoot = path.join(root, affectedStartup ? 'blocked' : 'accepted');
      const suite = SUITE_REGISTRY.httpTimeoutLifecycle;
      const code = await runner.runDirectRegisteredSuite(suite, {
        env: {},
        reportRoot,
        runWrapper: async ({ context }) => {
          // Unit scaffolding for the independently tested provenance/filesystem
          // gates, not a native isolation or cleanup claim.
          context.provenanceVerified = true;
          context.ownedRootCleanup = { verified: true };
          const phases = suite.expectedPhases.map((phaseId) => ({
            phaseId,
            complete: true,
            exitCode: 0,
            signal: null,
            cleanupVerified: true,
            diagnosticsError: '',
            processCleanup: closure,
          }));
          runner.writeSuiteFinalEvidence({
            context,
            suite,
            exitCode: 0,
            signal: null,
            processCleanup: closure,
            phaseResults: phases,
          });
          return { exitCode: 0, signal: null, processCleanup: closure };
        },
      });
      assert.equal(code, affectedStartup ? 1 : 0);
      const terminal = JSON.parse(fs.readFileSync(path.join(reportRoot, 'httpTimeoutLifecycle.terminal-result.json'), 'utf8'));
      assert.equal(terminal.complete, !affectedStartup);
      assert.equal(terminal.originalProcessClosureVerified, false, 'Outer acceptance must not rewrite original closure');
      assert.equal(terminal.lifecycleAcceptance.infrastructure, 'recovered');
      assert.equal(terminal.lifecycleAcceptance.product, affectedStartup ? 'failed' : 'passed');
    }
    const unavailable = runner.readContainmentReceipt(path.join(root, 'absent.json'), 0, null);
    assert.equal(unavailable.lifecycleAcceptance.product, 'blocked');
    assert.equal(unavailable.infrastructureCleanupVerified, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
