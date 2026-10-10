/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global __dirname, __filename, clearTimeout, console, module, process, require, setTimeout */
const { execFileSync, spawn } = require('child_process');
const assert = require('node:assert/strict');
const { Buffer } = require('buffer');
const { createHash, randomUUID } = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { URL } = require('url');
const {
  createBatchRoot,
  createSuiteContext,
  buildSuiteEnvironment,
  prepareSuiteExtensionsDirectory,
  cleanupSuiteTransientRoots,
  getSuiteScopedCredentialEnv,
  normalizeSuiteSelection,
  runBatchSuites,
  SUITE_REGISTRY,
} = require('./e2e-cli-batch');
const { getOgfScenariosForPhase } = require('./ogf-e2e-registry');
const cancelCheck = require('./workspace-prompt-cancel');
const legacyHttpTimeoutComposeSuite = Object.freeze({
  id: 'httpTimeoutComposeOriginal',
  requiresAzure: true,
  expectedPhases: Object.freeze([
    'runtimeDependencyBootstrap:bootstrap',
    'httpTimeoutComposeOriginal:create',
    'httpTimeoutComposeOriginal:reopen',
  ]),
});

const forbiddenOutputPatterns = [
  {
    name: 'VS Code DialogService refusal',
    pattern: /DialogService:.*refused to show dialog/i,
  },
  {
    name: 'Unexpected VS Code dialog attempt',
    pattern: /Unexpected VS Code dialog attempted/i,
  },
];
const generatedWorkspaceSnapshotDirectoryName = 'generated-workspaces';
const generatedWorkspaceSnapshotMaxFileBytes = 1024 * 1024;
const generatedWorkspaceSnapshotExcludedNames = new Set([
  '.git',
  '.vscode-test',
  'bin',
  'obj',
  'node_modules',
  'extensions',
  'globalStorage',
  'workspaceStorage',
  'credentials',
  'CachedData',
  'GPUCache',
  'Service Worker',
]);
const generatedWorkspaceSnapshotSecretKeyPattern =
  /(access[_-]?token|account[_-]?key|api[_-]?key|authorization|authentication|azurewebjobsstorage|client[_-]?secret|connection[_-]?key|connection[_-]?runtime[_-]?url|connection[_-]?string|credential|password|sas|secret|sig|signature|token)/i;
const generatedWorkspaceSnapshotSecretQueryPattern =
  /^(code|sig|signature|se|sp|spr|sr|st|sv|skoid|sktid|skt|ske|sks|skv|access_token|refresh_token|id_token)$/i;
const generatedWorkspaceSnapshotSafeTextExtensions = new Set([
  '',
  '.code-workspace',
  '.cs',
  '.csproj',
  '.funcignore',
  '.gitignore',
  '.json',
  '.md',
  '.ps1',
  '.sln',
  '.txt',
  '.xml',
  '.yaml',
  '.yml',
]);
const vscodeProfileLogMaxFileBytes = 1024 * 1024;
const vscodeProfileLogSafeExtensions = new Set(['', '.json', '.jsonl', '.log', '.md', '.txt']);
const vscodeProfileLogSafeFileNames = new Set(['telemetry.log', 'exthost.log', 'renderer.log', 'main.log', 'sharedprocess.log']);
const generatedWorkspaceSnapshotDangerousExtensions = new Set([
  '.cer',
  '.crt',
  '.der',
  '.env',
  '.jks',
  '.js',
  '.key',
  '.pem',
  '.pfx',
  '.p12',
  '.ts',
]);
const generatedWorkspaceSnapshotDangerousFileNames = new Set(['.env', '.env.local', '.npmrc']);
const workspaceParentsWithDiagnosticFailures = new Set();

if (require.main === module) {
  main();
}

function main() {
  const httpTimeoutSelector = [
    '--http-timeout-lifecycle',
    '--http-timeout-request-execution',
    '--http-timeout-request-validation',
    '--http-timeout-compose-original',
  ].find((selector) => process.argv.includes(selector));
  if (httpTimeoutSelector) {
    if (process.argv.length !== 3) {
      exitWithError(new Error(`${httpTimeoutSelector} is a focused create + reopen route; do not combine it with other flags.`));
      return;
    }
    const run = requiresDirectFamilyWrapper(process.env) ? runDirectFamily('httpTimeoutLifecycle') : runHttpTimeoutLifecycle();
    Promise.resolve(run)
      .then((code) => process.exit(code))
      .catch(exitWithError);
    return;
  }
  if (process.argv[2] === '--check-workspace-artifact-regeneration') {
    if (process.argv.length !== 4) {
      exitWithError(new Error('--check-workspace-artifact-regeneration requires only the archived family diagnostic root.'));
      return;
    }
    try {
      assertRegenerationStageEvidence(path.resolve(process.argv[3]), {
        source: process.env.BUILD_SOURCEVERSION || 'local',
        run: process.env.BUILD_BUILDID || 'local',
        job: process.env.SYSTEM_JOBID || 'local',
        platform: process.platform,
      });
      console.log(
        '[workspace-regeneration] Diagnostic evidence structure complete; original identities unverified; no supplementary acceptance.'
      );
    } catch (error) {
      exitWithError(error);
    }
    return;
  }
  if (process.argv.includes('--workspace-artifact-regeneration')) {
    if (process.argv.length !== 3) {
      exitWithError(
        new Error('--workspace-artifact-regeneration is a focused wizard + fresh regular-workbench route; do not combine flags.')
      );
      return;
    }
    beginDirectRegenerationEvidence();
    runVscodeTest(['--label', 'createWorkspaceCoreMatrix'], {
      extraEnv: {
        LA_E2E_CLI_REQUIRE_WORKSPACE_REGENERATION: '1',
        LA_E2E_CLI_REQUIRE_WORKSPACE_CANCEL: '0',
        LA_E2E_CLI_CREATE_WORKSPACE_CASE: 'standard-stateful',
        LA_E2E_CLI_VALIDATE_DEPENDENCIES: '1',
        LA_E2E_STRICT_DEPENDENCY_VALIDATION: '1',
        LA_E2E_CLI_AUTO_START_DESIGN_TIME: '0',
        LA_E2E_CLI_MINIMAL_ACTIVATION: '0',
        LA_E2E_CLI_SKIP_ACTIVATION_WORKSPACE_ENSURE: '0',
      },
    })
      .then((code) => process.exit(code))
      .catch(exitWithError);
    return;
  }
  if (process.argv.includes('--workspace-multi-root')) {
    if (process.argv.length !== 3) {
      exitWithError(new Error('--workspace-multi-root is a focused official-wizard + real-reload family; do not combine flags.'));
      return;
    }
    if (process.env.LA_E2E_CLI_BATCH_MODE !== '1' && process.env.LA_E2E_CLI_DIRECT_WRAPPED_SUITE !== 'workspaceMultiRoot') {
      runDirectRegisteredSuite(SUITE_REGISTRY.workspaceMultiRoot)
        .then((code) => process.exit(code))
        .catch(exitWithError);
      return;
    }
    require('./workspace-multi-root')
      .runWorkspaceMultiRoot({ runVscodeTest, collectVscodeProfileLogs, writeSuitePhaseResult })
      .then((code) => process.exit(code))
      .catch(exitWithError);
    return;
  }
  if (process.argv.includes('--workspace-prompt-cancel')) {
    if (process.argv.length !== 3) {
      exitWithError(new Error('--workspace-prompt-cancel is a focused setup + regular UI route; do not combine it with other flags.'));
      return;
    }
    runVscodeTest(['--label', 'createWorkspaceCoreMatrix'], {
      extraEnv: { LA_E2E_CLI_REQUIRE_WORKSPACE_CANCEL: '1', LA_E2E_CLI_CREATE_WORKSPACE_CASE: 'standard-stateful' },
    })
      .then((code) => process.exit(code))
      .catch(exitWithError);
    return;
  }
  const {
    args,
    azureAuthWarmup,
    codefulDebugTasks,
    createWorkspaceFull,
    msnWeatherLifecycle,
    nugetConversionLifecycle,
    statelessVariablesLifecycle,
    suites,
    variablesPickerLifecycle,
    visibleDelayMs,
    workspaceLifecycle,
  } = parseArgs(process.argv.slice(2));

  if (
    statelessVariablesLifecycle &&
    (azureAuthWarmup ||
      codefulDebugTasks ||
      createWorkspaceFull ||
      msnWeatherLifecycle ||
      nugetConversionLifecycle ||
      variablesPickerLifecycle ||
      workspaceLifecycle ||
      suites !== undefined ||
      args.length > 0)
  ) {
    exitWithError(new Error('--stateless-variables-lifecycle is a focused bootstrap/create/reopen family; do not combine selectors.'));
  } else if (
    suites !== undefined &&
    (azureAuthWarmup ||
      codefulDebugTasks ||
      createWorkspaceFull ||
      msnWeatherLifecycle ||
      nugetConversionLifecycle ||
      statelessVariablesLifecycle ||
      variablesPickerLifecycle ||
      workspaceLifecycle ||
      args.length > 0)
  ) {
    exitWithError(new Error('--suites cannot be combined with --label or lifecycle flags; select registered logical suite ids only.'));
  } else if (suites !== undefined) {
    runSuitesBatch(suites, visibleDelayMs)
      .then((code) => process.exit(code))
      .catch(exitWithError);
  } else if (azureAuthWarmup) {
    runAzureAuthWarmup(visibleDelayMs)
      .then((code) => process.exit(code))
      .catch(exitWithError);
  } else if (createWorkspaceFull) {
    runCreateWorkspaceFull(visibleDelayMs).catch(exitWithError);
  } else if (nugetConversionLifecycle) {
    runNugetConversionLifecycle(visibleDelayMs).catch(exitWithError);
  } else if (codefulDebugTasks) {
    runCodefulDebugTasks(visibleDelayMs).catch(exitWithError);
  } else if (msnWeatherLifecycle) {
    runMsnWeatherLifecycle(visibleDelayMs).catch(exitWithError);
  } else if (variablesPickerLifecycle) {
    runVariablesPickerLifecycle(visibleDelayMs).catch(exitWithError);
  } else if (statelessVariablesLifecycle) {
    if (process.env.LA_E2E_CLI_SUITE_WRAPPER_CHILD === '1') {
      runStatelessVariablesLifecycle(visibleDelayMs).catch(exitWithError);
    } else {
      runDirectFamily('statelessVariablesLifecycle', visibleDelayMs)
        .then((code) => process.exit(code))
        .catch(exitWithError);
    }
  } else if (workspaceLifecycle) {
    runWorkspaceLifecycle(visibleDelayMs).catch(exitWithError);
  } else if (args.length === 0) {
    runDefaultBaseline(visibleDelayMs).catch(exitWithError);
  } else if (getCreateWorkspaceMatrixCaseLabels(args)) {
    runCreateWorkspaceMatrixCases(args, visibleDelayMs).catch(exitWithError);
  } else {
    runVscodeTest(args, { visibleDelayMs })
      .then((code) => process.exit(code))
      .catch(exitWithError);
  }
}

function exitWithError(error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function requiresDirectFamilyWrapper(env = process.env) {
  return env.LA_E2E_CLI_SUITE_WRAPPER_CHILD !== '1';
}

async function runSuitesBatch(suitesValue, visibleDelayMs) {
  const suites = normalizeSuiteSelection(suitesValue, { platform: process.platform });
  const batchRoot = createBatchRoot({ batchRoot: process.env.LA_E2E_CLI_BATCH_ROOT });
  const resultsDir = path.resolve(process.env.LA_E2E_CLI_BATCH_RESULTS_DIR || path.join(batchRoot, 'results'));
  const seedDir = resolvePreparedExtensionsSeed();
  fs.mkdirSync(resultsDir, { recursive: true });

  console.log(`[batch] Starting ${suites.length} suite(s) on ${process.platform}: ${suites.map((suite) => suite.id).join(', ')}`);
  console.log(`[batch] Batch root: ${batchRoot}`);
  console.log(`[batch] Prepared extensions seed: ${seedDir}`);

  const aggregate = await runBatchSuites({
    suites,
    batchRoot,
    seedDir,
    diagnosticOnly: isEnabledEnv(process.env.LA_E2E_CLI_BATCH_DIAGNOSTIC_ONLY),
    trustedFullExecution: isEnabledEnv(process.env.LA_E2E_CLI_BATCH_TRUSTED_FULL_EXECUTION),
    admissionContext: readJsonIfExists(process.env.LA_E2E_CLI_ADMISSION_CONTEXT_PATH),
    cohortId: process.env.LA_E2E_CLI_BATCH_COHORT_ID,
    runSuite: ({ suite, context, env, timeoutMs }) => runSuiteWrapperProcess({ suite, context, env, visibleDelayMs, timeoutMs }),
  });
  fs.writeFileSync(path.join(resultsDir, 'e2e-cli-batch-result.json'), `${JSON.stringify(aggregate, null, 2)}\n`);
  writeBatchJUnitResults(resultsDir, aggregate);
  console.log(`[batch] Wrote aggregate result: ${path.join(resultsDir, 'e2e-cli-batch-result.json')}`);

  if (aggregate.aggregateOutcome !== 'success') {
    console.error(
      `[batch] Failed. failedSuites=${aggregate.failedSuites.join(',') || '<none>'} blockedSuites=${
        aggregate.blockedSuites.join(',') || '<none>'
      } complete=${aggregate.complete} fullRollup=${aggregate.fullRollup}`
    );
    return 1;
  }

  function isEnabledEnv(value) {
    return value === '1' || String(value).toLowerCase() === 'true';
  }

  console.log('[batch] All expected suites completed successfully.');
  return 0;
}

function writeBatchJUnitResults(resultsDir, aggregate) {
  const suiteResults = Array.isArray(aggregate.suites) ? aggregate.suites : [];
  for (const suite of suiteResults) {
    fs.writeFileSync(path.join(resultsDir, `${sanitizeEnvSegment(suite.id)}.junit.xml`), buildBatchSuiteJUnitXml(suite));
  }
  fs.writeFileSync(path.join(resultsDir, 'e2e-cli-batch-result.junit.xml'), buildBatchAggregateJUnitXml(aggregate));
}

function buildBatchSuiteJUnitXml(suite) {
  const failed = suite.finalOutcome !== 'success';
  const failure = failed
    ? [
        `    <failure message="${escapeXml(suite.reason ?? suite.finalOutcome ?? 'suite failed')}">`,
        escapeXml(JSON.stringify(suite, null, 2)),
        '    </failure>',
      ]
    : [];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuite name="${escapeXml(suite.id)}" tests="1" failures="${failed ? 1 : 0}" skipped="${suite.finalOutcome === 'blocked' ? 1 : 0}">`,
    `  <testcase classname="@vscode/test-cli.batch" name="${escapeXml(suite.id)}">`,
    ...failure,
    '  </testcase>',
    '</testsuite>',
    '',
  ].join('\n');
}

function buildBatchAggregateJUnitXml(aggregate) {
  const suites = Array.isArray(aggregate.suites) ? aggregate.suites : [];
  const failures =
    suites.filter((suite) => suite.finalOutcome !== 'success').length + (aggregate.fullRollup ? 0 : aggregate.diagnosticOnly ? 0 : 0);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuites name="@vscode/test-cli batch" tests="${suites.length}" failures="${failures}">`,
    ...suites.map((suite) => buildBatchSuiteJUnitXml(suite).split('\n').slice(1, -1).join('\n')),
    '</testsuites>',
    '',
  ].join('\n');
}

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** Shared direct-family entry point. Native work stays in the existing suite
 * wrapper; this caller never invents a successful process-cleanup observation. */
async function runDirectFamily(suiteId, visibleDelayMs, options = {}) {
  const suite = SUITE_REGISTRY[suiteId];
  if (!suite) {
    throw new Error('Direct family wrapper requires a registered suite');
  }
  const resultsDir = path.resolve(options.resultsDir || path.join(__dirname, '..', '.vscode-test', 'results'));
  fs.mkdirSync(resultsDir, { recursive: true });
  const batchRoot = createBatchRoot({ batchRoot: options.batchRoot || process.env.LA_E2E_CLI_BATCH_ROOT });
  const context = {
    ...createSuiteContext({ batchRoot, suite, index: 0, total: 1 }),
    directFamily: true,
    transientCleanupVerified: false,
    terminalResultPath: path.join(resultsDir, `${suiteId}.terminal-result.json`),
    cleanupLedgerPath: path.join(resultsDir, `${suiteId}.cleanup-ledger.json`),
  };
  // Fresh unique phase journal and label-specific receipts, even when callers
  // inherited an old JSONL or a previously successful terminal artifact.
  fs.writeFileSync(context.phaseResultsPath, '');
  writeSuiteTerminalResult(
    { LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH: context.terminalResultPath },
    {
      suiteId,
      label: suiteId,
      complete: false,
      lifecycleFinalized: false,
      cleanupVerified: false,
      exitCode: null,
      phaseResults: [],
      expectedPhaseIds: context.expectedPhaseIds,
    }
  );
  writeSuiteCleanupLedger(
    { LA_E2E_CLI_SUITE_CLEANUP_LEDGER_PATH: context.cleanupLedgerPath },
    {
      suiteId,
      verified: false,
      processTreeVerified: false,
      phases: [],
    }
  );
  const seedDir = resolvePreparedExtensionsSeed(options.seedDir);
  const execute = async () => {
    try {
      prepareSuiteExtensionsDirectory({ seedDir, targetDir: context.extensionsDir });
      // Same approved WIF/token scope as the canonical MSN/batch lane. No
      // ambient Azure CLI fallback, new grants, or resource creation.
      const credentials = await getSuiteScopedCredentialEnv(process.env, suite, options.timeoutMs || 45 * 60 * 1000);
      const env = buildSuiteEnvironment(process.env, context, credentials);
      return await runSuiteWrapperProcess({
        suite,
        context,
        env,
        visibleDelayMs,
        timeoutMs: options.timeoutMs || 45 * 60 * 1000,
        ...(options.scriptPath ? { scriptPath: options.scriptPath } : {}),
      });
    } catch (error) {
      console.error(
        `[${suite.id}] Failed to prepare isolated direct-family execution: ${error instanceof Error ? error.message : String(error)}`
      );
      return {
        exitCode: null,
        signal: null,
        error,
        processCleanup: {
          verified: false,
          error: 'Suite wrapper process observation was not completed',
        },
      };
    }
  };
  const result = await execute();
  let error = result.error;
  if (result.processCleanup?.verified === true && result.exitCode === 0 && !result.signal && !error) {
    try {
      cleanupSuiteTransientRoots(context);
      context.transientCleanupVerified = true;
    } catch (cleanupError) {
      error = cleanupError;
    }
  }
  context.directFinalizationComplete = true;
  writeSuiteFinalEvidence({ ...result, context, suite, error });
  const terminal = readJsonIfExists(context.terminalResultPath);
  return terminal?.complete === true && context.transientCleanupVerified && !error ? 0 : 1;
}

function resolvePreparedExtensionsSeed(explicitSeedDir) {
  return path.resolve(
    explicitSeedDir ||
      process.env.LA_E2E_CLI_PREPARED_EXTENSIONS_DIR ||
      process.env.LA_E2E_CLI_EXTENSIONS_DIR ||
      path.join(__dirname, '..', '.vscode-test', 'extensions')
  );
}

function sanitizeInheritedGitCommandConfigEnv(env) {
  return Object.fromEntries(
    Object.entries(env).filter(([key]) => {
      if (key === 'GIT_CONFIG_COUNT' || key === 'GIT_CONFIG_PARAMETERS') {
        return false;
      }

      return !/^GIT_CONFIG_(KEY|VALUE)_\d+$/.test(key);
    })
  );
}

// Direct ADO selectors need the SAME outer process/phase finalization as batch
// execution, but at the stable direct-consumer report paths. This does not
// fabricate a process cleanup result or promote a family's exit code to proof.
async function runDirectRegisteredSuite(
  suite,
  { env = process.env, reportRoot = path.resolve(__dirname, '..', '.vscode-test', 'results'), runWrapper = runSuiteWrapperProcess } = {}
) {
  if (!suite || SUITE_REGISTRY[suite.id] !== suite) {
    throw new Error('Direct supplementary execution requires an exact registered suite');
  }
  fs.mkdirSync(reportRoot, { recursive: true });
  const invocation = require('crypto').randomUUID();
  const context = {
    id: suite.id,
    startedAt: new Date().toISOString(),
    expectedPhaseIds: [...suite.expectedPhases],
    phaseResultsPath: path.join(reportRoot, `${suite.id}.phases-${invocation}.jsonl`),
    cleanupLedgerPath: path.join(reportRoot, `${suite.id}.cleanup-ledger.json`),
    terminalResultPath: path.join(reportRoot, `${suite.id}.terminal-result.json`),
  };
  const provenancePath = path.join(reportRoot, `${suite.id}.terminal-invocation.json`);
  const provenance = {
    schemaVersion: 1,
    suiteId: suite.id,
    invocation,
    startedAt: context.startedAt,
    identity: { source: env.BUILD_SOURCEVERSION || 'local', run: env.BUILD_BUILDID || 'local', job: env.SYSTEM_JOBID || 'local' },
    expectedPhaseIds: context.expectedPhaseIds,
    phaseResultsPath: context.phaseResultsPath,
    cleanupLedgerPath: context.cleanupLedgerPath,
    terminalResultPath: context.terminalResultPath,
  };
  // Invalidate an earlier success BEFORE child launch or native preflight.
  writeSuiteTerminalResult(
    { LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH: context.terminalResultPath },
    {
      suiteId: suite.id,
      complete: false,
      lifecycleFinalized: false,
      exitCode: null,
      signal: null,
      cleanupVerified: false,
      originalProcessClosureVerified: false,
      processClosureProof: 'original-identities-unverified',
      diagnosticsError: 'direct-invocation-not-finalized',
      phaseCompleteness: false,
      expectedPhaseIds: context.expectedPhaseIds,
      observedPhaseIds: [],
      missingPhaseIds: context.expectedPhaseIds,
      unexpectedPhaseIds: [],
      duplicatePhaseIds: [],
      blockedPhaseIds: [],
      phaseResults: [],
    }
  );
  writeSuiteCleanupLedger(
    { LA_E2E_CLI_SUITE_CLEANUP_LEDGER_PATH: context.cleanupLedgerPath },
    {
      schemaVersion: 1,
      suiteId: suite.id,
      verified: false,
      invocation,
      reason: 'direct-invocation-not-finalized',
    }
  );
  fs.writeFileSync(provenancePath, JSON.stringify(provenance, null, 2));
  const result = await runWrapper({
    suite,
    context,
    timeoutMs: 45 * 60 * 1000,
    env: { ...env, LA_E2E_CLI_DIRECT_WRAPPED_SUITE: suite.id },
  });
  // The general wrapper writes the terminal only after its child closes and
  // verifyNoOwnedDescendants actually observes cleanup. Reopen phase proof
  // separately covers original Code closure, diagnostics and fixture absence.
  const terminal = readJsonIfExists(context.terminalResultPath);
  const cleanup = readJsonIfExists(context.cleanupLedgerPath);
  const exact = (value) => JSON.stringify(value) === JSON.stringify(context.expectedPhaseIds);
  const phases = terminal?.phaseResults;
  const accepted =
    result.exitCode === 0 &&
    !result.signal &&
    !result.error &&
    terminal?.suiteId === suite.id &&
    terminal.complete === true &&
    terminal.lifecycleFinalized === true &&
    terminal.exitCode === 0 &&
    terminal.originalProcessClosureVerified === true &&
    terminal.processClosureProof === 'retained-original-identities' &&
    terminal.signal === null &&
    terminal.cleanupVerified === true &&
    terminal.diagnosticsError === '' &&
    terminal.phaseCompleteness === true &&
    exact(terminal.expectedPhaseIds) &&
    exact(terminal.observedPhaseIds) &&
    ['missingPhaseIds', 'unexpectedPhaseIds', 'duplicatePhaseIds', 'blockedPhaseIds'].every(
      (key) => Array.isArray(terminal[key]) && terminal[key].length === 0
    ) &&
    Array.isArray(phases) &&
    exact(phases.map((phase) => phase.phaseId)) &&
    phases.every(
      (phase) =>
        phase.complete === true &&
        phase.exitCode === 0 &&
        phase.signal === null &&
        phase.cleanupVerified === true &&
        phase.diagnosticsError === ''
    ) &&
    cleanup?.schemaVersion === 1 &&
    cleanup.verified === true &&
    cleanup.processTreeVerified === true &&
    cleanup.processCleanup?.verified === true;
  provenance.finalizedAt = new Date().toISOString();
  provenance.accepted = accepted;
  fs.writeFileSync(provenancePath, JSON.stringify(provenance, null, 2));
  return accepted ? 0 : 1;
}

