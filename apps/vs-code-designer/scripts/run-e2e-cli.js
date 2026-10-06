/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global __dirname, __filename, clearTimeout, console, module, process, require, setTimeout */
const { execFileSync, spawn } = require('child_process');
const { Buffer } = require('buffer');
const { createHash } = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { URL } = require('url');
const { createBatchRoot, normalizeSuiteSelection, runBatchSuites, SUITE_REGISTRY } = require('./e2e-cli-batch');
const { getOgfScenariosForPhase } = require('./ogf-e2e-registry');
const cancelCheck = require('./workspace-prompt-cancel');

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
    suites,
    variablesPickerLifecycle,
    visibleDelayMs,
    workspaceLifecycle,
  } = parseArgs(process.argv.slice(2));

  if (
    suites !== undefined &&
    (azureAuthWarmup ||
      codefulDebugTasks ||
      createWorkspaceFull ||
      msnWeatherLifecycle ||
      nugetConversionLifecycle ||
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

async function runSuitesBatch(suitesValue, visibleDelayMs) {
  const suites = normalizeSuiteSelection(suitesValue, { platform: process.platform });
  const batchRoot = createBatchRoot({ batchRoot: process.env.LA_E2E_CLI_BATCH_ROOT });
  const resultsDir = path.resolve(process.env.LA_E2E_CLI_BATCH_RESULTS_DIR || path.join(batchRoot, 'results'));
  const seedDir = path.resolve(process.env.LA_E2E_CLI_PREPARED_EXTENSIONS_DIR || path.join(__dirname, '..', '.vscode-test', 'extensions'));
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
    ...suites.map((suite) => buildBatchSuiteJUnitXml(suite).split('\n').slice(1, -2).join('\n')),
    '</testsuites>',
    '',
  ].join('\n');
}

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
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
  const child = spawn(process.execPath, childArgs, {
    env: sanitizeInheritedGitCommandConfigEnv({
      ...env,
      LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH: context.terminalResultPath,
      LA_E2E_CLI_SUITE_CLEANUP_LEDGER_PATH: context.cleanupLedgerPath,
      LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH: context.phaseResultsPath,
    }),
    cwd: path.resolve(__dirname, '..'),
  });

  let output = '';
  let timedOut = false;
  let settled = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    terminateProcessTree(child, 'SIGTERM')
      .then(() => delay(5000))
      .then(() => terminateProcessTree(child, 'SIGKILL'))
      .catch((error) => {
        appendOutput(`\n[batch] Failed to terminate timed-out process tree: ${error instanceof Error ? error.message : String(error)}\n`);
      });
  }, timeoutMs).unref();

  const forwardSignal = (signal) => {
    if (settled) {
      return;
    }
    appendOutput(`\n[batch] Parent received ${signal}; terminating suite process tree.\n`);
    terminateProcessTree(child, 'SIGTERM')
      .then(() => delay(5000))
      .then(() => terminateProcessTree(child, 'SIGKILL'))
      .finally(() => process.exit(1));
  };
  process.once('SIGINT', forwardSignal);
  process.once('SIGTERM', forwardSignal);

  const appendOutput = (text) => {
    output += text;
    if (output.length > 2 * 1024 * 1024) {
      output = output.slice(-2 * 1024 * 1024);
    }
  };

  child.stdout.on('data', (data) => {
    const text = data.toString();
    appendOutput(text);
    process.stdout.write(`[${suite.id}] ${text}`);
  });
  child.stderr.on('data', (data) => {
    const text = data.toString();
    appendOutput(text);
    process.stderr.write(`[${suite.id}] ${text}`);
  });

  return new Promise((resolve) => {
    child.on('error', (error) => {
      clearTimeout(timeout);
      settled = true;
      process.off('SIGINT', forwardSignal);
      process.off('SIGTERM', forwardSignal);
      writeSuiteFinalEvidence({
        context,
        suite,
        exitCode: null,
        signal: null,
        output,
        error,
        processCleanup: { verified: false, error: error.message },
      });
      resolve({ exitCode: null, signal: null, error, output });
    });
    child.on('close', async (exitCode, signal) => {
      clearTimeout(timeout);
      settled = true;
      process.off('SIGINT', forwardSignal);
      process.off('SIGTERM', forwardSignal);
      const processCleanup = await verifyNoOwnedDescendants(child.pid);
      const error = timedOut
        ? new Error(`suite timed out after ${timeoutMs}ms`)
        : processCleanup.error
          ? new Error(processCleanup.error)
          : undefined;
      writeSuiteFinalEvidence({ context, suite, exitCode, signal, output, error, processCleanup });
      resolve({ exitCode, signal, output, error });
    });
  });
}

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return undefined;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeSuiteFinalEvidence({ context, suite, exitCode, signal, error, processCleanup }) {
  const phaseResults = readJsonLinesIfExists(context.phaseResultsPath);
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
    unexpectedPhaseIds.length === 0 &&
    duplicatePhaseIds.length === 0 &&
    (missingPhaseIds.length === 0 || blockedPhaseIds.length > 0) &&
    phaseResults.length > 0;
  const msnSucceeded =
    (suite.id !== 'msnWeatherLifecycle' && suite.id !== 'workspaceMultiRoot') ||
    (exitCode === 0 &&
      (signal === null || signal === undefined) &&
      missingPhaseIds.length === 0 &&
      phaseResults.length === expectedPhaseIds.length &&
      phaseResults.every(
        (phase) => phase.complete === true && phase.exitCode === 0 && (phase.signal === null || phase.signal === undefined)
      ));
  const terminalComplete =
    phaseCompleteness &&
    phaseCleanupVerified &&
    processCleanup.verified === true &&
    !error &&
    phaseDiagnosticsErrors.length === 0 &&
    msnSucceeded;
  const finalizedPhaseResults = terminalComplete ? phaseResults : phaseResults.map(clearOgfScenarios);
  const ogfScenarios = terminalComplete ? collectOgfScenarios(finalizedPhaseResults) : [];
  const cleanupLedger = {
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
    processTreeVerified: processCleanup.verified === true,
    processCleanup,
    verified: phaseCompleteness && phaseCleanupVerified && processCleanup.verified === true,
    phases: finalizedPhaseResults,
  };
  const terminalResult = {
    suiteId: suite.id,
    exitCode,
    signal,
    cleanupVerified: cleanupLedger.verified,
    diagnosticsError: [error instanceof Error ? error.message : String(error || ''), ...phaseDiagnosticsErrors].filter(Boolean).join('\n'),
    expectedPhaseIds,
    observedPhaseIds,
    missingPhaseIds,
    unexpectedPhaseIds,
    duplicatePhaseIds,
    blockedPhaseIds,
    phaseCompleteness,
    complete: terminalComplete,
    ...(suite.id === 'msnWeatherLifecycle' || suite.id === 'workspaceMultiRoot'
      ? { lifecycleFinalized: true, phaseResults: finalizedPhaseResults.map(projectTerminalPhase) }
      : {}),
    ...(ogfScenarios.length > 0 ? { ogfScenarios } : {}),
  };
  writeSuiteCleanupLedger({ LA_E2E_CLI_SUITE_CLEANUP_LEDGER_PATH: context.cleanupLedgerPath }, cleanupLedger);
  writeSuiteTerminalResult({ LA_E2E_CLI_SUITE_TERMINAL_RESULT_PATH: context.terminalResultPath }, terminalResult);
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

function terminateProcessTree(child, signal) {
  return getProcessTreePids(child.pid).then((pids) => {
    for (const pid of [...pids].reverse()) {
      if (pid !== process.pid && isPidAlive(pid)) {
        try {
          process.kill(pid, signal);
        } catch {
          // Process already exited.
        }
      }
    }
  });
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

async function runMsnWeatherLifecycle(visibleDelayMs) {
  ensureMsnWeatherProfile();
  const azureEnv = getMsnWeatherAzureEnv();
  const lifecycleDir = getLifecycleArtifactDir('msn-weather-lifecycle');
  const lifecycleRunId = Date.now();
  const runtimeDependenciesRoot = createIsolatedRuntimeDependenciesRoot('msnWeatherLifecycle');
  const workspaceParent = createOwnedWorkspaceParent('msn-weather-lifecycle');
  let lifecycleSucceeded = false;
  const commonEnv = {
    LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT: runtimeDependenciesRoot,
    LA_E2E_CLI_EXPECT_AZURE_LOGIC_APPS_CHANNEL: '1',
    LA_E2E_CLI_VSCODE_LOG_ARTIFACT_LABEL: 'msnWeatherLifecycle',
  };
  fs.mkdirSync(lifecycleDir, { recursive: true });
  const manifestPath = path.join(lifecycleDir, `manifest-standard-${lifecycleRunId}.json`);

  try {
    await runVscodeTest(['--label', 'runtimeDependencyBootstrap'], {
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
    const funcCoreToolsProbe = await waitForFuncCoreToolsAtDependencyRoot(runtimeDependenciesRoot, {
      context: 'MSN Weather dependency bootstrap',
      timeoutMs: 30_000,
    });
    writeRuntimeDependencyProbe(lifecycleDir, lifecycleRunId, runtimeDependenciesRoot, funcCoreToolsProbe);

    await runVscodeTest(['--label', 'msnWeatherLifecycle'], {
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

    await runVscodeTest(['--label', 'msnWeatherLifecycle'], {
      visibleDelayMs,
      extraEnv: getMsnWeatherLifecycleRunExtraEnv({ commonEnv, workspaceParent, lifecycleRunId, entry, azureEnv }),
    });

    lifecycleSucceeded = true;
  } finally {
    await cleanupOwnedWorkspaceParent(workspaceParent, 'MSN Weather lifecycle');
    if (lifecycleSucceeded && process.env.LA_E2E_CLI_PRESERVE_WORKSPACES !== '1') {
      await cleanupRuntimeDependenciesRoot(runtimeDependenciesRoot);
    }
  }
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
    });
  } catch (error) {
    errors.push(error);
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, 'MSN lifecycle failed; original execution, cleanup and evidence errors were retained');
  }
  if (!cleanupVerified || terminal?.complete === false) {
    throw new Error('MSN lifecycle evidence failed: incomplete-or-unclean-lifecycle');
  }
  return { cleanupVerified, terminal };
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

function runVscodeTest(args, options = {}) {
  const label = getLabelArg(args);
  const userDataSuffix =
    options.extraEnv?.LA_E2E_CLI_USER_DATA_SUFFIX ?? process.env.LA_E2E_CLI_USER_DATA_SUFFIX ?? `run-${Date.now()}-${process.pid}`;
  const deferredWorkspaceParent = options.workspaceParent ?? getDeferredCreateWorkspaceParent(label);
  const outputFilter = createOutputFilter();
  const { command, commandArgs } = getVscodeTestCommand(args);
  const childEnv = sanitizeInheritedGitCommandConfigEnv({
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
  const cancelRequired =
    cancelCheck.required(childEnv) &&
    label === 'createWorkspaceCoreMatrix' &&
    childEnv.LA_E2E_CLI_CREATE_WORKSPACE_CASE === 'standard-stateful';
  const cancelContext = cancelRequired ? cancelCheck.prepareCancelContext(childEnv, deferredWorkspaceParent) : undefined;
  if (cancelContext) {
    childEnv.LA_E2E_CLI_CANCEL_HANDOFF_PATH = cancelContext.handoffPath;
    childEnv.LA_E2E_CLI_CANCEL_CONTEXT = JSON.stringify(cancelContext);
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
      cleanupLedger =
        options.retainWorkspaceForSupplement && childEnv.LA_E2E_CLI_MULTI_ROOT_HANDOFF
          ? {
              verified: fs.existsSync(deferredWorkspaceParent),
              action: 'retained-for-multi-root',
              reason: 'Final cleanup belongs to the supplementary family after its original regular window closes.',
            }
          : await cleanupDeferredWorkspaceAfterCancel(deferredWorkspaceParent, childEnv, cancelResult);
      try {
        collectVscodeProfileLogs(label, childEnv);
      } catch (error) {
        diagnosticsError = error;
        diagnosticsErrors.push(error);
        console.error(
          `[vscode-test-cli] Failed to capture required VS Code profile diagnostics: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
      const phaseId =
        options.multiRootCreatePhase && childEnv.LA_E2E_CLI_MULTI_ROOT_HANDOFF
          ? 'workspaceMultiRoot:create'
          : getSuitePhaseId(label, childEnv);
      const matchedPattern = forbiddenOutputPatterns.find(({ pattern }) => pattern.test(output));
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
      const phasePassed = code === 0 && cleanupLedger.verified === true && !diagnosticsError && !matchedPattern && !cancelError;
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
      });

      if (diagnosticsError) {
        reject(new AggregateError(diagnosticsErrors, 'Required original workspace/profile diagnostics failed'));
        return;
      }
      if (cancelError) {
        reject(cancelError);
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
    .filter((file) => {
      const normalized = file.replace(/\\/g, '/');
      return (
        /Azure Logic Apps \(Standard\)\.log$/i.test(file) ||
        normalized.includes('/ms-azuretools.vscode-azurelogicapps/') ||
        /vscode-azurelogicapps/i.test(file)
      );
    })
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
  _test: {
    assertSafeRuntimeDependenciesRoot,
    canUseInteractiveMsnWeatherAzureTargetEnv,
    captureGeneratedWorkspaceDiagnostics,
    collectVscodeProfileLogs,
    collectRuntimeDependencyDiagnostics,
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
    beginDirectMsnEvidence,
    finalizeDirectMsnEvidence,
    finalizeMsnLifecycleCleanup,
    getDirectSuiteComplete,
    getDirectExpectedPhaseIds,
    getOwnedRootCleanupVerified,
    getSuiteTerminalResultPath,
    getWorkspaceSourcesFromManifestPath,
    buildOgfScenariosForPhase,
    clearOgfScenarios,
    collectOgfScenarios,
    safeReadDirectory,
    sanitizeInheritedGitCommandConfigEnv,
    sanitizeEnvSegment,
    redactGeneratedWorkspaceJsonValue,
    redactGeneratedWorkspacePlainText,
    runSuiteWrapperProcess,
    runDirectRegisteredSuite,
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
  writeSuiteCleanupLedger(env, result.cleanupLedger);
  writeSuiteTerminalResult(env, {
    label: result.label,
    phaseId: result.phaseId,
    exitCode: result.exitCode,
    signal: result.signal,
    cleanupVerified: result.cleanupVerified,
    diagnosticsError: result.diagnosticsError,
    complete: terminalComplete,
    mochaPassingCount: result.mochaPassingCount,
    phaseResults: finalizedPhaseResults.map((phase) => ({
      phaseId: phase.phaseId,
      exitCode: phase.exitCode,
      signal: phase.signal,
      cleanupVerified: phase.cleanupVerified,
      diagnosticsError: phase.diagnosticsError,
      complete: phase.complete,
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
    ...(Array.isArray(phase.ogfScenarios) && phase.ogfScenarios.length > 0 ? { ogfScenarios: phase.ogfScenarios } : {}),
  };
}

function beginDirectMsnEvidence(env) {
  if (env.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH) {
    return;
  }
  writeSuiteTerminalResult(env, {
    label: 'msnWeatherLifecycle',
    exitCode: null,
    signal: null,
    cleanupVerified: false,
    diagnosticsError: '',
    complete: false,
    lifecycleFinalized: false,
    phaseResults: [],
  });
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

function finalizeDirectMsnEvidence(env, { cleanupVerified, lifecycleSucceeded, lifecycleError }) {
  if (env.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH) {
    return undefined;
  }
  const terminal = readJsonIfExists(getSuiteTerminalResultPath(env, 'msnWeatherLifecycle'));
  const phaseResults = terminal?.phaseResults || [];
  const complete =
    lifecycleSucceeded === true &&
    !lifecycleError &&
    cleanupVerified === true &&
    getDirectSuiteComplete('msnWeatherLifecycle', phaseResults);
  const finalized = {
    ...terminal,
    label: 'msnWeatherLifecycle',
    complete,
    lifecycleFinalized: true,
    cleanupVerified: cleanupVerified === true && phaseResults.every((phase) => phase.cleanupVerified === true),
    exitCode: complete ? 0 : terminal?.exitCode === 0 || terminal?.exitCode === undefined ? 1 : terminal.exitCode,
    signal: terminal?.signal ?? null,
    diagnosticsError: [
      terminal?.diagnosticsError,
      lifecycleError ? 'lifecycle-execution-failed' : '',
      !cleanupVerified ? 'lifecycle-cleanup-failed' : '',
      !complete && !lifecycleError && cleanupVerified ? 'incomplete-lifecycle-phases' : '',
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
    missingPhaseIds.length === 0 &&
    unexpectedPhaseIds.length === 0 &&
    getDuplicateValues(observedPhaseIds).length === 0 &&
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

function getDirectExpectedPhaseIds(label) {
  const caseLabels = getCreateWorkspaceMatrixCaseLabels(['--label', label]);
  if (caseLabels) {
    return caseLabels.map((caseLabel) => `${label}:${caseLabel}`);
  }
  if (!label) {
    return [];
  }
  if (label === 'msnWeatherLifecycle') {
    return SUITE_REGISTRY[label].expectedPhases.filter((phaseId) => phaseId.startsWith(`${label}:`));
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
  while ((match = pattern.exec(String(output ?? ''))) !== null) {
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
  const createWorkspaceCase = env.LA_E2E_CLI_CREATE_WORKSPACE_CASE;
  if (label && createWorkspaceCase) {
    return `${label}:${createWorkspaceCase}`;
  }
  if (label === 'runtimeDependencyBootstrap') {
    return 'runtimeDependencyBootstrap:bootstrap';
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