function runSuiteWrapperProcess({ suite, context, env, visibleDelayMs, timeoutMs, scriptPath = __filename }) {
  const childArgs = [scriptPath, ...suite.args, ...(visibleDelayMs ? ['--visible-delay-ms', String(visibleDelayMs)] : [])];
  console.log(`[batch] Running suite ${suite.id}: ${process.execPath} ${childArgs.map((arg) => JSON.stringify(arg)).join(' ')}`);
  const childEnv = sanitizeInheritedGitCommandConfigEnv({
    ...env,
    LA_E2E_CLI_SUITE_WRAPPER_CHILD: '1',
    LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH: context.terminalResultPath,
    LA_E2E_CLI_SUITE_CLEANUP_LEDGER_PATH: context.cleanupLedgerPath,
    LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH: context.phaseResultsPath,
  });
  let launch;
  try {
    launch = spawnContainedSuiteProcess({
      childArgs,
      cwd: path.resolve(__dirname, '..'),
      env: childEnv,
      reportsRoot: context.reportsRoot,
    });
  } catch (error) {
    const processCleanup = {
      schemaVersion: 1,
      verified: false,
      retainedOriginalIdentitiesVerified: false,
      containmentEstablished: false,
      error: error instanceof Error ? error.message : String(error),
      checkedAt: new Date().toISOString(),
    };
    writeSuiteFinalEvidence({ context, suite, exitCode: null, signal: null, output: '', error, processCleanup });
    return Promise.resolve({ exitCode: null, signal: null, error, output: '', processCleanup });
  }
  const { child, containmentReceiptPath } = launch;

  let output = '';
  let timedOut = false;
  let settled = false;
  let forceKillTimeout;
  let parentSignal;
  const requestContainmentTermination = () => {
    terminateContainmentHost(child, 'SIGTERM');
    clearTimeout(forceKillTimeout);
    const forceKillDelayMs = process.platform === 'linux' ? 12_000 : 5000;
    forceKillTimeout = setTimeout(() => {
      if (!settled) {
        terminateContainmentHost(child, 'SIGKILL');
      }
    }, forceKillDelayMs).unref();
  };
  const timeout = setTimeout(() => {
    timedOut = true;
    requestContainmentTermination();
  }, timeoutMs).unref();

  const forwardSignal = (signal) => {
    if (settled) {
      return;
    }
    parentSignal = signal;
    appendOutput(`\n[batch] Parent received ${signal}; terminating suite process tree.\n`);
    requestContainmentTermination();
  };
  process.once('SIGINT', forwardSignal);
  process.once('SIGTERM', forwardSignal);

  const appendOutput = (text) => {
    output += text;
    if (output.length > 2 * 1024 * 1024) {
      output = output.slice(-2 * 1024 * 1024);
    }
  };
  const stdoutPrefixer = createLinePrefixer(`[${suite.id}] `, (text) => process.stdout.write(text));
  const stderrPrefixer = createLinePrefixer(`[${suite.id}] `, (text) => process.stderr.write(text));

  child.stdout.on('data', (data) => {
    const text = data.toString();
    appendOutput(text);
    stdoutPrefixer.push(text);
  });
  child.stderr.on('data', (data) => {
    const text = data.toString();
    appendOutput(text);
    stderrPrefixer.push(text);
  });

  return new Promise((resolve) => {
    child.on('error', (error) => {
      stdoutPrefixer.flush();
      stderrPrefixer.flush();
      clearTimeout(timeout);
      clearTimeout(forceKillTimeout);
      settled = true;
      process.off('SIGINT', forwardSignal);
      process.off('SIGTERM', forwardSignal);
      fs.rmSync(containmentReceiptPath, { force: true });
      const processCleanup = { verified: false, error: error.message };
      writeSuiteFinalEvidence({
        context,
        suite,
        exitCode: null,
        signal: null,
        output,
        error,
        processCleanup,
      });
      resolve({ exitCode: null, signal: null, error, output, processCleanup });
    });
    child.on('close', async (exitCode, signal) => {
      if (settled) {
        return;
      }
      clearTimeout(timeout);
      clearTimeout(forceKillTimeout);
      settled = true;
      stdoutPrefixer.flush();
      stderrPrefixer.flush();
      process.off('SIGINT', forwardSignal);
      process.off('SIGTERM', forwardSignal);
      const processCleanup = readContainmentReceipt(containmentReceiptPath, exitCode, signal);
      fs.rmSync(containmentReceiptPath, { force: true });
      const reportedExitCode = processCleanup.verified ? processCleanup.rootExitCode : exitCode;
      const reportedSignal = processCleanup.verified ? processCleanup.rootSignal : signal;
      const error = timedOut
        ? new Error(`suite timed out after ${timeoutMs}ms`)
        : processCleanup.error
          ? new Error(processCleanup.error)
          : undefined;
      writeSuiteFinalEvidence({
        context,
        suite,
        exitCode: reportedExitCode,
        signal: reportedSignal,
        output,
        error,
        processCleanup,
      });
      if (parentSignal) {
        process.exit(1);
      } else {
        resolve({ exitCode: reportedExitCode, signal: reportedSignal, output, error, processCleanup });
      }
    });
  });
}

function createLinePrefixer(prefix, write) {
  let pending = '';
  return Object.freeze({
    push(value) {
      pending += String(value ?? '');
      let newline;
      while ((newline = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, newline + 1);
        pending = pending.slice(newline + 1);
        write(`${prefix}${line}`);
      }
    },
    flush() {
      if (pending) {
        write(`${prefix}${pending}`);
        pending = '';
      }
    },
  });
}

function getContainmentHost() {
  if (!['linux', 'win32'].includes(process.platform)) {
    throw new Error(`Unsupported suite containment platform: ${process.platform}`);
  }
  const extension = process.platform === 'win32' ? 'cs' : 'c';
  const sourcePath = path.join(__dirname, `e2e-cli-containment-host.${extension}`);
  const source = fs.readFileSync(sourcePath);
  const sourceHash = createHash('sha256').update(source).digest('hex');
  const buildRoot = path.join(os.tmpdir(), 'logicappsux-e2e-containment', sourceHash);
  const hostPath = path.join(buildRoot, process.platform === 'win32' ? 'e2e-cli-containment-host.exe' : 'e2e-cli-containment-host');
  if (fs.existsSync(hostPath)) {
    return hostPath;
  }
  fs.mkdirSync(buildRoot, { recursive: true });
  if (process.platform === 'win32') {
    const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;
    execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `Add-Type -Path ${quote(sourcePath)} -OutputAssembly ${quote(hostPath)} -OutputType ConsoleApplication`,
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000 }
    );
  } else {
    execFileSync(process.env.CC || 'cc', ['-O2', '-Wall', '-Wextra', sourcePath, '-o', hostPath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120_000,
    });
    fs.chmodSync(hostPath, 0o755);
  }
  if (!fs.existsSync(hostPath)) {
    throw new Error(`Suite containment host was not created: ${hostPath}`);
  }
  return hostPath;
}

function spawnContainedSuiteProcess({ childArgs, cwd, env, reportsRoot }) {
  const hostPath = getContainmentHost();
  const containmentReceiptPath = path.join(
    os.tmpdir(),
    'logicappsux-e2e-containment-receipts',
    `${path.basename(reportsRoot)}-${process.pid}-${randomUUID()}.json`
  );
  fs.mkdirSync(path.dirname(containmentReceiptPath), { recursive: true });
  const child = spawn(hostPath, [containmentReceiptPath, process.execPath, ...childArgs], {
    env,
    cwd,
  });
  return { child, containmentReceiptPath };
}

function readContainmentReceipt(receiptPath, hostExitCode, hostSignal) {
  const expectedMechanism = process.platform === 'win32' ? 'windows-job-object' : process.platform === 'linux' ? 'linux-subreaper' : '';
  try {
    const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
    const escapedDescendants = Array.isArray(receipt.escapedDescendants) ? receipt.escapedDescendants : [];
    const rootSignalNumber = receipt.rootSignal === null ? null : signalNumber(receipt.rootSignal);
    const expectedHostExitCode = rootSignalNumber === null ? receipt.rootExitCode : rootSignalNumber ? 128 + rootSignalNumber : undefined;
    const hostOutcomeMatches = Number.isInteger(expectedHostExitCode) && hostSignal === null && hostExitCode === expectedHostExitCode;
    const receiptShapeValid =
      receipt.schemaVersion === 1 &&
      receipt.mechanism === expectedMechanism &&
      receipt.containmentEstablished === true &&
      Number.isSafeInteger(receipt.rootPid) &&
      receipt.rootPid > 0 &&
      Number.isInteger(receipt.rootExitCode) &&
      (receipt.rootSignal === null || Number.isInteger(rootSignalNumber));
    const containmentEmpty =
      receipt.containmentEmpty === true &&
      receipt.retainedOriginalIdentitiesVerified === true &&
      escapedDescendants.length === 0 &&
      (!Number.isInteger(receipt.activeContainedProcessCount) || receipt.activeContainedProcessCount === 0);
    const verified = receiptShapeValid && containmentEmpty && hostOutcomeMatches;
    const verificationError = !receiptShapeValid
      ? 'Suite ownership containment receipt was malformed'
      : !containmentEmpty
        ? 'Suite ownership containment was not empty after the wrapper root closed'
        : `Suite containment receipt did not match host outcome: host=${hostExitCode ?? hostSignal}, receipt=${expectedHostExitCode}`;
    return {
      ...receipt,
      verified,
      retainedOriginalIdentitiesVerified: verified,
      checkedAt: new Date().toISOString(),
      ...(verified ? {} : { error: verificationError }),
    };
  } catch (error) {
    return {
      schemaVersion: 1,
      verified: false,
      retainedOriginalIdentitiesVerified: false,
      containmentEstablished: false,
      error: `Suite ownership containment receipt unavailable: ${error instanceof Error ? error.message : String(error)}`,
      checkedAt: new Date().toISOString(),
    };
  }
}

function signalNumber(signal) {
  const signals = {
    SIGHUP: 1,
    SIGABRT: 6,
    SIGINT: 2,
    SIGKILL: 9,
    SIGSEGV: 11,
    SIGTERM: 15,
  };
  return signals[signal];
}

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return undefined;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeSuiteFinalEvidence({ context, suite, exitCode, signal, error, processCleanup, phaseResults: suppliedPhases }) {
  const retainedCaseEvidence = suite.id === 'msnWeatherLifecycle' ? readJsonIfExists(context.terminalResultPath) : undefined;
  const retainedMsnCleanupVerified =
    retainedCaseEvidence?.label === 'msnWeatherLifecycle' &&
    retainedCaseEvidence.complete === true &&
    retainedCaseEvidence.lifecycleFinalized === true &&
    retainedCaseEvidence.cleanupVerified === true &&
    retainedCaseEvidence.filesystemCleanupVerified === true &&
    retainedCaseEvidence.lifecycleBodySucceeded === true &&
    retainedCaseEvidence.phaseCompleteness === true;
  const retainedCaseCleanupBlocked =
    suite.id === 'workspaceMultiRoot' || (suite.id === 'msnWeatherLifecycle' && !retainedMsnCleanupVerified);
  const retainedCaseCleanupError =
    suite.id === 'workspaceMultiRoot'
      ? require('./workspace-multi-root').nativeCleanupBlocker
      : suite.id === 'msnWeatherLifecycle'
        ? 'MSN cleanup blocked: original process identity closure is unverified; exact workspace and dependency roots retained'
        : '';
  const originalProcessClosureVerified = !retainedCaseCleanupBlocked && processCleanup.retainedOriginalIdentitiesVerified === true;
  const processClosureProof = originalProcessClosureVerified ? 'retained-original-identities' : 'original-identities-unverified';
  const readJournal = () => {
    if (suppliedPhases) {
      return { phases: suppliedPhases, error: '' };
    }
    try {
      return { phases: readJsonLinesIfExists(context.phaseResultsPath), error: '' };
    } catch (journalError) {
      if (!context.directFamily) {
        throw journalError;
      }
      return { phases: [], error: 'Invalid direct family phase journal' };
    }
  };
  const journal = readJournal();
  const phaseResults = journal.phases;
  const observedPhaseIds = phaseResults.map((phase) => phase.phaseId).filter(Boolean);
  const expectedPhaseIds = context.expectedPhaseIds ?? [];
  const missingPhaseIds = expectedPhaseIds.filter((phaseId) => !observedPhaseIds.includes(phaseId));
  const unexpectedPhaseIds = observedPhaseIds.filter((phaseId) => !expectedPhaseIds.includes(phaseId));
  const duplicatePhaseIds = getDuplicateValues(observedPhaseIds);
  const blockedPhaseIds = exitCode === 0 ? [] : missingPhaseIds;
  const phaseDiagnosticsErrors = phaseResults
    .map((phase) => phase.diagnosticsError)
    .filter((diagnosticsError) => typeof diagnosticsError === 'string' && diagnosticsError.trim());
  const phaseCleanupVerified = phaseResults.every((phase) => phase.cleanupVerified === true);
  const phaseCompleteness =
    (suite.id !== 'workspaceArtifactRegeneration' || expectedPhaseIds.every((phaseId, index) => observedPhaseIds[index] === phaseId)) &&
    unexpectedPhaseIds.length === 0 &&
    duplicatePhaseIds.length === 0 &&
    (missingPhaseIds.length === 0 || blockedPhaseIds.length > 0) &&
    phaseResults.length > 0;
  const lifecycleSucceeded =
    ![
      'msnWeatherLifecycle',
      'httpTimeoutComposeOriginal',
      'httpTimeoutLifecycle',
      'createWorkspaceCoreMatrix',
      'statelessVariablesLifecycle',
      'workspaceArtifactRegeneration',
      'workspaceMultiRoot',
    ].includes(suite.id) ||
    (exitCode === 0 &&
      (signal === null || signal === undefined) &&
      missingPhaseIds.length === 0 &&
      phaseResults.length === expectedPhaseIds.length &&
      (suite.id !== 'httpTimeoutLifecycle' || expectedPhaseIds.every((phaseId, index) => observedPhaseIds[index] === phaseId)) &&
      phaseResults.every(
        (phase) => phase.complete === true && phase.exitCode === 0 && (phase.signal === null || phase.signal === undefined)
      ));
  const statelessSucceeded =
    suite.id !== 'statelessVariablesLifecycle' || (exitCode === 0 && !signal && getDirectSuiteComplete(suite.id, phaseResults));
  const directSucceeded =
    !context.directFamily ||
    (exitCode === 0 &&
      !signal &&
      context.transientCleanupVerified === true &&
      observedPhaseIds.length === expectedPhaseIds.length &&
      observedPhaseIds.every((phaseId, index) => phaseId === expectedPhaseIds[index]) &&
      phaseResults.every((phase) => phase.complete === true && phase.exitCode === 0 && !phase.signal));
  const terminalComplete =
    phaseCompleteness &&
    phaseCleanupVerified &&
    !retainedCaseCleanupBlocked &&
    processCleanup.verified === true &&
    !error &&
    !journal.error &&
    phaseDiagnosticsErrors.length === 0 &&
    lifecycleSucceeded &&
    statelessSucceeded &&
    directSucceeded &&
    (!context.invocation || (context.provenanceVerified === true && context.ownedRootCleanup?.verified === true));
  const finalizedPhaseResults = terminalComplete ? phaseResults : phaseResults.map(clearOgfScenarios);
  const ogfScenarios = terminalComplete ? collectOgfScenarios(finalizedPhaseResults) : [];
  const cleanupLedger = {
    originalProcessClosureVerified,
    processClosureProof,
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    suiteId: suite.id,
    expectedPhaseIds,
    observedPhaseIds,
    missingPhaseIds,
    unexpectedPhaseIds,
    duplicatePhaseIds,
    blockedPhaseIds,
    phaseCleanupVerified,
    processTreeVerified: processCleanup.verified === true && !retainedCaseCleanupBlocked,
    processCleanup: retainedCaseCleanupBlocked
      ? { verified: false, error: retainedCaseCleanupError, postExitAncestryObservation: processCleanup }
      : processCleanup,
    verified:
      phaseCompleteness &&
      phaseCleanupVerified &&
      processCleanup.verified === true &&
      !retainedCaseCleanupBlocked &&
      (!context.invocation || (context.provenanceVerified === true && context.ownedRootCleanup?.verified === true)) &&
      (!context.directFamily || directSucceeded),
    ...(context.directFamily ? { transientCleanupVerified: context.transientCleanupVerified === true } : {}),
    ...(suite.id === 'msnWeatherLifecycle'
      ? { filesystemCleanupVerified: retainedMsnCleanupVerified, retainedCaseCleanupVerified: retainedMsnCleanupVerified }
      : {}),
    ...(retainedCaseCleanupBlocked ? { retainedCaseCleanupVerified: false, retainedCaseCleanupError } : {}),
    phases: finalizedPhaseResults,
    ...(context.invocation ? { invocation: context.invocation, ownedRootCleanup: context.ownedRootCleanup } : {}),
  };
  const terminalResult = {
    originalProcessClosureVerified,
    processClosureProof,
    suiteId: suite.id,
    ...(context.directFamily ? { label: suite.id, phaseJournalPath: context.phaseResultsPath } : {}),
    exitCode: context.directFamily && !terminalComplete ? 1 : exitCode,
    signal,
    cleanupVerified: cleanupLedger.verified,
    ...(suite.id === 'msnWeatherLifecycle'
      ? {
          lifecycleBodySucceeded:
            expectedPhaseIds.length === phaseResults.length &&
            expectedPhaseIds.every((phaseId, index) => phaseResults[index].phaseId === phaseId) &&
            phaseResults.every((phase) =>
              phase.phaseId === 'msnWeatherLifecycle:run'
                ? phase.bodyAssertionsPassed === true
                : phase.complete === true && phase.exitCode === 0 && !phase.signal
            ),
          filesystemCleanupVerified: retainedMsnCleanupVerified,
        }
      : {}),
    diagnosticsError: [
      error instanceof Error ? error.message : String(error || ''),
      journal.error,
      ...phaseDiagnosticsErrors,
      retainedCaseCleanupBlocked ? retainedCaseCleanupError : '',
    ]
      .filter(Boolean)
      .join('\n'),
    expectedPhaseIds,
    observedPhaseIds,
    missingPhaseIds,
    unexpectedPhaseIds,
    duplicatePhaseIds,
    blockedPhaseIds,
    phaseCompleteness,
    complete: terminalComplete,
    ...(context.invocation
      ? { label: suite.id, invocation: context.invocation, provenanceVerified: context.provenanceVerified === true }
      : {}),
    ...([
      'msnWeatherLifecycle',
      'httpTimeoutComposeOriginal',
      'httpTimeoutLifecycle',
      'createWorkspaceCoreMatrix',
      'statelessVariablesLifecycle',
      'workspaceArtifactRegeneration',
      'workspaceMultiRoot',
    ].includes(suite.id) || context.directFamily
      ? {
          lifecycleFinalized: !context.directFamily || context.directFinalizationComplete === true,
          phaseResults: finalizedPhaseResults.map(projectTerminalPhase),
        }
      : {}),
    ...(ogfScenarios.length > 0 ? { ogfScenarios } : {}),
  };
  writeSuiteCleanupLedger({ LA_E2E_CLI_SUITE_CLEANUP_LEDGER_PATH: context.cleanupLedgerPath }, cleanupLedger);
  writeSuiteTerminalResult({ LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH: context.terminalResultPath }, terminalResult);
  return terminalResult;
}

function getDuplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates];
}

function readJsonLinesIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return [];
  }
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function terminateContainmentHost(child, signal) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return false;
  }
  try {
    return child.kill(signal);
  } catch {
    return false;
  }
}

function verifyNoOwnedDescendants(pid) {
  return getProcessTreePids(pid)
    .then((pids) => {
      const alivePids = pids.filter((candidate) => candidate !== process.pid && isPidAlive(candidate));
      return {
        schemaVersion: 1,
        verified: alivePids.length === 0,
        alivePids,
        checkedAt: new Date().toISOString(),
      };
    })
    .catch((error) => ({
      schemaVersion: 1,
      verified: false,
      error: error instanceof Error ? error.message : String(error),
      checkedAt: new Date().toISOString(),
    }));
}

function requiresDirectHttpPhaseClosure(env) {
  return !!env.LA_E2E_CLI_HTTP_TIMEOUT_COMPOSE_INVOCATION_ID && env.LA_E2E_CLI_SUITE_WRAPPER_CHILD !== '1';
}

function getProcessTreePids(pid) {
  if (!pid) {
    return Promise.resolve([]);
  }
  return Promise.resolve(getProcessTreePidsSync(pid));
}

function getProcessTreePidsSync(pid) {
  const parentPairs = getProcessParentPairs();
  const childrenByParent = new Map();
  for (const pair of parentPairs) {
    if (!childrenByParent.has(pair.parentPid)) {
      childrenByParent.set(pair.parentPid, []);
    }
    childrenByParent.get(pair.parentPid).push(pair.pid);
  }
  const pids = [];
  const stack = [pid];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!Number.isInteger(current) || pids.includes(current)) {
      continue;
    }
    pids.push(current);
    stack.push(...(childrenByParent.get(current) ?? []));
  }
  return pids;
}

function getProcessParentPairs() {
  if (process.platform === 'win32') {
    const output = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId | ConvertTo-Json -Compress',
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const parsed = JSON.parse(output);
    return (Array.isArray(parsed) ? parsed : [parsed])
      .map((entry) => ({ pid: Number(entry.ProcessId), parentPid: Number(entry.ParentProcessId) }))
      .filter((entry) => Number.isInteger(entry.pid) && Number.isInteger(entry.parentPid));
  }

  const output = execFileSync('ps', ['-eo', 'pid=,ppid='], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/).map(Number))
    .filter(([pidValue, parentPid]) => Number.isInteger(pidValue) && Number.isInteger(parentPid))
    .map(([pidValue, parentPid]) => ({ pid: pidValue, parentPid }));
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function runCreateWorkspaceFull(visibleDelayMs) {
  for (const label of ['createWorkspaceBehavior', 'createWorkspaceCoreMatrix', 'createWorkspacePreviewMatrix', 'createWorkspaceCodeful']) {
    const labelArgs = ['--label', label];
    if (getCreateWorkspaceMatrixCaseLabels(labelArgs)) {
      await runCreateWorkspaceMatrixCases(labelArgs, visibleDelayMs);
    } else {
      await runVscodeTest(labelArgs, { visibleDelayMs });
    }
  }
}

async function runCreateWorkspaceMatrixCases(args, visibleDelayMs) {
  const caseLabels = getCreateWorkspaceMatrixCaseLabels(args);
  const startedAt = Date.now();

  for (const [index, caseLabel] of caseLabels.entries()) {
    await runVscodeTest(args, {
      visibleDelayMs,
      extraEnv: {
        LA_E2E_CLI_CREATE_WORKSPACE_CASE: caseLabel,
        LA_E2E_CLI_USER_DATA_SUFFIX: `cw-${index + 1}-${Date.now().toString(36)}`,
      },
    });
  }

  console.log(`\n  ${caseLabels.length} passing (${formatDuration(Date.now() - startedAt)})`);
  return 0;
}

async function runAzureAuthWarmup(visibleDelayMs) {
  ensureMsnWeatherProfile();
  return await runVscodeTest(['--label', 'azureAuthWarmup'], {
    visibleDelayMs: visibleDelayMs ?? '10000',
    extraEnv: {
      LA_E2E_CLI_INCLUDE_AZURE_AUTH_WARMUP: '1',
      LA_E2E_CLI_MINIMAL_ACTIVATION: '1',
    },
  });
}

async function runWorkspaceLifecycle(visibleDelayMs) {
  const lifecycleDir = getLifecycleArtifactDir('workspace-lifecycle');
  fs.mkdirSync(lifecycleDir, { recursive: true });
  const manifest = [];
  const workspaceParent = createOwnedWorkspaceParent('workspace-lifecycle');

  for (const label of ['standard', 'custom-code', 'rules-engine']) {
    const manifestPath = path.join(lifecycleDir, `manifest-${label}-${Date.now()}.json`);
    await runVscodeTest(['--label', 'workspaceLifecycle'], {
      visibleDelayMs,
      extraEnv: {
        LA_E2E_CLI_WORKSPACE_PARENT: workspaceParent,
        LA_E2E_CLI_INCLUDE_WORKSPACE_LIFECYCLE: '1',
        LA_E2E_CLI_USER_DATA_SUFFIX: `workspace-lifecycle-create-${sanitizeEnvSegment(label)}-${Date.now()}`,
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE: 'create',
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_CREATE_LABEL: label,
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_MANIFEST: manifestPath,
      },
    });
    manifest.push(...JSON.parse(fs.readFileSync(manifestPath, 'utf-8')));
  }

  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error('Workspace lifecycle setup did not write workspace entries');
  }

  for (const entry of manifest) {
    await runVscodeTest(['--label', 'workspaceLifecycle'], {
      visibleDelayMs,
      extraEnv: {
        LA_E2E_CLI_WORKSPACE_PARENT: workspaceParent,
        LA_E2E_CLI_INCLUDE_WORKSPACE_LIFECYCLE: '1',
        LA_E2E_CLI_USER_DATA_SUFFIX: `workspace-lifecycle-${sanitizeEnvSegment(entry.label)}-${Date.now()}`,
        LA_E2E_CLI_MINIMAL_ACTIVATION: '1',
        LA_E2E_CLI_SKIP_ACTIVATION_WORKSPACE_ENSURE: '1',
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE: 'run',
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE: JSON.stringify(entry),
        LA_E2E_CLI_STARTUP_RESOURCE: entry.appDir,
      },
    });
  }

  await cleanupOwnedWorkspaceParent(workspaceParent, 'workspace lifecycle');
}

async function runHttpTimeoutComposeOriginal({
  run = runVscodeTest,
  createParent = createOwnedWorkspaceParent,
  cleanup = cleanupOwnedWorkspaceParent,
  createRuntimeRoot = createIsolatedRuntimeDependenciesRoot,
  cleanupRuntime = cleanupRuntimeDependenciesRoot,
  observeClosure = verifyNoOwnedDescendants,
  credentialEnvironment = getSuiteScopedCredentialEnv,
  artifactDir = getLifecycleArtifactDir('http-timeout-compose-original'),
  resultsDir = path.join(process.cwd(), '.vscode-test', 'results'),
} = {}) {
  const invocation = { id: randomUUID(), startedAt: new Date().toISOString(), ownerPid: process.pid };
  const direct = process.env.LA_E2E_CLI_BATCH_MODE !== '1';
  const context = direct ? beginDirectHttpTimeoutComposeEvidence({ artifactDir, resultsDir, invocation }) : undefined;
  let lifecycleError;
  let ownedRootCleanup;
  try {
    const { selectHttpTimeoutComposeWorkspace } = require('../out/test/e2e/httpTimeoutComposeOracle');
    fs.mkdirSync(artifactDir, { recursive: true });
    const workspaceParent = createParent('http-timeout-compose-original');
    const notBefore = Date.now();
    const manifestPath = path.join(artifactDir, `manifest-stateless-${notBefore}.json`);
    const runtimeDependenciesRoot = process.env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT ?? createRuntimeRoot('httpTimeoutComposeOriginal');
    const phaseResultsPath = context?.phaseResultsPath ?? process.env.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH;
    const azureCredentialEnv = await credentialEnvironment(process.env, legacyHttpTimeoutComposeSuite, 45 * 60 * 1000);
    const commonEnv = {
      ...azureCredentialEnv,
      LA_E2E_CLI_HTTP_TIMEOUT_COMPOSE_INVOCATION_ID: invocation.id,
      LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT: runtimeDependenciesRoot,
      LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH: phaseResultsPath,
      LA_E2E_CLI_CREATE_WORKSPACE_PARENT: workspaceParent,
      LA_E2E_CLI_CREATE_WORKSPACE_FIXTURE_MANIFEST: manifestPath,
      LA_E2E_CLI_HTTP_TIMEOUT_COMPOSE_NOT_BEFORE: String(notBefore),
    };
    const bootstrapExit = await run(['--label', 'runtimeDependencyBootstrap'], {
      extraEnv: {
        ...commonEnv,
        LA_E2E_CLI_INCLUDE_RUNTIME_DEPENDENCY_BOOTSTRAP: '1',
        LA_E2E_CLI_MINIMAL_ACTIVATION: '1',
        LA_E2E_CLI_VALIDATE_DEPENDENCIES: '1',
        LA_E2E_CLI_USER_DATA_SUFFIX: `http-timeout-compose-bootstrap-${notBefore}`,
      },
    });
    if (bootstrapExit !== 0) {
      throw new Error('HTTP timeout Compose runtime dependency bootstrap host failed');
    }
    // Existing wizard fixture producer, one Standard Stateless case only.
    // The official CLI process must close successfully before the fresh reopen.
    const createExit = await run(['--label', 'createWorkspaceFixturesManifest'], {
      extraEnv: {
        ...commonEnv,
        LA_E2E_CLI_HTTP_TIMEOUT_COMPOSE_PHASE: 'create',
        LA_E2E_CLI_CREATE_WORKSPACE_CASE: 'standard-stateless',
        LA_E2E_CLI_USER_DATA_SUFFIX: `http-timeout-compose-create-${notBefore}`,
      },
    });
    if (createExit !== 0) {
      throw new Error('HTTP timeout Compose fixture host failed');
    }
    const entry = selectHttpTimeoutComposeWorkspace(JSON.parse(fs.readFileSync(manifestPath, 'utf8')), workspaceParent, notBefore);
    for (const requiredPath of [entry.wsFilePath, path.join(entry.wfDir, 'workflow.json')]) {
      if (!fs.existsSync(requiredPath)) {
        throw new Error(`HTTP timeout Compose generated fixture is missing: ${requiredPath}`);
      }
    }
    const runExit = await run(['--label', 'httpTimeoutComposeOriginal'], {
      extraEnv: {
        ...commonEnv,
        LA_E2E_CLI_HTTP_TIMEOUT_COMPOSE_PHASE: 'reopen',
        LA_E2E_CLI_INCLUDE_HTTP_TIMEOUT_COMPOSE_ORIGINAL: '1',
        LA_E2E_CLI_MINIMAL_ACTIVATION: '0',
        LA_E2E_CLI_VALIDATE_DEPENDENCIES: '1',
        LA_E2E_STRICT_DEPENDENCY_VALIDATION: '1',
        LA_E2E_CLI_SKIP_ACTIVATION_WORKSPACE_ENSURE: '1',
        LA_E2E_CLI_USER_DATA_SUFFIX: `http-timeout-compose-run-${notBefore}`,
        LA_E2E_CLI_STARTUP_RESOURCE: entry.wsFilePath,
      },
    });
    if (runExit !== 0) {
      throw new Error('HTTP timeout Compose observation host failed');
    }
    // Retain failed fixture/diagnostics. Cleanup failure cannot become success.
    await cleanup(workspaceParent, 'HTTP timeout Compose original', true);
    if (!process.env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT && process.env.LA_E2E_CLI_PRESERVE_WORKSPACES !== '1') {
      await cleanupRuntime(runtimeDependenciesRoot);
    }
    const ownedRoots = [workspaceParent, ...(!process.env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT ? [runtimeDependenciesRoot] : [])];
    ownedRootCleanup = { ownedRoots, checkedAt: new Date().toISOString(), verified: getOwnedRootCleanupVerified(ownedRoots) };
    if (context && !ownedRootCleanup.verified) {
      throw new Error('HTTP timeout Compose owned lifecycle roots still exist after cleanup');
    }
  } catch (error) {
    lifecycleError = error;
  }
  if (context) {
    let processCleanup;
    try {
      processCleanup = { ...(await observeClosure(process.pid)), ownerPid: process.pid };
    } catch (error) {
      processCleanup = { verified: false, ownerPid: process.pid, checkedAt: new Date().toISOString(), error: String(error) };
    }
    const terminal = finalizeDirectHttpTimeoutComposeEvidence(context, { lifecycleError, processCleanup, ownedRootCleanup });
    if (!terminal.complete) {
      throw lifecycleError ?? new Error(terminal.diagnosticsError || 'HTTP timeout Compose direct evidence is incomplete');
    }
  } else if (lifecycleError) {
    throw lifecycleError;
  }
  return 0;
}

async function runHttpTimeoutLifecycle({
  run = runVscodeTest,
  createParent = createOwnedWorkspaceParent,
  cleanup = cleanupOwnedWorkspaceParent,
  createRuntimeRoot = createIsolatedRuntimeDependenciesRoot,
  cleanupRuntime = cleanupRuntimeDependenciesRoot,
  credentialEnvironment = getSuiteScopedCredentialEnv,
} = {}) {
  const suiteId = 'httpTimeoutLifecycle';
  const phaseResultsPath = process.env.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH;
  if (!phaseResultsPath || (fs.existsSync(phaseResultsPath) && fs.readFileSync(phaseResultsPath, 'utf8').trim())) {
    throw new Error(`${suiteId} requires a fresh isolated wrapper phase journal`);
  }
  const artifactDir = getLifecycleArtifactDir('http-timeout-lifecycle');
  fs.mkdirSync(artifactDir, { recursive: true });
  const workspaceParent = createParent(suiteId);
  const manifestPath = path.join(artifactDir, `manifest-${Date.now()}.json`);
  const runtimeDependenciesRoot = process.env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT ?? createRuntimeRoot(suiteId);
  const failures = [];
  try {
    const azureCredentialEnv = await credentialEnvironment(process.env, SUITE_REGISTRY[suiteId], 45 * 60 * 1000);
    const commonEnv = {
      ...azureCredentialEnv,
      LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT: runtimeDependenciesRoot,
      LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH: phaseResultsPath,
      LA_E2E_CLI_WORKSPACE_PARENT: workspaceParent,
      LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MANIFEST: manifestPath,
      LA_E2E_CLI_INCLUDE_HTTP_TIMEOUT_REQUEST_LIFECYCLE: '1',
      LA_E2E_CLI_DISABLE_UNOWNED_PORT_KILL: '1',
      LA_E2E_CLI_STARTUP_RESOURCE: '',
    };
    const bootstrapExit = await run(['--label', 'runtimeDependencyBootstrap'], {
      extraEnv: {
        ...commonEnv,
        LA_E2E_CLI_INCLUDE_RUNTIME_DEPENDENCY_BOOTSTRAP: '1',
        LA_E2E_CLI_MINIMAL_ACTIVATION: '1',
        LA_E2E_CLI_VALIDATE_DEPENDENCIES: '1',
        LA_E2E_CLI_USER_DATA_SUFFIX: `${suiteId}-bootstrap-${Date.now()}`,
      },
    });
    if (bootstrapExit !== 0) {
      throw new Error(`${suiteId} runtime dependency bootstrap host failed`);
    }
    const createExit = await run(['--label', 'httpTimeoutLifecycle'], {
      extraEnv: {
        ...commonEnv,
        LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MODE: 'create',
        LA_E2E_CLI_MINIMAL_ACTIVATION: '1',
        LA_E2E_CLI_USER_DATA_SUFFIX: `${suiteId}-create-${Date.now()}`,
      },
    });
    if (createExit !== 0) {
      throw new Error(`${suiteId} fixture host failed`);
    }
    const { selectHttpTimeoutRequestWorkspace } = require('../out/test/e2e/httpTimeoutRequestOracle');
    const entry = selectHttpTimeoutRequestWorkspace(JSON.parse(fs.readFileSync(manifestPath, 'utf8')), 'http-timeout-lifecycle');
    for (const requiredPath of [entry.workspaceFilePath, entry.workflowJsonPath]) {
      if (!fs.existsSync(requiredPath)) {
        throw new Error(`${suiteId} generated fixture is missing: ${requiredPath}`);
      }
    }
    const runExit = await run(['--label', 'httpTimeoutLifecycle'], {
      extraEnv: {
        ...commonEnv,
        LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MODE: 'run',
        LA_E2E_CLI_MINIMAL_ACTIVATION: '0',
        LA_E2E_CLI_VALIDATE_DEPENDENCIES: '1',
        LA_E2E_STRICT_DEPENDENCY_VALIDATION: '1',
        LA_E2E_CLI_SKIP_ACTIVATION_WORKSPACE_ENSURE: '1',
        LA_E2E_CLI_USER_DATA_SUFFIX: `${suiteId}-run-${Date.now()}`,
        LA_E2E_CLI_STARTUP_RESOURCE: entry.workspaceFilePath,
      },
    });
    if (runExit !== 0) {
      throw new Error(`${suiteId} observation host failed`);
    }
  } catch (error) {
    failures.push(error);
  }
  try {
    await cleanup(workspaceParent, suiteId, true);
  } catch (error) {
    failures.push(error);
  }
  if (!process.env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT && process.env.LA_E2E_CLI_PRESERVE_WORKSPACES !== '1') {
    try {
      await cleanupRuntime(runtimeDependenciesRoot);
    } catch (error) {
      failures.push(error);
    }
  }
  if (
    failures.length > 0 ||
    !getOwnedRootCleanupVerified([
      workspaceParent,
      ...(!process.env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT ? [runtimeDependenciesRoot] : []),
    ]) ||
    !getDirectSuiteComplete(suiteId, readJsonLinesIfExists(phaseResultsPath))
  ) {
    throw new AggregateError(failures, `${suiteId} lifecycle evidence is inadmissible`);
  }
  return 0;
}

// Additive family selector, intentionally outside the canonical baseline/OGF
// rollup. Native coverage is earned only by its actual isolated consumer run.
async function runStatelessVariablesLifecycle(visibleDelayMs, operations = { runVscodeTest, waitForFuncCoreToolsAtDependencyRoot }) {
  const phaseResultsPath = process.env.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH;
  if (!phaseResultsPath || (fs.existsSync(phaseResultsPath) && fs.readFileSync(phaseResultsPath, 'utf8').trim())) {
    throw new Error('Stateless lifecycle requires a fresh isolated wrapper phase journal');
  }
  const dependencyRoot = createIsolatedRuntimeDependenciesRoot('statelessVariablesLifecycle');
  const lifecycleDir = getLifecycleArtifactDir('stateless-variables-lifecycle');
  fs.mkdirSync(lifecycleDir, { recursive: true });
  const workspaceParent = createOwnedWorkspaceParent('stateless-variables-lifecycle');
  const manifestPath = path.join(lifecycleDir, `manifest-stateless-${Date.now()}.json`);
  const phaseEnv = {
    LA_E2E_CLI_CREATE_WORKSPACE_CASE: '',
    LA_E2E_CLI_WORKSPACE_LIFECYCLE_CREATE_LABEL: '',
    LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE: '',
    LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE: '',
    LA_E2E_CLI_WORKSPACE_LIFECYCLE_MANIFEST: '',
    LA_E2E_CLI_WORKSPACE_PARENT: '',
    LA_E2E_CLI_STATELESS_VARIABLES_MODE: '',
    LA_E2E_CLI_STARTUP_RESOURCE: '',
    LA_E2E_CLI_PROFILE_PHASE: '',
  };
  const sharedEnv = {
    ...phaseEnv,
    LA_E2E_CLI_INCLUDE_STATELESS_VARIABLES: '1',
    LA_E2E_CLI_WORKSPACE_PARENT: workspaceParent,
    LA_E2E_CLI_WORKSPACE_LIFECYCLE_MANIFEST: manifestPath,
    LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT: dependencyRoot,
    LA_E2E_CLI_DISABLE_UNOWNED_PORT_KILL: '1',
    LA_E2E_CLI_DEFER_WORKSPACE_CLEANUP: '1',
  };
  const failures = [];
  let lifecycleSucceeded = false;
  try {
    // Reuse the existing native dependency bootstrap; this is a real reported
    // phase, not preparation inferred from a warm user cache or unit controls.
    await operations.runVscodeTest(['--label', 'runtimeDependencyBootstrap'], {
      visibleDelayMs,
      extraEnv: {
        ...phaseEnv,
        LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT: dependencyRoot,
        LA_E2E_CLI_INCLUDE_RUNTIME_DEPENDENCY_BOOTSTRAP: '1',
        LA_E2E_CLI_EXPECT_EMPTY_RUNTIME_DEPENDENCIES_ROOT: '1',
        LA_E2E_CLI_EMPTY_RUNTIME_DEPENDENCIES_ROOT_CONFIRMED: '1',
        LA_E2E_CLI_MINIMAL_ACTIVATION: '1',
        LA_E2E_CLI_VALIDATE_DEPENDENCIES: '1',
        LA_E2E_STRICT_DEPENDENCY_VALIDATION: '1',
        LA_E2E_CLI_PROFILE_PHASE: 'stateless-variables-bootstrap',
        LA_E2E_CLI_USER_DATA_SUFFIX: `stateless-variables-bootstrap-${Date.now()}`,
      },
    });
    await operations.waitForFuncCoreToolsAtDependencyRoot(dependencyRoot, {
      context: 'Stateless variables dependency bootstrap',
      timeoutMs: 30_000,
    });
    const controlledFuncDirectory = path.dirname(getFuncCoreToolsBinaryPath(dependencyRoot));
    await operations.runVscodeTest(['--label', 'statelessVariablesLifecycle'], {
      visibleDelayMs,
      controlledFuncDirectory,
      extraEnv: {
        ...sharedEnv,
        LA_E2E_CLI_USER_DATA_SUFFIX: `stateless-variables-create-${Date.now()}`,
        LA_E2E_CLI_STATELESS_VARIABLES_MODE: 'create',
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE: 'create',
      },
    });
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (
      !Array.isArray(manifest) ||
      manifest.length !== 1 ||
      manifest[0].label !== 'stateless-variables' ||
      manifest[0].appType !== 'standard'
    ) {
      throw new Error('Stateless wizard must write exactly one Standard stateless family entry');
    }
    const entry = manifest[0];
    await operations.runVscodeTest(['--label', 'statelessVariablesLifecycle'], {
      visibleDelayMs,
      controlledFuncDirectory,
      extraEnv: {
        ...sharedEnv,
        LA_E2E_CLI_USER_DATA_SUFFIX: `stateless-variables-prepare-${Date.now()}`,
        LA_E2E_CLI_PROFILE_PHASE: 'stateless-variables-prepare',
        LA_E2E_CLI_STATELESS_VARIABLES_MODE: 'prepare',
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE: 'stateless-variables-prepare',
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE: JSON.stringify(entry),
        LA_E2E_CLI_STARTUP_RESOURCE: entry.workspaceFilePath,
        LA_E2E_CLI_AUTO_START_DESIGN_TIME: '0',
        LA_E2E_CLI_MINIMAL_ACTIVATION: '0',
        LA_E2E_CLI_SKIP_ACTIVATION_WORKSPACE_ENSURE: '1',
      },
    });
    await operations.runVscodeTest(['--label', 'statelessVariablesLifecycle'], {
      visibleDelayMs,
      controlledFuncDirectory,
      extraEnv: {
        ...sharedEnv,
        LA_E2E_CLI_USER_DATA_SUFFIX: `stateless-variables-run-${Date.now()}`,
        LA_E2E_CLI_PROFILE_PHASE: 'stateless-variables-activation',
        LA_E2E_CLI_EXPECT_AZURE_LOGIC_APPS_CHANNEL: '1',
        LA_E2E_CLI_VSCODE_LOG_ARTIFACT_LABEL: 'statelessVariablesLifecycle',
        LA_E2E_CLI_STATELESS_VARIABLES_MODE: 'run',
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE: 'stateless-variables-run',
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE: JSON.stringify(entry),
        LA_E2E_CLI_STARTUP_RESOURCE: entry.workspaceFilePath,
        // This family proves the product's real activation-time startup path.
        // The test exposes the product Output channel before its bounded
        // consistency, fixture-binding and Designer assertions continue.
        LA_E2E_CLI_AUTO_START_DESIGN_TIME: '1',
        // The real consumer requires registerFuncHostTaskEvents(). Command-only
        // activation returns before those task-process listeners are registered,
        // so pickFuncProcess can never observe the generated host task.
        LA_E2E_CLI_MINIMAL_ACTIVATION: '0',
        LA_E2E_CLI_SKIP_ACTIVATION_WORKSPACE_ENSURE: '1',
      },
    });
    lifecycleSucceeded = true;
  } catch (error) {
    failures.push(error);
  }
  if (lifecycleSucceeded) {
    for (const root of [workspaceParent, dependencyRoot]) {
      try {
        await cleanupOwnedWorkspaceParent(root, 'stateless variables lifecycle', true);
      } catch (error) {
        failures.push(error);
      }
    }
  }
  // Final admission is after actual owned-root cleanup, not after the last child
  // returned zero. Missing/unordered phases and retained roots cannot exit zero.
  const complete =
    lifecycleSucceeded &&
    failures.length === 0 &&
    getOwnedRootCleanupVerified([workspaceParent, dependencyRoot]) &&
    getDirectSuiteComplete('statelessVariablesLifecycle', readJsonLinesIfExists(phaseResultsPath));
  if (!complete) {
    throw new AggregateError(failures, 'Stateless four-phase lifecycle evidence is inadmissible');
  }
}

function beginDirectHttpTimeoutComposeEvidence({ artifactDir, resultsDir, invocation }) {
  const label = 'httpTimeoutComposeOriginal';
  const context = {
    invocation,
    expectedPhaseIds: getDirectExpectedPhaseIds(label),
    phaseResultsPath: path.join(artifactDir, `phases-${invocation.id}.jsonl`),
    terminalResultPath: path.join(resultsDir, `${label}.terminal-result.json`),
    cleanupLedgerPath: path.join(resultsDir, `${label}.cleanup-ledger.json`),
  };
  context.invocation = { ...invocation, replacedPriorResult: fs.existsSync(context.terminalResultPath) };
  writeSuiteTerminalResult(
    { LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH: context.terminalResultPath },
    {
      label,
      suiteId: label,
      invocation: context.invocation,
      complete: false,
      cleanupVerified: false,
      lifecycleFinalized: false,
      expectedPhaseIds: context.expectedPhaseIds,
      phaseResults: [],
    }
  );
  writeSuiteCleanupLedger(
    { LA_E2E_CLI_SUITE_CLEANUP_LEDGER_PATH: context.cleanupLedgerPath },
    { invocation: context.invocation, verified: false, phaseResults: [] }
  );
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(context.phaseResultsPath, '');
  return context;
}

function finalizeDirectHttpTimeoutComposeEvidence(context, { lifecycleError, processCleanup, ownedRootCleanup }) {
  let phaseResults = [];
  let evidenceError;
  try {
    phaseResults = readJsonLinesIfExists(context.phaseResultsPath);
    const initialized = readJsonIfExists(context.terminalResultPath);
    const start = Date.parse(context.invocation.startedAt);
    const labels = ['runtimeDependencyBootstrap', 'createWorkspaceFixturesManifest', 'httpTimeoutComposeOriginal'];
    const validClosure = (closure, notBefore) =>
      closure?.verified === true &&
      Number.isInteger(closure.ownerPid) &&
      closure.ownerPid > 0 &&
      Array.isArray(closure.alivePids) &&
      closure.alivePids.length === 0 &&
      !closure.error &&
      Date.parse(closure.checkedAt) >= notBefore &&
      Date.parse(closure.checkedAt) <= Date.now();
    const provenanceFailures = [];
    const requireProvenance = (condition, message) => {
      if (!condition) {
        provenanceFailures.push(message);
      }
    };
    requireProvenance(initialized?.invocation?.id === context.invocation.id, 'initialized invocation id mismatch');
    requireProvenance(initialized?.lifecycleFinalized === false, 'initialized lifecycle was already finalized');
    requireProvenance(
      getDirectSuiteComplete('httpTimeoutComposeOriginal', phaseResults),
      'direct phase journal is incomplete or out of order'
    );
    for (const [index, phase] of phaseResults.entries()) {
      const phaseStartedAt = Date.parse(phase.phaseStartedAt);
      const phaseFinishedAt = Date.parse(phase.phaseFinishedAt);
      requireProvenance(phase.invocationId === context.invocation.id, `phase ${index} invocation id mismatch`);
      requireProvenance(phaseStartedAt >= start, `phase ${index} started before the invocation`);
      requireProvenance(phase.label === labels[index], `phase ${index} label mismatch`);
      requireProvenance(
        Number.isInteger(phase.mochaPassingCount) && phase.mochaPassingCount > 0,
        `phase ${index} lacks a passing Mocha test`
      );
      requireProvenance(phaseFinishedAt >= phaseStartedAt, `phase ${index} finish time precedes its start`);
      requireProvenance(phaseFinishedAt <= Date.now(), `phase ${index} finish time is in the future`);
      requireProvenance(validClosure(phase.processCleanup, phaseStartedAt), `phase ${index} process closure is invalid`);
      requireProvenance(
        Date.parse(phase.processCleanup?.checkedAt) <= phaseFinishedAt,
        `phase ${index} process closure was checked after phase completion`
      );
      if (index > 0) {
        requireProvenance(phaseStartedAt >= Date.parse(phaseResults[index - 1].phaseFinishedAt), `phase ${index} overlaps the prior phase`);
      }
    }
    requireProvenance(validClosure(processCleanup, start), 'wrapper process closure is invalid');
    requireProvenance(processCleanup?.ownerPid === context.invocation.ownerPid, 'wrapper process owner mismatch');
    context.provenanceVerified = provenanceFailures.length === 0;
    if (!context.provenanceVerified) {
      throw new Error(
        `HTTP timeout Compose stale, incomplete or mismatched invocation/phase/closure evidence: ${provenanceFailures.join('; ')}`
      );
    }
  } catch (error) {
    context.provenanceVerified = false;
    evidenceError = error;
  }
  try {
    context.ownedRootCleanup = {
      ...ownedRootCleanup,
      verified:
        ownedRootCleanup?.verified === true &&
        getOwnedRootCleanupVerified(ownedRootCleanup.ownedRoots) &&
        Date.parse(ownedRootCleanup.checkedAt) >= Date.parse(phaseResults.at(-1)?.phaseFinishedAt) &&
        Date.parse(processCleanup.checkedAt) >= Date.parse(ownedRootCleanup.checkedAt),
    };
  } catch (error) {
    context.ownedRootCleanup = { ...ownedRootCleanup, verified: false, error: String(error) };
  }
  return writeSuiteFinalEvidence({
    context,
    suite: legacyHttpTimeoutComposeSuite,
    exitCode: lifecycleError || evidenceError ? 1 : 0,
    signal: null,
    error: lifecycleError ?? evidenceError ?? (!context.ownedRootCleanup.verified ? new Error('Owned cleanup not verified') : undefined),
    processCleanup,
    phaseResults,
  });
}

async function runNugetConversionLifecycle(visibleDelayMs) {
  const lifecycleDir = getLifecycleArtifactDir('nuget-conversion-lifecycle');
  fs.mkdirSync(lifecycleDir, { recursive: true });
  const workspaceParent = createOwnedWorkspaceParent('nuget-conversion-lifecycle');
  const manifestPath = path.join(lifecycleDir, `manifest-standard-${Date.now()}.json`);
  await runVscodeTest(['--label', 'nugetConversionLifecycle'], {
    visibleDelayMs,
    extraEnv: {
      LA_E2E_CLI_WORKSPACE_PARENT: workspaceParent,
      LA_E2E_CLI_INCLUDE_NUGET_CONVERSION_LIFECYCLE: '1',
      LA_E2E_CLI_USER_DATA_SUFFIX: `nuget-conversion-create-${Date.now()}`,
      LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE: 'create',
      LA_E2E_CLI_WORKSPACE_LIFECYCLE_CREATE_LABEL: 'standard',
      LA_E2E_CLI_WORKSPACE_LIFECYCLE_MANIFEST: manifestPath,
    },
  });

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const entry = manifest.find((candidate) => candidate.label === 'standard') ?? manifest[0];
  if (!entry) {
    throw new Error('NuGet conversion lifecycle setup did not write a Standard workspace entry');
  }

  await runVscodeTest(['--label', 'nugetConversionLifecycle'], {
    visibleDelayMs,
    extraEnv: {
      LA_E2E_CLI_WORKSPACE_PARENT: workspaceParent,
      LA_E2E_CLI_INCLUDE_NUGET_CONVERSION_LIFECYCLE: '1',
      LA_E2E_CLI_USER_DATA_SUFFIX: `nuget-conversion-run-${Date.now()}`,
      LA_E2E_CLI_MINIMAL_ACTIVATION: '1',
      LA_E2E_CLI_SKIP_ACTIVATION_WORKSPACE_ENSURE: '1',
      LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE: 'nuget-run',
      LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE: JSON.stringify(entry),
      LA_E2E_CLI_STARTUP_RESOURCE: entry.appDir,
    },
  });

  await cleanupOwnedWorkspaceParent(workspaceParent, 'NuGet conversion lifecycle');
}

async function runCodefulDebugTasks(visibleDelayMs) {
  ensureCSharpDevKitServerShim();
  const lifecycleDir = getLifecycleArtifactDir('codeful-debug-tasks');
  fs.mkdirSync(lifecycleDir, { recursive: true });
  const manifest = [];
  const workspaceParent = createOwnedWorkspaceParent('codeful-debug-tasks');

  for (const label of ['codeful-modern', 'codeful-legacy']) {
    const manifestPath = path.join(lifecycleDir, `manifest-${label}-${Date.now()}.json`);
    await runVscodeTest(['--label', 'codefulDebugTasks'], {
      visibleDelayMs,
      extraEnv: {
        LA_E2E_CLI_WORKSPACE_PARENT: workspaceParent,
        LA_E2E_CLI_INCLUDE_CODEFUL_DEBUG_TASKS: '1',
        LA_E2E_CLI_USER_DATA_SUFFIX: `codeful-debug-create-${sanitizeEnvSegment(label)}-${Date.now()}`,
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE: 'codeful-create',
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_CREATE_LABEL: label,
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_MANIFEST: manifestPath,
      },
    });
    manifest.push(...JSON.parse(fs.readFileSync(manifestPath, 'utf-8')));
  }

  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error('Codeful debug task setup did not write workspace entries');
  }

  for (const entry of manifest) {
    await runVscodeTest(['--label', 'codefulDebugTasks'], {
      visibleDelayMs,
      extraEnv: getCodefulDebugTasksRunExtraEnv({ workspaceParent, entry }),
    });
  }

  await cleanupOwnedWorkspaceParent(workspaceParent, 'codeful debug task lifecycle');
}

function getCodefulDebugTasksRunExtraEnv({ workspaceParent, entry, now = Date.now() }) {
  return {
    LA_E2E_CLI_WORKSPACE_PARENT: workspaceParent,
    LA_E2E_CLI_INCLUDE_CODEFUL_DEBUG_TASKS: '1',
    LA_E2E_CLI_USER_DATA_SUFFIX: `codeful-debug-run-${sanitizeEnvSegment(entry.label)}-${now}`,
    LA_E2E_CLI_AUTO_START_DESIGN_TIME: '1',
    LA_E2E_CLI_VALIDATE_DEPENDENCIES: '1',
    LA_E2E_CLI_CODEFUL_EVIDENCE_NOT_BEFORE: String(now - 1000),
    LA_E2E_CLI_MINIMAL_ACTIVATION: '1',
    LA_E2E_CLI_SKIP_ACTIVATION_WORKSPACE_ENSURE: '1',
    LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE: 'codeful-run',
    LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE: JSON.stringify(entry),
    LA_E2E_CLI_STARTUP_RESOURCE: entry.workspaceFilePath,
  };
}

async function runMsnWeatherLifecycle(
  visibleDelayMs,
  {
    ensureProfile = ensureMsnWeatherProfile,
    azureEnvironment = getMsnWeatherAzureEnv,
    runPhase = runVscodeTest,
    probe = waitForFuncCoreToolsAtDependencyRoot,
    observe = require('./msn-cleanup-diagnostics').observeMsnCleanupDiagnostics,
    closeOwnedProcesses = require('./msn-cleanup-diagnostics').closeOwnedMsnProcesses,
    cleanupWorkspace = cleanupOwnedWorkspaceParent,
    cleanupRuntime = cleanupRuntimeDependenciesRoot,
  } = {}
) {
  const evidenceEnv = { ...process.env };
  if (evidenceEnv.LA_E2E_CLI_SUITE_WRAPPER_CHILD !== '1') {
    delete evidenceEnv.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH;
  }
  const directEvidence = beginDirectMsnEvidence(evidenceEnv);
  ensureProfile();
  const azureEnv = azureEnvironment();
  const lifecycleDir = getLifecycleArtifactDir('msn-weather-lifecycle');
  const lifecycleRunId = Date.now();
  const runtimeDependenciesRoot = createIsolatedRuntimeDependenciesRoot('msnWeatherLifecycle');
  const workspaceParent = createOwnedWorkspaceParent('msn-weather-lifecycle');
  let lifecycleSucceeded = false;
  let preparationSucceeded = false;
  let lifecycleError;
  let processCleanup = {
    verified: false,
    originalProcessClosureVerified: false,
    processClosureProof: 'original-identities-unverified',
  };
  const commonEnv = {
    ...directEvidence,
    LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT: runtimeDependenciesRoot,
    LA_E2E_CLI_EXPECT_AZURE_LOGIC_APPS_CHANNEL: '1',
    LA_E2E_CLI_VSCODE_LOG_ARTIFACT_LABEL: 'msnWeatherLifecycle',
    LA_E2E_CLI_MSN_LIFECYCLE_INVOCATION: require('crypto').randomUUID(),
    LA_E2E_CLI_DISABLE_UNOWNED_PORT_KILL: '1',
    LA_E2E_CLI_MSN_DIAGNOSTICS_DIR: path.join(lifecycleDir, `msn-cleanup-observations-${lifecycleRunId}`),
  };
  fs.mkdirSync(lifecycleDir, { recursive: true });
  const manifestPath = path.join(lifecycleDir, `manifest-standard-${lifecycleRunId}.json`);

  try {
    await runPhase(['--label', 'runtimeDependencyBootstrap'], {
      visibleDelayMs,
      extraEnv: {
        ...commonEnv,
        LA_E2E_CLI_INCLUDE_RUNTIME_DEPENDENCY_BOOTSTRAP: '1',
        LA_E2E_CLI_EXPECT_EMPTY_RUNTIME_DEPENDENCIES_ROOT: '1',
        LA_E2E_CLI_EMPTY_RUNTIME_DEPENDENCIES_ROOT_CONFIRMED: '1',
        LA_E2E_CLI_MINIMAL_ACTIVATION: '1',
        LA_E2E_CLI_VALIDATE_DEPENDENCIES: '1',
        LA_E2E_STRICT_DEPENDENCY_VALIDATION: '1',
        LA_E2E_CLI_PROFILE_PHASE: 'msn-weather-bootstrap',
        LA_E2E_CLI_USER_DATA_SUFFIX: `msn-weather-bootstrap-${lifecycleRunId}`,
      },
    });
    const funcCoreToolsProbe = await probe(runtimeDependenciesRoot, {
      context: 'MSN Weather dependency bootstrap',
      timeoutMs: 30_000,
    });
    writeRuntimeDependencyProbe(lifecycleDir, lifecycleRunId, runtimeDependenciesRoot, funcCoreToolsProbe);

    await runPhase(['--label', 'msnWeatherLifecycle'], {
      visibleDelayMs,
      extraEnv: {
        ...commonEnv,
        LA_E2E_CLI_INCLUDE_MSN_WEATHER_LIFECYCLE: '1',
        LA_E2E_CLI_WORKSPACE_PARENT: workspaceParent,
        LA_E2E_CLI_PROFILE_PHASE: 'msn-weather-create',
        LA_E2E_CLI_USER_DATA_SUFFIX: `msn-weather-create-${lifecycleRunId}`,
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE: 'create',
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_CREATE_LABEL: 'standard',
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_MANIFEST: manifestPath,
      },
    });

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const entry = manifest.find((candidate) => candidate.label === 'standard') ?? manifest[0];
    if (!entry) {
      throw new Error('MSN Weather lifecycle setup did not write a Standard workspace entry');
    }

    preparationSucceeded = true;
    await runPhase(['--label', 'msnWeatherLifecycle'], {
      visibleDelayMs,
      extraEnv: getMsnWeatherLifecycleRunExtraEnv({ commonEnv, workspaceParent, lifecycleRunId, entry, azureEnv }),
    });

    lifecycleSucceeded = true;
  } catch (error) {
    lifecycleError = error;
  }
  await finalizeMsnLifecycleCleanup({
    lifecycleError,
    cleanupSteps: [
      async () => {
        if (!lifecycleSucceeded && preparationSucceeded) {
          lifecycleSucceeded = require('./msn-cleanup-diagnostics').readMsnBodyAssertions({
            outputDir: commonEnv.LA_E2E_CLI_MSN_DIAGNOSTICS_DIR,
            invocation: commonEnv.LA_E2E_CLI_MSN_LIFECYCLE_INVOCATION,
          });
        }
      },
      async () => {
        await observe({
          dependencyRoot: runtimeDependenciesRoot,
          outputDir: commonEnv.LA_E2E_CLI_MSN_DIAGNOSTICS_DIR,
          stage: 'after-cli-close',
        });
      },
      async () => {
        processCleanup = await closeOwnedProcesses({
          dependencyRoot: runtimeDependenciesRoot,
          outputDir: commonEnv.LA_E2E_CLI_MSN_DIAGNOSTICS_DIR,
        });
      },
      async () => {
        if (processCleanup.verified) {
          await cleanupWorkspace(workspaceParent, 'successful MSN Weather lifecycle', true);
        }
      },
      async () => {
        if (processCleanup.verified) {
          await cleanupRuntime(runtimeDependenciesRoot);
        }
      },
    ],
    observeCleanup: () => getOwnedRootCleanupVerified([workspaceParent, runtimeDependenciesRoot]),
    finalizeEvidence: (outcome) =>
      finalizeDirectMsnEvidence(evidenceEnv, {
        ...outcome,
        lifecycleSucceeded,
        phaseResultsPath: commonEnv.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH,
        ownedRoots: [workspaceParent, runtimeDependenciesRoot],
        processCleanup,
      }),
  });
}

async function finalizeMsnLifecycleCleanup({ lifecycleError, cleanupSteps, observeCleanup, finalizeEvidence }) {
  const errors = lifecycleError ? [lifecycleError] : [];
  for (const step of cleanupSteps) {
    try {
      await step();
    } catch (error) {
      errors.push(error);
    }
  }
  let cleanupVerified = false;
  try {
    cleanupVerified = observeCleanup() === true;
  } catch (error) {
    errors.push(error);
  }
  let terminal;
  try {
    terminal = finalizeEvidence({
      cleanupVerified,
      lifecycleError: errors.length > 0,
      errors,
    });
  } catch (error) {
    errors.push(error);
  }
  if (errors.length > 0) {
    throw new AggregateError(
      errors,
      `MSN lifecycle failed; original execution, cleanup and evidence errors were retained:\n${describeMsnFailures(errors).join('\n')}`
    );
  }
  if (!cleanupVerified || terminal?.complete === false) {
    throw new Error('MSN lifecycle evidence failed: incomplete-or-unclean-lifecycle');
  }
  return { cleanupVerified, terminal };
}

function describeMsnFailures(errors, depth = 0) {
  return errors
    .slice(0, 20)
    .flatMap((error) => [
      redactGeneratedWorkspacePlainText(error instanceof Error ? error.message : String(error)),
      ...(error instanceof AggregateError && depth < 4 ? describeMsnFailures(error.errors, depth + 1) : []),
    ]);
}

async function runVariablesPickerLifecycle(visibleDelayMs) {
  const lifecycleDir = getLifecycleArtifactDir('variables-picker-lifecycle');
  const lifecycleRunId = Date.now();
  const workspaceParent = createOwnedWorkspaceParent('variables-picker-lifecycle');
  fs.mkdirSync(lifecycleDir, { recursive: true });
  const manifestPath = path.join(lifecycleDir, `manifest-standard-${lifecycleRunId}.json`);

  try {
    await runVscodeTest(['--label', 'workspaceLifecycle'], {
      visibleDelayMs,
      extraEnv: {
        LA_E2E_CLI_WORKSPACE_PARENT: workspaceParent,
        LA_E2E_CLI_INCLUDE_WORKSPACE_LIFECYCLE: '1',
        LA_E2E_CLI_USER_DATA_SUFFIX: `variables-picker-create-${lifecycleRunId}`,
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE: 'create',
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_CREATE_LABEL: 'standard',
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_MANIFEST: manifestPath,
      },
    });

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const entry = manifest.find((candidate) => candidate.label === 'standard') ?? manifest[0];
    if (!entry) {
      throw new Error('Variables picker lifecycle setup did not write a Standard workspace entry');
    }

    await runVscodeTest(['--label', 'workspaceLifecycle'], {
      visibleDelayMs,
      extraEnv: {
        LA_E2E_CLI_WORKSPACE_PARENT: workspaceParent,
        LA_E2E_CLI_INCLUDE_WORKSPACE_LIFECYCLE: '1',
        LA_E2E_CLI_USER_DATA_SUFFIX: `variables-picker-run-${lifecycleRunId}`,
        LA_E2E_CLI_MINIMAL_ACTIVATION: '1',
        LA_E2E_CLI_SKIP_ACTIVATION_WORKSPACE_ENSURE: '1',
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE: 'variables-picker-run',
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE: JSON.stringify(entry),
        LA_E2E_CLI_STARTUP_RESOURCE: entry.workspaceFilePath,
      },
    });
  } finally {
    await cleanupOwnedWorkspaceParent(workspaceParent, 'Variables picker lifecycle');
  }
}

function getMsnWeatherLifecycleRunExtraEnv({ commonEnv, workspaceParent, lifecycleRunId, entry, azureEnv }) {
  return {
    ...commonEnv,
    LA_E2E_CLI_INCLUDE_MSN_WEATHER_LIFECYCLE: '1',
    LA_E2E_CLI_WORKSPACE_PARENT: workspaceParent,
    LA_E2E_CLI_MINIMAL_ACTIVATION: '1',
    LA_E2E_CLI_SKIP_ACTIVATION_WORKSPACE_ENSURE: '1',
    LA_E2E_CLI_PROFILE_PHASE: 'msn-weather-run',
    LA_E2E_CLI_USER_DATA_SUFFIX: `msn-weather-run-${lifecycleRunId}`,
    LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE: 'msn-weather-run',
    LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE: JSON.stringify(entry),
    LA_E2E_CLI_STARTUP_RESOURCE: entry.workspaceFilePath,
    ...azureEnv,
  };
}

function ensureMsnWeatherProfile() {
  const hasHeadlessAzureAuth = hasHeadlessMsnWeatherAzureAuth(process.env);
  if (hasHeadlessAzureAuth && !process.env.LA_E2E_CLI_USER_DATA_DIR?.trim()) {
    console.log('[workspace-lifecycle][msn-weather] Using per-phase VS Code profiles with headless Azure auth from environment.');
    return;
  }

  if (isBatchMode()) {
    throw new Error(
      'MSN Weather --suites batch mode requires headless Azure auth (WIF/service connection/access token); refusing to reuse a persistent local VS Code profile.'
    );
  }

  const userDataDir = process.env.LA_E2E_CLI_USER_DATA_DIR ?? getDefaultAzureAuthUserDataDir();
  process.env.LA_E2E_CLI_USER_DATA_DIR = userDataDir;
  if (!userDataDir) {
    throw new Error(
      [
        'MSN Weather lifecycle requires LA_E2E_CLI_USER_DATA_DIR to point at the signed-in local Azure test profile.',
        'Open and sign in first with: pnpm --dir apps\\vs-code-designer run test:e2e-cli:open:azure',
        'Then rerun the MSN Weather lifecycle from the same shell.',
      ].join('\n')
    );
  }

  if (!fs.existsSync(userDataDir)) {
    if (hasHeadlessAzureAuth) {
      fs.mkdirSync(userDataDir, { recursive: true });
      console.log(`[workspace-lifecycle][msn-weather] Created VS Code test profile for headless Azure auth: ${path.resolve(userDataDir)}`);
      return;
    }
    throw new Error(`MSN Weather lifecycle profile path does not exist: ${userDataDir}`);
  }

  console.log(`[workspace-lifecycle][msn-weather] Reusing VS Code profile: ${path.resolve(userDataDir)}`);
}

function getDefaultAzureAuthUserDataDir() {
  return path.resolve(__dirname, '..', '.vscode-test', 'local-azure-auth', 'user-data');
}

function getMsnWeatherAzureEnv() {
  return {
    ...getMsnWeatherAzureTargetEnv(),
    ...getMsnWeatherAzureAuthEnv(),
  };
}

function getMsnWeatherAzureTargetEnv() {
  const explicitSubscriptionId = firstEnvironmentValue(['LA_E2E_CLI_AZURE_SUBSCRIPTION_ID', 'WORKFLOWS_SUBSCRIPTION_ID']);
  const explicitTenantId = firstEnvironmentValue(['LA_E2E_CLI_AZURE_TENANT_ID', 'WORKFLOWS_TENANT_ID']);
  const explicitResourceGroupName = firstEnvironmentValue(['LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME', 'WORKFLOWS_RESOURCE_GROUP_NAME']);
  const explicitLocation = firstEnvironmentValue(['LA_E2E_CLI_AZURE_LOCATION_NAME', 'WORKFLOWS_LOCATION_NAME']);
  const explicitManagementBaseUrl = firstEnvironmentValue(['LA_E2E_CLI_AZURE_MANAGEMENT_BASE_URL', 'WORKFLOWS_MANAGEMENT_BASE_URI']);
  const hasExplicitTargetValue = Boolean(
    explicitSubscriptionId || explicitTenantId || explicitResourceGroupName || explicitLocation || explicitManagementBaseUrl
  );
  if (!hasExplicitTargetValue && canUseInteractiveMsnWeatherAzureTargetEnv(process.env)) {
    console.log(
      '[workspace-lifecycle][msn-weather] Explicit local interactive Azure settings mode enabled; wrapper will not preseed Azure connector target env.'
    );
    return {};
  }
  const account = explicitSubscriptionId && explicitTenantId ? undefined : isBatchMode() ? undefined : tryGetAzureCliAccount();
  const resourceGroupName = explicitResourceGroupName ?? (isBatchMode() ? undefined : tryGetAzureCliDefaultResourceGroup());
  const location = explicitLocation ?? 'westus';
  const tenantId = explicitTenantId ?? account?.tenantId;

  if (!(explicitSubscriptionId ?? account?.id) || !tenantId || !resourceGroupName || !location) {
    throw new Error(
      [
        'MSN Weather lifecycle needs Azure connector target settings before opening the designer.',
        'Set LA_E2E_CLI_AZURE_TENANT_ID and LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME, or configure Azure CLI account/default group with:',
        "  az configure --defaults group='<resource-group-name>'",
        'The wrapper can auto-detect the Azure CLI subscription/tenant and defaults LA_E2E_CLI_AZURE_LOCATION_NAME to westus.',
      ].join('\n')
    );
  }

  const env = {
    LA_E2E_CLI_AZURE_SUBSCRIPTION_ID: explicitSubscriptionId ?? account.id,
    LA_E2E_CLI_AZURE_TENANT_ID: tenantId,
    LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME: resourceGroupName,
    LA_E2E_CLI_AZURE_LOCATION_NAME: location,
  };

  if (explicitManagementBaseUrl) {
    env.LA_E2E_CLI_AZURE_MANAGEMENT_BASE_URL = explicitManagementBaseUrl;
  }

  console.log(
    `[workspace-lifecycle][msn-weather] Using Azure connector target from ${explicitSubscriptionId ? 'environment' : 'Azure CLI account'} and ${
      explicitResourceGroupName ? 'environment' : 'Azure CLI defaults'
    }; location=${location}.`
  );
  return env;
}

function canUseInteractiveMsnWeatherAzureTargetEnv(env) {
  if (env.LA_E2E_CLI_BATCH_MODE === '1') {
    return false;
  }
  const allow = env.LA_E2E_CLI_MSN_WEATHER_ALLOW_INTERACTIVE_AZURE_SETTINGS?.trim();
  if (!/^(1|true)$/i.test(allow ?? '')) {
    return false;
  }

  return !/^(1|true)$/i.test(env.CI ?? '') && !/^(1|true)$/i.test(env.TF_BUILD ?? '') && !/^(1|true)$/i.test(env.GITHUB_ACTIONS ?? '');
}

function hasHeadlessMsnWeatherAzureAuth(env) {
  return (
    !!env.LA_E2E_CLI_AZURE_ACCESS_TOKEN?.trim() ||
    !/^(false|0)?$/i.test(env.AzCode_UseAzureFederatedCredentials ?? '') ||
    !!env.FC_SERVICE_CONNECTION_ID?.trim() ||
    !!env.AzCode_ServiceConnectionID?.trim()
  );
}

function isBatchMode() {
  return process.env.LA_E2E_CLI_BATCH_MODE === '1';
}

function getMsnWeatherAzureAuthEnv() {
  if (process.env.LA_E2E_CLI_AZURE_ACCESS_TOKEN?.trim()) {
    console.log('[workspace-lifecycle][msn-weather] Reusing LA_E2E_CLI_AZURE_ACCESS_TOKEN from the current shell.');
    return {};
  }

  if (isBatchMode() || process.env.LA_E2E_CLI_DISABLE_AZURE_CLI_TOKEN_FALLBACK === '1') {
    return {};
  }

  try {
    const { command, args } = getAzureCliAccessTokenCommand();
    const output = execFileSync(command, args, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const token = JSON.parse(output).accessToken;
    if (typeof token !== 'string' || token.trim().length === 0) {
      throw new Error('Azure CLI did not return an accessToken.');
    }

    console.log('[workspace-lifecycle][msn-weather] Using Azure CLI token fallback for connector search in the test host.');
    return {
      LA_E2E_CLI_AZURE_ACCESS_TOKEN: token,
    };
  } catch (error) {
    console.warn(
      [
        '[workspace-lifecycle][msn-weather] Azure CLI token fallback is unavailable; the test will rely on the VS Code Microsoft auth profile.',
        `Reason: ${error instanceof Error ? error.message : String(error)}`,
      ].join('\n')
    );
    return {};
  }
}

function firstEnvironmentValue(names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}

function tryGetAzureCliAccount() {
  try {
    const output = execAzureCliJson(['account', 'show', '--output', 'json']);
    const account = JSON.parse(output);
    if (typeof account.id === 'string' && account.id.trim()) {
      return {
        id: account.id.trim(),
        tenantId: typeof account.tenantId === 'string' && account.tenantId.trim() ? account.tenantId.trim() : undefined,
      };
    }
  } catch (error) {
    console.warn(
      `[workspace-lifecycle][msn-weather] Unable to read Azure CLI account: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return undefined;
}

function tryGetAzureCliDefaultResourceGroup() {
  try {
    const output = execAzureCliJson(['configure', '--list-defaults', '--output', 'json']);
    const defaults = JSON.parse(output);
    if (!Array.isArray(defaults)) {
      return undefined;
    }

    const group = defaults.find((entry) => entry?.name === 'group')?.value;
    return typeof group === 'string' && group.trim() ? group.trim() : undefined;
  } catch (error) {
    console.warn(
      `[workspace-lifecycle][msn-weather] Unable to read Azure CLI default resource group: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }
}

function execAzureCliJson(args) {
  const { command, args: commandArgs } = getAzureCliCommand(args);
  return execFileSync(command, commandArgs, {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function getAzureCliAccessTokenCommand() {
  const azArgs = ['account', 'get-access-token', '--resource', 'https://management.core.windows.net/', '--output', 'json'];
  return getAzureCliCommand(azArgs);
}

function getAzureCliCommand(azArgs) {
  if (process.platform === 'win32') {
    return {
      command: process.env.ComSpec ?? 'cmd.exe',
      args: ['/d', '/s', '/c', ['az', ...azArgs].join(' ')],
    };
  }

  return {
    command: 'az',
    args: azArgs,
  };
}

function ensureCSharpDevKitServerShim() {
  if (process.platform !== 'win32') {
    return;
  }

  const extensionsDir = path.resolve(process.env.LA_E2E_CLI_EXTENSIONS_DIR || path.join(__dirname, '..', '.vscode-test', 'extensions'));
  if (!fs.existsSync(extensionsDir)) {
    return;
  }

  for (const entry of fs.readdirSync(extensionsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('ms-dotnettools.csdevkit-')) {
      continue;
    }

    const serverDir = path.join(
      extensionsDir,
      entry.name,
      'components',
      'vs-green-server',
      'platforms',
      'win32-x64',
      'node_modules',
      '@microsoft',
      'visualstudio-server.win32-x64'
    );
    const serverExe = path.join(serverDir, 'Microsoft.VisualStudio.Code.Server.exe');
    const serverShim = path.join(serverDir, 'Microsoft.VisualStudio.Code.Server');
    if (fs.existsSync(serverExe) && !fs.existsSync(serverShim)) {
      fs.copyFileSync(serverExe, serverShim);
    }
  }
}

async function runDefaultBaseline(visibleDelayMs) {
  for (const label of ['unitTests', 'createWorkspace']) {
    await runVscodeTest(['--label', label], { visibleDelayMs });
  }

  return 0;
}

function sanitizeEnvSegment(value) {
  return String(value).replace(/[^a-z0-9_-]+/gi, '-');
}

function getLifecycleArtifactDir(name) {
  return path.resolve(process.env.LA_E2E_CLI_LIFECYCLE_ARTIFACT_ROOT || path.join(__dirname, '..', '.vscode-test'), name);
}

function createIsolatedRuntimeDependenciesRoot(label) {
  const prefix = path.join(
    os.tmpdir(),
    `logicappsux-vscode-e2e-runtime-deps-${sanitizeEnvSegment(label)}-${process.platform}-${process.arch}-`
  );
  const root = fs.mkdtempSync(prefix);
  assertSafeRuntimeDependenciesRoot(root);

  const entries = fs.readdirSync(root);
  if (entries.length > 0) {
    throw new Error(`[runtime-deps] Expected isolated dependency root to start empty: ${root}`);
  }

  console.log(`[runtime-deps] Created empty isolated dependency root: ${root}`);
  return root;
}

function assertSafeRuntimeDependenciesRoot(root) {
  const resolvedRoot = path.resolve(root);
  const tempRoot = path.resolve(os.tmpdir());
  const userCacheRoot = path.resolve(os.homedir(), '.azurelogicapps', 'dependencies');
  const relativeToTempRoot = path.relative(tempRoot, resolvedRoot);
  const expectedPrefix = `logicappsux-vscode-e2e-runtime-deps-`;

  if (path.relative(userCacheRoot, resolvedRoot) === '') {
    throw new Error(`[runtime-deps] Refusing to use the user's Azure Logic Apps dependency cache as an isolated root: ${resolvedRoot}`);
  }

  if (
    relativeToTempRoot.startsWith('..') ||
    path.isAbsolute(relativeToTempRoot) ||
    !path.basename(resolvedRoot).startsWith(expectedPrefix)
  ) {
    throw new Error(`[runtime-deps] Isolated dependency root must be a test-owned directory under ${tempRoot}: ${resolvedRoot}`);
  }
}

function getFuncCoreToolsBinaryPath(runtimeDependenciesRoot) {
  return path.join(runtimeDependenciesRoot, 'FuncCoreTools', process.platform === 'win32' ? 'func.exe' : 'func');
}

function getRequiredFuncCoreToolsBinaryPaths(runtimeDependenciesRoot) {
  const executableName = process.platform === 'win32' ? 'func.exe' : 'func';
  const funcToolsRoot = path.join(runtimeDependenciesRoot, 'FuncCoreTools');
  return [
    { name: 'configured launcher', path: path.join(funcToolsRoot, executableName) },
    { name: 'in-proc8 worker host', path: path.join(funcToolsRoot, 'in-proc8', executableName) },
  ];
}

function getFuncCoreToolsCandidatePaths(runtimeDependenciesRoot) {
  const executableName = process.platform === 'win32' ? 'func.exe' : 'func';
  const funcToolsRoot = path.join(runtimeDependenciesRoot, 'FuncCoreTools');
  const candidates = [
    path.join(funcToolsRoot, executableName),
    path.join(funcToolsRoot, 'in-proc8', executableName),
    path.join(funcToolsRoot, 'in-proc6', executableName),
  ];
  const pending = [funcToolsRoot];

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || !fs.existsSync(current)) {
      continue;
    }

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(entryPath);
      } else if (entry.name === executableName) {
        candidates.push(entryPath);
      }
    }
  }

  return [...new Set(candidates)];
}

async function waitForFuncCoreToolsAtDependencyRoot(runtimeDependenciesRoot, options = {}) {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? 120_000;
  const context = options.context ?? 'runtime dependency bootstrap';
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const version = verifyFuncCoreToolsAtDependencyRoot(runtimeDependenciesRoot, context);
      console.log(
        `[runtime-deps] Func Core Tools ready after ${Date.now() - startedAt}ms for ${context}: ${getFuncCoreToolsBinaryPath(
          runtimeDependenciesRoot
        )} -> ${version}`
      );
      return version;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  throw lastError ?? new Error(`[runtime-deps] Timed out waiting for Func Core Tools after ${timeoutMs}ms for ${context}`);
}

function verifyFuncCoreToolsAtDependencyRoot(runtimeDependenciesRoot, context = 'runtime dependency bootstrap') {
  const requiredBinaries = getRequiredFuncCoreToolsBinaryPaths(runtimeDependenciesRoot);
  const missingRequiredBinaries = requiredBinaries.filter((candidate) => !fs.existsSync(candidate.path));
  if (missingRequiredBinaries.length > 0) {
    throw new Error(
      [
        `[runtime-deps] Missing required Func Core Tools executable(s) after ${context}:`,
        ...missingRequiredBinaries.map((candidate) => `- ${candidate.name}: ${candidate.path}`),
        'This check runs before opening the designer so CI fails fast instead of waiting for the local designer tab timeout.',
        collectRuntimeDependencyDiagnostics(runtimeDependenciesRoot),
      ].join('\n')
    );
  }

  const versions = [];
  for (const candidate of requiredBinaries) {
    if (process.platform !== 'win32') {
      fs.chmodSync(candidate.path, 0o755);
    }

    try {
      const version = execFileSync(candidate.path, ['--version'], {
        encoding: 'utf-8',
        timeout: 30_000,
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim();
      if (!/^\d+\.\d+\.\d+/.test(version)) {
        throw new Error(`Unexpected version output: ${version}`);
      }
      versions.push(`${candidate.name} ${candidate.path}=${version}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        [
          `[runtime-deps] Func Core Tools version probe failed after ${context}: ${candidate.name} ${candidate.path}`,
          message,
          collectRuntimeDependencyDiagnostics(runtimeDependenciesRoot),
        ].join('\n')
      );
    }
  }

  return versions.join(', ');
}

function collectRuntimeDependencyDiagnostics(runtimeDependenciesRoot) {
  const funcDir = path.join(runtimeDependenciesRoot, 'FuncCoreTools');
  const rootEntries = safeReadDirectory(runtimeDependenciesRoot);
  const funcEntries = safeReadDirectory(funcDir);
  const candidates = getFuncCoreToolsCandidatePaths(runtimeDependenciesRoot).map(
    (candidate) => `${fs.existsSync(candidate) ? 'exists' : 'missing'} ${candidate}`
  );
  return [
    `[runtime-deps] dependencyRoot=${runtimeDependenciesRoot}`,
    `[runtime-deps] dependencyRoot entries=${JSON.stringify(rootEntries)}`,
    `[runtime-deps] FuncCoreTools entries=${JSON.stringify(funcEntries)}`,
    `[runtime-deps] Func Core Tools candidates=${JSON.stringify(candidates)}`,
  ].join('\n');
}

function writeRuntimeDependencyProbe(lifecycleDir, lifecycleRunId, runtimeDependenciesRoot, probeResult) {
  fs.mkdirSync(lifecycleDir, { recursive: true });
  const lines = [
    '# Runtime dependency probe',
    '',
    `Run ID: ${lifecycleRunId}`,
    `Dependency root: ${runtimeDependenciesRoot}`,
    '',
    '## Required Func Core Tools probes',
    '',
    probeResult,
    '',
    '## Runtime dependency inventory',
    '',
    collectRuntimeDependencyDiagnostics(runtimeDependenciesRoot),
    '',
  ];
  fs.writeFileSync(path.join(lifecycleDir, `runtime-dependency-probe-${lifecycleRunId}.md`), `${lines.join('\n')}\n`);
}

async function cleanupRuntimeDependenciesRoot(runtimeDependenciesRoot) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  try {
    fs.rmSync(runtimeDependenciesRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
    console.log(`[runtime-deps] Removed isolated dependency root after successful MSN Weather lifecycle: ${runtimeDependenciesRoot}`);
  } catch (error) {
    console.warn(`[runtime-deps] Unable to remove isolated dependency root ${runtimeDependenciesRoot}: ${String(error)}`);
    throw error;
  }
}

function safeReadDirectory(directory) {
  try {
    return fs.existsSync(directory) ? fs.readdirSync(directory).slice(0, 50) : ['<missing>'];
  } catch (error) {
    return [`<error: ${error instanceof Error ? error.message : String(error)}>`];
  }
}

function collectRegenerationProfileLogs(root, childEnv, collector = collectVscodeProfileLogs) {
  const errors = [];
  let profileFiles;
  try {
    profileFiles = fs.readdirSync(root).filter((name) => name.endsWith('-profile.json'));
  } catch (error) {
    return [error];
  }
  for (const file of profileFiles) {
    try {
      const profile = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
      collector('workspaceRegeneration', {
        ...childEnv,
        LA_E2E_CLI_USER_DATA_DIR: profile.profile,
        LA_E2E_CLI_PROFILE_PHASE: profile.phase,
        LA_E2E_CLI_VSCODE_LOG_DIR: path.join(root, 'vscode-logs'),
      });
    } catch (error) {
      errors.push(error);
    }
  }
  return errors;
}

function applyControlledFuncEnvironment(env, controlledFuncDirectory) {
  if (!controlledFuncDirectory) {
    return env;
  }
  const { controlledFuncEnvironment } = require('../out/test/e2e/workspaceMultiRootLaunch');
  return controlledFuncEnvironment(controlledFuncDirectory, env, process.platform);
}

function runVscodeTest(args, options = {}) {
  const phaseStartedAt = new Date().toISOString();
  const label = getLabelArg(args);
  const userDataSuffix =
    options.extraEnv?.LA_E2E_CLI_USER_DATA_SUFFIX ?? process.env.LA_E2E_CLI_USER_DATA_SUFFIX ?? `run-${Date.now()}-${process.pid}`;
  const deferredWorkspaceParent = options.workspaceParent ?? getDeferredCreateWorkspaceParent(label);
  const outputFilter = createOutputFilter();
  const { command, commandArgs } = getVscodeTestCommand(args);
  let childEnv = sanitizeInheritedGitCommandConfigEnv({
    ...process.env,
    LA_E2E_CLI_LABEL: label ?? '',
    LA_E2E_CLI_USER_DATA_SUFFIX: userDataSuffix,
    ...(options.visibleDelayMs ? { LA_E2E_CLI_VISIBLE_DELAY_MS: options.visibleDelayMs } : {}),
    ...(deferredWorkspaceParent
      ? {
          LA_E2E_CLI_CREATE_WORKSPACE_PARENT: deferredWorkspaceParent,
          LA_E2E_CLI_DEFER_WORKSPACE_CLEANUP: '1',
        }
      : {}),
    ...(options.extraEnv ?? {}),
  });
  childEnv = applyControlledFuncEnvironment(childEnv, options.controlledFuncDirectory);
  const cancelRequired =
    cancelCheck.required(childEnv) &&
    label === 'createWorkspaceCoreMatrix' &&
    childEnv.LA_E2E_CLI_CREATE_WORKSPACE_CASE === 'standard-stateful';
  const regenerationRequired = childEnv.LA_E2E_CLI_REQUIRE_WORKSPACE_REGENERATION === '1';
  if (
    regenerationRequired &&
    (cancelRequired || label !== 'createWorkspaceCoreMatrix' || childEnv.LA_E2E_CLI_CREATE_WORKSPACE_CASE !== 'standard-stateful')
  ) {
    throw new Error('Regeneration requires its isolated Standard Stateful wizard; it cannot share the Cancel supplement or other labels.');
  }

  const regenerationContext = regenerationRequired
    ? cancelCheck.prepareCancelContext(
        {
          ...childEnv,
          LA_E2E_CLI_CANCEL_DIAGNOSTICS_DIR:
            childEnv.LA_E2E_CLI_REGENERATION_DIAGNOSTICS_DIR ||
            path.join(__dirname, '..', '.vscode-test', `workspace-regeneration-${userDataSuffix}`),
        },
        deferredWorkspaceParent
      )
    : undefined;
  const cancelContext = cancelRequired ? cancelCheck.prepareCancelContext(childEnv, deferredWorkspaceParent) : undefined;
  if (regenerationContext) {
    beginDirectRegenerationEvidence(regenerationContext);
    const runtime = require('../out/test/e2e/workspaceArtifactRegenerationRuntime');
    regenerationContext.runtimeAdmission = {
      root: runtime.initializeRegenerationRuntimeRoot(childEnv.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT),
      sourceSettingsPath: path.join(getVscodeUserDataDir(childEnv), 'User', 'settings.json'),
    };
    // Persist the admission before starting the original wizard host. The host
    // must capture actual VS Code global configuration, not environment guesses.
    fs.writeFileSync(path.join(regenerationContext.root, 'invocation.json'), `${JSON.stringify(regenerationContext)}\n`);
  }
  // The existing validated wizard handoff is shared, not the Cancel observation
  // or its private mapping. No extra fixture generation or Code download occurs.
  const wizardHandoffContext = cancelContext || regenerationContext;
  if (wizardHandoffContext) {
    childEnv.LA_E2E_CLI_CANCEL_HANDOFF_PATH = wizardHandoffContext.handoffPath;
    childEnv.LA_E2E_CLI_CANCEL_CONTEXT = JSON.stringify(wizardHandoffContext);
  }
  if (regenerationContext && !childEnv.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH) {
    writeSuiteTerminalResult(childEnv, {
      label: 'workspaceArtifactRegeneration',
      complete: false,
      cleanupVerified: false,
      originalProcessClosureVerified: false,
      processClosureProof: 'original-identities-unverified',
      exitCode: null,
      signal: null,
      lifecycleFinalized: false,
      phaseResults: [],
    });
  }
  const child = spawn(command, commandArgs, {
    env: childEnv,
  });

  let output = '';

  child.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stdout.write(outputFilter.filter(text));
  });

  child.stderr.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stderr.write(outputFilter.filter(text));
  });

  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', async (code, signal) => {
      const remainingOutput = outputFilter.flush();
      if (remainingOutput) {
        process.stdout.write(remainingOutput);
      }
      let diagnosticsError;
      const diagnosticsErrors = [];
      let cleanupLedger;
      let cancelResult;
      let cancelError;
      let regenerationResult;
      let regenerationApi;
      let regenerationError;
      let regenerationWizardVerified = false;
      let regenerationEvidenceVerified = false;
      let msnBodyAssertionsPassed;
      if (regenerationContext) {
        const previousScreenshotDir = process.env.LA_E2E_CLI_SCREENSHOT_DIR;
        const previousDebugPort = process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT;
        try {
          if (code !== 0 || signal) {
            throw new Error('Original wizard host failed; regeneration cannot be credited');
          }
          process.env.LA_E2E_CLI_SCREENSHOT_DIR = path.join(regenerationContext.root, 'screenshots');
          process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT = childEnv.LA_E2E_CLI_REMOTE_DEBUGGING_PORT || '9514';
          regenerationApi = require('../out/test/e2e/workspaceArtifactRegeneration.test');
          const originalHandoff = JSON.parse(fs.readFileSync(regenerationContext.handoffPath, 'utf8'));
          const handoff = {
            ...cancelCheck.adaptCancelHandoff(originalHandoff, regenerationContext),
            runtimeSettings: originalHandoff.runtimeSettings,
          };
          require('../out/test/e2e/workspaceArtifactRegenerationRuntime').verifyRegenerationRuntimeSettings(
            handoff.runtimeSettings,
            regenerationContext
          );
          regenerationWizardVerified = true;
          regenerationResult = await regenerationApi.runWorkspaceArtifactRegeneration(regenerationContext, handoff, {
            ...childEnv,
            LA_E2E_CLI_REMOTE_DEBUGGING_PORT: process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT,
          });
          if (!regenerationResult.observationPassed) {
            throw new Error(`Required regeneration observation failed: ${regenerationResult.errors.join('; ')}`);
          }
        } catch (error) {
          regenerationError = error;
          markOwnedWorkspaceParentsWithDiagnosticFailure(childEnv, [deferredWorkspaceParent].filter(Boolean));
          fs.writeFileSync(
            regenerationContext.resultPath,
            `${JSON.stringify(regenerationResult || { scenario: 'workspace-artifact-regeneration', complete: false, errors: [String(error)] }, null, 2)}\n`
          );
          console.error(`[workspace-regeneration] ${String(error)}`);
        } finally {
          diagnosticsErrors.push(...collectRegenerationProfileLogs(regenerationContext.root, childEnv));
          if (previousScreenshotDir === undefined) {
            delete process.env.LA_E2E_CLI_SCREENSHOT_DIR;
          } else {
            process.env.LA_E2E_CLI_SCREENSHOT_DIR = previousScreenshotDir;
          }
          if (previousDebugPort === undefined) {
            delete process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT;
          } else {
            process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT = previousDebugPort;
          }
        }
      }
      if (cancelContext) {
        try {
          if (code !== 0 || signal) {
            throw new Error('Original wizard host failed; supplementary Cancel cannot be credited');
          }
          cancelResult = await cancelCheck.runCancelSupplement(cancelContext, childEnv, collectVscodeProfileLogs);
        } catch (error) {
          cancelError = error;
          cancelResult = {
            schemaVersion: 1,
            scenario: 'workspace-prompt-cancel',
            invocation: cancelContext.invocation,
            identity: cancelContext.identity,
            invocationCount: 0,
            observationPassed: false,
            originalCodeClose: null,
            errors: [String(error)],
            complete: false,
          };
          console.error(`[workspace-cancel] ${String(error)}`);
        }
      }
      try {
        captureGeneratedWorkspaceDiagnostics({
          env: childEnv,
          label,
          outcome: code === 0 ? 'success' : 'failure',
          ownedRoots: [deferredWorkspaceParent].filter(Boolean),
        });
      } catch (error) {
        diagnosticsError = error;
        diagnosticsErrors.push(error);
        markOwnedWorkspaceParentsWithDiagnosticFailure(childEnv, [deferredWorkspaceParent].filter(Boolean));
        console.error(
          `[generated-workspace-diagnostics] Failed to capture generated workspace diagnostics; preserving owned workspace data: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
      try {
        collectVscodeProfileLogs(label, childEnv);
      } catch (error) {
        diagnosticsError = error;
        diagnosticsErrors.push(error);
        markOwnedWorkspaceParentsWithDiagnosticFailure(childEnv, [deferredWorkspaceParent].filter(Boolean));
        console.error(
          `[vscode-test-cli] Failed to capture required VS Code profile diagnostics: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
      const matchedPattern = forbiddenOutputPatterns.find(({ pattern }) => pattern.test(output));
      if (regenerationContext && regenerationResult && regenerationApi) {
        try {
          regenerationApi.assertWorkspaceArtifactRegenerationEvidence(regenerationContext, regenerationResult, [
            ...diagnosticsErrors,
            ...(regenerationError ? [regenerationError] : []),
            ...(matchedPattern ? [matchedPattern.name] : []),
          ]);
          regenerationEvidenceVerified = true;
        } catch (error) {
          regenerationError = error;
          markOwnedWorkspaceParentsWithDiagnosticFailure(childEnv, [deferredWorkspaceParent].filter(Boolean));
          console.error(`[workspace-regeneration] Required pre-cleanup evidence validation failed: ${String(error)}`);
        }
      }
      if (label === 'msnWeatherLifecycle' && childEnv.LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE === 'msn-weather-run') {
        try {
          msnBodyAssertionsPassed = require('./msn-cleanup-diagnostics').readMsnBodyAssertions({
            outputDir: childEnv.LA_E2E_CLI_MSN_DIAGNOSTICS_DIR,
            invocation: childEnv.LA_E2E_CLI_MSN_LIFECYCLE_INVOCATION,
          });
        } catch (error) {
          diagnosticsError = error;
          diagnosticsErrors.push(error);
          markOwnedWorkspaceParentsWithDiagnosticFailure(childEnv, [deferredWorkspaceParent].filter(Boolean));
        }
      }
      cleanupLedger =
        options.retainWorkspaceForSupplement && childEnv.LA_E2E_CLI_MULTI_ROOT_HANDOFF
          ? {
              verified: fs.existsSync(deferredWorkspaceParent),
              action: 'retained-for-multi-root',
              reason: 'Final cleanup belongs to the supplementary family after its original regular window closes.',
            }
          : await cleanupDeferredWorkspaceAfterCancel(deferredWorkspaceParent, childEnv, cancelResult || regenerationResult);
      const phaseId =
        options.multiRootCreatePhase && childEnv.LA_E2E_CLI_MULTI_ROOT_HANDOFF
          ? 'workspaceMultiRoot:create'
          : getSuitePhaseId(label, childEnv);
      const ownHttpInvocation = childEnv.LA_E2E_CLI_HTTP_TIMEOUT_COMPOSE_INVOCATION_ID;
      const requireDirectHttpPhaseClosure = requiresDirectHttpPhaseClosure(childEnv);
      const processCleanup = requireDirectHttpPhaseClosure
        ? { ...(await verifyNoOwnedDescendants(child.pid)), ownerPid: child.pid }
        : undefined;
      const diagnosticsErrorMessage = diagnosticsError
        ? diagnosticsError instanceof Error
          ? diagnosticsError.message
          : String(diagnosticsError)
        : '';
      if (cancelContext) {
        try {
          cancelResult.originalWizardClose = { code, signal };
          cancelCheck.finalizeCancelResult(cancelContext, cancelResult, cleanupLedger, diagnosticsErrors);
          cancelCheck.assertCancelResult(cancelResult, cancelContext.root, cancelContext.identity);
        } catch (error) {
          cancelError = error;
          console.error(`[workspace-cancel] Required supplementary acceptance failed: ${String(error)}`);
        }
      }
      if (regenerationContext && regenerationResult && regenerationApi) {
        try {
          assert.equal(regenerationEvidenceVerified, true, 'Pre-cleanup regeneration evidence was not verified');
          regenerationApi.finalizeWorkspaceArtifactRegeneration(regenerationContext, regenerationResult, cleanupLedger, [
            ...diagnosticsErrors,
            ...(regenerationError ? [regenerationError] : []),
            ...(matchedPattern ? [matchedPattern.name] : []),
          ]);
        } catch (error) {
          regenerationError = error;
          console.error(`[workspace-regeneration] Required final acceptance failed: ${String(error)}`);
        }
      }
      const phasePassed =
        code === 0 &&
        cleanupLedger.verified === true &&
        !diagnosticsError &&
        !matchedPattern &&
        !cancelError &&
        !regenerationError &&
        (!requireDirectHttpPhaseClosure ||
          (signal === null && processCleanup?.verified === true && Number.isInteger(child.pid) && getMochaPassingCount(output) > 0));
      if (regenerationContext) {
        const errors = [
          ...diagnosticsErrors.map(String),
          ...(regenerationError ? [String(regenerationError)] : []),
          ...(matchedPattern ? [matchedPattern.name] : []),
          ...(regenerationResult?.errors || []),
        ];
        const regenerationPhases = regenerationApi
          ? regenerationApi.buildRegenerationPhaseResults({
              wizard: {
                code,
                signal,
                verified: regenerationWizardVerified,
                mochaPassingCount: getMochaPassingCount(output),
              },
              hosts: regenerationResult?.hosts || [],
              complete: regenerationResult?.complete === true && phasePassed,
              cleanupVerified: cleanupLedger.verified,
              errors,
            })
          : [
              {
                label: 'workspaceArtifactRegeneration',
                phaseId: 'workspaceArtifactRegeneration:create',
                exitCode: code,
                signal,
                complete: false,
                diagnosticsError: errors.join('; '),
                cleanupVerified: cleanupLedger.verified,
                mochaPassingCount: getMochaPassingCount(output),
                ogfScenarios: [],
              },
            ];
        for (const phase of regenerationPhases) {
          writeSuitePhaseResult(childEnv, { ...phase, cleanupLedger });
        }
        try {
          const terminal = publishRegenerationStageEvidence(regenerationContext, regenerationResult, regenerationPhases, cleanupLedger);
          assertRegenerationStageEvidence(regenerationContext.root, regenerationContext.identity);
          writeDirectRegenerationEvidence(regenerationContext, terminal, cleanupLedger);
        } catch (error) {
          regenerationError = error;
          console.error(`[workspace-regeneration] Strict family staging evidence failed: ${String(error)}`);
          if (regenerationResult) {
            regenerationResult.complete = false;
            regenerationResult.errors.push(String(error));
            try {
              const terminal = publishRegenerationStageEvidence(regenerationContext, regenerationResult, regenerationPhases, cleanupLedger);
              writeDirectRegenerationEvidence(regenerationContext, terminal, cleanupLedger);
            } catch (publishError) {
              console.error(`[workspace-regeneration] Failed to retain unsuccessful staging result: ${String(publishError)}`);
            }
          }
        }
      } else {
        writeSuitePhaseResult(childEnv, {
          phaseId,
          label,
          exitCode: code,
          signal,
          cleanupVerified: cleanupLedger.verified,
          diagnosticsError: diagnosticsErrorMessage,
          complete: phasePassed,
          cleanupLedger,
          mochaPassingCount: getMochaPassingCount(output),
          ogfScenarios: buildOgfScenariosForPhase(phaseId, childEnv, { passed: phasePassed }),
          ...(msnBodyAssertionsPassed !== undefined ? { bodyAssertionsPassed: msnBodyAssertionsPassed } : {}),
          ...(ownHttpInvocation
            ? {
                invocationId: ownHttpInvocation,
                phaseStartedAt,
                phaseFinishedAt: new Date().toISOString(),
                processCleanup,
              }
            : {}),
        });
      }

      if (diagnosticsError) {
        reject(new AggregateError(diagnosticsErrors, 'Required original workspace/profile diagnostics failed'));
        return;
      }
      if (cancelError) {
        reject(cancelError);
        return;
      }
      if (regenerationError) {
        reject(regenerationError);
        return;
      }
      if (requireDirectHttpPhaseClosure && processCleanup?.verified !== true) {
        const alivePids = Array.isArray(processCleanup?.alivePids) ? processCleanup.alivePids.join(', ') : 'unavailable';
        reject(new Error(`HTTP timeout Compose original direct phase owned-descendant closure was not verified; alive PIDs: ${alivePids}`));
        return;
      }

      if (matchedPattern) {
        reject(new Error(`\n[activation-smoke] Failed because VS Code output contained: ${matchedPattern.name}`));
        return;
      }
      if (code === null || typeof code !== 'number') {
        reject(new Error(`Process exited without a numeric exit code${signal ? ` (signal: ${signal})` : ''}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`Exit code: ${code}`));
        return;
      }

      resolve(0);
    });
  });
}

function getVscodeTestCommand(args) {
  if (process.platform === 'win32') {
    return { command: process.env.ComSpec ?? 'cmd.exe', commandArgs: ['/d', '/s', '/c', 'vscode-test', ...args] };
  }

  return { command: 'vscode-test', commandArgs: args };
}

function captureGeneratedWorkspaceDiagnostics({ env, label, outcome, ownedRoots = [] }) {
  if (!shouldCaptureGeneratedWorkspaceDiagnostics(env, label, ownedRoots)) {
    return;
  }

  const scenario = sanitizeEnvSegment(env.LA_E2E_CLI_VSCODE_LOG_ARTIFACT_LABEL || label || 'default');
  const phase = sanitizeEnvSegment(env.LA_E2E_CLI_PROFILE_PHASE || env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE || label || 'run');
  const destinationRoot = getGeneratedWorkspaceSnapshotRoot();
  const snapshotName = `${scenario}__${phase}__${outcome}__${Date.now()}`;
  const snapshotRoot = path.join(destinationRoot, snapshotName);
  const workspaceRoot = path.join(snapshotRoot, 'workspaces');
  const manifestPaths = [env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_MANIFEST].filter((candidate) => candidate?.trim());
  const trustedRoots = [...ownedRoots, env.LA_E2E_CLI_WORKSPACE_PARENT, env.LA_E2E_CLI_CREATE_WORKSPACE_PARENT].filter((candidate) =>
    candidate?.trim()
  );
  const trustedRootRecords = collectTrustedSnapshotRootRecords(trustedRoots);
  const sources = collectGeneratedWorkspaceSnapshotSources({
    manifestPaths,
    ownedRoots: [env.LA_E2E_CLI_WORKSPACE_PARENT, env.LA_E2E_CLI_CREATE_WORKSPACE_PARENT, ...ownedRoots].filter((candidate) =>
      candidate?.trim()
    ),
    lifecycleCaseJson: env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE,
  });
  const snapshots = [];
  const skipped = [];

  fs.rmSync(snapshotRoot, { recursive: true, force: true });
  fs.mkdirSync(workspaceRoot, { recursive: true });

  for (const source of sources) {
    const resolvedSource = path.resolve(source.path);
    const trustedRoot = findTrustedSnapshotRoot(resolvedSource, trustedRootRecords);
    if (!trustedRoot) {
      skipped.push({
        source: source.path,
        reason: 'source is outside wrapper-created owned roots',
      });
      continue;
    }

    if (!fs.existsSync(resolvedSource)) {
      skipped.push({ source: source.path, reason: 'source path does not exist' });
      continue;
    }

    const destinationName = uniqueSnapshotName(workspaceRoot, source.label || path.basename(resolvedSource) || 'workspace');
    const destination = path.join(workspaceRoot, destinationName);
    const copyResult = copyGeneratedWorkspaceSnapshot(resolvedSource, destination, trustedRoot);
    snapshots.push({
      label: source.label || destinationName,
      kind: source.kind,
      sourcePath: resolvedSource,
      trustedRoot: trustedRoot.root,
      relativeSnapshotPath: path.relative(snapshotRoot, destination),
      copiedFiles: copyResult.copiedFiles,
      skippedFiles: copyResult.skippedFiles,
      redactedFiles: copyResult.redactedFiles,
      bytes: copyResult.bytes,
      msnWeatherLocalSettingsEvidence: collectMsnWeatherLocalSettingsEvidence(destination, snapshotRoot),
    });
  }

  if (snapshots.length === 0) {
    const reason = getNoGeneratedWorkspaceSnapshotReason({ env, label, trustedRootRecords, sources, skipped });
    fs.writeFileSync(path.join(snapshotRoot, 'no-workspace-created.txt'), `${reason}\n`);
    skipped.push({ source: '<none>', reason });
  }

  const rejectedSources = skipped.filter((entry) => entry.reason === 'source is outside wrapper-created owned roots');
  const isRunPhase = phase.toLowerCase().includes('run') || (env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE || '').toLowerCase().includes('run');
  const hasOnlyRejectedDiscoveredRunSources = isRunPhase && snapshots.length === 0 && sources.length > 0 && rejectedSources.length > 0;

  const metadata = {
    capturedAt: new Date().toISOString(),
    label: label || '',
    phase,
    scenario,
    outcome,
    platform: process.platform,
    arch: process.arch,
    sourceWorkspacePaths: sources.map((source) => source.path),
    trustedRoots: trustedRootRecords.map((root) => root.root),
    manifestPaths,
    snapshots,
    skipped,
    notes: [
      'Snapshot reflects files on disk at VS Code host exit; unsaved designer canvas state may be missing if failure happened before save.',
      'Secrets are recursively redacted from allowlisted JSON/text project files; unhandled or credential-bearing formats are omitted.',
      'Excluded bulky/generated folders include .git, node_modules, bin, obj, .vscode-test, VS Code user storage, extensions, and files over 1 MiB.',
    ],
  };
  writeGeneratedWorkspaceSnapshotIndex(snapshotRoot, metadata);
  appendGeneratedWorkspaceRootIndex(destinationRoot, snapshotName, metadata);
  console.log(`[generated-workspace-diagnostics] Captured ${snapshots.length} workspace snapshot(s): ${snapshotRoot}`);
  if (hasOnlyRejectedDiscoveredRunSources) {
    markOwnedWorkspaceParentsWithDiagnosticFailure(env, ownedRoots);
    throw new Error(
      [
        'Generated workspace diagnostics rejected discovered workspace source(s) outside wrapper-created owned roots.',
        'The run phase must carry LA_E2E_CLI_WORKSPACE_PARENT/LA_E2E_CLI_CREATE_WORKSPACE_PARENT from the create phase; manifest or case paths alone are not trusted.',
        `Rejected sources: ${rejectedSources.map((entry) => entry.source).join(', ')}`,
      ].join(' ')
    );
  }
}

function getNoGeneratedWorkspaceSnapshotReason({ env, label, trustedRootRecords, sources = [], skipped = [] }) {
  if (label === 'createWorkspaceBehavior') {
    return [
      'createWorkspaceBehavior intentionally validates Create Workspace wizard content, field validation, review/back, and app-type cleanup without clicking Create.',
      'No generated Logic App project/workspace is expected for this label.',
    ].join(' ');
  }

  const rejectedSources = skipped.filter((entry) => entry.reason === 'source is outside wrapper-created owned roots');
  if (sources.length > 0 && rejectedSources.length > 0) {
    return [
      'generated workspace source(s) were discovered but rejected because no matching wrapper-created owned root was registered for this phase.',
      'This usually means the run phase did not carry LA_E2E_CLI_WORKSPACE_PARENT/LA_E2E_CLI_CREATE_WORKSPACE_PARENT from the create phase; manifest or case paths alone are not trusted.',
      `Rejected sources: ${rejectedSources.map((entry) => entry.source).join(', ')}`,
    ].join(' ');
  }

  if (trustedRootRecords.length === 0 && env.LA_E2E_CLI_PRESERVE_WORKSPACES === '1') {
    return 'workspace cleanup is preserved and no harness-owned snapshot root was registered for this phase';
  }

  if (trustedRootRecords.length === 0) {
    return 'no workspace created before this phase (for example, bootstrap failed before create)';
  }

  return 'no snapshot-eligible generated workspace files were found under registered roots';
}

function shouldCaptureGeneratedWorkspaceDiagnostics() {
  return true;
}

function getGeneratedWorkspaceSnapshotRoot() {
  return path.resolve(
    process.env.LA_E2E_CLI_GENERATED_WORKSPACE_ARTIFACT_DIR ||
      path.join(__dirname, '..', '.vscode-test', generatedWorkspaceSnapshotDirectoryName)
  );
}

function collectGeneratedWorkspaceSnapshotSources({ manifestPaths = [], ownedRoots = [], lifecycleCaseJson }) {
  const sources = [];

  for (const source of getWorkspaceSourcesFromLifecycleCase(lifecycleCaseJson)) {
    sources.push(source);
  }

  for (const manifestPath of manifestPaths) {
    for (const source of getWorkspaceSourcesFromManifestPath(manifestPath)) {
      sources.push(source);
    }
  }

  for (const ownedRoot of ownedRoots) {
    sources.push(...getWorkspaceSourcesFromOwnedRoot(ownedRoot));
  }

  const seen = new Set();
  return sources.filter((source) => {
    const key = normalizeSnapshotPathKey(source.path);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getWorkspaceSourcesFromLifecycleCase(lifecycleCaseJson) {
  if (!lifecycleCaseJson?.trim()) {
    return [];
  }

  try {
    const entry = JSON.parse(lifecycleCaseJson);
    return getWorkspaceSourcesFromManifestEntries([entry], 'lifecycle-case');
  } catch (error) {
    console.warn(`[generated-workspace-diagnostics] Unable to parse lifecycle case JSON: ${String(error)}`);
    return [];
  }
}

function getWorkspaceSourcesFromManifestPath(manifestPath) {
  if (!manifestPath || !fs.existsSync(manifestPath)) {
    return [];
  }

  try {
    const entries = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    return getWorkspaceSourcesFromManifestEntries(Array.isArray(entries) ? entries : [entries], `manifest:${manifestPath}`);
  } catch (error) {
    console.warn(`[generated-workspace-diagnostics] Unable to parse workspace manifest ${manifestPath}: ${String(error)}`);
    return [];
  }
}

function getWorkspaceSourcesFromManifestEntries(entries, kind) {
  return entries
    .map((entry, index) => {
      const workspacePath = entry?.workspaceDir || entry?.wsDir || entry?.parentDir;
      if (typeof workspacePath !== 'string' || !workspacePath.trim()) {
        return undefined;
      }

      return {
        kind,
        label: sanitizeEnvSegment(entry.label || entry.wsName || `workspace-${index + 1}`),
        path: workspacePath,
      };
    })
    .filter(Boolean);
}

function getWorkspaceSourcesFromOwnedRoot(ownedRoot) {
  if (!ownedRoot || !fs.existsSync(ownedRoot)) {
    return [];
  }

  if (looksLikeGeneratedWorkspaceRoot(ownedRoot)) {
    return [
      {
        kind: 'owned-root',
        label: sanitizeEnvSegment(path.basename(ownedRoot)),
        path: ownedRoot,
      },
    ];
  }

  const entries = fs.readdirSync(ownedRoot, { withFileTypes: true });
  if (entries.length === 0) {
    return [];
  }

  return entries
    .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
    .map((entry) => ({
      kind: 'owned-root-child',
      label: sanitizeEnvSegment(entry.name),
      path: path.join(ownedRoot, entry.name),
    }));
}

function looksLikeGeneratedWorkspaceRoot(directory) {
  if (!fs.existsSync(directory) || !fs.lstatSync(directory).isDirectory()) {
    return false;
  }

  const entries = fs.readdirSync(directory);
  return entries.some((entry) => entry.endsWith('.code-workspace')) || fs.existsSync(path.join(directory, 'host.json'));
}

function collectTrustedSnapshotRootRecords(roots) {
  const seen = new Set();
  const records = [];
  for (const root of roots) {
    if (!root?.trim()) {
      continue;
    }

    const resolvedRoot = path.resolve(root);
    const key = normalizeSnapshotPathKey(resolvedRoot);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    if (!fs.existsSync(resolvedRoot)) {
      continue;
    }

    const stat = fs.lstatSync(resolvedRoot);
    if (stat.isSymbolicLink()) {
      throw new Error(`Generated workspace trusted root is a symlink/reparse point and cannot be snapshotted safely: ${resolvedRoot}`);
    }
    if (!stat.isDirectory()) {
      throw new Error(`Generated workspace trusted root is not a directory: ${resolvedRoot}`);
    }

    records.push({
      root: resolvedRoot,
      realRoot: fs.realpathSync(resolvedRoot),
    });
  }
  return records;
}

function findTrustedSnapshotRoot(sourcePath, trustedRootRecords) {
  const resolvedSource = path.resolve(sourcePath);
  for (const record of trustedRootRecords) {
    if (!isPathInsideSnapshotRoot(resolvedSource, record.root)) {
      continue;
    }

    if (!fs.existsSync(resolvedSource)) {
      return record;
    }

    const stat = fs.lstatSync(resolvedSource);
    if (stat.isSymbolicLink()) {
      throw new Error(`Generated workspace snapshot source is a symlink/reparse point and cannot be trusted: ${resolvedSource}`);
    }

    const realSource = fs.realpathSync(resolvedSource);
    if (!isPathInsideSnapshotRoot(realSource, record.realRoot)) {
      throw new Error(`Generated workspace snapshot source escapes trusted root: ${resolvedSource}`);
    }
    return record;
  }
  return undefined;
}

function isPathInsideSnapshotRoot(candidatePath, rootPath) {
  const resolvedCandidate = path.resolve(candidatePath);
  const resolvedRoot = path.resolve(rootPath);
  if (normalizeSnapshotPathKey(resolvedCandidate) === normalizeSnapshotPathKey(resolvedRoot)) {
    return true;
  }
  const relative = path.relative(resolvedRoot, resolvedCandidate);
  return Boolean(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function normalizeSnapshotPathKey(filePath) {
  const resolved = path.resolve(filePath);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function copyGeneratedWorkspaceSnapshot(source, destination, trustedRootRecord = createStandaloneTrustedSnapshotRootRecord(source)) {
  const sourceStat = fs.lstatSync(source);
  if (sourceStat.isSymbolicLink()) {
    throw new Error(`Generated workspace snapshot source is a symlink/reparse point and cannot be copied safely: ${source}`);
  }

  const resolvedSource = path.resolve(source);
  const realSource = fs.realpathSync(resolvedSource);
  if (
    !isPathInsideSnapshotRoot(resolvedSource, trustedRootRecord.root) ||
    !isPathInsideSnapshotRoot(realSource, trustedRootRecord.realRoot)
  ) {
    throw new Error(`Generated workspace snapshot source is outside the trusted owned root: ${source}`);
  }

  const result = {
    bytes: 0,
    copiedFiles: 0,
    redactedFiles: 0,
    skippedFiles: [],
  };
  fs.mkdirSync(destination, { recursive: true });
  copyGeneratedWorkspaceEntry(resolvedSource, resolvedSource, destination, result, trustedRootRecord.realRoot);
  if (result.skippedFiles.length > 0) {
    fs.writeFileSync(
      path.join(destination, 'SNAPSHOT_SKIPPED_FILES.md'),
      `${result.skippedFiles.map((entry) => `- ${entry}`).join('\n')}\n`
    );
  }
  return result;
}

function createStandaloneTrustedSnapshotRootRecord(source) {
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) {
    throw new Error(`Generated workspace snapshot source is a symlink/reparse point and cannot be trusted: ${source}`);
  }
  const resolvedSource = path.resolve(source);
  return {
    root: resolvedSource,
    realRoot: fs.realpathSync(resolvedSource),
  };
}

function copyGeneratedWorkspaceEntry(root, current, destination, result, trustedRealRoot) {
  const relative = path.relative(root, current);
  const displayRelative = relative || '.';
  const stat = fs.lstatSync(current);
  if (stat.isSymbolicLink()) {
    result.skippedFiles.push(`${displayRelative} (symlink/reparse point skipped)`);
    return;
  }

  const realCurrent = fs.realpathSync(current);
  if (!isPathInsideSnapshotRoot(realCurrent, trustedRealRoot)) {
    result.skippedFiles.push(`${displayRelative} (escaped snapshot root)`);
    return;
  }

  if (relative && shouldExcludeGeneratedWorkspaceSnapshotPath(relative, stat)) {
    result.skippedFiles.push(`${displayRelative} (excluded generated/bulky path)`);
    return;
  }

  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      copyGeneratedWorkspaceEntry(root, path.join(current, entry.name), path.join(destination, entry.name), result, trustedRealRoot);
    }
    return;
  }

  if (!stat.isFile()) {
    result.skippedFiles.push(`${displayRelative} (non-file entry skipped)`);
    return;
  }

  if (stat.size > generatedWorkspaceSnapshotMaxFileBytes) {
    result.skippedFiles.push(`${displayRelative} (${stat.size} bytes exceeds ${generatedWorkspaceSnapshotMaxFileBytes})`);
    return;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (shouldOmitUnsafeGeneratedWorkspaceSnapshotFile(current)) {
    result.skippedFiles.push(`${displayRelative} (unsafe or unhandled file type omitted)`);
  } else if (shouldTreatAsTextSnapshotFile(current)) {
    const original = fs.readFileSync(current, 'utf-8');
    let redacted;
    try {
      redacted = redactGeneratedWorkspaceText(original, current);
    } catch (error) {
      if (error instanceof SnapshotFileOmittedError) {
        result.skippedFiles.push(`${displayRelative} (${error.message})`);
        return;
      }
      throw error;
    }
    fs.writeFileSync(destination, redacted);
    result.bytes += Buffer.byteLength(redacted);
    result.redactedFiles += redacted === original ? 0 : 1;
  } else {
    result.skippedFiles.push(`${displayRelative} (non-allowlisted binary file omitted)`);
    return;
  }
  result.copiedFiles += 1;
}

function shouldExcludeGeneratedWorkspaceSnapshotPath(relativePath, stat) {
  const parts = relativePath.split(/[\\/]+/);
  if (parts.some((part) => generatedWorkspaceSnapshotExcludedNames.has(part))) {
    return true;
  }

  return stat.size > generatedWorkspaceSnapshotMaxFileBytes;
}

function shouldTreatAsTextSnapshotFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return (
    generatedWorkspaceSnapshotSafeTextExtensions.has(extension) &&
    !generatedWorkspaceSnapshotDangerousFileNames.has(path.basename(filePath).toLowerCase())
  );
}

function shouldOmitUnsafeGeneratedWorkspaceSnapshotFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath).toLowerCase();
  return generatedWorkspaceSnapshotDangerousExtensions.has(extension) || generatedWorkspaceSnapshotDangerousFileNames.has(fileName);
}

function redactGeneratedWorkspaceText(content, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.json' || extension === '.code-workspace') {
    try {
      return `${JSON.stringify(redactGeneratedWorkspaceJsonValue(JSON.parse(content)), null, 2)}\n`;
    } catch {
      throw new SnapshotFileOmittedError('unparseable JSON/JSONC omitted because it cannot be safely redacted');
    }
  }

  return redactGeneratedWorkspacePlainText(content);
}

function redactGeneratedWorkspaceJsonValue(value, key = '') {
  if (key && generatedWorkspaceSnapshotSecretKeyPattern.test(key)) {
    return '<redacted>';
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactGeneratedWorkspaceJsonValue(entry, ''));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redactGeneratedWorkspaceJsonValue(entryValue, entryKey)])
    );
  }

  if (typeof value === 'string') {
    return redactGeneratedWorkspacePlainText(value);
  }

  return value;
}

function redactGeneratedWorkspacePlainText(content) {
  let redacted = content.replace(/(Authorization\s*[:=]\s*Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1<redacted>');
  redacted = redacted.replace(
    /((?:access[_-]?token|account[_-]?key|api[_-]?key|authorization|authentication|azurewebjobsstorage|client[_-]?secret|connection[_-]?key|connection[_-]?runtime[_-]?url|connection[_-]?string|credential|password|sas|secret|sig|signature|token)\s*[=:]\s*)("[^"]*"|'[^']*'|[^\s,;]+)/gi,
    '$1<redacted>'
  );
  redacted = redacted.replace(
    /((?:access[_-]?token|account[_-]?key|api[_-]?key|authorization|authentication|azurewebjobsstorage|client[_-]?secret|connection[_-]?key|connection[_-]?runtime[_-]?url|connection[_-]?string|credential|password|sas|secret|sig|signature|token)["']?\s*:\s*)("[^"]*"|'[^']*'|[^\s,}\]]+)/gi,
    '$1<redacted>'
  );
  redacted = redacted.replace(
    /<\s*(authentication|credentials|password|secret|token|authorization|connectionstring|connection-string|apikey|api-key|key)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    (_match, tagName) => `<${tagName}><redacted></${tagName}>`
  );
  redacted = redacted.replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1<redacted>');
  redacted = redacted.replace(/https?:\/\/[^\s"')]+/gi, (url) => redactGeneratedWorkspaceUrl(url));
  return redacted;
}

class SnapshotFileOmittedError extends Error {}

function redactGeneratedWorkspaceUrl(value) {
  try {
    const url = new URL(value);
    let changed = false;
    for (const key of Array.from(url.searchParams.keys())) {
      if (generatedWorkspaceSnapshotSecretQueryPattern.test(key)) {
        url.searchParams.set(key, '<redacted>');
        changed = true;
      }
    }
    return changed ? url.toString() : value;
  } catch {
    return value;
  }
}

function uniqueSnapshotName(parent, label) {
  const base = sanitizeEnvSegment(label || 'workspace') || 'workspace';
  let candidate = base;
  let index = 1;
  while (fs.existsSync(path.join(parent, candidate))) {
    index += 1;
    candidate = `${base}-${index}`;
  }
  return candidate;
}

function collectMsnWeatherLocalSettingsEvidence(snapshotWorkspaceRoot, snapshotRoot) {
  return walkFiles(snapshotWorkspaceRoot)
    .filter((filePath) => path.basename(filePath).startsWith('msn-weather-local-settings-') && path.extname(filePath) === '.json')
    .map((filePath) => {
      try {
        const evidence = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const statuses = Object.entries(evidence.keys ?? {}).map(([key, value]) => `${key}=${value?.status ?? 'unknown'}`);
        return {
          relativePath: path.relative(snapshotRoot, filePath),
          stage: evidence.stage ?? path.basename(filePath, '.json'),
          requiredKeys: Array.isArray(evidence.requiredKeys) ? evidence.requiredKeys : [],
          summary: statuses.length > 0 ? statuses.join(', ') : 'no key statuses recorded',
        };
      } catch (error) {
        return {
          relativePath: path.relative(snapshotRoot, filePath),
          stage: path.basename(filePath, '.json'),
          requiredKeys: [],
          summary: `unable to parse evidence: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    });
}

function writeGeneratedWorkspaceSnapshotIndex(snapshotRoot, metadata) {
  fs.writeFileSync(path.join(snapshotRoot, 'index.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  const lines = [
    '# Generated workspace snapshot',
    '',
    `Scenario: ${metadata.scenario}`,
    `Phase: ${metadata.phase}`,
    `Outcome: ${metadata.outcome}`,
    `Platform: ${metadata.platform}`,
    '',
    '## Snapshot notes',
    '',
    ...metadata.notes.map((note) => `- ${note}`),
    '',
    '## Sources',
    '',
    ...(metadata.snapshots.length > 0
      ? metadata.snapshots.map(
          (snapshot) =>
            `- ${snapshot.label}: ${snapshot.sourcePath} -> ${snapshot.relativeSnapshotPath} (${snapshot.copiedFiles} files, ${snapshot.bytes} bytes, ${snapshot.redactedFiles} redacted)`
        )
      : ['- no workspace created']),
    '',
    '## Skipped',
    '',
    ...(metadata.skipped.length > 0 ? metadata.skipped.map((entry) => `- ${entry.source}: ${entry.reason}`) : ['- none']),
    '',
    '## MSN Weather local.settings evidence',
    '',
    ...metadata.snapshots.flatMap((snapshot) =>
      snapshot.msnWeatherLocalSettingsEvidence.length > 0
        ? snapshot.msnWeatherLocalSettingsEvidence.map(
            (entry) => `- ${snapshot.label} ${entry.stage}: ${entry.summary} (${entry.relativePath})`
          )
        : [`- ${snapshot.label}: none`]
    ),
    '',
  ];
  fs.writeFileSync(path.join(snapshotRoot, 'index.md'), `${lines.join('\n')}\n`);
}

function appendGeneratedWorkspaceRootIndex(destinationRoot, snapshotName, metadata) {
  fs.mkdirSync(destinationRoot, { recursive: true });
  const indexPath = path.join(destinationRoot, 'index.md');
  if (!fs.existsSync(indexPath)) {
    fs.writeFileSync(
      indexPath,
      [
        '# Generated workspace diagnostics',
        '',
        'Snapshots are redacted on-disk generated workspace copies captured before test cleanup.',
        '',
        '| Captured | Scenario | Phase | Outcome | Platform | Snapshot | Sources |',
        '|---|---|---|---|---|---|---|',
      ].join('\n') + '\n'
    );
  }

  fs.appendFileSync(
    indexPath,
    `| ${metadata.capturedAt} | ${metadata.scenario} | ${metadata.phase} | ${metadata.outcome} | ${metadata.platform} | ${snapshotName}/index.md | ${metadata.snapshots.length} |\n`
  );
  fs.appendFileSync(path.join(destinationRoot, 'index.jsonl'), `${JSON.stringify({ snapshotName, ...metadata })}\n`);
}

function collectVscodeProfileLogs(label, env) {
  const userDataDir = getVscodeUserDataDir(env);
  const sourceLogsDir = path.join(userDataDir, 'logs');
  const logRoot =
    env.LA_E2E_CLI_VSCODE_LOG_DIR ??
    process.env.LA_E2E_CLI_VSCODE_LOG_DIR ??
    path.resolve(__dirname, '..', '.vscode-test', 'vscode-logs', 'cli');
  const artifactLabel = env.LA_E2E_CLI_VSCODE_LOG_ARTIFACT_LABEL?.trim() || label || 'default';
  const profileName = sanitizeEnvSegment(
    [env.LA_E2E_CLI_PROFILE_PHASE, env.LA_E2E_CLI_USER_DATA_SUFFIX].filter((part) => part?.trim()).join('__') || 'default'
  );
  const destination = path.join(logRoot, sanitizeEnvSegment(artifactLabel), profileName);

  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });

  if (!fs.existsSync(sourceLogsDir)) {
    fs.writeFileSync(path.join(destination, 'batch-diagnostic-failure.txt'), `VS Code profile logs were not found at ${sourceLogsDir}\n`);
    throw new Error(`Required VS Code profile logs were not found at ${sourceLogsDir}`);
  }

  const logsCopy = copySanitizedVscodeProfileLogs(sourceLogsDir, path.join(destination, 'logs'));
  const channelLogs = copyAzureLogicAppsChannelLogs(sourceLogsDir, destination);
  const expectAzureLogicAppsChannel = env.LA_E2E_CLI_EXPECT_AZURE_LOGIC_APPS_CHANNEL === '1';
  if (expectAzureLogicAppsChannel && channelLogs.length === 0) {
    fs.writeFileSync(
      path.join(destination, 'batch-diagnostic-failure.txt'),
      `Expected Azure Logic Apps (Standard) output-channel logs were not found under ${sourceLogsDir}\n`
    );
    throw new Error(`Expected Azure Logic Apps (Standard) output-channel logs were not found under ${sourceLogsDir}`);
  }

  writeVscodeProfileLogIndex(destination, {
    label: label ?? 'default',
    phase: env.LA_E2E_CLI_PROFILE_PHASE ?? '',
    userDataSuffix: env.LA_E2E_CLI_USER_DATA_SUFFIX ?? '',
    sourceLogsDir,
    userDataDir,
    channelLogs,
    logsCopy,
    expectAzureLogicAppsChannel,
  });
  console.log(`[vscode-test-cli] Captured VS Code profile logs: ${sourceLogsDir} -> ${destination}`);
}

function copyAzureLogicAppsChannelLogs(sourceLogsDir, destination) {
  const channelLogs = findAzureLogicAppsChannelLogs(sourceLogsDir);
  const channelDestination = path.join(destination, 'azure-logic-apps-channel');
  fs.mkdirSync(channelDestination, { recursive: true });

  for (const [index, source] of channelLogs.entries()) {
    const relativeSource = path.relative(sourceLogsDir, source);
    const destinationName = `${String(index + 1).padStart(2, '0')}-${sanitizeEnvSegment(relativeSource)}.log`;
    copySanitizedTextFile(source, path.join(channelDestination, destinationName), {
      root: sourceLogsDir,
      allowAzureLogicAppsChannelName: true,
    });
  }

  if (channelLogs.length === 0) {
    fs.writeFileSync(
      path.join(channelDestination, 'missing-azure-logic-apps-channel.txt'),
      `No Azure Logic Apps (Standard) output-channel logs were found under ${sourceLogsDir}\n`
    );
  }

  return channelLogs.map((source) => path.relative(sourceLogsDir, source));
}

function copySanitizedVscodeProfileLogs(sourceLogsDir, destination) {
  const result = { copiedFiles: 0, skippedFiles: [] };
  fs.mkdirSync(destination, { recursive: true });

  for (const source of walkFiles(sourceLogsDir)) {
    const relativeSource = path.relative(sourceLogsDir, source);
    try {
      if (!isSafeVscodeProfileLogFile(source, sourceLogsDir)) {
        result.skippedFiles.push({ source: relativeSource, reason: 'not in VS Code profile log allowlist' });
        continue;
      }
      copySanitizedTextFile(source, path.join(destination, sanitizeRelativeLogPath(relativeSource)), { root: sourceLogsDir });
      result.copiedFiles += 1;
    } catch (error) {
      result.skippedFiles.push({ source: relativeSource, reason: error instanceof Error ? error.message : String(error) });
    }
  }

  fs.writeFileSync(path.join(destination, 'copy-summary.json'), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

function isSafeVscodeProfileLogFile(filePath, root) {
  const relativePath = path.relative(root, filePath);
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return false;
  }
  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized.split('/').some((segment) => segment === '..' || !segment || segment.startsWith('.'))) {
    return false;
  }
  const stat = fs.lstatSync(filePath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > vscodeProfileLogMaxFileBytes) {
    return false;
  }
  const fileName = path.basename(filePath).toLowerCase();
  const extension = path.extname(fileName).toLowerCase();
  return vscodeProfileLogSafeExtensions.has(extension) || vscodeProfileLogSafeFileNames.has(fileName);
}

function copySanitizedTextFile(source, destination, options = {}) {
  if (!isSafeVscodeProfileLogFile(source, options.root ?? path.dirname(source))) {
    throw new Error('unsafe VS Code profile log file');
  }
  const original = fs.readFileSync(source, 'utf-8');
  const redacted = redactGeneratedWorkspacePlainText(original);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, redacted);
}

function sanitizeRelativeLogPath(relativePath) {
  return relativePath
    .split(/[\\/]+/)
    .filter(Boolean)
    .map((segment) => sanitizeEnvSegment(segment))
    .join(path.sep);
}

function findAzureLogicAppsChannelLogs(sourceLogsDir) {
  if (!fs.existsSync(sourceLogsDir)) {
    return [];
  }

  return walkFiles(sourceLogsDir)
    .filter((file) => /^\d+-Azure Logic Apps \(Standard\)\.log$/i.test(path.basename(file)))
    .sort();
}

function writeVscodeProfileLogIndex(destination, details) {
  const lines = [
    '# VS Code profile log index',
    '',
    `Label: ${details.label}`,
    `Phase: ${details.phase || '<not set>'}`,
    `User data suffix: ${details.userDataSuffix || '<not set>'}`,
    `User data dir: ${details.userDataDir}`,
    `Original logs dir: ${details.sourceLogsDir}`,
    `Copied log files: ${details.logsCopy?.copiedFiles ?? '<not recorded>'}`,
    '',
    '## Azure Logic Apps (Standard) channel logs',
    '',
  ];

  if (details.channelLogs.length > 0) {
    for (const channelLog of details.channelLogs) {
      lines.push(`- ${channelLog}`);
    }
  } else {
    lines.push('- <missing>');
    if (details.expectAzureLogicAppsChannel) {
      console.warn(
        `[vscode-test-cli] Expected Azure Logic Apps (Standard) output-channel logs were missing for ${details.label}/${details.phase}`
      );
    }
  }

  fs.writeFileSync(path.join(destination, 'profile-log-index.md'), `${lines.join('\n')}\n`);
}

function walkFiles(root) {
  const files = [];
  const pending = [root];

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || !fs.existsSync(current)) {
      continue;
    }

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(entryPath);
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }

  return files;
}

function getVscodeUserDataDir(env) {
  if (env.LA_E2E_CLI_USER_DATA_DIR?.trim()) {
    return path.resolve(env.LA_E2E_CLI_USER_DATA_DIR);
  }

  const checkoutHash = createHash('sha1').update(path.resolve(__dirname, '..')).digest('hex').slice(0, 8);
  const userDataSuffix = env.LA_E2E_CLI_USER_DATA_SUFFIX?.trim();
  if (env.LA_E2E_CLI_USER_DATA_PARENT?.trim()) {
    return path.resolve(env.LA_E2E_CLI_USER_DATA_PARENT, userDataSuffix ? `user-data-${userDataSuffix}` : `user-data-${process.pid}`);
  }

  if (process.platform === 'win32') {
    return path.resolve(__dirname, '..', '.vscode-test', userDataSuffix ? `user-data-${userDataSuffix}` : 'user-data');
  }

  return path.join(os.tmpdir(), `la-vscode-test-${checkoutHash}-${userDataSuffix || process.pid}`);
}

function createOutputFilter() {
  let pendingLine = '';
  let hasLoggedSuppression = false;

  return {
    filter(text) {
      if (process.env.LA_E2E_CLI_SHOW_VSCODE_NOISE === '1') {
        return text;
      }

      pendingLine += text.replace(/\r\n/g, '\n');
      const lines = pendingLine.split('\n');
      pendingLine = lines.pop() ?? '';

      return lines
        .map((line) => {
          if (!shouldSuppressKnownVscodeNoise(line)) {
            return `${line}\n`;
          }

          if (hasLoggedSuppression) {
            return '';
          }

          hasLoggedSuppression = true;
          return '[vscode-test] Suppressed known VS Code host noise. Set LA_E2E_CLI_SHOW_VSCODE_NOISE=1 to show raw host output.\n';
        })
        .join('');
    },
    flush() {
      if (!pendingLine) {
        return '';
      }

      const line = pendingLine;
      pendingLine = '';
      return shouldSuppressKnownVscodeNoise(line) ? '' : line;
    },
  };
}

function shouldSuppressKnownVscodeNoise(line) {
  return knownVscodeNoisePatterns.some((pattern) => pattern.test(line));
}

module.exports = {
  redactDiagnosticText: redactGeneratedWorkspacePlainText,
  runDirectFamily,
  _test: {
    getDirectRegenerationEvidencePaths,
    beginDirectRegenerationEvidence,
    writeDirectRegenerationEvidence,
    publishRegenerationStageEvidence,
    assertRegenerationStageEvidence,
    assertSafeRuntimeDependenciesRoot,
    canUseInteractiveMsnWeatherAzureTargetEnv,
    captureGeneratedWorkspaceDiagnostics,
    collectVscodeProfileLogs,
    collectRegenerationProfileLogs,
    collectRuntimeDependencyDiagnostics,
    applyControlledFuncEnvironment,
    collectGeneratedWorkspaceSnapshotSources,
    cleanupOwnedWorkspaceParent,
    cleanupDeferredWorkspaceAfterCancel,
    copyGeneratedWorkspaceSnapshot,
    copySanitizedVscodeProfileLogs,
    copyAzureLogicAppsChannelLogs,
    createOwnedWorkspaceParent,
    createIsolatedRuntimeDependenciesRoot,
    findAzureLogicAppsChannelLogs,
    getCodefulDebugTasksRunExtraEnv,
    runHttpTimeoutComposeOriginal,
    beginDirectHttpTimeoutComposeEvidence,
    finalizeDirectHttpTimeoutComposeEvidence,
    getMsnWeatherAzureTargetEnv,
    getMsnWeatherAzureAuthEnv,
    hasHeadlessMsnWeatherAzureAuth,
    getMsnWeatherLifecycleRunExtraEnv,
    hasOwnedWorkspaceParentDiagnosticFailure,
    getNoGeneratedWorkspaceSnapshotReason,
    getGeneratedWorkspaceSnapshotRoot,
    getVscodeUserDataDir,
    getFuncCoreToolsCandidatePaths,
    getFuncCoreToolsBinaryPath,
    getMochaPassingCount,
    runHttpTimeoutLifecycle,
    beginDirectMsnEvidence,
    finalizeDirectMsnEvidence,
    finalizeMsnLifecycleCleanup,
    runMsnWeatherLifecycle,
    getDirectSuiteComplete,
    getDirectExpectedPhaseIds,
    runStatelessVariablesLifecycle,
    getSuitePhaseId,
    getOwnedRootCleanupVerified,
    getSuiteTerminalResultPath,
    getWorkspaceSourcesFromManifestPath,
    buildOgfScenariosForPhase,
    buildBatchAggregateJUnitXml,
    clearOgfScenarios,
    collectOgfScenarios,
    safeReadDirectory,
    sanitizeInheritedGitCommandConfigEnv,
    sanitizeEnvSegment,
    redactGeneratedWorkspaceJsonValue,
    redactGeneratedWorkspacePlainText,
    runSuiteWrapperProcess,
    runDirectRegisteredSuite,
    createLinePrefixer,
    readContainmentReceipt,
    requiresDirectHttpPhaseClosure,
    requiresDirectFamilyWrapper,
    verifyFuncCoreToolsAtDependencyRoot,
    walkFiles,
    writeSuitePhaseResult,
    writeSuiteFinalEvidence,
    writeSuiteTerminalResult,
    writeVscodeProfileLogIndex,
  },
};

const knownVscodeNoisePatterns = [
  /^\[AgentHost\] (No token resolved|Clearing authentication)/,
  /^\[AgentHost:renderer\] /,
  /^\[ChatModelSelection\] event=no-model-at-toolbar-build /,
  /^Settings Sync: Account status changed from /,
  /^Unable to create workbench contribution 'chat\.contextContributions'\. \{\}/,
  /^Uncaught TypeError: Failed to fetch dynamically imported module: .*textMateTokenizationWorker\.workerMain\.js#TextMateWorker$/,
  /^\[main .* \[AgentHost:stderr\] \(node:\d+\) \[(DEP0040|DEP0005|DEP0169|DEP0190)\] DeprecationWarning: /,
  /^Unknown channel: agentHostClientProxy$/,
  /^\(node:\d+\) \[(DEP0040|DEP0005|DEP0169|DEP0190)\] DeprecationWarning: /,
  /^rejected promise not handled within 1 second: SolutionOpenError: Run into errors while opening the solution: /,
  /^stack trace: SolutionOpenError: Run into errors while opening the solution: /,
  /^\s+at .*\.vscode-test\\extensions\\ms-dotnettools\.csdevkit-/,
  /^An unknown error occurred\. Please consult the log for more details\.$/,
];

function parseArgs(rawArgs) {
  const args = [];
  let createWorkspaceFull = false;
  let visibleDelayMs;
  let workspaceLifecycle = false;
  let statelessVariablesLifecycle = false;
  let nugetConversionLifecycle = false;
  let codefulDebugTasks = false;
  let msnWeatherLifecycle = false;
  let variablesPickerLifecycle = false;
  let azureAuthWarmup = false;
  let suites;

  for (let index = 0; index < rawArgs.length; index++) {
    const arg = rawArgs[index];
    if (arg === '--visible-delay-ms') {
      visibleDelayMs = rawArgs[index + 1];
      index++;
      continue;
    }
    if (arg === '--suites') {
      suites = rawArgs[index + 1] ?? '';
      index++;
      continue;
    }
    if (arg === '--create-workspace-full') {
      createWorkspaceFull = true;
      continue;
    }
    if (arg === '--workspace-lifecycle') {
      workspaceLifecycle = true;
      continue;
    }
    if (arg === '--stateless-variables-lifecycle') {
      statelessVariablesLifecycle = true;
      continue;
    }
    if (arg === '--nuget-conversion-lifecycle') {
      nugetConversionLifecycle = true;
      continue;
    }
    if (arg === '--codeful-debug-tasks') {
      codefulDebugTasks = true;
      continue;
    }
    if (arg === '--msn-weather-lifecycle') {
      msnWeatherLifecycle = true;
      continue;
    }
    if (arg === '--variables-picker-lifecycle') {
      variablesPickerLifecycle = true;
      continue;
    }
    if (arg === '--azure-auth-warmup') {
      azureAuthWarmup = true;
      continue;
    }

    args.push(arg);
  }

  return {
    args,
    azureAuthWarmup,
    codefulDebugTasks,
    createWorkspaceFull,
    msnWeatherLifecycle,
    nugetConversionLifecycle,
    suites,
    statelessVariablesLifecycle,
    variablesPickerLifecycle,
    visibleDelayMs,
    workspaceLifecycle,
  };
}

function getLabelArg(args) {
  const labelIndex = args.indexOf('--label');
  if (labelIndex < 0) {
    return undefined;
  }

  return args[labelIndex + 1];
}

function getCreateWorkspaceMatrixCaseLabels(args) {
  if (process.env.LA_E2E_CLI_CREATE_WORKSPACE_CASE) {
    return undefined;
  }

  const label = getLabelArg(args);
  if (label === 'createWorkspaceCoreMatrix') {
    return [
      'standard-stateful',
      'standard-stateless',
      'custom-code-stateful',
      'custom-code-stateless',
      'rules-engine-stateful',
      'rules-engine-stateless',
    ];
  }
  if (label === 'createWorkspacePreviewMatrix') {
    return [
      'standard-autonomous-agent',
      'standard-conversational-agent',
      'custom-code-autonomous-agent',
      'custom-code-conversational-agent',
      'rules-engine-autonomous-agent',
      'rules-engine-conversational-agent',
    ];
  }
  if (label === 'createWorkspaceCodeful') {
    return ['codeful-modern-control', 'codeful-legacy-control'];
  }

  return undefined;
}

function getDeferredCreateWorkspaceParent(label) {
  if (!label?.startsWith('createWorkspace') || label === 'createWorkspaceFixturesManifest') {
    return undefined;
  }

  if (process.env.LA_E2E_CLI_PRESERVE_WORKSPACES === '1') {
    return undefined;
  }

  const parentRoot = getOwnedWorkspaceRootParent();
  fs.mkdirSync(parentRoot, { recursive: true });
  return fs.mkdtempSync(path.join(parentRoot, 'la-e2e-cli-create-workspace-'));
}

function createOwnedWorkspaceParent(label) {
  const parentRoot = getOwnedWorkspaceRootParent();
  fs.mkdirSync(parentRoot, { recursive: true });
  const root = fs.mkdtempSync(path.join(parentRoot, `la-e2e-cli-${sanitizeEnvSegment(label)}-`));
  console.log(`[generated-workspace-diagnostics] Registered owned workspace parent: ${root}`);
  return root;
}

function getOwnedWorkspaceRootParent() {
  return path.resolve(process.env.LA_E2E_CLI_WORKSPACE_ROOT || os.tmpdir());
}

async function cleanupOwnedWorkspaceParent(workspaceParent, context, strict = false) {
  if (!workspaceParent || process.env.LA_E2E_CLI_PRESERVE_WORKSPACES === '1') {
    return;
  }
  if (workspaceParentsWithDiagnosticFailures.has(path.resolve(workspaceParent))) {
    console.warn(
      `[generated-workspace-diagnostics] Preserving owned workspace parent after ${context} because diagnostics capture failed: ${workspaceParent}`
    );
    return;
  }

  await delay(1000);
  try {
    fs.rmSync(workspaceParent, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
    console.log(`[generated-workspace-diagnostics] Removed owned workspace parent after ${context}: ${workspaceParent}`);
  } catch (error) {
    console.warn(`[generated-workspace-diagnostics] Unable to remove owned workspace parent ${workspaceParent}: ${String(error)}`);
    if (strict) {
      throw error;
    }
  }
}

async function cleanupDeferredWorkspaceAfterCancel(workspaceParent, env, cancelResult) {
  if (cancelResult && !cancelResult.originalCodeClose) {
    const error = 'Original regular Code closure was not confirmed; preserving the app through the existing diagnostic retention path.';
    cancelResult.errors.push(error);
    markOwnedWorkspaceParentsWithDiagnosticFailure(env, [workspaceParent].filter(Boolean));
    console.error(`[workspace-cancel] ${error}`);
  }
  return cleanupDeferredWorkspaceParent(workspaceParent);
}

async function cleanupDeferredWorkspaceParent(workspaceParent) {
  const ledger = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    workspaceParent: workspaceParent || '',
    verified: true,
    action: 'none',
    reason: '',
  };
  if (!workspaceParent) {
    return ledger;
  }
  if (workspaceParentsWithDiagnosticFailures.has(path.resolve(workspaceParent))) {
    console.warn(
      `[generated-workspace-diagnostics] Preserving deferred workspace parent because diagnostics capture failed: ${workspaceParent}`
    );
    return { ...ledger, verified: false, action: 'preserved', reason: 'diagnostics capture failed' };
  }

  await delay(1000);
  try {
    fs.rmSync(workspaceParent, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
    ledger.action = 'removed';
    ledger.verified = !fs.existsSync(workspaceParent);
  } catch (error) {
    console.warn(`[create-workspace-smoke] Unable to remove temp workspace parent after VS Code exit ${workspaceParent}: ${String(error)}`);
    return { ...ledger, verified: false, action: 'failed-remove', reason: String(error) };
  }
  if (!ledger.verified) {
    ledger.reason = 'workspace parent still exists after removal';
  }
  return ledger;
}

function markOwnedWorkspaceParentsWithDiagnosticFailure(env, ownedRoots = []) {
  for (const root of [env.LA_E2E_CLI_WORKSPACE_PARENT, env.LA_E2E_CLI_CREATE_WORKSPACE_PARENT, ...ownedRoots].filter((candidate) =>
    candidate?.trim()
  )) {
    workspaceParentsWithDiagnosticFailures.add(path.resolve(root));
  }
}

function hasOwnedWorkspaceParentDiagnosticFailure(workspaceParent) {
  return workspaceParentsWithDiagnosticFailures.has(path.resolve(workspaceParent));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeSuiteCleanupLedger(env, ledger) {
  const filePath = env.LA_E2E_CLI_SUITE_CLEANUP_LEDGER_PATH;
  if (!filePath) {
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(ledger, null, 2)}\n`);
}

function writeSuiteTerminalResult(env, result) {
  const filePath = getSuiteTerminalResultPath(env, result.label || result.suiteId);
  if (!filePath) {
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        ...result,
      },
      null,
      2
    )}\n`
  );
}

function writeSuitePhaseResult(env, result) {
  const phaseResultsPath = env.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH;
  if (phaseResultsPath) {
    fs.mkdirSync(path.dirname(phaseResultsPath), { recursive: true });
    fs.appendFileSync(phaseResultsPath, `${JSON.stringify({ schemaVersion: 1, ...result })}\n`);
    return;
  }
  const priorTerminalResult = readJsonIfExists(getSuiteTerminalResultPath(env, result.label));
  const phaseResults = [...(Array.isArray(priorTerminalResult?.phaseResults) ? priorTerminalResult.phaseResults : []), result];
  const terminalComplete = getDirectSuiteComplete(result.label, phaseResults);
  const finalizedPhaseResults = terminalComplete ? phaseResults : phaseResults.map(clearOgfScenarios);
  const retainedOgfScenarios = terminalComplete ? collectDirectOgfScenarios(result.label, finalizedPhaseResults, env) : [];
  writeSuiteCleanupLedger(
    env,
    result.label === 'msnWeatherLifecycle'
      ? {
          ...result.cleanupLedger,
          verified: false,
          lifecycleFinalized: false,
          phaseCleanupVerified: result.cleanupLedger?.verified === true,
        }
      : result.cleanupLedger
  );
  writeSuiteTerminalResult(env, {
    label: result.label,
    phaseId: result.phaseId,
    exitCode: result.exitCode,
    signal: result.signal,
    cleanupVerified: result.label === 'msnWeatherLifecycle' ? false : result.cleanupVerified,
    diagnosticsError: result.diagnosticsError,
    complete: result.label === 'msnWeatherLifecycle' ? false : terminalComplete,
    ...(result.label === 'msnWeatherLifecycle'
      ? { lifecycleFinalized: false, originalProcessClosureVerified: false, processClosureProof: 'original-identities-unverified' }
      : {}),
    ...(result.label === 'workspaceArtifactRegeneration' ? { lifecycleFinalized: terminalComplete } : {}),
    mochaPassingCount:
      result.label === 'workspaceArtifactRegeneration'
        ? phaseResults.reduce((count, phase) => count + (phase.mochaPassingCount || 0), 0)
        : result.mochaPassingCount,
    phaseResults: finalizedPhaseResults.map((phase) => ({
      phaseId: phase.phaseId,
      exitCode: phase.exitCode,
      signal: phase.signal,
      cleanupVerified: phase.cleanupVerified,
      diagnosticsError: phase.diagnosticsError,
      complete: phase.complete,
      ...(result.label === 'workspaceArtifactRegeneration' ? { mochaPassingCount: phase.mochaPassingCount || 0 } : {}),
      ...(Array.isArray(phase.ogfScenarios) && phase.ogfScenarios.length > 0 ? { ogfScenarios: phase.ogfScenarios } : {}),
    })),
    ...(retainedOgfScenarios.length > 0 ? { ogfScenarios: retainedOgfScenarios } : {}),
  });
}

function projectTerminalPhase(phase) {
  return {
    phaseId: phase.phaseId,
    exitCode: phase.exitCode,
    signal: phase.signal,
    cleanupVerified: phase.cleanupVerified,
    diagnosticsError: phase.diagnosticsError,
    complete: phase.complete,
    ...(typeof phase.bodyAssertionsPassed === 'boolean' ? { bodyAssertionsPassed: phase.bodyAssertionsPassed } : {}),
    ...(Array.isArray(phase.ogfScenarios) && phase.ogfScenarios.length > 0 ? { ogfScenarios: phase.ogfScenarios } : {}),
  };
}

function beginDirectMsnEvidence(env) {
  if (env.LA_E2E_CLI_SUITE_WRAPPER_CHILD === '1' && env.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH) {
    return { LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH: env.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH };
  }
  const phaseResultsPath = path.join(
    path.dirname(getSuiteTerminalResultPath(env, 'msnWeatherLifecycle')),
    `msnWeatherLifecycle.phases-${require('crypto').randomUUID()}.jsonl`
  );
  writeSuiteTerminalResult(env, {
    label: 'msnWeatherLifecycle',
    phaseResultsPath,
    exitCode: null,
    signal: null,
    cleanupVerified: false,
    diagnosticsError: '',
    complete: false,
    lifecycleFinalized: false,
    originalProcessClosureVerified: false,
    processClosureProof: 'original-identities-unverified',
    phaseResults: [],
  });
  writeSuiteCleanupLedger(
    { ...env, LA_E2E_CLI_SUITE_CLEANUP_LEDGER_PATH: env.LA_E2E_CLI_SUITE_CLEANUP_LEDGER_PATH || getDirectMsnCleanupLedgerPath(env) },
    {
      schemaVersion: 1,
      verified: false,
      originalProcessClosureVerified: false,
      filesystemCleanupVerified: false,
      reason: 'lifecycle-not-finalized',
      phaseResultsPath,
    }
  );
  writeSuiteTerminalResult(
    { ...env, LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH: undefined },
    {
      label: 'runtimeDependencyBootstrap',
      complete: false,
      cleanupVerified: false,
      exitCode: null,
      signal: null,
      diagnosticsError: '',
      phaseResults: [],
    }
  );
  return { LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH: phaseResultsPath };
}

function getDirectMsnCleanupLedgerPath(env) {
  return path.join(path.dirname(getSuiteTerminalResultPath(env, 'msnWeatherLifecycle')), 'msnWeatherLifecycle.cleanup-ledger.json');
}

function getOwnedRootCleanupVerified(ownedRoots) {
  if (!Array.isArray(ownedRoots) || ownedRoots.length === 0) {
    return false;
  }
  return ownedRoots.every((root) => {
    if (!root) {
      return false;
    }
    try {
      fs.lstatSync(root);
      return false;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return true;
      }
      throw new Error('Owned lifecycle cleanup failed: root-absence-observation-failed');
    }
  });
}

function finalizeDirectMsnEvidence(
  env,
  { cleanupVerified, lifecycleSucceeded, lifecycleError, phaseResultsPath, ownedRoots = [], errors = [], processCleanup }
) {
  const terminal = readJsonIfExists(getSuiteTerminalResultPath(env, 'msnWeatherLifecycle'));
  const phaseResults = readJsonLinesIfExists(phaseResultsPath);
  const expectedPhaseIds = SUITE_REGISTRY.msnWeatherLifecycle.expectedPhases;
  const phaseCompleteness =
    phaseResults.length === expectedPhaseIds.length &&
    phaseResults.every(
      (phase, index) =>
        phase.phaseId === expectedPhaseIds[index] &&
        phase.complete === true &&
        phase.exitCode === 0 &&
        !phase.signal &&
        phase.cleanupVerified === true &&
        !phase.diagnosticsError &&
        (phase.phaseId !== 'msnWeatherLifecycle:run' || phase.bodyAssertionsPassed === true)
    );
  const originalProcessClosureVerified = processCleanup?.verified === true && processCleanup.originalProcessClosureVerified === true;
  const complete =
    lifecycleSucceeded === true && phaseCompleteness && cleanupVerified === true && originalProcessClosureVerified && errors.length === 0;
  const cleanupLedger = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    verified: complete,
    filesystemCleanupVerified: cleanupVerified === true,
    originalProcessClosureVerified,
    processClosureProof: processCleanup?.processClosureProof ?? 'original-identities-unverified',
    ownedRoots,
    phaseResultsPath,
    failureReasons: describeMsnFailures(errors),
    reason: complete ? '' : originalProcessClosureVerified ? 'lifecycle-incomplete' : 'original-process-closure-unverified',
  };
  writeSuiteCleanupLedger(
    { ...env, LA_E2E_CLI_SUITE_CLEANUP_LEDGER_PATH: env.LA_E2E_CLI_SUITE_CLEANUP_LEDGER_PATH || getDirectMsnCleanupLedgerPath(env) },
    cleanupLedger
  );
  const finalized = {
    ...terminal,
    label: 'msnWeatherLifecycle',
    complete,
    lifecycleFinalized: true,
    cleanupVerified: complete,
    filesystemCleanupVerified: cleanupVerified === true,
    originalProcessClosureVerified,
    processClosureProof: processCleanup?.processClosureProof ?? 'original-identities-unverified',
    lifecycleBodySucceeded: lifecycleSucceeded === true,
    phaseCompleteness,
    expectedPhaseIds,
    observedPhaseIds: phaseResults.map((phase) => phase.phaseId),
    phaseResultsPath,
    failureReasons: describeMsnFailures(errors),
    exitCode: complete ? 0 : typeof terminal?.exitCode === 'number' && terminal.exitCode !== 0 ? terminal.exitCode : 1,
    signal: terminal?.signal ?? null,
    diagnosticsError: [
      terminal?.diagnosticsError,
      lifecycleError ? (lifecycleSucceeded ? 'lifecycle-finalization-failed' : 'lifecycle-execution-failed') : '',
      !cleanupVerified ? 'lifecycle-cleanup-failed' : '',
      !phaseCompleteness ? 'incomplete-lifecycle-phases' : '',
      !originalProcessClosureVerified ? 'original-process-closure-unverified' : '',
    ]
      .filter(Boolean)
      .join('; '),
    phaseResults,
  };
  writeSuiteTerminalResult(env, finalized);
  return finalized;
}

function getDirectSuiteComplete(label, phaseResults) {
  const observedPhaseIds = phaseResults.map((phase) => phase.phaseId).filter(Boolean);
  const expectedPhaseIds = getDirectExpectedPhaseIds(label);
  const missingPhaseIds = expectedPhaseIds.filter((phaseId) => !observedPhaseIds.includes(phaseId));
  const unexpectedPhaseIds = observedPhaseIds.filter((phaseId) => !expectedPhaseIds.includes(phaseId));
  return (
    phaseResults.length > 0 &&
    phaseResults.length === expectedPhaseIds.length &&
    (label !== 'workspaceArtifactRegeneration' || expectedPhaseIds.every((phaseId, index) => observedPhaseIds[index] === phaseId)) &&
    missingPhaseIds.length === 0 &&
    unexpectedPhaseIds.length === 0 &&
    getDuplicateValues(observedPhaseIds).length === 0 &&
    (!['httpTimeoutComposeOriginal', 'httpTimeoutLifecycle', 'statelessVariablesLifecycle'].includes(label) ||
      expectedPhaseIds.every((phaseId, index) => observedPhaseIds[index] === phaseId)) &&
    phaseResults.every(
      (phase) =>
        phase.complete === true &&
        phase.exitCode === 0 &&
        (phase.signal === null || phase.signal === undefined) &&
        phase.cleanupVerified === true &&
        !phase.diagnosticsError
    )
  );
}

function getDirectRegenerationEvidencePaths() {
  const resultsRoot = path.resolve(__dirname, '..', '.vscode-test', 'results');
  return {
    terminalResultPath: path.join(resultsRoot, 'workspaceArtifactRegeneration.terminal-result.json'),
    cleanupLedgerPath: path.join(resultsRoot, 'workspaceArtifactRegeneration.cleanup-ledger.json'),
  };
}

function beginDirectRegenerationEvidence(context, paths = getDirectRegenerationEvidencePaths()) {
  const expectedPhaseIds = [...SUITE_REGISTRY.workspaceArtifactRegeneration.expectedPhases];
  writeSuiteTerminalResult(
    { LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH: paths.terminalResultPath },
    {
      suiteId: 'workspaceArtifactRegeneration',
      label: 'workspaceArtifactRegeneration',
      invocation: context?.invocation ?? null,
      identity: context?.identity ?? {
        source: process.env.BUILD_SOURCEVERSION || 'local',
        run: process.env.BUILD_BUILDID || 'local',
        job: process.env.SYSTEM_JOBID || 'local',
        platform: process.platform,
      },
      complete: false,
      lifecycleFinalized: false,
      exitCode: null,
      signal: null,
      cleanupVerified: false,
      diagnosticsError: 'lifecycle-not-finalized',
      originalProcessClosureVerified: false,
      processClosureProof: 'original-identities-unverified',
      phaseCompleteness: false,
      expectedPhaseIds,
      observedPhaseIds: [],
      missingPhaseIds: expectedPhaseIds,
      unexpectedPhaseIds: [],
      duplicatePhaseIds: [],
      blockedPhaseIds: [],
      phaseResults: [],
      mochaPassingCount: 0,
    }
  );
  writeSuiteCleanupLedger(
    { LA_E2E_CLI_SUITE_CLEANUP_LEDGER_PATH: paths.cleanupLedgerPath },
    {
      suiteId: 'workspaceArtifactRegeneration',
      invocation: context?.invocation ?? null,
      identity: context?.identity,
      verified: false,
      action: 'pending',
      workspaceParent: context?.workspaceParent ?? '',
      reason: 'lifecycle-not-finalized',
    }
  );
}

function writeDirectRegenerationEvidence(context, terminal, cleanup, paths = getDirectRegenerationEvidencePaths()) {
  assert.equal(terminal.suiteId, 'workspaceArtifactRegeneration');
  assert.equal(terminal.invocation, context.invocation);
  assert.deepEqual(terminal.identity, context.identity);
  if (terminal.complete) {
    assert.equal(terminal.lifecycleFinalized, true);
    assert.equal(terminal.phaseCompleteness, true);
    assert.equal(terminal.exitCode, 0);
    assert.equal(terminal.signal, null);
    assert.equal(terminal.cleanupVerified, true);
    assert.equal(terminal.diagnosticsError, '');
    assert.equal(getDirectSuiteComplete(terminal.suiteId, terminal.phaseResults), true);
    assert.deepEqual(terminal.expectedPhaseIds, [...SUITE_REGISTRY.workspaceArtifactRegeneration.expectedPhases]);
    assert.deepEqual(terminal.observedPhaseIds, terminal.expectedPhaseIds);
    for (const name of ['missingPhaseIds', 'unexpectedPhaseIds', 'duplicatePhaseIds', 'blockedPhaseIds']) {
      assert.deepEqual(terminal[name], []);
    }
    assert.equal(cleanup.verified, true);
    assert.equal(cleanup.action, 'removed');
    assert.equal(cleanup.workspaceParent, context.workspaceParent);
  }
  // Only actual owned-root cleanup and native phase proofs are recorded here.
  // The outer wrapper's independent process-tree receipt is not fabricated.
  writeSuiteCleanupLedger(
    { LA_E2E_CLI_SUITE_CLEANUP_LEDGER_PATH: paths.cleanupLedgerPath },
    {
      ...cleanup,
      suiteId: terminal.suiteId,
      retainedOriginalIdentitiesVerified: false,
      invocation: context.invocation,
      identity: context.identity,
      expectedPhaseIds: terminal.expectedPhaseIds,
      observedPhaseIds: terminal.observedPhaseIds,
      missingPhaseIds: terminal.missingPhaseIds,
      unexpectedPhaseIds: terminal.unexpectedPhaseIds,
      duplicatePhaseIds: terminal.duplicatePhaseIds,
      blockedPhaseIds: terminal.blockedPhaseIds,
      phaseCleanupVerified: terminal.phaseResults.every((phase) => phase.cleanupVerified === true),
      phases: terminal.phaseResults,
    }
  );
  writeSuiteTerminalResult(
    { LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH: paths.terminalResultPath },
    {
      ...terminal,
      // This custom finalizer has no retained-original-identities observer yet.
      // Do not accept caller/model claims, exit 0 or removed-directory inference.
      originalProcessClosureVerified: false,
      processClosureProof: 'original-identities-unverified',
    }
  );
}

function publishRegenerationStageEvidence(context, result, phases, cleanup) {
  const expectedPhaseIds = SUITE_REGISTRY.workspaceArtifactRegeneration.expectedPhases;
  const safePhases = phases.map((phase) => ({
    schemaVersion: 1,
    label: 'workspaceArtifactRegeneration',
    ...projectTerminalPhase(phase),
    mochaPassingCount: phase.mochaPassingCount || 0,
    diagnosticsError: redactGeneratedWorkspacePlainText(String(phase.diagnosticsError || '')),
  }));
  const observedPhaseIds = safePhases.map((phase) => phase.phaseId);
  const missingPhaseIds = expectedPhaseIds.filter((phaseId) => !observedPhaseIds.includes(phaseId));
  const unexpectedPhaseIds = observedPhaseIds.filter((phaseId) => !expectedPhaseIds.includes(phaseId));
  const duplicatePhaseIds = getDuplicateValues(observedPhaseIds);
  const phaseCompleteness =
    safePhases.length === expectedPhaseIds.length &&
    expectedPhaseIds.every((phaseId, index) => observedPhaseIds[index] === phaseId) &&
    missingPhaseIds.length === 0 &&
    unexpectedPhaseIds.length === 0 &&
    duplicatePhaseIds.length === 0;
  const cleanupVerified =
    cleanup.verified === true &&
    cleanup.action === 'removed' &&
    cleanup.workspaceParent === context.workspaceParent &&
    safePhases.every((phase) => phase.cleanupVerified === true);
  const diagnostics = [
    ...(result?.errors || []),
    ...safePhases.map((phase) => phase.diagnosticsError).filter(Boolean),
    ...(!cleanupVerified ? [cleanup.reason || 'owned-cleanup-not-verified'] : []),
    ...(!phaseCompleteness ? ['incomplete-or-invalid-lifecycle-phases'] : []),
  ].map((error) => redactGeneratedWorkspacePlainText(String(error)));
  const complete =
    result?.complete === true &&
    getDirectSuiteComplete('workspaceArtifactRegeneration', safePhases) &&
    cleanupVerified &&
    phaseCompleteness &&
    diagnostics.length === 0;
  const binding = {
    schemaVersion: 1,
    suiteId: 'workspaceArtifactRegeneration',
    invocation: context.invocation,
    identity: context.identity,
    finalizedUtc: new Date().toISOString(),
    originalProcessClosureVerified: false,
    processClosureProof: 'original-identities-unverified',
  };
  const terminal = {
    ...binding,
    label: 'workspaceArtifactRegeneration',
    lifecycleFinalized: true,
    complete,
    exitCode: complete ? 0 : 1,
    signal: null,
    expectedPhaseIds: [...expectedPhaseIds],
    observedPhaseIds,
    missingPhaseIds,
    unexpectedPhaseIds,
    duplicatePhaseIds,
    blockedPhaseIds: complete ? [] : missingPhaseIds,
    phaseCompleteness,
    diagnosticsError: diagnostics.join('; '),
    phaseResults: safePhases,
    cleanupVerified,
    mochaPassingCount: safePhases.reduce((sum, phase) => sum + phase.mochaPassingCount, 0),
  };
  fs.writeFileSync(path.join(context.root, 'phase-results.jsonl'), `${safePhases.map((phase) => JSON.stringify(phase)).join('\n')}\n`);
  writeSuiteTerminalResult({ LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH: path.join(context.root, 'terminal-result.json') }, terminal);
  writeSuiteCleanupLedger(
    { LA_E2E_CLI_SUITE_CLEANUP_LEDGER_PATH: path.join(context.root, 'cleanup-ledger.json') },
    {
      ...cleanup,
      ...binding,
      retainedOriginalIdentitiesVerified: false,
      verified: cleanupVerified,
      expectedPhaseIds: [...expectedPhaseIds],
      observedPhaseIds,
      phaseCleanupVerified: safePhases.every((phase) => phase.cleanupVerified === true),
      phases: safePhases,
    }
  );
  const primary = result || { ...binding, errors: ['Regular-workbench phases did not start'], hosts: [], observations: [] };
  fs.writeFileSync(
    context.resultPath,
    `${JSON.stringify(
      {
        ...primary,
        ...binding,
        complete,
        lifecycleFinalized: true,
        expectedPhaseIds: [...expectedPhaseIds],
        phaseResults: safePhases,
        cleanup: { verified: cleanup.verified === true, action: cleanup.action, workspaceParent: cleanup.workspaceParent },
        errors: (primary.errors || []).map((error) => redactGeneratedWorkspacePlainText(String(error))),
        hosts: (primary.hosts || []).map((host) => ({
          ...host,
          errors: (host.errors || []).map((error) => redactGeneratedWorkspacePlainText(String(error))),
        })),
      },
      null,
      2
    )}\n`
  );
  const promptObservations = [];
  for (const phaseId of expectedPhaseIds.slice(1)) {
    const phase = phaseId.slice('workspaceArtifactRegeneration:'.length);
    const file = path.join(context.root, `${phase}-prompt-observations.jsonl`);
    if (!fs.existsSync(file)) {
      continue;
    }
    const stat = fs.lstatSync(file);
    assert.ok(stat.isFile() && !stat.isSymbolicLink(), 'Prompt observations must be an original regular file');
    assert.ok(stat.size <= vscodeProfileLogMaxFileBytes, 'Prompt observations exceed the safe archive size limit');
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)) {
      promptObservations.push(
        JSON.stringify({
          phase,
          observation: redactGeneratedWorkspaceJsonValue(JSON.parse(line)),
        })
      );
    }
  }
  fs.writeFileSync(
    path.join(context.root, 'prompt-observations.jsonl'),
    `${promptObservations.join('\n')}${promptObservations.length ? '\n' : ''}`
  );
  const codeLogs = ['Sanitized regular Code stdout/stderr; raw per-phase logs are not part of the safe archive.'];
  for (const host of primary.hosts || []) {
    assert.ok(
      expectedPhaseIds.includes(`workspaceArtifactRegeneration:${host.phase}`),
      'Only registered native phase logs may be published'
    );
    const file = path.join(context.root, `${host.phase}-code.log`);
    if (fs.existsSync(file)) {
      const stat = fs.lstatSync(file);
      assert.ok(stat.isFile() && !stat.isSymbolicLink(), 'Code log must be an original regular file');
      codeLogs.push(
        `\n## ${host.phase}\n${redactGeneratedWorkspacePlainText(fs.readFileSync(file, 'utf8').slice(0, vscodeProfileLogMaxFileBytes))}`
      );
    }
  }
  fs.writeFileSync(path.join(context.root, 'code.log'), `${codeLogs.join('\n')}\n`);
  return terminal;
}

function assertRegenerationStageEvidence(root, expectedIdentity) {
  const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
  const invocation = read('invocation.json');
  const handoff = read('wizard-handoff.json');
  const primary = read('final-result.json');
  const terminal = read('terminal-result.json');
  const cleanup = read('cleanup-ledger.json');
  const phases = readJsonLinesIfExists(path.join(root, 'phase-results.jsonl'));
  assert.deepEqual(invocation.identity, expectedIdentity, 'Wrong current job/source/platform evidence');
  for (const artifact of [handoff, primary, terminal, cleanup]) {
    assert.equal(artifact.schemaVersion, 1);
    assert.equal(artifact.invocation, invocation.invocation, 'Stale or wrong family invocation');
    assert.deepEqual(artifact.identity, expectedIdentity);
  }
  const expectedPhases = SUITE_REGISTRY.workspaceArtifactRegeneration.expectedPhases;
  assert.deepEqual(
    phases.map((phase) => phase.phaseId),
    [...expectedPhases],
    'All fourteen phases must be present in exact order'
  );
  assert.equal(getDirectSuiteComplete('workspaceArtifactRegeneration', phases), true, 'One passing wizard is not complete family evidence');
  assert.deepEqual(terminal.expectedPhaseIds, [...expectedPhases]);
  assert.deepEqual(terminal.observedPhaseIds, [...expectedPhases]);
  assert.deepEqual(terminal.phaseResults, phases);
  assert.deepEqual(primary.phaseResults, phases);
  assert.equal(terminal.lifecycleFinalized, true);
  assert.equal(primary.lifecycleFinalized, true);
  assert.equal(terminal.complete, true);
  assert.equal(primary.complete, true);
  assert.equal(terminal.exitCode, 0);
  assert.equal(terminal.signal, null);
  assert.equal(terminal.cleanupVerified, true);
  assert.equal(terminal.diagnosticsError, '');
  assert.equal(terminal.phaseCompleteness, true);
  assert.equal(terminal.suiteId, 'workspaceArtifactRegeneration');
  for (const name of ['missingPhaseIds', 'unexpectedPhaseIds', 'duplicatePhaseIds', 'blockedPhaseIds']) {
    assert.deepEqual(terminal[name], []);
  }
  assert.equal(cleanup.verified, true);
  assert.equal(cleanup.action, 'removed', 'Preserved/failed owned cleanup must not pass staging');
  assert.equal(cleanup.workspaceParent, invocation.workspaceParent);
  assert.equal(primary.cleanup?.verified, true);
  assert.equal(primary.cleanup?.action, 'removed');
  assert.equal(primary.cleanup?.workspaceParent, invocation.workspaceParent);
  assert.deepEqual(primary.errors, []);
  assert.deepEqual(primary.code, { version: handoff.launch.version, sha256: handoff.launch.sha256 });
  assert.match(handoff.launch.sha256, /^[a-f0-9]{64}$/);
  const runtime = handoff.runtimeSettings;
  assert.ok(runtime, 'Actual creating-host runtime configuration evidence is required');
  assert.equal(runtime.schemaVersion, 1);
  assert.equal(runtime.invocation, invocation.invocation);
  assert.deepEqual(runtime.identity, expectedIdentity);
  assert.equal(runtime.root, invocation.runtimeAdmission?.root, 'Wrong admitted runtime root in archived handoff');
  assert.ok(
    Date.parse(runtime.capturedUtc) >= Date.parse(invocation.startedUtc) &&
      Date.parse(runtime.capturedUtc) <= Date.parse(terminal.finalizedUtc),
    'Stale runtime capture'
  );
  const {
    regenerationRuntimeSettingsHash,
    regenerationRuntimeSettingKeys,
  } = require('../out/test/e2e/workspaceArtifactRegenerationRuntime');
  assert.deepEqual(Object.keys(runtime.settings).sort(), [...regenerationRuntimeSettingKeys].sort());
  assert.equal(runtime.allowlistedSettingsSha256, regenerationRuntimeSettingsHash(runtime.settings));
  assert.equal(runtime.settings['azureLogicAppsStandard.autoRuntimeDependenciesValidationAndInstallation'], true);
  assert.equal(runtime.settings['azureLogicAppsStandard.e2eStrictDependencyValidation'], true);
  assert.ok(Array.isArray(runtime.binaries) && runtime.binaries.length >= 3);
  assert.ok(runtime.binaries.every((binary) => typeof binary.path === 'string' && /^[a-f0-9]{64}$/.test(binary.sha256)));
  // This archived check intentionally does not read the original profiles or
  // dependency cache; live path/byte checks already gate native completion.
  assert.equal(primary.hosts.length, 13);
  assert.deepEqual(
    primary.hosts.map((host) => `workspaceArtifactRegeneration:${host.phase}`),
    expectedPhases.slice(1)
  );
  for (const host of primary.hosts) {
    assert.equal(host.observationPassed, true);
    assert.deepEqual(host.close, { code: 0, signal: null });
    assert.deepEqual(host.errors, []);
  }
  const names = ['vscode-single', 'vscode-multiple', 'vscode-repeat', 'root-single', 'root-multiple', 'root-repeat'];
  assert.deepEqual(
    primary.observations.map((observation) => observation.name),
    names
  );
  for (const observation of primary.observations) {
    assert.equal(observation.realYesMouseInput, true);
    assert.equal(observation.realOverwriteYesMouseInput, true);
    assert.equal(observation.initializationYesCount, 1);
    assert.equal(observation.overwriteYesCount, 1);
    assert.equal(observation.freshReopen, true);
  }
  const checkpoints = [
    'workspace-regeneration-baseline',
    ...names.flatMap((name) =>
      ['before-yes', 'before-overwrite-yes', 'after-yes', 'reopened'].map((suffix) => `workspace-regeneration-${name}-${suffix}`)
    ),
  ];
  for (const checkpoint of checkpoints) {
    const bytes = fs.readFileSync(path.join(root, 'screenshots', `${checkpoint}.png`));
    assert.ok(
      bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      'Required real PNG missing/invalid'
    );
    const sidecar = read(path.join('screenshots', `${checkpoint}.json`));
    assert.equal(sidecar.checkpoint, checkpoint);
    assert.equal(sidecar.classification, 'evidence');
    assert.equal(sidecar.verdict, 'accepted');
    assert.equal(sidecar.target?.owner, 'workbench');
    assert.ok(sidecar.target?.opaqueTargetId && sidecar.target?.opaqueFrameId);
    assert.ok(Number.isInteger(sidecar.target?.generation));
    assert.ok(sidecar.timing?.samples > 1 && sidecar.timing?.captureAttempts > 0);
    const accepted = sidecar.events?.findLast((event) => event.name === 'accepted');
    assert.ok(accepted && accepted.attempt === sidecar.timing.captureAttempts && accepted.generation === sidecar.target.generation);
  }
  assert.ok(fs.statSync(path.join(root, 'code.log')).size > 0);
  const indices = walkFiles(path.join(root, 'vscode-logs')).filter((file) => path.basename(file) === 'profile-log-index.md');
  for (const phaseId of expectedPhases.slice(1)) {
    const phaseName = phaseId.slice('workspaceArtifactRegeneration:'.length);
    assert.ok(
      indices.some((file) => fs.readFileSync(file, 'utf8').includes(`Phase: ${phaseName}\n`)),
      `Sanitized profile-log index is required for ${phaseName}`
    );
  }
  return terminal;
}

function getDirectExpectedPhaseIds(label) {
  const caseLabels = getCreateWorkspaceMatrixCaseLabels(['--label', label]);
  if (caseLabels) {
    return caseLabels.map((caseLabel) => `${label}:${caseLabel}`);
  }
  if (!label) {
    return [];
  }
  if (label === 'httpTimeoutComposeOriginal') {
    return [...legacyHttpTimeoutComposeSuite.expectedPhases];
  }
  if (['httpTimeoutComposeOriginal', 'httpTimeoutLifecycle'].includes(label)) {
    return [...SUITE_REGISTRY[label].expectedPhases];
  }
  if (label === 'msnWeatherLifecycle') {
    return SUITE_REGISTRY[label].expectedPhases.filter((phaseId) => phaseId.startsWith(`${label}:`));
  }
  if (label === 'workspaceArtifactRegeneration' || label === 'statelessVariablesLifecycle') {
    return [...SUITE_REGISTRY[label].expectedPhases];
  }
  if (label === 'runtimeDependencyBootstrap') {
    return ['runtimeDependencyBootstrap:bootstrap'];
  }
  return [label];
}

function collectDirectOgfScenarios(label, phaseResults, env) {
  const existingScenarios = collectOgfScenarios(phaseResults);
  const reconstructedScenarios = phaseResults.flatMap((phase) => {
    const phaseId = phase.phaseId || '';
    const executedVariant = getDirectPhaseVariant(label, phaseId);
    return buildOgfScenariosForPhase(
      phaseId,
      {
        ...env,
        LA_E2E_CLI_CREATE_WORKSPACE_CASE: executedVariant || env.LA_E2E_CLI_CREATE_WORKSPACE_CASE || '',
      },
      { passed: phase.complete === true && phase.exitCode === 0 && phase.cleanupVerified === true && !phase.diagnosticsError }
    );
  });
  return mergeOgfScenarios(existingScenarios, reconstructedScenarios);
}

function getDirectPhaseVariant(label, phaseId) {
  const prefix = `${label}:`;
  return typeof phaseId === 'string' && phaseId.startsWith(prefix) ? phaseId.slice(prefix.length) : '';
}

function getSuiteTerminalResultPath(env, label) {
  if (env.LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH) {
    return env.LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH;
  }
  if (!label) {
    return undefined;
  }
  return path.join(process.cwd(), '.vscode-test', 'results', `${sanitizeEnvSegment(label)}.terminal-result.json`);
}

function getMochaPassingCount(output) {
  const pattern = /^[ \t]*(\d+) passing\b/gm;
  let count = 0;
  let match;
  const ansiEscapeSequencePattern = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, 'g');
  const normalizedOutput = String(output ?? '').replace(ansiEscapeSequencePattern, '');
  while ((match = pattern.exec(normalizedOutput)) !== null) {
    count = Number(match[1]) || 0;
  }
  return count;
}

function buildOgfScenariosForPhase(phaseId, env, options = {}) {
  if (options.passed !== true) {
    return [];
  }
  return getOgfScenariosForPhase(phaseId, {
    passed: true,
    executedVariant: env.LA_E2E_CLI_CREATE_WORKSPACE_CASE || '',
    platform: process.platform,
    arch: process.arch,
    vscodeVersion: env.LA_E2E_CLI_VSCODE_VERSION || '',
    sourceVersion: env.BUILD_SOURCEVERSION || env.GITHUB_SHA || '',
    buildId: env.BUILD_BUILDID || env.GITHUB_RUN_ID || '',
    definitionId: env.SYSTEM_DEFINITIONID || '',
    repository: env.BUILD_REPOSITORY_NAME || env.GITHUB_REPOSITORY || '',
  });
}

function mergeOgfScenarios(...scenarioGroups) {
  const byKey = new Map();
  for (const scenario of scenarioGroups.flat().filter(Boolean)) {
    const key = `${scenario.scenarioId || ''}|${scenario.executedPhase || ''}|${scenario.executedVariant || ''}`;
    byKey.set(key, scenario);
  }
  return [...byKey.values()];
}

function collectOgfScenarios(phaseResults) {
  return mergeOgfScenarios(...phaseResults.map((phase) => phase.ogfScenarios || []));
}

function clearOgfScenarios(phase) {
  if (!phase || !Object.prototype.hasOwnProperty.call(phase, 'ogfScenarios')) {
    return phase;
  }
  const rest = { ...phase };
  delete rest.ogfScenarios;
  return rest;
}

function getSuitePhaseId(label, env) {
  if (label === 'httpTimeoutLifecycle' && env.LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MODE) {
    const phase = env.LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MODE === 'run' ? 'reopen' : env.LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MODE;
    return `httpTimeoutLifecycle:${phase}`;
  }
  if (
    label === 'createWorkspaceFixturesManifest' &&
    env.LA_E2E_CLI_HTTP_TIMEOUT_COMPOSE_PHASE === 'create' &&
    env.LA_E2E_CLI_CREATE_WORKSPACE_CASE === 'standard-stateless'
  ) {
    return 'httpTimeoutComposeOriginal:create';
  }
  if (label === 'httpTimeoutComposeOriginal' && env.LA_E2E_CLI_HTTP_TIMEOUT_COMPOSE_PHASE === 'reopen') {
    return 'httpTimeoutComposeOriginal:reopen';
  }
  const createWorkspaceCase = env.LA_E2E_CLI_CREATE_WORKSPACE_CASE;
  if (label && createWorkspaceCase) {
    return `${label}:${createWorkspaceCase}`;
  }
  if (label === 'runtimeDependencyBootstrap') {
    return 'runtimeDependencyBootstrap:bootstrap';
  }
  if (label === 'statelessVariablesLifecycle' && env.LA_E2E_CLI_STATELESS_VARIABLES_MODE === 'create') {
    return 'statelessVariablesLifecycle:create';
  }
  if (label === 'statelessVariablesLifecycle' && env.LA_E2E_CLI_STATELESS_VARIABLES_MODE === 'prepare') {
    return 'statelessVariablesLifecycle:prepare';
  }
  if (label === 'statelessVariablesLifecycle' && env.LA_E2E_CLI_STATELESS_VARIABLES_MODE === 'run') {
    return 'statelessVariablesLifecycle:reopen';
  }
  const createWorkspaceLabel = env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_CREATE_LABEL;
  const lifecycleMode = env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE;
  if (label === 'msnWeatherLifecycle' && lifecycleMode === 'create') {
    return 'msnWeatherLifecycle:create';
  }
  if (label === 'msnWeatherLifecycle' && lifecycleMode === 'msn-weather-run') {
    return 'msnWeatherLifecycle:run';
  }
  if (lifecycleMode === 'create' && createWorkspaceLabel) {
    return `${label}:create:${createWorkspaceLabel}`;
  }
  if (lifecycleMode && label) {
    return `${label}:${lifecycleMode}`;
  }
  return label || env.LA_E2E_CLI_BATCH_SUITE_ID || 'unknown';
}

function formatDuration(durationMs) {
  const seconds = Math.max(1, Math.round(durationMs / 1000));
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds === 0 ? `${minutes}m` : `${minutes}m ${remainingSeconds}s`;
}
