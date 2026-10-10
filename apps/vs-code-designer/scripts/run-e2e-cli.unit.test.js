/* global __dirname, console, process, require, setTimeout */
const assert = require('assert');
const { Buffer } = require('buffer');
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');

const {
  runDirectFamily,
  _test: {
    collectRuntimeDependencyDiagnostics,
    collectRegenerationProfileLogs,
    cleanupDeferredWorkspaceAfterCancel,
    applyControlledFuncEnvironment,
    collectVscodeProfileLogs,
    canUseInteractiveMsnWeatherAzureTargetEnv,
    captureGeneratedWorkspaceDiagnostics,
    collectGeneratedWorkspaceSnapshotSources,
    copyGeneratedWorkspaceSnapshot,
    copyAzureLogicAppsChannelLogs,
    createIsolatedRuntimeDependenciesRoot,
    findAzureLogicAppsChannelLogs,
    getCodefulDebugTasksRunExtraEnv,
    getFuncCoreToolsCandidatePaths,
    getFuncCoreToolsBinaryPath,
    getMochaPassingCount,
    getDirectExpectedPhaseIds,
    finalizeMsnLifecycleCleanup,
    getDirectSuiteComplete,
    getOwnedRootCleanupVerified,
    getSuiteTerminalResultPath,
    hasOwnedWorkspaceParentDiagnosticFailure,
    buildBatchAggregateJUnitXml,
    buildOgfScenariosForPhase,
    collectOgfScenarios,
    getMsnWeatherLifecycleRunExtraEnv,
    getMsnWeatherAzureTargetEnv,
    getMsnWeatherAzureAuthEnv,
    hasHeadlessMsnWeatherAzureAuth,
    getNoGeneratedWorkspaceSnapshotReason,
    getVscodeUserDataDir,
    getWorkspaceSourcesFromManifestPath,
    redactGeneratedWorkspaceJsonValue,
    redactGeneratedWorkspacePlainText,
    readContainmentReceipt,
    requiresDirectHttpPhaseClosure,
    requiresDirectFamilyWrapper,
    runHttpTimeoutLifecycle,
    runSuiteWrapperProcess,
    createLinePrefixer,
    sanitizeInheritedGitCommandConfigEnv,
    verifyFuncCoreToolsAtDependencyRoot,
    writeSuitePhaseResult,
    writeSuiteFinalEvidence,
    writeVscodeProfileLogIndex,
  },
} = require('./run-e2e-cli.js');
const {
  buildBatchAggregate,
  buildSuiteEnvironment,
  classifySuiteRunResult,
  createBatchRoot,
  createSuiteContext,
  getSuiteScopedCredentialEnv,
  normalizeSuiteSelection,
  prepareSuiteExtensionsDirectory,
  runBatchSuites,
  SUITE_REGISTRY,
} = require('./e2e-cli-batch.js');
const {
  _test: { buildAggregate: buildSummaryAggregate, buildSingleSummary, parseMochaLog, writeSingleResult },
} = require('./summarize-e2e-cli-results.js');
const { assertSuccessfulMsnTerminal } = require('./e2e-cli-terminal');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'run-e2e-cli-unit-'));

(async () => {
  try {
    await testUnconfirmedCancelClosePreservesExistingApp();
    testCreatesEmptyIsolatedDependencyRoot();
    testAppliesControlledFuncAfterFinalEnvironmentMerge();
    testFailFastMissingFuncDiagnostics();
    testFailFastMissingInProc8Diagnostics();
    testCopiesAzureLogicAppsChannelLogs();
    testVscodeProfileLogsUseSuiteUserDataParentAndRedact();
    testRegenerationProfileCollectionPreservesPrimaryFailure();
    testGeneratedWorkspaceSnapshotCopiesUsefulRedactedTree();
    testGeneratedWorkspaceSnapshotRedactsNestedSecrets();
    testGeneratedWorkspaceSnapshotOmitsUnsafeFormats();
    testGeneratedWorkspaceSnapshotRejectsUnownedManifestSources();
    testGeneratedWorkspaceSnapshotRejectsSymlinkRoots();
    testGeneratedWorkspaceSnapshotOmitsUnparseableJsonWithArbitrarySecrets();
    testGeneratedWorkspaceSnapshotHandlesOwnedRootFiles();
    testGeneratedWorkspaceSnapshotCapturesRunCaseWhenOwnedRootCarriesAcrossPhases();
    testGeneratedWorkspaceSnapshotFailsAndPreservesRejectedRunCaseWithOwnedRoot();
    testGeneratedWorkspaceSnapshotExplainsRejectedRunCaseWithoutOwnedRoot();
    testMsnWeatherLifecycleRunEnvCarriesOwnedRoot();
    await testHttpTimeoutRequestLifecycleUsesIsolatedStartupResources();
    testCodefulDebugTasksRunEnvCarriesOwnedRoot();
    testGeneratedWorkspaceSnapshotFallsBackToOwnedRootForPartialManifest();
    testGeneratedWorkspaceSnapshotSourcesSupportLifecycleAndManifestShapes();
    testGeneratedWorkspaceSnapshotWritesNoWorkspaceMarker();
    testGeneratedWorkspaceSnapshotWritesNoWorkspaceMarkerForSmokeLabels();
    testGeneratedWorkspaceSnapshotExplainsBehaviorNoWorkspace();
    testMsnWeatherTargetEnvAllowsLocalInteractiveMode();
    testMsnWeatherTargetEnvBlocksInteractiveModeInCi();
    testBatchMsnWeatherDisablesLocalCliFallback();
    testSanitizesInheritedGitCommandConfigEnv();
    testBatchSuiteRegistryValidation();
    testBatchRuntimePathsStayShort();
    testBatchSuiteEnvironmentIsolation();
    testHttpDirectSelectorUsesRegisteredContainment();
    testHttpBatchDelegatesProcessClosureToSuiteContainment();
    await testBatchSuiteScopedCredentials();
    await testBatchContinuesAfterOrdinaryFailure();
    await testBatchStopsAfterContainmentBreach();
    await testBatchStopsAfterSuiteSetupFailure();
    await testBatchReturnsAggregateAfterInitializationFailure();
    await testBatchReturnsAggregateAfterContextCreationFailure();
    await testRunSuiteWrapperProcessWritesStructuredResults();
    await testDirectHttpFamilyRetainsWrapperPhaseJournal();
    await testRunSuiteWrapperProcessTimeoutCancelsDisposableChild();
    await testRunSuiteWrapperProcessTimeoutCancelsGrandchildListener();
    await testRunSuiteWrapperProcessTimeoutCancelsSignalResistantDescendant();
    await testContainedWrapperRejectsEscapedDescendant();
    testContainmentReceiptMustMatchHostOutcome();
    testDirectSuitePhaseResultRetainsOgfAcrossMatrixPhases();
    testDirectSuitePhaseResultClearsOgfOnLaterFailure();
    testDirectSuitePhaseResultDoesNotEmitOgfForCleanupFailure();
    testCoreMatrixBatchFinalEvidenceRetainsPhaseResults();
    testBatchAggregateJunitClosesEverySuite();
    testMsnDirectLifecycleEvidence();
    await testMsnLifecycleCleanupRetainsOriginalErrors();
    testMsnBatchLifecycleEvidence();
    testMsnSummaryRejectsIncompleteTerminal();
    testMochaHookReportingUsesOrdinalFailureIdentity();
    testSuitePrefixedMochaSummaryParsing();
    testMsnFailedWrapperAccounting();
    testMsnNativeFailureAccounting();
    testOgfGateControls();
    testAggregateCompletenessAndDiagnosticRerun();
    testAggregateCliOptions();
    testSingleSummarySupportsDiagnosticsArtifactName();
    testSummarizerMergesDirectOgfTerminalResult();
    testSummarizerDoesNotMergeFailedOgfTerminalResult();
    console.log('[run-e2e-cli.unit] all tests passed');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function testUnconfirmedCancelClosePreservesExistingApp() {
  const root = path.join(tempRoot, 'cancel-unconfirmed-close');
  fs.mkdirSync(root);
  const file = path.join(root, 'original-project.json');
  fs.writeFileSync(file, '{"mustRemain":"original"}');
  const result = { originalCodeClose: null, errors: ['original ordinary Close Window timeout'] };
  const cleanup = await cleanupDeferredWorkspaceAfterCancel(root, { LA_E2E_CLI_CREATE_WORKSPACE_PARENT: root }, result);
  assert.strictEqual(cleanup.verified, false);
  assert.strictEqual(cleanup.action, 'preserved');
  assert.strictEqual(fs.readFileSync(file, 'utf8'), '{"mustRemain":"original"}');
  assert.strictEqual(result.errors[0], 'original ordinary Close Window timeout');
  assert.match(result.errors[1], /closure was not confirmed/);
  const closedRoot = path.join(tempRoot, 'cancel-confirmed-close');
  fs.mkdirSync(closedRoot);
  const closed = await cleanupDeferredWorkspaceAfterCancel(closedRoot, {}, { originalCodeClose: { code: 0, signal: null }, errors: [] });
  assert.strictEqual(closed.verified, true);
  assert.strictEqual(closed.action, 'removed');
  assert.ok(!fs.existsSync(closedRoot));
}

function testCreatesEmptyIsolatedDependencyRoot() {
  const root = createIsolatedRuntimeDependenciesRoot('unit-test');
  try {
    assert.ok(root.startsWith(os.tmpdir()), `root should be isolated under the OS temp directory: ${root}`);
    assert.ok(path.basename(root).startsWith('logicappsux-vscode-e2e-runtime-deps-'), `root should be test-owned: ${root}`);
    assert.deepStrictEqual(fs.readdirSync(root), []);
    assert.strictEqual(path.basename(getFuncCoreToolsBinaryPath(root)), process.platform === 'win32' ? 'func.exe' : 'func');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function testAppliesControlledFuncAfterFinalEnvironmentMerge() {
  const controlledDirectory = path.join(tempRoot, 'controlled-func');
  const inheritedPath = process.platform === 'win32' ? 'C:\\inherited-bin' : '/inherited-bin';
  const result = applyControlledFuncEnvironment({ PATH: inheritedPath }, controlledDirectory);
  const pathKeys = Object.keys(result).filter((key) => (process.platform === 'win32' ? key.toLowerCase() === 'path' : key === 'PATH'));
  assert.strictEqual(pathKeys.length, 1, 'Final child environment must contain one unambiguous PATH key');
  assert.strictEqual(result[pathKeys[0]].split(path.delimiter)[0], controlledDirectory);
}

function testHttpBatchDelegatesProcessClosureToSuiteContainment() {
  const invocation = { LA_E2E_CLI_HTTP_TIMEOUT_COMPOSE_INVOCATION_ID: 'unit-http-invocation' };
  assert.strictEqual(requiresDirectHttpPhaseClosure(invocation), true);
  assert.strictEqual(
    requiresDirectHttpPhaseClosure({ ...invocation, LA_E2E_CLI_SUITE_WRAPPER_CHILD: '1' }),
    false,
    'Batch HTTP phases must rely on the exact suite containment receipt instead of reconstructing exited process ancestry'
  );
}

function testHttpDirectSelectorUsesRegisteredContainment() {
  assert.strictEqual(requiresDirectFamilyWrapper({}), true, 'The direct HTTP selector must launch the registered containment wrapper');
  assert.strictEqual(
    requiresDirectFamilyWrapper({
      LA_E2E_CLI_SUITE_WRAPPER_CHILD: '1',
    }),
    false,
    'The contained HTTP child must execute the scenario instead of recursively launching another wrapper'
  );
}

function testFailFastMissingFuncDiagnostics() {
  const root = path.join(tempRoot, 'missing-func-root');
  fs.mkdirSync(root, { recursive: true });
  assert.throws(
    () => verifyFuncCoreToolsAtDependencyRoot(root, 'unit missing func'),
    (error) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /Missing required Func Core Tools executable/);
      assert.match(error.message, /configured launcher/);
      assert.match(error.message, /in-proc8 worker host/);
      assert.match(error.message, /before opening the designer/);
      assert.match(error.message, /dependencyRoot entries/);
      return true;
    }
  );

  assert.match(collectRuntimeDependencyDiagnostics(root), /FuncCoreTools entries=\["<missing>"\]/);
}

function testFailFastMissingInProc8Diagnostics() {
  const root = path.join(tempRoot, 'missing-inproc8-root');
  const executableName = process.platform === 'win32' ? 'func.exe' : 'func';
  const configuredFunc = path.join(root, 'FuncCoreTools', executableName);
  const optionalInProc6Func = path.join(root, 'FuncCoreTools', 'in-proc6', executableName);
  fs.mkdirSync(path.dirname(optionalInProc6Func), { recursive: true });
  fs.writeFileSync(configuredFunc, 'placeholder');
  fs.writeFileSync(optionalInProc6Func, 'not required by the MSN Weather .NET 8 profile');

  assert.ok(getFuncCoreToolsCandidatePaths(root).includes(optionalInProc6Func), 'optional in-proc6 candidate should be discovered');
  assert.throws(
    () => verifyFuncCoreToolsAtDependencyRoot(root, 'unit missing in-proc8'),
    (error) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /Missing required Func Core Tools executable/);
      assert.match(error.message, /in-proc8 worker host/);
      assert.doesNotMatch(error.message, /in-proc6 worker host/);
      return true;
    }
  );
}

function testCopiesAzureLogicAppsChannelLogs() {
  const logsRoot = path.join(tempRoot, 'logs');
  const channelDir = path.join(logsRoot, '20260928T030206', 'window1', 'exthost', 'output_logging_20260928T030211');
  const channelLog = path.join(channelDir, '11-Azure Logic Apps (Standard).log');
  fs.mkdirSync(channelDir, { recursive: true });
  fs.writeFileSync(channelLog, 'bundle healthy\nAuthorization: Bearer raw-token\nfunc not found\n');

  const profileDestination = path.join(tempRoot, 'profile-destination');
  fs.mkdirSync(profileDestination, { recursive: true });

  const discovered = findAzureLogicAppsChannelLogs(logsRoot);
  assert.deepStrictEqual(discovered, [channelLog]);

  const copied = copyAzureLogicAppsChannelLogs(logsRoot, profileDestination);
  assert.deepStrictEqual(copied, [path.relative(logsRoot, channelLog)]);
  const copiedLogName = fs.readdirSync(path.join(profileDestination, 'azure-logic-apps-channel')).find((name) => name.endsWith('.log'));
  assert.ok(copiedLogName, 'channel log should be copied to top-level channel directory');
  const copiedLog = fs.readFileSync(path.join(profileDestination, 'azure-logic-apps-channel', copiedLogName), 'utf-8');
  assert.doesNotMatch(copiedLog, /raw-token/);
  assert.match(copiedLog, /<redacted>/);

  writeVscodeProfileLogIndex(profileDestination, {
    label: 'msnWeatherLifecycle',
    phase: 'msn-weather-run',
    userDataSuffix: 'msn-weather-run-123',
    sourceLogsDir: logsRoot,
    userDataDir: path.join(tempRoot, 'user-data'),
    channelLogs: copied,
    expectAzureLogicAppsChannel: true,
  });
  assert.match(fs.readFileSync(path.join(profileDestination, 'profile-log-index.md'), 'utf-8'), /msn-weather-run/);
}

function testVscodeProfileLogsUseSuiteUserDataParentAndRedact() {
  const userDataParent = path.join(tempRoot, 'suite-user-data-parent');
  const userDataDir = path.join(userDataParent, 'user-data-phase-a');
  const logsRoot = path.join(userDataDir, 'logs');
  const logDir = path.join(logsRoot, '20260928T030206', 'window1', 'exthost');
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(path.join(logDir, 'exthost.log'), 'Authorization=Bearer top-secret\nregular line\n');
  fs.writeFileSync(path.join(logDir, 'large.log'), 'x'.repeat(1024 * 1024 + 1));
  const channelDir = path.join(logDir, 'output_logging_20260928T030211');
  fs.mkdirSync(channelDir, { recursive: true });
  fs.writeFileSync(path.join(channelDir, '11-Azure Logic Apps (Standard).log'), 'access_token=abc123\nchannel line\n');
  fs.writeFileSync(path.join(logDir, 'ms-azuretools.vscode-azurelogicapps.log'), 'generic extension log\n');

  const env = {
    LA_E2E_CLI_USER_DATA_PARENT: userDataParent,
    LA_E2E_CLI_USER_DATA_SUFFIX: 'phase-a',
    LA_E2E_CLI_PROFILE_PHASE: 'phase-a',
    LA_E2E_CLI_VSCODE_LOG_DIR: path.join(tempRoot, 'profile-log-artifacts'),
    LA_E2E_CLI_VSCODE_LOG_ARTIFACT_LABEL: 'msnWeatherLifecycle',
    LA_E2E_CLI_EXPECT_AZURE_LOGIC_APPS_CHANNEL: '1',
  };

  assert.strictEqual(getVscodeUserDataDir(env), userDataDir);
  collectVscodeProfileLogs('msnWeatherLifecycle', env);

  const destination = path.join(env.LA_E2E_CLI_VSCODE_LOG_DIR, 'msnWeatherLifecycle', 'phase-a__phase-a');
  assert.ok(fs.existsSync(path.join(destination, 'profile-log-index.md')), 'profile log index should be written');
  const copiedSummary = JSON.parse(fs.readFileSync(path.join(destination, 'logs', 'copy-summary.json'), 'utf-8'));
  assert.ok(copiedSummary.copiedFiles >= 2, 'safe text logs should be copied');
  assert.ok(
    copiedSummary.skippedFiles.some((entry) => entry.source.endsWith('large.log')),
    'oversized logs should be skipped rather than published'
  );
  const copiedText = fs.readFileSync(path.join(destination, 'logs', '20260928T030206', 'window1', 'exthost', 'exthost-log'), 'utf-8');
  assert.doesNotMatch(copiedText, /top-secret|abc123/);
  assert.match(copiedText, /<redacted>/);
  assert.deepStrictEqual(
    findAzureLogicAppsChannelLogs(logsRoot).map((file) => path.basename(file)),
    ['11-Azure Logic Apps (Standard).log'],
    'Required channel evidence must not accept a generic extension-host log'
  );

  assert.throws(
    () =>
      collectVscodeProfileLogs('msnWeatherLifecycle', {
        ...env,
        LA_E2E_CLI_USER_DATA_SUFFIX: 'missing',
      }),
    /Required VS Code profile logs were not found/
  );
}

function testRegenerationProfileCollectionPreservesPrimaryFailure() {
  const missing = path.join(tempRoot, 'missing-regeneration-profile-root');
  const missingErrors = collectRegenerationProfileLogs(missing, {});
  assert.strictEqual(missingErrors.length, 1, 'Missing evidence roots must be reported without throwing over the primary failure');

  const root = path.join(tempRoot, 'regeneration-profile-root');
  fs.mkdirSync(root);
  fs.writeFileSync(path.join(root, 'phase-profile.json'), JSON.stringify({ profile: path.join(root, 'profile'), phase: 'phase' }));
  const collectorError = new Error('unit collector failure');
  const collectorErrors = collectRegenerationProfileLogs(root, {}, () => {
    throw collectorError;
  });
  assert.deepStrictEqual(collectorErrors, [collectorError], 'Profile collection failures must remain secondary diagnostics');
}

function testGeneratedWorkspaceSnapshotCopiesUsefulRedactedTree() {
  const source = createSyntheticGeneratedWorkspace('snapshot-source');
  const destination = path.join(tempRoot, 'snapshot-destination');
  const rawSecretMarkers = [
    'live-runtime-connection-key',
    'live-prefixed-runtime-connection-key',
    'live-dash-runtime-connection-key',
    'live-underscore-runtime-connection-key',
    'live-runtime-signature',
    'live-prefixed-runtime-signature',
    'live-dash-runtime-signature',
    'live-underscore-runtime-signature',
  ];
  const destinationWrites = new Map();
  const originalWriteFileSync = fs.writeFileSync;
  fs.writeFileSync = function writeFileSyncWithDestinationAssertion(filePath, content, ...args) {
    if (typeof filePath === 'string' && path.resolve(filePath).startsWith(path.resolve(destination))) {
      const text = Buffer.isBuffer(content) ? content.toString('utf-8') : String(content);
      destinationWrites.set(path.relative(destination, filePath), text);
      for (const marker of rawSecretMarkers) {
        assert.ok(!text.includes(marker), `Raw marker ${marker} must be redacted before writing ${filePath}`);
      }
    }
    return originalWriteFileSync.call(this, filePath, content, ...args);
  };
  let result;
  try {
    result = copyGeneratedWorkspaceSnapshot(source, destination);
  } finally {
    fs.writeFileSync = originalWriteFileSync;
  }

  assert.ok(result.copiedFiles >= 7, `expected useful generated project files to be copied, got ${result.copiedFiles}`);
  assert.ok(
    destinationWrites.has(path.join('LogicApp', 'local.settings.json')),
    'local.settings.json should be redacted before destination write'
  );
  assert.ok(
    destinationWrites.has(path.join('LogicApp', 'connections.json')),
    'connections.json should be redacted before destination write'
  );
  assert.ok(fs.existsSync(path.join(destination, 'test.code-workspace')), '.code-workspace should be copied');
  assert.ok(fs.existsSync(path.join(destination, 'LogicApp', 'host.json')), 'host.json should be copied');
  assert.ok(fs.existsSync(path.join(destination, 'LogicApp', 'Workflow1', 'workflow.json')), 'workflow.json should be copied');
  assert.ok(fs.existsSync(path.join(destination, 'LogicApp', '.vscode', 'tasks.json')), 'tasks.json should be copied');
  assert.ok(fs.existsSync(path.join(destination, 'LogicApp', '.vscode', 'launch.json')), 'launch.json should be copied');
  assert.ok(!fs.existsSync(path.join(destination, 'LogicApp', 'bin')), 'bin should be excluded');
  assert.ok(!fs.existsSync(path.join(destination, 'LogicApp', 'node_modules')), 'node_modules should be excluded');
  assert.ok(!fs.existsSync(path.join(destination, 'LogicApp', 'oversized.txt')), 'bulky file should be excluded');
  assert.ok(
    fs.existsSync(path.join(destination, 'SNAPSHOT_SKIPPED_FILES.md')),
    'snapshot should include skipped-file details for bulky/generated exclusions'
  );
  if (fs.existsSync(path.join(source, 'LogicApp', 'outside-link'))) {
    assert.ok(
      result.skippedFiles.some((entry) => entry.includes('outside-link') && entry.includes('symlink')),
      'symlink/reparse-point entries should be skipped instead of followed'
    );
  }

  const localSettings = JSON.parse(fs.readFileSync(path.join(destination, 'LogicApp', 'local.settings.json'), 'utf-8'));
  assert.strictEqual(localSettings.Values.WORKFLOWS_SUBSCRIPTION_ID, '00000000-0000-4000-8000-000000000001');
  assert.strictEqual(localSettings.Values.WORKFLOWS_RESOURCE_GROUP_NAME, 'LogicAppsVSCode-E2E-Fixtures');
  assert.strictEqual(localSettings.Values.WORKFLOWS_LOCATION_NAME, 'westus');
  assert.strictEqual(localSettings.Values.WORKFLOWS_TENANT_ID, '00000000-0000-4000-8000-000000000002');
  assert.strictEqual(localSettings.Values.AzureWebJobsStorage, '<redacted>');
  assert.strictEqual(localSettings.Values.SECRET_KEY, '<redacted>');
  assert.strictEqual(localSettings.Values.connectionKey, '<redacted>');
  assert.strictEqual(localSettings.Values.MSN_CONNECTION_KEY, '<redacted>');
  assert.strictEqual(localSettings.Values['connection-key'], '<redacted>');
  assert.strictEqual(localSettings.Values.connection_key, '<redacted>');
  const sourceLocalSettings = JSON.parse(fs.readFileSync(path.join(source, 'LogicApp', 'local.settings.json'), 'utf-8'));
  assert.strictEqual(
    sourceLocalSettings.Values.connectionKey,
    'live-runtime-connection-key',
    'live local.settings.json should not be mutated'
  );
  assert.strictEqual(sourceLocalSettings.Values.MSN_CONNECTION_KEY, 'live-prefixed-runtime-connection-key');
  assert.strictEqual(sourceLocalSettings.Values['connection-key'], 'live-dash-runtime-connection-key');
  assert.strictEqual(sourceLocalSettings.Values.connection_key, 'live-underscore-runtime-connection-key');
  const connections = JSON.parse(fs.readFileSync(path.join(destination, 'LogicApp', 'connections.json'), 'utf-8'));
  assert.strictEqual(connections.managedApiConnections.msnweather.connectionRuntimeUrl, '<redacted>');
  assert.strictEqual(connections.managedApiConnections.msnweather.MSN_CONNECTION_RUNTIME_URL, '<redacted>');
  assert.strictEqual(connections.managedApiConnections.msnweather['connection-runtime-url'], '<redacted>');
  assert.strictEqual(connections.managedApiConnections.msnweather.connection_runtime_url, '<redacted>');
  const sourceConnections = JSON.parse(fs.readFileSync(path.join(source, 'LogicApp', 'connections.json'), 'utf-8'));
  assert.strictEqual(
    sourceConnections.managedApiConnections.msnweather.connectionRuntimeUrl,
    'https://example.invalid/runtime/webhooks/workflow/api/secret?sig=live-runtime-signature',
    'live connections.json should not be mutated'
  );
  assert.strictEqual(
    sourceConnections.managedApiConnections.msnweather.MSN_CONNECTION_RUNTIME_URL,
    'https://example.invalid/runtime/webhooks/workflow/api/prefixed?sig=live-prefixed-runtime-signature'
  );
  assert.strictEqual(
    sourceConnections.managedApiConnections.msnweather['connection-runtime-url'],
    'https://example.invalid/runtime/webhooks/workflow/api/dash?sig=live-dash-runtime-signature'
  );
  assert.strictEqual(
    sourceConnections.managedApiConnections.msnweather.connection_runtime_url,
    'https://example.invalid/runtime/webhooks/workflow/api/underscore?sig=live-underscore-runtime-signature'
  );
  const settingsEvidence = JSON.parse(
    fs.readFileSync(path.join(destination, '.vscode-e2e-diagnostics', 'LogicApp', 'msn-weather-local-settings-after-save.json'), 'utf-8')
  );
  assert.deepStrictEqual(settingsEvidence.requiredKeys, [
    'WORKFLOWS_SUBSCRIPTION_ID',
    'WORKFLOWS_RESOURCE_GROUP_NAME',
    'WORKFLOWS_LOCATION_NAME',
    'WORKFLOWS_TENANT_ID',
    'WORKFLOWS_MANAGEMENT_BASE_URI',
  ]);
  const lifecycleTrace = JSON.parse(
    fs.readFileSync(path.join(destination, '.vscode-e2e-diagnostics', 'LogicApp', 'msn-weather-lifecycle-trace.json'), 'utf-8')
  );
  assert.strictEqual(lifecycleTrace[0].phase, 'savedworkflowverified');
  assert.strictEqual(lifecycleTrace[0].detail.accessToken, '<redacted>');
  assert.strictEqual(lifecycleTrace[0].detail.nested.clientSecret, '<redacted>');

  const workflow = fs.readFileSync(path.join(destination, 'LogicApp', 'Workflow1', 'workflow.json'), 'utf-8');
  assert.match(workflow, /sig=%3Credacted%3E/);
}

function testGeneratedWorkspaceSnapshotRedactsNestedSecrets() {
  assert.deepStrictEqual(redactGeneratedWorkspaceJsonValue({ authentication: { value: 'FAKE_TEST_SECRET' } }), {
    authentication: '<redacted>',
  });
  assert.deepStrictEqual(redactGeneratedWorkspaceJsonValue({ apiKey: ['FAKE_TEST_SECRET'] }), { apiKey: '<redacted>' });
  assert.deepStrictEqual(redactGeneratedWorkspaceJsonValue({ credentials: { value: 'FAKE_TEST_SECRET' } }), {
    credentials: '<redacted>',
  });

  const redactedJsonc = redactGeneratedWorkspacePlainText('{"token":"FAKE_TEST_SECRET", // comment\n}');
  assert.doesNotMatch(redactedJsonc, /FAKE_TEST_SECRET/);
  assert.match(redactedJsonc, /<redacted>/);
}

function testGeneratedWorkspaceSnapshotOmitsUnsafeFormats() {
  const source = createSyntheticGeneratedWorkspace('unsafe-formats');
  const appDir = path.join(source, 'LogicApp');
  fs.writeFileSync(path.join(appDir, '.env'), 'TOKEN=FAKE_TEST_SECRET\n');
  fs.writeFileSync(path.join(appDir, 'private.key'), '-----BEGIN PRIVATE KEY-----\nFAKE_TEST_SECRET\n');
  fs.writeFileSync(path.join(appDir, 'fixture.js'), 'const token = "FAKE_TEST_SECRET";\n');
  fs.writeFileSync(path.join(appDir, 'jsonc-settings.json'), '{"token":"FAKE_TEST_SECRET", // comment\n}');
  const destination = path.join(tempRoot, 'unsafe-formats-destination');

  const result = copyGeneratedWorkspaceSnapshot(source, destination);
  assert.ok(!fs.existsSync(path.join(destination, 'LogicApp', '.env')), '.env files should be omitted');
  assert.ok(!fs.existsSync(path.join(destination, 'LogicApp', 'private.key')), '.key files should be omitted');
  assert.ok(!fs.existsSync(path.join(destination, 'LogicApp', 'fixture.js')), '.js files should be omitted');
  assert.ok(
    result.skippedFiles.some((entry) => entry.includes('.env') && entry.includes('unsafe')),
    'unsafe omitted files should be listed in snapshot skip details'
  );
  assert.ok(!fs.existsSync(path.join(destination, 'LogicApp', 'jsonc-settings.json')), 'unparseable JSON/JSONC should be omitted');
  assert.ok(
    result.skippedFiles.some((entry) => entry.includes('jsonc-settings.json') && entry.includes('unparseable JSON')),
    'unparseable JSON/JSONC omission should be explicit'
  );
}

function testGeneratedWorkspaceSnapshotRejectsUnownedManifestSources() {
  const ownedRoot = path.join(tempRoot, 'owned-root-for-unowned-source');
  fs.mkdirSync(ownedRoot, { recursive: true });
  const outsideWorkspace = createSyntheticGeneratedWorkspace('outside-manifest-source', path.join(tempRoot, 'outside-parent'));
  const manifestPath = path.join(tempRoot, 'outside-manifest.json');
  const artifactRoot = path.join(tempRoot, 'generated-artifacts-unowned-source');
  fs.writeFileSync(manifestPath, JSON.stringify([{ label: 'outside', workspaceDir: outsideWorkspace }], null, 2));

  withEnvironment({ LA_E2E_CLI_GENERATED_WORKSPACE_ARTIFACT_DIR: artifactRoot }, () => {
    captureGeneratedWorkspaceDiagnostics({
      env: {
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_MANIFEST: manifestPath,
        LA_E2E_CLI_WORKSPACE_PARENT: ownedRoot,
        LA_E2E_CLI_PROFILE_PHASE: 'create',
      },
      label: 'workspaceLifecycle',
      outcome: 'failure',
    });
  });

  assert.strictEqual(findFileByName(artifactRoot, 'workflow.json'), undefined, 'manifest source outside owned root must not be copied');
  const snapshotIndex = findFileByName(artifactRoot, 'index.json');
  assert.ok(snapshotIndex, `expected snapshot index.json under ${artifactRoot}`);
  assert.match(fs.readFileSync(snapshotIndex, 'utf-8'), /outside wrapper-created owned roots/);
}

function testGeneratedWorkspaceSnapshotRejectsSymlinkRoots() {
  const ownedRoot = path.join(tempRoot, 'owned-root-for-linked-source');
  const outsideWorkspace = createSyntheticGeneratedWorkspace('linked-target', path.join(tempRoot, 'linked-target-parent'));
  const linkedSource = path.join(ownedRoot, 'linked-source');
  fs.mkdirSync(ownedRoot, { recursive: true });
  try {
    fs.symlinkSync(outsideWorkspace, linkedSource, process.platform === 'win32' ? 'junction' : 'dir');
  } catch {
    return;
  }

  const artifactRoot = path.join(tempRoot, 'generated-artifacts-linked-source');
  assert.throws(
    () =>
      withEnvironment({ LA_E2E_CLI_GENERATED_WORKSPACE_ARTIFACT_DIR: artifactRoot }, () =>
        captureGeneratedWorkspaceDiagnostics({
          env: {
            LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE: JSON.stringify({ label: 'linked', workspaceDir: linkedSource }),
            LA_E2E_CLI_WORKSPACE_PARENT: ownedRoot,
            LA_E2E_CLI_PROFILE_PHASE: 'create',
          },
          label: 'workspaceLifecycle',
          outcome: 'failure',
        })
      ),
    /symlink\/reparse point/
  );
}

function testGeneratedWorkspaceSnapshotOmitsUnparseableJsonWithArbitrarySecrets() {
  const source = createSyntheticGeneratedWorkspace('arbitrary-jsonc-secret');
  const appDir = path.join(source, 'LogicApp');
  const secret = '00000000-0000-4000-8000-000000000099';
  fs.writeFileSync(path.join(appDir, 'credentials.json'), `{"credentials":{"value":"${secret}"}, // comment\n}`);
  fs.writeFileSync(
    path.join(appDir, 'authentication.json'),
    `{"authentication":{"nested":{"type":"basic"},"value":"${secret}"}, // comment\n}`
  );
  fs.writeFileSync(path.join(appDir, 'secrets.xml'), `<settings><password>${secret}</password></settings>`);
  const destination = path.join(tempRoot, 'arbitrary-jsonc-secret-destination');

  copyGeneratedWorkspaceSnapshot(source, destination);
  assert.ok(!fs.existsSync(path.join(destination, 'LogicApp', 'credentials.json')), 'unparseable credentials JSONC should be omitted');
  assert.ok(!fs.existsSync(path.join(destination, 'LogicApp', 'authentication.json')), 'unparseable auth JSONC should be omitted');
  const xml = fs.readFileSync(path.join(destination, 'LogicApp', 'secrets.xml'), 'utf-8');
  assert.doesNotMatch(xml, new RegExp(secret));
  assert.match(xml, /<password><redacted><\/password>/);
}

function testGeneratedWorkspaceSnapshotHandlesOwnedRootFiles() {
  const ownedRoot = path.join(tempRoot, 'owned-root-with-files');
  const workspace = createSyntheticGeneratedWorkspace('workspace-with-files', ownedRoot);
  fs.writeFileSync(path.join(ownedRoot, 'manifest.json'), JSON.stringify([{ workspaceDir: workspace }], null, 2));
  const artifactRoot = path.join(tempRoot, 'generated-artifacts-owned-root-files');

  withEnvironment({ LA_E2E_CLI_GENERATED_WORKSPACE_ARTIFACT_DIR: artifactRoot }, () => {
    captureGeneratedWorkspaceDiagnostics({
      env: {
        LA_E2E_CLI_WORKSPACE_PARENT: ownedRoot,
        LA_E2E_CLI_PROFILE_PHASE: 'create',
      },
      label: 'workspaceLifecycle',
      outcome: 'failure',
    });
  });

  assert.ok(findFileByName(artifactRoot, 'test.code-workspace'), 'workspace root files should be preserved');
  assert.strictEqual(
    findFileByName(artifactRoot, 'manifest.json'),
    undefined,
    'owned-root control files should not be copied as workspaces'
  );
}

function testGeneratedWorkspaceSnapshotCapturesRunCaseWhenOwnedRootCarriesAcrossPhases() {
  const ownedRoot = path.join(tempRoot, 'owned-root-run-case');
  const workspace = createSyntheticGeneratedWorkspace('workspace-run-case', ownedRoot);
  const artifactRoot = path.join(tempRoot, 'generated-artifacts-run-case');

  withEnvironment({ LA_E2E_CLI_GENERATED_WORKSPACE_ARTIFACT_DIR: artifactRoot }, () => {
    captureGeneratedWorkspaceDiagnostics({
      env: {
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE: JSON.stringify({ label: 'standard', workspaceDir: workspace }),
        LA_E2E_CLI_WORKSPACE_PARENT: ownedRoot,
        LA_E2E_CLI_PROFILE_PHASE: 'msn-weather-run',
      },
      label: 'msnWeatherLifecycle',
      outcome: 'failure',
    });
  });

  const copiedWorkflow = findFileByName(artifactRoot, 'workflow.json');
  assert.ok(copiedWorkflow, `expected run case workflow.json to be captured under ${artifactRoot}`);
  assert.match(fs.readFileSync(copiedWorkflow, 'utf-8'), /sig=%3Credacted%3E/, 'expected run case to copy and redact workflow files');
  const index = findFileByName(artifactRoot, 'index.json');
  assert.ok(index, `expected run case index.json under ${artifactRoot}`);
  const indexText = fs.readFileSync(index, 'utf-8');
  assert.match(indexText, /owned-root-run-case/);
  assert.match(indexText, /"label": "standard"/);
}

function testGeneratedWorkspaceSnapshotExplainsRejectedRunCaseWithoutOwnedRoot() {
  const workspace = createSyntheticGeneratedWorkspace('workspace-rejected-run-case');
  const artifactRoot = path.join(tempRoot, 'generated-artifacts-rejected-run-case');

  withEnvironment({ LA_E2E_CLI_GENERATED_WORKSPACE_ARTIFACT_DIR: artifactRoot }, () => {
    assert.throws(
      () =>
        captureGeneratedWorkspaceDiagnostics({
          env: {
            LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE: JSON.stringify({ label: 'standard', workspaceDir: workspace }),
            LA_E2E_CLI_PROFILE_PHASE: 'msn-weather-run',
          },
          label: 'msnWeatherLifecycle',
          outcome: 'failure',
        }),
      /rejected discovered workspace source/
    );
  });

  const marker = findFileByName(artifactRoot, 'no-workspace-created.txt');
  assert.ok(marker, 'rejected run case should still publish an explicit marker');
  assert.match(fs.readFileSync(marker, 'utf-8'), /discovered but rejected/);
  assert.match(fs.readFileSync(marker, 'utf-8'), /manifest or case paths alone are not trusted/);
}

function testGeneratedWorkspaceSnapshotFailsAndPreservesRejectedRunCaseWithOwnedRoot() {
  const ownedRoot = path.join(tempRoot, 'owned-root-rejected-run-case');
  fs.mkdirSync(ownedRoot, { recursive: true });
  const workspace = createSyntheticGeneratedWorkspace('workspace-rejected-owned-run-case', path.join(tempRoot, 'outside-owned-run-parent'));
  const artifactRoot = path.join(tempRoot, 'generated-artifacts-rejected-owned-run-case');

  withEnvironment({ LA_E2E_CLI_GENERATED_WORKSPACE_ARTIFACT_DIR: artifactRoot }, () => {
    assert.throws(
      () =>
        captureGeneratedWorkspaceDiagnostics({
          env: {
            LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE: JSON.stringify({ label: 'standard', workspaceDir: workspace }),
            LA_E2E_CLI_WORKSPACE_PARENT: ownedRoot,
            LA_E2E_CLI_PROFILE_PHASE: 'msn-weather-run',
          },
          label: 'msnWeatherLifecycle',
          outcome: 'failure',
        }),
      /rejected discovered workspace source/
    );
  });

  const marker = findFileByName(artifactRoot, 'no-workspace-created.txt');
  assert.ok(marker, 'rejected owned run case should still publish an explicit marker');
  assert.match(fs.readFileSync(marker, 'utf-8'), /discovered but rejected/);
  assert.strictEqual(
    hasOwnedWorkspaceParentDiagnosticFailure(ownedRoot),
    true,
    'owned parent should be marked for preservation when run-case discovered sources are rejected'
  );
}

function testMsnWeatherLifecycleRunEnvCarriesOwnedRoot() {
  const workspaceParent = path.join(tempRoot, 'msn-weather-run-parent');
  const entry = {
    label: 'standard',
    workspaceFilePath: path.join(workspaceParent, 'workspace.code-workspace'),
    workspaceDir: path.join(workspaceParent, 'workspace'),
  };
  const env = getMsnWeatherLifecycleRunExtraEnv({
    commonEnv: {
      LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT: path.join(tempRoot, 'runtime-deps'),
    },
    workspaceParent,
    lifecycleRunId: 12345,
    entry,
    azureEnv: {
      LA_E2E_CLI_AZURE_SUBSCRIPTION_ID: 'sub',
    },
  });

  assert.strictEqual(env.LA_E2E_CLI_WORKSPACE_PARENT, workspaceParent);
  assert.strictEqual(env.LA_E2E_CLI_PROFILE_PHASE, 'msn-weather-run');
  assert.strictEqual(env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE, 'msn-weather-run');
  assert.deepStrictEqual(JSON.parse(env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE), entry);
  assert.strictEqual(env.LA_E2E_CLI_STARTUP_RESOURCE, entry.workspaceFilePath);
  assert.strictEqual(env.LA_E2E_CLI_AZURE_SUBSCRIPTION_ID, 'sub');
}

async function testHttpTimeoutRequestLifecycleUsesIsolatedStartupResources() {
  assert.deepStrictEqual(getDirectExpectedPhaseIds('httpTimeoutLifecycle'), [
    'runtimeDependencyBootstrap:bootstrap',
    'httpTimeoutLifecycle:create',
    'httpTimeoutLifecycle:reopen',
  ]);

  const suiteId = 'httpTimeoutLifecycle';
  const root = fs.mkdtempSync(path.join(tempRoot, 'http-timeout-request-'));
  const workspaceParent = path.join(root, 'workspaces');
  const runtimeRoot = path.join(root, 'runtime');
  const phaseResultsPath = path.join(root, 'phases.jsonl');
  fs.mkdirSync(workspaceParent, { recursive: true });
  fs.mkdirSync(runtimeRoot, { recursive: true });
  const priorPhaseResultsPath = process.env.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH;
  const priorRuntimeRoot = process.env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT;
  const calls = [];

  process.env.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH = phaseResultsPath;
  process.env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT = runtimeRoot;
  try {
    await runHttpTimeoutLifecycle({
      createParent: () => workspaceParent,
      createRuntimeRoot: () => runtimeRoot,
      cleanupRuntime: async () => undefined,
      credentialEnvironment: async () => ({}),
      cleanup: async (ownedRoot) => {
        fs.rmSync(ownedRoot, { recursive: true, force: true });
      },
      run: async (args, options) => {
        const env = options.extraEnv;
        calls.push({ args, env: { ...env } });
        let phaseId = 'runtimeDependencyBootstrap:bootstrap';
        if (env.LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MODE === 'create') {
          phaseId = `${suiteId}:create`;
          const wsName = 'httptimeoutws';
          const appDir = path.join(workspaceParent, wsName, 'httptimeoutapp');
          const wfName = 'httptimeoutwf';
          const workspaceDir = path.join(workspaceParent, wsName);
          const workspaceFilePath = path.join(workspaceDir, `${wsName}.code-workspace`);
          const workflowJsonPath = path.join(appDir, wfName, 'workflow.json');
          fs.mkdirSync(path.dirname(workflowJsonPath), { recursive: true });
          fs.writeFileSync(workspaceFilePath, '{}');
          fs.writeFileSync(workflowJsonPath, '{}');
          fs.writeFileSync(
            env.LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MANIFEST,
            JSON.stringify([
              {
                label: 'http-timeout-lifecycle',
                appType: 'standard',
                wsName,
                wfName,
                workspaceDir,
                workspaceFilePath,
                appDir,
                workflowJsonPath,
              },
            ])
          );
        } else if (env.LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MODE === 'run') {
          phaseId = `${suiteId}:reopen`;
        }
        fs.appendFileSync(
          phaseResultsPath,
          `${JSON.stringify({
            phaseId,
            complete: true,
            exitCode: 0,
            signal: null,
            cleanupVerified: true,
          })}\n`
        );
        return 0;
      },
    });
  } finally {
    if (priorPhaseResultsPath === undefined) {
      delete process.env.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH;
    } else {
      process.env.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH = priorPhaseResultsPath;
    }
    if (priorRuntimeRoot === undefined) {
      delete process.env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT;
    } else {
      process.env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT = priorRuntimeRoot;
    }
  }

  assert.strictEqual(calls.length, 3);
  const [bootstrap, create, run] = calls;
  assert.strictEqual(bootstrap.env.LA_E2E_CLI_STARTUP_RESOURCE, '');
  assert.strictEqual(create.env.LA_E2E_CLI_STARTUP_RESOURCE, '');
  assert.strictEqual(create.env.LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MODE, 'create');
  assert.strictEqual(run.env.LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MODE, 'run');
  const manifest = JSON.parse(fs.readFileSync(create.env.LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MANIFEST, 'utf8'));
  assert.strictEqual(run.env.LA_E2E_CLI_STARTUP_RESOURCE, manifest[0].workspaceFilePath);
  assert.notStrictEqual(create.env.LA_E2E_CLI_USER_DATA_SUFFIX, run.env.LA_E2E_CLI_USER_DATA_SUFFIX);
}

function testCodefulDebugTasksRunEnvCarriesOwnedRoot() {
  const workspaceParent = path.join(tempRoot, 'codeful-run-parent');
  const entry = {
    label: 'codeful-modern',
    workspaceFilePath: path.join(workspaceParent, 'workspace.code-workspace'),
    workspaceDir: path.join(workspaceParent, 'workspace'),
  };
  const env = getCodefulDebugTasksRunExtraEnv({
    workspaceParent,
    entry,
    now: 12345,
  });

  assert.strictEqual(env.LA_E2E_CLI_WORKSPACE_PARENT, workspaceParent);
  assert.strictEqual(env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE, 'codeful-run');
  assert.deepStrictEqual(JSON.parse(env.LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE), entry);
  assert.strictEqual(env.LA_E2E_CLI_STARTUP_RESOURCE, entry.workspaceFilePath);
  assert.strictEqual(env.LA_E2E_CLI_CODEFUL_EVIDENCE_NOT_BEFORE, '11345');
}

function testGeneratedWorkspaceSnapshotFallsBackToOwnedRootForPartialManifest() {
  const ownedRoot = path.join(tempRoot, 'owned-root');
  const workspace = createSyntheticGeneratedWorkspace('owned-root', ownedRoot);
  const malformedManifestPath = path.join(tempRoot, 'malformed-manifest.json');
  fs.writeFileSync(malformedManifestPath, '{');
  const artifactRoot = path.join(tempRoot, 'generated-artifacts-partial-manifest');

  withEnvironment({ LA_E2E_CLI_GENERATED_WORKSPACE_ARTIFACT_DIR: artifactRoot }, () => {
    captureGeneratedWorkspaceDiagnostics({
      env: {
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_MANIFEST: malformedManifestPath,
        LA_E2E_CLI_WORKSPACE_PARENT: ownedRoot,
        LA_E2E_CLI_PROFILE_PHASE: 'create',
      },
      label: 'workspaceLifecycle',
      outcome: 'failure',
    });
  });

  const rootIndex = fs.readFileSync(path.join(artifactRoot, 'index.md'), 'utf-8');
  assert.match(rootIndex, /workspaceLifecycle/);
  const copiedWorkflow = findFileByName(artifactRoot, 'workflow.json');
  assert.ok(copiedWorkflow, `expected workflow.json to be captured under ${artifactRoot}`);
  assert.ok(copiedWorkflow.includes(path.basename(workspace)), 'expected fallback to copy the owned generated workspace');
  const snapshotIndex = findFileByName(artifactRoot, 'index.json');
  assert.ok(snapshotIndex, `expected snapshot index.json under ${artifactRoot}`);
  assert.match(fs.readFileSync(path.join(path.dirname(snapshotIndex), 'index.md'), 'utf-8'), /WORKFLOWS_SUBSCRIPTION_ID=valid/);
}

function testGeneratedWorkspaceSnapshotSourcesSupportLifecycleAndManifestShapes() {
  const manifestWorkspace = createSyntheticGeneratedWorkspace('manifest-shape');
  const lifecycleWorkspace = createSyntheticGeneratedWorkspace('lifecycle-shape');
  const manifestPath = path.join(tempRoot, 'manifest-shape.json');
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify([
      {
        label: 'manifest-standard',
        workspaceDir: manifestWorkspace,
      },
    ])}\n`
  );
  const lifecycleCaseJson = JSON.stringify({
    label: 'lifecycle-standard',
    workspaceDir: lifecycleWorkspace,
  });

  assert.deepStrictEqual(
    getWorkspaceSourcesFromManifestPath(manifestPath).map((source) => source.path),
    [manifestWorkspace]
  );
  const sources = collectGeneratedWorkspaceSnapshotSources({
    manifestPaths: [manifestPath],
    lifecycleCaseJson,
  });
  assert.deepStrictEqual(sources.map((source) => source.path).sort(), [lifecycleWorkspace, manifestWorkspace].sort());
}

function testGeneratedWorkspaceSnapshotWritesNoWorkspaceMarker() {
  const artifactRoot = path.join(tempRoot, 'generated-artifacts-no-workspace');
  withEnvironment({ LA_E2E_CLI_GENERATED_WORKSPACE_ARTIFACT_DIR: artifactRoot }, () => {
    captureGeneratedWorkspaceDiagnostics({
      env: {
        LA_E2E_CLI_PROFILE_PHASE: 'msn-weather-bootstrap',
      },
      label: 'runtimeDependencyBootstrap',
      outcome: 'failure',
    });
  });

  const marker = findFileByName(artifactRoot, 'no-workspace-created.txt');
  assert.ok(marker, 'bootstrap phase without a workspace should write an explicit marker');
  assert.match(fs.readFileSync(marker, 'utf-8'), /no workspace created/i);
}

function testGeneratedWorkspaceSnapshotWritesNoWorkspaceMarkerForSmokeLabels() {
  const artifactRoot = path.join(tempRoot, 'generated-artifacts-smoke-no-workspace');
  withEnvironment({ LA_E2E_CLI_GENERATED_WORKSPACE_ARTIFACT_DIR: artifactRoot }, () => {
    captureGeneratedWorkspaceDiagnostics({
      env: {},
      label: 'unitTests',
      outcome: 'success',
    });
  });

  const marker = findFileByName(artifactRoot, 'no-workspace-created.txt');
  assert.ok(marker, 'non-workspace smoke labels should still publish an explicit no-workspace marker');
}

function testGeneratedWorkspaceSnapshotExplainsBehaviorNoWorkspace() {
  assert.match(
    getNoGeneratedWorkspaceSnapshotReason({ env: {}, label: 'createWorkspaceBehavior', trustedRootRecords: [] }),
    /without clicking Create/
  );

  const ownedRoot = path.join(tempRoot, 'behavior-owned-root');
  fs.mkdirSync(ownedRoot, { recursive: true });
  const artifactRoot = path.join(tempRoot, 'generated-artifacts-behavior-no-workspace');
  withEnvironment({ LA_E2E_CLI_GENERATED_WORKSPACE_ARTIFACT_DIR: artifactRoot }, () => {
    captureGeneratedWorkspaceDiagnostics({
      env: {
        LA_E2E_CLI_CREATE_WORKSPACE_PARENT: ownedRoot,
      },
      label: 'createWorkspaceBehavior',
      outcome: 'success',
      ownedRoots: [ownedRoot],
    });
  });

  const marker = findFileByName(artifactRoot, 'no-workspace-created.txt');
  assert.ok(marker, 'Create Workspace behavior label should write an explicit no-workspace marker');
  assert.match(fs.readFileSync(marker, 'utf-8'), /without clicking Create/);
  const index = findFileByName(artifactRoot, 'index.json');
  assert.ok(index, 'Create Workspace behavior label should write snapshot metadata');
  assert.match(fs.readFileSync(index, 'utf-8'), /No generated Logic App project\/workspace is expected/);
}

function testMsnWeatherTargetEnvAllowsLocalInteractiveMode() {
  withEnvironment(
    {
      LA_E2E_CLI_MSN_WEATHER_ALLOW_INTERACTIVE_AZURE_SETTINGS: '1',
      LA_E2E_CLI_AZURE_SUBSCRIPTION_ID: undefined,
      WORKFLOWS_SUBSCRIPTION_ID: undefined,
      LA_E2E_CLI_AZURE_TENANT_ID: undefined,
      WORKFLOWS_TENANT_ID: undefined,
      LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME: undefined,
      WORKFLOWS_RESOURCE_GROUP_NAME: undefined,
      LA_E2E_CLI_AZURE_LOCATION_NAME: undefined,
      WORKFLOWS_LOCATION_NAME: undefined,
      LA_E2E_CLI_AZURE_MANAGEMENT_BASE_URL: undefined,
      WORKFLOWS_MANAGEMENT_BASE_URI: undefined,
      CI: undefined,
      TF_BUILD: undefined,
      GITHUB_ACTIONS: undefined,
    },
    () => {
      assert.deepStrictEqual(getMsnWeatherAzureTargetEnv(), {});
    }
  );
}

function testMsnWeatherTargetEnvBlocksInteractiveModeInCi() {
  assert.strictEqual(
    canUseInteractiveMsnWeatherAzureTargetEnv({
      LA_E2E_CLI_MSN_WEATHER_ALLOW_INTERACTIVE_AZURE_SETTINGS: '1',
      CI: 'true',
    }),
    false
  );
  assert.strictEqual(
    canUseInteractiveMsnWeatherAzureTargetEnv({
      LA_E2E_CLI_MSN_WEATHER_ALLOW_INTERACTIVE_AZURE_SETTINGS: '1',
      TF_BUILD: 'True',
    }),
    false
  );
  assert.strictEqual(
    canUseInteractiveMsnWeatherAzureTargetEnv({
      LA_E2E_CLI_MSN_WEATHER_ALLOW_INTERACTIVE_AZURE_SETTINGS: '1',
      GITHUB_ACTIONS: 'true',
    }),
    false
  );
}

function testBatchMsnWeatherDisablesLocalCliFallback() {
  withEnvironment(
    {
      LA_E2E_CLI_BATCH_MODE: '1',
      LA_E2E_CLI_AZURE_ACCESS_TOKEN: undefined,
      LA_E2E_CLI_DISABLE_AZURE_CLI_TOKEN_FALLBACK: undefined,
      AzCode_UseAzureFederatedCredentials: 'false',
      FC_SERVICE_CONNECTION_ID: undefined,
      AzCode_ServiceConnectionID: undefined,
    },
    () => {
      assert.deepStrictEqual(getMsnWeatherAzureAuthEnv(), {});
      assert.strictEqual(hasHeadlessMsnWeatherAzureAuth(process.env), false);
    }
  );

  withEnvironment(
    {
      LA_E2E_CLI_BATCH_MODE: '1',
      LA_E2E_CLI_AZURE_SUBSCRIPTION_ID: undefined,
      WORKFLOWS_SUBSCRIPTION_ID: undefined,
      LA_E2E_CLI_AZURE_TENANT_ID: undefined,
      WORKFLOWS_TENANT_ID: undefined,
      LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME: undefined,
      WORKFLOWS_RESOURCE_GROUP_NAME: undefined,
      LA_E2E_CLI_MSN_WEATHER_ALLOW_INTERACTIVE_AZURE_SETTINGS: '1',
      CI: undefined,
    },
    () => {
      assert.throws(() => getMsnWeatherAzureTargetEnv(), /Set LA_E2E_CLI_AZURE_TENANT_ID/);
    }
  );
}

function testSanitizesInheritedGitCommandConfigEnv() {
  assert.deepStrictEqual(
    sanitizeInheritedGitCommandConfigEnv({
      GIT_CONFIG_COUNT: '3',
      GIT_CONFIG_KEY_0: 'safe.bareRepository',
      GIT_CONFIG_VALUE_0: 'explicit',
      GIT_CONFIG_KEY_1: 'credential.interactive',
      GIT_CONFIG_VALUE_1: 'never',
      GIT_CONFIG_KEY_2: 'core.fsmonitor',
      GIT_CONFIG_VALUE_2: '',
      GIT_CONFIG_PARAMETERS: "'credential.https://github.com.helper='",
      GIT_EXEC_PATH: '/git/libexec/git-core',
      GIT_TERMINAL_PROMPT: '0',
      LA_E2E_CLI_LABEL: 'msnWeatherLifecycle',
    }),
    {
      GIT_EXEC_PATH: '/git/libexec/git-core',
      GIT_TERMINAL_PROMPT: '0',
      LA_E2E_CLI_LABEL: 'msnWeatherLifecycle',
    }
  );
}

function testBatchSuiteRegistryValidation() {
  assert.deepStrictEqual(
    normalizeSuiteSelection('linux', { platform: 'linux' }).map((suite) => suite.id),
    [
      'unitTests',
      'createWorkspaceBehavior',
      'createWorkspaceCoreMatrix',
      'createWorkspacePreviewMatrix',
      'createWorkspaceCodeful',
      'msnWeatherLifecycle',
    ]
  );
  assert.deepStrictEqual(
    normalizeSuiteSelection('windows', { platform: 'win32' }).map((suite) => suite.id),
    [
      'unitTests',
      'createWorkspaceBehavior',
      'createWorkspaceCoreMatrix',
      'createWorkspacePreviewMatrix',
      'createWorkspaceCodeful',
      'msnWeatherLifecycle',
    ]
  );
  assert.deepStrictEqual(
    normalizeSuiteSelection('createWorkspaceBehaviorSmoke', { platform: 'win32' }).map((suite) => suite.id),
    ['createWorkspaceBehaviorSmoke']
  );
  assert.throws(() => normalizeSuiteSelection('', { platform: 'linux' }), /requires at least one/);
  assert.throws(() => normalizeSuiteSelection('unitTests,unitTests', { platform: 'linux' }), /Duplicate/);
  assert.throws(() => normalizeSuiteSelection('doesNotExist', { platform: 'linux' }), /Unknown/);
  assert.throws(() => normalizeSuiteSelection('createWorkspaceBehaviorSmoke', { platform: 'linux' }), /not available/);
}

function testBatchSuiteEnvironmentIsolation() {
  const suite = SUITE_REGISTRY.unitTests;
  const batchRoot = path.join(tempRoot, 'batch-env');
  fs.mkdirSync(batchRoot, { recursive: true });
  const context = createSuiteContext({ batchRoot, suite, index: 0, total: 1, now: 1 });
  const env = buildSuiteEnvironment(
    {
      PATH: process.env.PATH,
      LA_E2E_CLI_STARTUP_RESOURCE: 'stale.code-workspace',
      LA_E2E_CLI_INCLUDE_MSN_WEATHER_LIFECYCLE: '1',
      LA_E2E_CLI_USER_DATA_SUFFIX: 'stale-profile',
      LA_E2E_CLI_USER_DATA_DIR: path.join(tempRoot, 'stale-user-data'),
      LA_E2E_CLI_AZURE_ACCESS_TOKEN: 'stale-token',
      WORKFLOWS_SUBSCRIPTION_ID: 'stale-subscription',
      idToken: 'raw-federated-token',
      servicePrincipalKey: 'raw-service-principal-key',
      servicePrincipalId: 'raw-service-principal-id',
      tenantId: 'raw-tenant-id',
      AZURE_CONFIG_DIR: path.join(tempRoot, 'azure-profile'),
    },
    context
  );

  assert.strictEqual(env.LA_E2E_CLI_BATCH_MODE, '1');
  assert.strictEqual(env.LA_E2E_CLI_BATCH_SUITE_ID, 'unitTests');
  assert.ok(env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT.startsWith(context.suiteRoot));
  assert.ok(env.LA_E2E_CLI_USER_DATA_PARENT.startsWith(context.suiteRoot));
  assert.ok(env.LA_E2E_CLI_EXTENSIONS_DIR.startsWith(context.suiteRoot));
  assert.ok(env.LA_E2E_CLI_WORKSPACE_ROOT.startsWith(context.suiteRoot));
  assert.ok(env.LA_E2E_CLI_VSCODE_LOG_DIR.startsWith(context.reportsRoot));
  assert.ok(env.LA_E2E_CLI_GENERATED_WORKSPACE_ARTIFACT_DIR.startsWith(context.reportsRoot));
  assert.ok(env.LA_E2E_CLI_CREATE_WORKSPACE_FIXTURE_MANIFEST.startsWith(context.workspaceRoot));
  assert.strictEqual(env.LA_E2E_CLI_STARTUP_RESOURCE, undefined);
  assert.strictEqual(env.LA_E2E_CLI_INCLUDE_MSN_WEATHER_LIFECYCLE, undefined);
  assert.strictEqual(env.LA_E2E_CLI_USER_DATA_SUFFIX, undefined);
  assert.strictEqual(env.LA_E2E_CLI_USER_DATA_DIR, undefined);
  assert.strictEqual(env.LA_E2E_CLI_AZURE_ACCESS_TOKEN, undefined);
  assert.strictEqual(env.WORKFLOWS_SUBSCRIPTION_ID, undefined);
  assert.strictEqual(env.idToken, undefined);
  assert.strictEqual(env.servicePrincipalKey, undefined);
  assert.strictEqual(env.servicePrincipalId, undefined);
  assert.strictEqual(env.tenantId, undefined);
  assert.strictEqual(env.AZURE_CONFIG_DIR, undefined);
  assert.strictEqual(env.LA_E2E_CLI_DISABLE_UNOWNED_PORT_KILL, '1');

  const seedDir = path.join(tempRoot, 'extensions-seed');
  fs.mkdirSync(path.join(seedDir, 'publisher.extension-1.0.0'), { recursive: true });
  fs.writeFileSync(path.join(seedDir, 'extensions.json'), '[]');
  prepareSuiteExtensionsDirectory({ seedDir, targetDir: context.extensionsDir });
  assert.ok(fs.existsSync(path.join(context.extensionsDir, 'extensions.json')), 'suite extensions dir should be copied from seed');
}

function testBatchRuntimePathsStayShort() {
  const rootParent = path.join(tempRoot, 'b');
  const batchRoot = createBatchRoot({ batchRoot: rootParent });
  const context = createSuiteContext({
    batchRoot,
    suite: SUITE_REGISTRY.createWorkspaceCoreMatrix,
    index: 2,
    total: 5,
  });
  assert.match(path.basename(batchRoot), /^b-[A-Za-z0-9]{6}$/);
  assert.match(path.basename(context.suiteRoot), /^03-[A-Za-z0-9]{6}$/);
  assert.ok(!context.suiteRoot.includes('createWorkspaceCoreMatrix'));
}

async function testBatchSuiteScopedCredentials() {
  assert.deepStrictEqual(await getSuiteScopedCredentialEnv({ LA_E2E_CLI_AZURE_ACCESS_TOKEN: 'token' }, SUITE_REGISTRY.unitTests), {});
  const scoped = await getSuiteScopedCredentialEnv(
    {
      LA_E2E_CLI_AZURE_ACCESS_TOKEN: 'token',
      LA_E2E_CLI_AZURE_ACCESS_TOKEN_EXPIRES_ON: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      LA_E2E_CLI_AZURE_ACCESS_TOKEN_MINTED_AT: new Date().toISOString(),
      LA_E2E_CLI_AZURE_SUBSCRIPTION_ID: 'subscription',
      WORKFLOWS_SUBSCRIPTION_ID: 'workflow-subscription',
      PATH: process.env.PATH,
    },
    SUITE_REGISTRY.msnWeatherLifecycle
  );
  assert.strictEqual(scoped.LA_E2E_CLI_AZURE_ACCESS_TOKEN, 'token');
  assert.strictEqual(scoped.LA_E2E_CLI_AZURE_SUBSCRIPTION_ID, 'subscription');
  assert.strictEqual(scoped.WORKFLOWS_SUBSCRIPTION_ID, 'workflow-subscription');
  assert.strictEqual(scoped.PATH, undefined);
  const httpScoped = await getSuiteScopedCredentialEnv(
    {
      LA_E2E_CLI_AZURE_ACCESS_TOKEN: 'http-token',
      LA_E2E_CLI_AZURE_ACCESS_TOKEN_EXPIRES_ON: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      LA_E2E_CLI_AZURE_ACCESS_TOKEN_MINTED_AT: new Date().toISOString(),
      LA_E2E_CLI_AZURE_TENANT_ID: 'http-tenant',
      LA_E2E_CLI_AZURE_SUBSCRIPTION_ID: 'http-subscription',
      LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME: 'http-resource-group',
      LA_E2E_CLI_AZURE_LOCATION_NAME: 'westus',
      LA_E2E_CLI_AZURE_MANAGEMENT_BASE_URL: 'https://management.azure.com',
    },
    SUITE_REGISTRY.httpTimeoutLifecycle
  );
  assert.strictEqual(httpScoped.LA_E2E_CLI_AZURE_ACCESS_TOKEN, 'http-token');
  assert.strictEqual(httpScoped.LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME, 'http-resource-group');
  await assert.rejects(
    () => getSuiteScopedCredentialEnv({}, SUITE_REGISTRY.msnWeatherLifecycle),
    /refusing to use ambient Azure CLI profile fallback/
  );
  await assert.rejects(
    () => getSuiteScopedCredentialEnv({ LA_E2E_CLI_AZURE_ACCESS_TOKEN: 'token' }, SUITE_REGISTRY.msnWeatherLifecycle),
    /EXPIRES_ON/
  );
  const providerPath = path.join(tempRoot, `azure-token-provider-${Date.now()}.cjs`);
  fs.writeFileSync(
    providerPath,
    `exports.getAccessTokenForSuite = async () => ({ accessToken: 'provider-token', expiresOnTimestamp: ${Date.now() + 60 * 60 * 1000}, expiresOn: '${new Date(
      Date.now() + 60 * 60 * 1000
    ).toISOString()}', mintedAt: '${new Date().toISOString()}' });\n`
  );
  const providerScoped = await getSuiteScopedCredentialEnv(
    { LA_E2E_CLI_AZURE_TOKEN_PROVIDER: providerPath },
    SUITE_REGISTRY.msnWeatherLifecycle
  );
  assert.strictEqual(providerScoped.LA_E2E_CLI_AZURE_ACCESS_TOKEN, 'provider-token');
}

async function testBatchContinuesAfterOrdinaryFailure() {
  const suites = [SUITE_REGISTRY.unitTests, SUITE_REGISTRY.createWorkspaceBehavior];
  const batchRoot = path.join(tempRoot, 'batch-ordinary-failure');
  const seedDir = path.join(tempRoot, 'batch-ordinary-seed');
  fs.mkdirSync(seedDir, { recursive: true });
  fs.writeFileSync(path.join(seedDir, 'extensions.json'), '[]');
  const launched = [];
  const aggregate = await runBatchSuites({
    suites,
    batchRoot,
    seedDir,
    runSuite: async ({ suite, context }) => {
      launched.push(suite.id);
      writeSuiteTerminalAndCleanup(context, { exitCode: suite.id === 'unitTests' ? 1 : 0 });
      return suite.id === 'unitTests'
        ? { exitCode: 1, signal: null, output: '1 failing\n' }
        : { exitCode: 0, signal: null, output: '1 passing\n' };
    },
  });

  assert.deepStrictEqual(launched, ['unitTests', 'createWorkspaceBehavior']);
  assert.strictEqual(aggregate.aggregateOutcome, 'failed');
  assert.strictEqual(aggregate.complete, true);
  assert.deepStrictEqual(
    aggregate.suites.map((suite) => suite.classification),
    ['ordinaryFailure', 'success']
  );
}

async function testBatchStopsAfterContainmentBreach() {
  const suites = [SUITE_REGISTRY.unitTests, SUITE_REGISTRY.createWorkspaceBehavior];
  const batchRoot = path.join(tempRoot, 'batch-breach');
  const seedDir = path.join(tempRoot, 'batch-breach-seed');
  fs.mkdirSync(seedDir, { recursive: true });
  fs.writeFileSync(path.join(seedDir, 'extensions.json'), '[]');
  const launched = [];
  const aggregate = await runBatchSuites({
    suites,
    batchRoot,
    seedDir,
    runSuite: async ({ suite, context }) => {
      launched.push(suite.id);
      writeSuiteTerminalAndCleanup(context, { exitCode: 1, cleanupVerified: false });
      return {
        exitCode: 1,
        signal: null,
        output: '[generated-workspace-diagnostics] Unable to remove owned workspace parent after test',
      };
    },
  });

  assert.deepStrictEqual(launched, ['unitTests']);
  assert.strictEqual(aggregate.containmentBreach, true);
  assert.strictEqual(aggregate.stoppedAfter, 'unitTests');
  assert.deepStrictEqual(
    aggregate.suites.map((suite) => suite.finalOutcome),
    ['infrastructureFailure', 'blocked']
  );
  const verifiedCleanup = { schemaVersion: 1, verified: true, phaseCleanupVerified: true, processTreeVerified: true };
  const completeTerminal = {
    schemaVersion: 1,
    complete: true,
    cleanupVerified: true,
    exitCode: 1,
    signal: null,
    diagnosticsError: '',
    phaseCompleteness: true,
  };
  assert.strictEqual(
    classifySuiteRunResult({
      exitCode: 1,
      signal: null,
      output: '2 failing\n',
      terminalResult: completeTerminal,
      cleanupLedger: verifiedCleanup,
    }).category,
    'ordinaryFailure'
  );
  assert.strictEqual(
    classifySuiteRunResult({
      exitCode: 1,
      signal: null,
      output: 'source is outside wrapper-created owned roots',
      terminalResult: completeTerminal,
      cleanupLedger: verifiedCleanup,
    }).category,
    'containmentBreach'
  );
  assert.strictEqual(classifySuiteRunResult({ exitCode: 0, signal: null, output: '' }).category, 'containmentBreach');
  assert.strictEqual(
    classifySuiteRunResult({
      exitCode: 1,
      signal: null,
      output: '1 failing\n',
      terminalResult: { ...completeTerminal, duplicatePhaseIds: [], blockedPhaseIds: ['phase-b'] },
      cleanupLedger: verifiedCleanup,
    }).category,
    'ordinaryFailure'
  );
  assert.strictEqual(
    classifySuiteRunResult({
      exitCode: 0,
      signal: null,
      output: '0 passing\n',
      terminalResult: { ...completeTerminal, exitCode: 0, duplicatePhaseIds: [] },
      cleanupLedger: verifiedCleanup,
    }).category,
    'containmentBreach'
  );
  assert.strictEqual(
    classifySuiteRunResult({
      exitCode: 0,
      signal: null,
      output: '1 passing\n',
      terminalResult: { ...completeTerminal, exitCode: 0, duplicatePhaseIds: ['unitTests'] },
      cleanupLedger: verifiedCleanup,
    }).category,
    'containmentBreach'
  );
}

async function testBatchStopsAfterSuiteSetupFailure() {
  const suites = [SUITE_REGISTRY.msnWeatherLifecycle, SUITE_REGISTRY.unitTests];
  const batchRoot = path.join(tempRoot, 'batch-suite-setup-failure');
  const seedDir = path.join(tempRoot, 'batch-suite-setup-seed');
  fs.mkdirSync(seedDir, { recursive: true });
  fs.writeFileSync(path.join(seedDir, 'extensions.json'), '[]');
  const launched = [];
  const aggregate = await runBatchSuites({
    suites,
    batchRoot,
    seedDir,
    baseEnv: { LA_E2E_CLI_AZURE_TOKEN_PROVIDER: path.join(tempRoot, 'missing-token-provider.cjs') },
    runSuite: async ({ suite }) => {
      launched.push(suite.id);
      return { exitCode: 0, signal: null, output: '1 passing\n' };
    },
  });

  assert.deepStrictEqual(launched, []);
  assert.strictEqual(aggregate.containmentBreach, true);
  assert.strictEqual(aggregate.stoppedAfter, 'msnWeatherLifecycle');
  assert.deepStrictEqual(
    aggregate.suites.map((suite) => suite.finalOutcome),
    ['infrastructureFailure', 'blocked']
  );
}

async function testBatchReturnsAggregateAfterInitializationFailure() {
  const suites = [SUITE_REGISTRY.unitTests, SUITE_REGISTRY.createWorkspaceBehavior];
  const batchRoot = path.join(tempRoot, 'batch-initialization-failure');
  const aggregate = await runBatchSuites({
    suites,
    batchRoot,
    seedDir: path.join(tempRoot, 'missing-extensions-seed'),
    runSuite: async () => {
      throw new Error('suite must not launch');
    },
  });

  assert.strictEqual(aggregate.containmentBreach, true);
  assert.strictEqual(aggregate.stoppedAfter, 'unitTests');
  assert.deepStrictEqual(
    aggregate.suites.map((suite) => suite.finalOutcome),
    ['infrastructureFailure', 'blocked']
  );
  assert.match(aggregate.suites[0].reason, /cohort initialization failed/);
}

async function testBatchReturnsAggregateAfterContextCreationFailure() {
  const suites = [SUITE_REGISTRY.unitTests, SUITE_REGISTRY.createWorkspaceBehavior];
  const batchRoot = path.join(tempRoot, 'batch-context-failure');
  const seedDir = path.join(tempRoot, 'batch-context-seed');
  fs.mkdirSync(seedDir, { recursive: true });
  fs.writeFileSync(path.join(seedDir, 'extensions.json'), '[]');
  const aggregate = await runBatchSuites({
    suites,
    batchRoot,
    seedDir,
    createContext: () => {
      throw new Error('synthetic context failure');
    },
    runSuite: async () => {
      throw new Error('suite must not launch');
    },
  });

  assert.strictEqual(aggregate.containmentBreach, true);
  assert.strictEqual(aggregate.stoppedAfter, 'unitTests');
  assert.deepStrictEqual(
    aggregate.suites.map((suite) => suite.finalOutcome),
    ['infrastructureFailure', 'blocked']
  );
  assert.match(aggregate.suites[0].reason, /suite context creation failed: synthetic context failure/);
}

async function testRunSuiteWrapperProcessWritesStructuredResults() {
  const batchRoot = path.join(tempRoot, 'wrapper-process-success');
  fs.mkdirSync(batchRoot, { recursive: true });
  const context = createSuiteContext({ batchRoot, suite: SUITE_REGISTRY.unitTests, index: 0, total: 1 });
  const result = await runSuiteWrapperProcess({
    suite: SUITE_REGISTRY.unitTests,
    context,
    env: process.env,
    timeoutMs: 10_000,
    scriptPath: createWrapperFixtureScript('success'),
  });

  assert.strictEqual(result.exitCode, 0);
  assert.strictEqual(result.error, undefined);
  const terminal = JSON.parse(fs.readFileSync(context.terminalResultPath, 'utf8'));
  const cleanup = JSON.parse(fs.readFileSync(context.cleanupLedgerPath, 'utf8'));
  assert.strictEqual(terminal.complete, true);
  assert.strictEqual(terminal.cleanupVerified, true);
  assert.strictEqual(terminal.originalProcessClosureVerified, true);
  assert.strictEqual(terminal.processClosureProof, 'retained-original-identities');
  assert.strictEqual(cleanup.verified, true);
  assert.strictEqual(cleanup.processCleanup.retainedOriginalIdentitiesVerified, true);
  assert.match(cleanup.processCleanup.mechanism, /^(windows-job-object|linux-subreaper)$/);
}

async function testDirectHttpFamilyRetainsWrapperPhaseJournal() {
  const resultsDir = path.join(tempRoot, 'direct-http-results');
  const batchRoot = path.join(tempRoot, 'direct-http-batch');
  const seedDir = path.join(tempRoot, 'direct-http-extensions');
  fs.mkdirSync(batchRoot, { recursive: true });
  fs.mkdirSync(seedDir, { recursive: true });
  fs.writeFileSync(path.join(seedDir, 'extensions.json'), '[]');
  const credentialKeys = [
    'LA_E2E_CLI_AZURE_ACCESS_TOKEN',
    'LA_E2E_CLI_AZURE_ACCESS_TOKEN_EXPIRES_ON',
    'LA_E2E_CLI_AZURE_ACCESS_TOKEN_MINTED_AT',
  ];
  const previous = Object.fromEntries(credentialKeys.map((key) => [key, process.env[key]]));
  process.env.LA_E2E_CLI_AZURE_ACCESS_TOKEN = 'unit-http-token';
  process.env.LA_E2E_CLI_AZURE_ACCESS_TOKEN_EXPIRES_ON = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  process.env.LA_E2E_CLI_AZURE_ACCESS_TOKEN_MINTED_AT = new Date().toISOString();
  try {
    const code = await runDirectFamily('httpTimeoutLifecycle', undefined, {
      resultsDir,
      batchRoot,
      seedDir,
      timeoutMs: 10_000,
      scriptPath: createWrapperFixtureScript('success'),
    });
    assert.strictEqual(code, 0);
    const terminal = JSON.parse(fs.readFileSync(path.join(resultsDir, 'httpTimeoutLifecycle.terminal-result.json'), 'utf8'));
    assert.deepStrictEqual(terminal.expectedPhaseIds, SUITE_REGISTRY.httpTimeoutLifecycle.expectedPhases);
    assert.deepStrictEqual(terminal.observedPhaseIds, SUITE_REGISTRY.httpTimeoutLifecycle.expectedPhases);
    assert.strictEqual(terminal.complete, true);
    assert.strictEqual(terminal.cleanupVerified, true);
    assert.strictEqual(terminal.originalProcessClosureVerified, true);
    assert.strictEqual(terminal.processClosureProof, 'retained-original-identities');
  } finally {
    for (const key of credentialKeys) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  }
}

async function testRunSuiteWrapperProcessTimeoutCancelsDisposableChild() {
  const batchRoot = path.join(tempRoot, 'wrapper-process-timeout');
  fs.mkdirSync(batchRoot, { recursive: true });
  const context = createSuiteContext({ batchRoot, suite: SUITE_REGISTRY.unitTests, index: 0, total: 1 });
  const startedAt = Date.now();
  const result = await runSuiteWrapperProcess({
    suite: SUITE_REGISTRY.unitTests,
    context,
    env: process.env,
    timeoutMs: 100,
    scriptPath: createWrapperFixtureScript('sleep'),
  });

  assert.ok(Date.now() - startedAt < 7000, 'timeout test should not wait for the fallback SIGKILL window');
  assert.ok(result.error instanceof Error);
  assert.match(result.error.message, /suite timed out/);
  assert.ok(result.signal || result.exitCode !== 0, 'timed-out child should not report successful exit');
}

async function testRunSuiteWrapperProcessTimeoutCancelsGrandchildListener() {
  const batchRoot = path.join(tempRoot, 'wrapper-process-grandchild-timeout');
  fs.mkdirSync(batchRoot, { recursive: true });
  const context = createSuiteContext({ batchRoot, suite: SUITE_REGISTRY.unitTests, index: 0, total: 1 });
  const processRecordsPath = path.join(context.reportsRoot, 'owned-processes.jsonl');
  const result = await runSuiteWrapperProcess({
    suite: SUITE_REGISTRY.unitTests,
    context,
    env: {
      ...process.env,
      LA_E2E_CLI_PROCESS_RECORDS_PATH: processRecordsPath,
    },
    timeoutMs: 1500,
    scriptPath: createWrapperFixtureScript('descendant'),
  });

  assert.ok(result.error instanceof Error);
  assert.match(result.error.message, /suite timed out/);
  const records = readJsonLines(processRecordsPath);
  assert.ok(
    records.some((record) => record.role === 'parent'),
    'fixture should record parent process'
  );
  assert.ok(
    records.some((record) => record.role === 'grandchild'),
    'fixture should record grandchild process'
  );
  await delay(500);
  for (const record of records.filter((entry) => entry.pid)) {
    assert.strictEqual(isAlive(record.pid), false, `fixture process should be terminated: ${JSON.stringify(record)}`);
  }
  for (const record of records.filter((entry) => entry.port)) {
    assert.strictEqual(await listenerAvailable(record.port), false, `fixture listener should be closed: ${JSON.stringify(record)}`);
  }
}

async function testRunSuiteWrapperProcessTimeoutCancelsSignalResistantDescendant() {
  const batchRoot = path.join(tempRoot, 'wrapper-process-signal-resistant-timeout');
  fs.mkdirSync(batchRoot, { recursive: true });
  const context = createSuiteContext({ batchRoot, suite: SUITE_REGISTRY.unitTests, index: 0, total: 1 });
  const processRecordsPath = path.join(context.reportsRoot, 'signal-resistant-processes.jsonl');
  const result = await runSuiteWrapperProcess({
    suite: SUITE_REGISTRY.unitTests,
    context,
    env: {
      ...process.env,
      LA_E2E_CLI_PROCESS_RECORDS_PATH: processRecordsPath,
    },
    timeoutMs: 1500,
    scriptPath: createWrapperFixtureScript('signal-resistant-descendant'),
  });

  assert.ok(result.error instanceof Error);
  assert.match(result.error.message, /suite timed out/);
  const records = readJsonLines(processRecordsPath);
  assert.ok(
    records.some((record) => record.role === 'grandchild'),
    'fixture should record the signal-resistant grandchild'
  );
  await delay(500);
  for (const record of records.filter((entry) => entry.pid)) {
    assert.strictEqual(isAlive(record.pid), false, `signal-resistant fixture should be terminated: ${JSON.stringify(record)}`);
  }
}

async function testContainedWrapperRejectsEscapedDescendant() {
  const batchRoot = path.join(tempRoot, 'wrapper-process-escaped-descendant');
  fs.mkdirSync(batchRoot, { recursive: true });
  const context = createSuiteContext({ batchRoot, suite: SUITE_REGISTRY.unitTests, index: 0, total: 1 });
  const processRecordsPath = path.join(context.reportsRoot, 'escaped-processes.jsonl');
  const result = await runSuiteWrapperProcess({
    suite: SUITE_REGISTRY.unitTests,
    context,
    env: {
      ...process.env,
      LA_E2E_CLI_PROCESS_RECORDS_PATH: processRecordsPath,
    },
    timeoutMs: process.platform === 'linux' ? 45_000 : 15_000,
    scriptPath: createWrapperFixtureScript('escaped-descendant'),
  });
  assert.notStrictEqual(result.exitCode, 0);
  assert.ok(result.error instanceof Error);
  assert.match(result.error.message, /ownership containment was not empty/i);
  assert.strictEqual(result.processCleanup.verified, false);
  assert.strictEqual(result.processCleanup.retainedOriginalIdentitiesVerified, false);
  assert.strictEqual(result.processCleanup.containmentEmpty, false);
  const records = readJsonLines(processRecordsPath);
  const escaped = records.find((record) => record.role === 'grandchild');
  assert.ok(escaped?.pid, 'fixture must record the detached descendant');
  await delay(250);
  assert.strictEqual(isAlive(escaped.pid), false, 'containment host must terminate the rejected escaped descendant');
}

function testContainmentReceiptMustMatchHostOutcome() {
  const receiptPath = path.join(tempRoot, 'forged-containment-receipt.json');
  fs.writeFileSync(
    receiptPath,
    JSON.stringify({
      schemaVersion: 1,
      mechanism: process.platform === 'win32' ? 'windows-job-object' : 'linux-subreaper',
      containmentEstablished: true,
      rootPid: 1234,
      rootExitCode: 0,
      rootSignal: null,
      containmentEmpty: true,
      retainedOriginalIdentitiesVerified: true,
      escapedDescendants: [],
      activeContainedProcessCount: 0,
    })
  );
  const cleanup = readContainmentReceipt(receiptPath, 126, null);
  assert.strictEqual(cleanup.verified, false);
  assert.match(cleanup.error, /did not match host outcome/);
}

function testDirectSuitePhaseResultRetainsOgfAcrossMatrixPhases() {
  const previousCwd = process.cwd();
  const cwd = path.join(tempRoot, 'direct-ogf-retained');
  fs.mkdirSync(cwd, { recursive: true });
  process.chdir(cwd);
  try {
    const label = 'createWorkspaceCoreMatrix';
    const phaseId = 'createWorkspaceCoreMatrix:standard-stateful';
    const ogfScenarios = buildOgfScenariosForPhase(
      phaseId,
      {
        LA_E2E_CLI_CREATE_WORKSPACE_CASE: 'standard-stateful',
        LA_E2E_CLI_VSCODE_VERSION: '1.140.0',
        BUILD_SOURCEVERSION: 'a'.repeat(40),
        BUILD_BUILDID: '15500000',
        SYSTEM_DEFINITIONID: '28771',
      },
      { passed: true }
    );

    for (const matrixPhaseId of [
      phaseId,
      'createWorkspaceCoreMatrix:standard-stateless',
      'createWorkspaceCoreMatrix:custom-code-stateful',
      'createWorkspaceCoreMatrix:custom-code-stateless',
      'createWorkspaceCoreMatrix:rules-engine-stateful',
      'createWorkspaceCoreMatrix:rules-engine-stateless',
    ]) {
      writeDirectPhaseResult({
        phaseId: matrixPhaseId,
        label,
        ogfScenarios: matrixPhaseId === phaseId ? ogfScenarios : [],
      });
    }

    const terminal = JSON.parse(fs.readFileSync(getSuiteTerminalResultPath({}, label), 'utf-8'));
    assert.strictEqual(terminal.complete, true);
    assert.strictEqual(terminal.phaseResults.length, 6);
    assert.strictEqual(terminal.ogfScenarios.length, 1);
    assert.strictEqual(terminal.ogfScenarios[0].scenarioId, 'ogf-launch-config-generated-name-standard-stateful');
    assert.strictEqual(terminal.ogfScenarios[0].source, undefined);
    assert.strictEqual(terminal.ogfScenarios[0].executedVariant, 'standard-stateful');
    assert.ok(terminal.ogfScenarios[0].assertionIdentities.includes('launch-configuration-name-ends-with-created-logic-app-name'));
  } finally {
    process.chdir(previousCwd);
  }
}

function testDirectSuitePhaseResultClearsOgfOnLaterFailure() {
  const previousCwd = process.cwd();
  const cwd = path.join(tempRoot, 'direct-ogf-cleared');
  fs.mkdirSync(cwd, { recursive: true });
  process.chdir(cwd);
  try {
    const label = 'createWorkspaceCoreMatrix';
    const phaseId = 'createWorkspaceCoreMatrix:standard-stateful';
    writeDirectPhaseResult({
      phaseId,
      label,
      ogfScenarios: buildOgfScenariosForPhase(phaseId, { LA_E2E_CLI_CREATE_WORKSPACE_CASE: 'standard-stateful' }, { passed: true }),
    });
    writeDirectPhaseResult({
      phaseId: 'createWorkspaceCoreMatrix:standard-stateless',
      label,
      exitCode: 1,
      complete: false,
    });

    const terminal = JSON.parse(fs.readFileSync(getSuiteTerminalResultPath({}, label), 'utf-8'));
    assert.strictEqual(terminal.complete, false);
    assert.strictEqual(terminal.ogfScenarios, undefined);
    assert.strictEqual(terminal.phaseResults.length, 2);
    assert.strictEqual(terminal.phaseResults[0].ogfScenarios, undefined);
    assert.strictEqual(terminal.phaseResults[1].ogfScenarios, undefined);
  } finally {
    process.chdir(previousCwd);
  }
}

function writeDirectPhaseResult(options) {
  writeSuitePhaseResult(
    {},
    {
      phaseId: options.phaseId,
      label: options.label,
      exitCode: options.exitCode ?? 0,
      signal: null,
      cleanupVerified: options.cleanupVerified ?? true,
      diagnosticsError: options.diagnosticsError ?? '',
      complete: options.complete ?? true,
      mochaPassingCount: options.mochaPassingCount ?? 1,
      cleanupLedger: { verified: options.cleanupVerified ?? true },
      ogfScenarios: options.ogfScenarios ?? [],
    }
  );
}

function testDirectSuitePhaseResultDoesNotEmitOgfForCleanupFailure() {
  const previousCwd = process.cwd();
  const cwd = path.join(tempRoot, 'direct-ogf-cleanup-failed');
  fs.mkdirSync(cwd, { recursive: true });
  process.chdir(cwd);
  try {
    const label = 'createWorkspaceCoreMatrix';
    const phaseId = 'createWorkspaceCoreMatrix:standard-stateful';
    writeSuitePhaseResult(
      {},
      {
        phaseId,
        label,
        exitCode: 0,
        signal: null,
        cleanupVerified: false,
        diagnosticsError: '',
        complete: false,
        mochaPassingCount: 1,
        cleanupLedger: { verified: false },
        ogfScenarios: buildOgfScenariosForPhase(phaseId, { LA_E2E_CLI_CREATE_WORKSPACE_CASE: 'standard-stateful' }, { passed: true }),
      }
    );

    const terminal = JSON.parse(fs.readFileSync(getSuiteTerminalResultPath({}, label), 'utf-8'));
    assert.strictEqual(terminal.complete, false);
    assert.strictEqual(terminal.cleanupVerified, false);
    assert.strictEqual(terminal.ogfScenarios, undefined);
  } finally {
    process.chdir(previousCwd);
  }
}

function testCoreMatrixBatchFinalEvidenceRetainsPhaseResults() {
  const root = path.join(tempRoot, 'core-matrix-batch-final-evidence');
  fs.mkdirSync(root, { recursive: true });
  const suite = SUITE_REGISTRY.createWorkspaceCoreMatrix;
  const context = {
    expectedPhaseIds: suite.expectedPhases,
    phaseResultsPath: path.join(root, 'phase-results.jsonl'),
    cleanupLedgerPath: path.join(root, 'cleanup-ledger.json'),
    terminalResultPath: path.join(root, 'terminal-result.json'),
  };
  const phaseResults = suite.expectedPhases.map((phaseId) => ({
    phaseId,
    label: suite.id,
    exitCode: 0,
    signal: null,
    cleanupVerified: true,
    diagnosticsError: '',
    complete: true,
    mochaPassingCount: 1,
  }));
  const terminal = writeSuiteFinalEvidence({
    context,
    suite,
    exitCode: 0,
    signal: null,
    processCleanup: { verified: true, retainedOriginalIdentitiesVerified: true },
    phaseResults,
  });
  assert.strictEqual(terminal.complete, true);
  assert.deepStrictEqual(
    terminal.phaseResults.map((phase) => phase.phaseId),
    suite.expectedPhases
  );
}

function testBatchAggregateJunitClosesEverySuite() {
  const xml = buildBatchAggregateJUnitXml({
    suites: [
      { id: 'unitTests', finalOutcome: 'success' },
      { id: 'createWorkspacePreviewMatrix', finalOutcome: 'failed', reason: 'exit 1' },
    ],
  });
  assert.strictEqual((xml.match(/<testsuite /g) || []).length, 2);
  assert.strictEqual((xml.match(/<\/testsuite>/g) || []).length, 2);
  assert.match(xml, /<\/testsuite>\n<testsuite name="createWorkspacePreviewMatrix"/);
}

function msnPhase(phaseId, override = {}) {
  return {
    phaseId,
    label: phaseId.startsWith('runtimeDependencyBootstrap:') ? 'runtimeDependencyBootstrap' : 'msnWeatherLifecycle',
    exitCode: 0,
    signal: null,
    cleanupVerified: true,
    diagnosticsError: '',
    complete: true,
    mochaPassingCount: 0,
    ...override,
  };
}

function msnSummary() {
  return { label: 'msnWeatherLifecycle', outcome: 'success', total: 1, passing: 1, failing: 0, pending: 0 };
}

function testMsnDirectLifecycleEvidence() {
  const previousCwd = process.cwd();
  try {
    for (const platform of ['linux', 'win32']) {
      const cwd = path.join(tempRoot, `msn-direct-${platform}`);
      fs.mkdirSync(cwd, { recursive: true });
      process.chdir(cwd);
      const env = { LA_E2E_CLI_DIRECT_SUITE_LABEL: 'msnWeatherLifecycle' };
      const ownedRoot = path.join(cwd, 'owned-runtime-root');
      const otherOwnedRoot = path.join(cwd, 'owned-workspace-root');
      fs.mkdirSync(ownedRoot);
      fs.mkdirSync(otherOwnedRoot);
      assert.strictEqual(getOwnedRootCleanupVerified([]), false);
      assert.strictEqual(getOwnedRootCleanupVerified([ownedRoot, undefined]), false);
      fs.rmdirSync(ownedRoot);
      assert.strictEqual(getOwnedRootCleanupVerified([ownedRoot, undefined]), false);
      assert.strictEqual(getOwnedRootCleanupVerified([ownedRoot]), true);
      assert.strictEqual(getOwnedRootCleanupVerified([ownedRoot, otherOwnedRoot]), false);
      fs.rmdirSync(otherOwnedRoot);
      assert.strictEqual(getOwnedRootCleanupVerified([ownedRoot, otherOwnedRoot]), true);
      const danglingRoot = `${ownedRoot}-link`;
      fs.symlinkSync(ownedRoot, danglingRoot, process.platform === 'win32' ? 'junction' : 'dir');
      assert.strictEqual(getOwnedRootCleanupVerified([danglingRoot]), false, 'A dangling root link is not verified absence');
      fs.unlinkSync(danglingRoot);
      const lstat = fs.lstatSync;
      try {
        fs.lstatSync = () => {
          throw Object.assign(new Error('private-root-observation-control'), { code: 'EACCES' });
        };
        assert.throws(
          () => getOwnedRootCleanupVerified([ownedRoot, otherOwnedRoot]),
          (error) => {
            assert.strictEqual(error.message, 'Owned lifecycle cleanup failed: root-absence-observation-failed');
            return true;
          }
        );
      } finally {
        fs.lstatSync = lstat;
      }
      const terminalPath = getSuiteTerminalResultPath(env, 'msnWeatherLifecycle');
      const readTerminal = () => JSON.parse(fs.readFileSync(terminalPath, 'utf8'));
      const phases = SUITE_REGISTRY.msnWeatherLifecycle.expectedPhases.map((phaseId) => msnPhase(phaseId));
      // The published pre-fix shape retained create/run but no bootstrap and was not complete.
      const publishedShape = {
        ...msnSummary(),
        exitCode: 0,
        signal: null,
        cleanupVerified: true,
        diagnosticsError: '',
        complete: false,
        phaseResults: phases.slice(1),
      };
      assert.throws(() => assertSuccessfulMsnTerminal(msnSummary(), publishedShape), /incomplete-or-unclean-terminal/);
      assert.strictEqual(getDirectSuiteComplete('msnWeatherLifecycle', phases.slice(1)), true);

      const lifecyclePhases = phases.slice(1);
      writeSuitePhaseResult({}, phases[0]);
      for (const phase of lifecyclePhases) {
        writeSuitePhaseResult(env, phase);
        assert.strictEqual(readTerminal().complete, false, 'Phase success cannot finalize outer cleanup');
        assert.strictEqual(readTerminal().lifecycleFinalized, false);
      }
      const bootstrap = JSON.parse(fs.readFileSync(getSuiteTerminalResultPath({}, 'runtimeDependencyBootstrap'), 'utf8'));
      assert.strictEqual(bootstrap.complete, true);
      assert.deepStrictEqual(
        bootstrap.phaseResults.map((phase) => phase.phaseId),
        ['runtimeDependencyBootstrap:bootstrap']
      );
      const terminal = readTerminal();
      assert.throws(() => assertSuccessfulMsnTerminal(msnSummary(), terminal), /incomplete-or-unclean-terminal/);
      for (const override of [
        { exitCode: 1 },
        { exitCode: null },
        { signal: 'SIGTERM' },
        { cleanupVerified: false },
        { complete: false },
        { lifecycleFinalized: false },
        { diagnosticsError: 'postprocessing-failed' },
        { phaseResults: lifecyclePhases.slice(1) },
        { phaseResults: [...lifecyclePhases, lifecyclePhases[0]] },
      ]) {
        assert.throws(() => assertSuccessfulMsnTerminal(msnSummary(), { ...terminal, ...override }));
      }
      for (const override of [{ passing: 0 }, { total: 0 }, { failing: 1 }, { pending: 1 }, { outcome: 'failure' }]) {
        assert.throws(() => assertSuccessfulMsnTerminal({ ...msnSummary(), ...override }, terminal));
      }
      assert.strictEqual(terminal.phaseId, 'msnWeatherLifecycle:run');
      assert.strictEqual(terminal.lifecycleFinalized, false);
      assert.deepStrictEqual(
        terminal.phaseResults.map((phase) => phase.phaseId),
        SUITE_REGISTRY.msnWeatherLifecycle.expectedPhases.slice(1)
      );
      assert.strictEqual(terminal.ogfScenarios, undefined);

      const log = path.join(cwd, 'msn.log');
      fs.writeFileSync(log, '\n  1 passing (1s)\n');
      assert.throws(
        () => writeSingleResult({ label: 'msnWeatherLifecycle', log, outDir: path.dirname(terminalPath), outcome: 'success' }),
        /incomplete-or-unclean-terminal/
      );
      const summary = JSON.parse(fs.readFileSync(path.join(path.dirname(terminalPath), 'msnWeatherLifecycle.json'), 'utf8'));
      assert.strictEqual(summary.passing, 1, 'Preparation phases are not additional logical scenarios');
      assert.strictEqual(summary.terminalPhaseId, undefined, 'An intermediate receipt must not be advertised as final acceptance');
      assert.deepStrictEqual(summary.executedTestCounts, { total: 1, passing: 1, failing: 0, pending: 0 });
      assert.strictEqual(summary.harnessFailures[0].kind, 'lifecycle-evidence');

      const failedPhaseOverrides = [
        { exitCode: 1 },
        { exitCode: null },
        { signal: 'SIGTERM' },
        { cleanupVerified: false },
        { complete: false },
        { diagnosticsError: 'required-profile-capture-failed' },
      ];
      for (const [index, phase] of lifecyclePhases.entries()) {
        for (const override of failedPhaseOverrides) {
          const changed = lifecyclePhases.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...override } : entry));
          assert.strictEqual(getDirectSuiteComplete('msnWeatherLifecycle', changed), false);
        }
        assert.strictEqual(
          getDirectSuiteComplete(
            'msnWeatherLifecycle',
            lifecyclePhases.filter((_, phaseIndex) => phaseIndex !== index)
          ),
          false
        );
        assert.strictEqual(getDirectSuiteComplete('msnWeatherLifecycle', [...lifecyclePhases, phase]), false);
      }
      assert.strictEqual(getDirectSuiteComplete('msnWeatherLifecycle', [...phases, msnPhase('unexpected')]), false);
      assert.strictEqual(getDirectSuiteComplete('msnWeatherLifecycle', [...phases, msnPhase('')]), false);

      writeSuitePhaseResult(env, lifecyclePhases[0]);
      assert.strictEqual(readTerminal().complete, false, 'Duplicate retained observations must not be silently reset');
      assert.strictEqual(readTerminal().phaseResults.length, 3);
      assert.throws(() => assertSuccessfulMsnTerminal(msnSummary(), readTerminal()));
    }
  } finally {
    process.chdir(previousCwd);
  }
}

function testMsnBatchLifecycleEvidence() {
  const suite = SUITE_REGISTRY.msnWeatherLifecycle;
  const root = path.join(tempRoot, 'msn-batch-terminal');
  fs.mkdirSync(root, { recursive: true });
  const context = {
    expectedPhaseIds: suite.expectedPhases,
    phaseResultsPath: path.join(root, 'phases.jsonl'),
    cleanupLedgerPath: path.join(root, 'cleanup.json'),
    terminalResultPath: path.join(root, 'terminal.json'),
  };
  const phases = suite.expectedPhases.map((phaseId) =>
    msnPhase(phaseId, phaseId === 'msnWeatherLifecycle:run' ? { bodyAssertionsPassed: true } : {})
  );
  const write = (phaseResults, options = {}) => {
    fs.writeFileSync(context.phaseResultsPath, phaseResults.map((phase) => JSON.stringify(phase)).join('\n'));
    writeSuiteFinalEvidence({
      context,
      suite,
      exitCode: Object.prototype.hasOwnProperty.call(options, 'exitCode') ? options.exitCode : 0,
      signal: options.signal ?? null,
      error: options.error,
      processCleanup: {
        verified: options.cleanupVerified ?? true,
        retainedOriginalIdentitiesVerified: options.originalProcessClosureVerified ?? false,
      },
    });
    return JSON.parse(fs.readFileSync(context.terminalResultPath, 'utf8'));
  };
  const diagnostic = write(phases);
  assert.strictEqual(diagnostic.lifecycleBodySucceeded, true);
  assert.strictEqual(diagnostic.complete, false);
  assert.strictEqual(diagnostic.cleanupVerified, false);
  assert.strictEqual(diagnostic.originalProcessClosureVerified, false);
  assert.throws(() => assertSuccessfulMsnTerminal(msnSummary(), diagnostic), /incomplete-or-unclean-terminal/);
  assert.strictEqual(JSON.parse(fs.readFileSync(context.cleanupLedgerPath)).verified, false);
  fs.writeFileSync(
    context.terminalResultPath,
    `${JSON.stringify({
      schemaVersion: 1,
      label: 'msnWeatherLifecycle',
      complete: true,
      lifecycleFinalized: true,
      cleanupVerified: true,
      filesystemCleanupVerified: true,
      lifecycleBodySucceeded: true,
      phaseCompleteness: true,
    })}\n`
  );
  const contained = write(phases, { originalProcessClosureVerified: true });
  assert.strictEqual(contained.complete, true);
  assert.strictEqual(contained.cleanupVerified, true);
  assert.strictEqual(contained.originalProcessClosureVerified, true);
  assert.strictEqual(contained.filesystemCleanupVerified, true);
  assertSuccessfulMsnTerminal(msnSummary(), contained);
  const containedCleanup = JSON.parse(fs.readFileSync(context.cleanupLedgerPath, 'utf8'));
  assert.strictEqual(containedCleanup.verified, true);
  assert.strictEqual(containedCleanup.retainedCaseCleanupVerified, true);
  for (const badPhases of [
    phases.slice(1),
    [...phases, phases[0]],
    [...phases, msnPhase('unexpected')],
    phases.map((phase, index) => (index === 1 ? { ...phase, exitCode: 1 } : phase)),
    phases.map((phase, index) => (index === 2 ? { ...phase, complete: false } : phase)),
  ]) {
    assert.strictEqual(write(badPhases).complete, false);
  }
  for (const options of [
    { exitCode: 1 },
    { exitCode: null },
    { signal: 'SIGTERM' },
    { error: new Error('outer-runtime-probe-failed') },
    { cleanupVerified: false },
  ]) {
    const terminal = write(phases, options);
    assert.strictEqual(terminal.complete, false);
    assert.throws(() => assertSuccessfulMsnTerminal(msnSummary(), terminal));
  }
}

function testMsnSummaryRejectsIncompleteTerminal() {
  const cases = [
    { name: 'incomplete', terminalText: '{"complete":false}', category: 'incomplete-or-unclean-terminal' },
    { name: 'missing', category: 'missing-required-terminal' },
    { name: 'malformed', terminalText: '{"private-sentinel":bad-json}', category: 'malformed-terminal' },
    { name: 'null', terminalText: 'null', category: 'incomplete-or-unclean-terminal' },
    { name: 'unreadable', directory: true, category: 'unreadable-terminal' },
  ];
  for (const fixture of cases) {
    const root = path.join(tempRoot, `msn-invalid-summary-${fixture.name}`);
    fs.mkdirSync(root, { recursive: true });
    const log = path.join(root, 'msn.log');
    fs.writeFileSync(log, '\n  ✔ Actual MSN runtime scenario (5ms)\n  1 passing (1s)\n');
    const terminalPath = path.join(root, 'msnWeatherLifecycle.terminal-result.json');
    if (fixture.terminalText !== undefined) {
      fs.writeFileSync(terminalPath, fixture.terminalText);
    } else if (fixture.directory) {
      fs.mkdirSync(terminalPath);
    }
    const cli = spawnSync(
      process.execPath,
      [
        path.join(__dirname, 'summarize-e2e-cli-results.js'),
        '--label',
        'msnWeatherLifecycle',
        '--log',
        log,
        '--out-dir',
        root,
        '--outcome',
        'success',
      ],
      { encoding: 'utf8' }
    );
    assert.strictEqual(cli.error, undefined);
    assert.strictEqual(cli.status, 1);
    assert.match(cli.stderr, new RegExp(fixture.category));
    const summary = JSON.parse(fs.readFileSync(path.join(root, 'msnWeatherLifecycle.json'), 'utf8'));
    assert.strictEqual(summary.outcome, 'failure');
    assert.strictEqual(summary.passing, 1);
    assert.strictEqual(summary.failing, 1);
    assert.strictEqual(summary.total, 2);
    assert.strictEqual(summary.passRate, 50);
    assert.deepStrictEqual(summary.executedTestCounts, { total: 1, passing: 1, failing: 0, pending: 0 });
    assert.deepStrictEqual(summary.passedTests, ['Actual MSN runtime scenario']);
    assert.deepStrictEqual(summary.failedTests, ['MSN lifecycle evidence']);
    assert.strictEqual(summary.terminalPhaseId, undefined);
    assert.strictEqual(summary.ogfScenarios, undefined);
    assert.strictEqual(summary.harnessFailures[0].kind, 'lifecycle-evidence');
    assert.match(summary.failureExcerpt.join('\n'), new RegExp(fixture.category));
    const xml = fs.readFileSync(path.join(root, 'msnWeatherLifecycle.junit.xml'), 'utf8');
    assert.match(xml, /tests="2" failures="1"/);
    assert.match(xml, /name="Actual MSN runtime scenario" \/>/);
    assert.match(xml, /<failure message="MSN lifecycle evidence">/);
    assert.match(xml, new RegExp(fixture.category));
    assert.strictEqual((xml.match(/<testcase /g) || []).length, 2);
    const markdown = fs.readFileSync(path.join(root, 'msnWeatherLifecycle.summary.md'), 'utf8');
    assert.match(markdown, /Harness evidence failure/);
    assert.match(markdown, /Executed Mocha tests: 1 passing, 0 failing, 0 pending/);
    assert.match(markdown, /Failure excerpt/);
    assert.match(markdown, new RegExp(fixture.category));
    assert.doesNotMatch(`${cli.stderr}\n${JSON.stringify(summary)}\n${xml}\n${markdown}`, /private-sentinel|bad-json/);
    const aggregate = buildSummaryAggregate([summary], { expectedLabels: ['msnWeatherLifecycle'] });
    assert.strictEqual(aggregate.failing, 1);
    assert.deepStrictEqual(aggregate.failedLabels, ['msnWeatherLifecycle']);
  }
}

function testMochaHookReportingUsesOrdinalFailureIdentity() {
  const passed = [
    'VS Code is running',
    'Test runner environment is configured',
    'Logic Apps extension is present with package metadata',
    'Logic Apps extension is loaded from the development dist folder',
    'Logic Apps extension dependencies are installed and visible to VS Code',
    'Logic Apps extension activates successfully',
    'Logic Apps extension activation does not attempt startup dialogs',
    'VS Code starts without a folder or saved workspace loaded',
  ];
  const logText = [
    ...passed.map((name) => `    ✔ ${name}`),
    '  Logic Apps Commands Tests',
    '    1) "before all" hook for "Should register expected Logic Apps commands"',
    '  8 passing (26s)',
    '  1 failing',
    '  1) Logic Apps Commands Tests',
    '       "before all" hook for "Should register expected Logic Apps commands":',
    '     Error: absent-settling workbench Chat state read failed. Reason: deadline-exceeded',
  ].join('\n');
  const root = path.join(tempRoot, 'actual-unit-hook-reporting');
  fs.mkdirSync(root);
  const log = path.join(root, 'native.log');
  fs.writeFileSync(log, logText);
  writeSingleResult({ label: 'unitTests', outcome: 'failure', log, outDir: root });
  const result = JSON.parse(fs.readFileSync(path.join(root, 'unitTests.json'), 'utf8'));
  assert.strictEqual(result.total, 9);
  assert.strictEqual(result.passing, 8);
  assert.strictEqual(result.failing, 1);
  assert.deepStrictEqual(result.executedTestCounts, { total: 8, passing: 8, failing: 0, pending: 0 });
  assert.deepStrictEqual(result.passedTests, passed);
  assert.deepStrictEqual(result.failedTests, [
    'Logic Apps Commands Tests: "before all" hook for "Should register expected Logic Apps commands"',
  ]);
  assert.strictEqual(result.harnessFailures.length, 1);
  assert.strictEqual(result.harnessFailures[0].kind, 'mocha-hook');
  const xml = fs.readFileSync(path.join(root, 'unitTests.junit.xml'), 'utf8');
  assert.match(xml, /tests="9" failures="1"/);
  assert.strictEqual((xml.match(/<testcase /g) || []).length, 9);
  assert.strictEqual((xml.match(/<failure /g) || []).length, 1);
  const markdown = fs.readFileSync(path.join(root, 'unitTests.summary.md'), 'utf8');
  assert.match(markdown, /Executed Mocha tests: 8 passing, 0 failing, 0 pending/);
  assert.match(markdown, /not additional executed feature tests/);

  const identicalTitles = parseMochaLog(
    'unitTests',
    'failure',
    '  0 passing (1s)\n  2 failing\n  1) Same suite\n       Same body:\n     Error: first\n  2) Same suite\n       Same body:\n     Error: second\n'
  );
  assert.strictEqual(identicalTitles.failing, 2);
  assert.deepStrictEqual(identicalTitles.failedTests, ['Same suite: Same body', 'Same suite: Same body']);
  assert.deepStrictEqual(identicalTitles.executedTestCounts, { total: 2, passing: 0, failing: 2, pending: 0 });
  const missingDetail = parseMochaLog('unitTests', 'failure', '  0 passing (1s)\n  2 failing\n  1) Only detail:\n     Error: failure\n');
  assert.deepStrictEqual(missingDetail.failedTests, ['Only detail', 'Failure 2']);
  assert.strictEqual(missingDetail.total, 2);
  assert.strictEqual(missingDetail.unclassifiedMochaFailureCount, 1);
  assert.deepStrictEqual(missingDetail.executedTestCounts, { total: 1, passing: 0, failing: 1, pending: 0 });
  const duplicatePasses = parseMochaLog('unitTests', 'success', '  ✔ Same title\n  ✔ Same title\n  2 passing (1s)\n');
  assert.deepStrictEqual(duplicatePasses.passedTests, ['Same title', 'Same title']);
  assert.strictEqual(duplicatePasses.total, 2);
  for (const detail of [
    '  1) "before all" hook reporting\n       Should fail as an ordinary body:',
    '  1) Ordinary suite\n       Should render "before all" hook text:',
  ]) {
    const bodyResult = parseMochaLog(
      'unitTests',
      'failure',
      `  0 passing (1s)\n  1 failing\n${detail}\n     Error: ordinary body failure\n`
    );
    assert.deepStrictEqual(bodyResult.executedTestCounts, { total: 1, passing: 0, failing: 1, pending: 0 });
    assert.strictEqual(bodyResult.harnessFailures, undefined, 'Hook words in suite/body prose do not make a Mocha hook');
  }

  const nestedNumbering = parseMochaLog(
    'unitTests',
    'failure',
    '  0 passing (1s)\n  2 failing\n  1) Ordinary suite\n       Actual body:\n     Error: multiline detail\n         2) This is error text, not another body:\n  2) Owned suite\n       "after all" hook for "Actual body":\n     Error: teardown failed\n'
  );
  assert.deepStrictEqual(nestedNumbering.executedTestCounts, { total: 1, passing: 0, failing: 1, pending: 0 });
  assert.deepStrictEqual(nestedNumbering.failedTests, ['Ordinary suite: Actual body', 'Owned suite: "after all" hook for "Actual body"']);
  assert.strictEqual(nestedNumbering.harnessFailures.length, 1);
  assert.strictEqual(nestedNumbering.harnessFailures[0].kind, 'mocha-hook');
}

function testSuitePrefixedMochaSummaryParsing() {
  const productionLog = [];
  const foreignPrefixer = createLinePrefixer('[otherSuite] ', (text) => productionLog.push(text));
  foreignPrefixer.push('    ✔ Must not be counted\n  9 pass');
  foreignPrefixer.push('ing (9s)\n');
  foreignPrefixer.flush();
  const currentPrefixer = createLinePrefixer('[statelessVariablesLifecycle] ', (text) => productionLog.push(text));
  currentPrefixer.push('    ✔ verifies callback, history, restart, and recovery (25ms)\n  1 pass');
  currentPrefixer.push('ing (2m)\n');
  currentPrefixer.flush();
  assert.ok(
    productionLog
      .join('')
      .split(/\r?\n/)
      .filter(Boolean)
      .every((line) => /^\[(?:otherSuite|statelessVariablesLifecycle)\] /.test(line)),
    'Every complete line from a production-shaped multi-line chunk must retain its suite owner'
  );
  const accepted = parseMochaLog('statelessVariablesLifecycle', 'success', productionLog.join(''));
  assert.strictEqual(accepted.passing, 1);
  assert.strictEqual(accepted.total, 1);
  assert.deepStrictEqual(accepted.passedTests, ['verifies callback, history, restart, and recovery']);
  assert.strictEqual(accepted.duration, '2m');

  const rejected = parseMochaLog(
    'statelessVariablesLifecycle',
    'success',
    '[statelessVariablesLifecycleOther]     ✔ Wrong suite\n[statelessVariablesLifecycleOther]   1 passing (1s)\n'
  );
  assert.strictEqual(rejected.passing, 0);
  assert.strictEqual(rejected.total, 0);
  assert.deepStrictEqual(rejected.passedTests, []);

  const unprefixed = parseMochaLog('statelessVariablesLifecycle', 'success', '    ✔ Single suite compatibility\n  1 passing (1s)\n');
  assert.strictEqual(unprefixed.passing, 1);
  assert.deepStrictEqual(unprefixed.passedTests, ['Single suite compatibility']);

  const unprefixedWithDiagnostics = parseMochaLog(
    'statelessVariablesLifecycle',
    'success',
    '    ✔ Single suite with diagnostics\n  1 passing (1s)\n[runtime-deps] Error: cleanup diagnostic\n'
  );
  assert.strictEqual(unprefixedWithDiagnostics.passing, 1);
  assert.deepStrictEqual(unprefixedWithDiagnostics.passedTests, ['Single suite with diagnostics']);
}

function testMsnFailedWrapperAccounting() {
  for (const platform of ['linux', 'win32']) {
    for (const failure of ['cleanup', 'missing', 'malformed', 'signal', 'phase', 'unexpected-wrapper']) {
      const root = path.join(tempRoot, `msn-failed-wrapper-${platform}-${failure}`);
      fs.mkdirSync(root);
      const log = path.join(root, 'native.log');
      fs.writeFileSync(
        log,
        '\n  ✔ Bootstrap preparation\n  1 passing (1s)\n  ✔ Workspace creation\n  1 passing (1s)\n  ✔ Should open generated designers and run saved workflows for Standard, custom code, and rules engine projects (106059ms)\n  1 passing (2m)\n'
      );
      const terminal = {
        schemaVersion: 1,
        label: 'msnWeatherLifecycle',
        phaseId: 'msnWeatherLifecycle:run',
        exitCode: failure === 'cleanup' ? 1 : 0,
        signal: failure === 'signal' ? 'SIGTERM' : null,
        cleanupVerified: failure !== 'cleanup',
        diagnosticsError: failure === 'cleanup' ? 'lifecycle-cleanup-failed' : '',
        complete: failure !== 'cleanup',
        mochaPassingCount: 0,
        phaseResults: SUITE_REGISTRY.msnWeatherLifecycle.expectedPhases.map((phaseId) =>
          msnPhase(phaseId, failure === 'phase' && phaseId.endsWith(':run') ? { exitCode: 1, complete: false } : {})
        ),
        lifecycleFinalized: true,
      };
      if (failure !== 'missing') {
        fs.writeFileSync(
          path.join(root, 'msnWeatherLifecycle.terminal-result.json'),
          failure === 'malformed' ? '{"private-sentinel":bad-json}' : JSON.stringify(terminal)
        );
      }
      const cli = spawnSync(
        process.execPath,
        [
          path.join(__dirname, 'summarize-e2e-cli-results.js'),
          '--label',
          'msnWeatherLifecycle',
          '--log',
          log,
          '--out-dir',
          root,
          '--outcome',
          'failure',
        ],
        { encoding: 'utf8' }
      );
      assert.strictEqual(cli.error, undefined);
      assert.strictEqual(cli.status, 1, 'An already-failed wrapper must not bypass terminal validation');
      const result = JSON.parse(fs.readFileSync(path.join(root, 'msnWeatherLifecycle.json'), 'utf8'));
      assert.strictEqual(result.outcome, 'failure');
      assert.strictEqual(result.passing, 1);
      assert.strictEqual(result.failing, 1);
      assert.strictEqual(result.total, 2);
      assert.deepStrictEqual(result.executedTestCounts, { total: 1, passing: 1, failing: 0, pending: 0 });
      assert.deepStrictEqual(result.failedTests, ['MSN lifecycle evidence']);
      assert.strictEqual(result.harnessFailures.length, 1);
      assert.strictEqual(result.harnessFailures[0].kind, 'lifecycle-evidence');
      assert.strictEqual(result.ogfScenarios, undefined);
      const xml = fs.readFileSync(path.join(root, 'msnWeatherLifecycle.junit.xml'), 'utf8');
      assert.match(xml, /tests="2" failures="1"/);
      assert.match(xml, /<failure message="MSN lifecycle evidence">/);
      assert.strictEqual((xml.match(/<testcase /g) || []).length, 2);
      assert.doesNotMatch(`${cli.stderr}${JSON.stringify(result)}${xml}`, /private-sentinel|bad-json/);
    }
  }
}

function testMsnNativeFailureAccounting() {
  const root = path.join(tempRoot, 'msn-native-failed-reporting');
  fs.mkdirSync(root);
  const log = path.join(root, 'native.log');
  fs.writeFileSync(
    log,
    '  ✔ Bootstrap preparation\n  1 passing (1s)\n  ✔ Workspace creation\n  1 passing (1s)\n  0 passing (1s)\n  1 failing\n  1) Runtime scenario:\n     Error: native assertion failed\n'
  );
  fs.writeFileSync(
    path.join(root, 'msnWeatherLifecycle.terminal-result.json'),
    JSON.stringify({
      label: 'msnWeatherLifecycle',
      complete: false,
      exitCode: 1,
      cleanupVerified: true,
      diagnosticsError: '',
      phaseResults: [],
    })
  );
  writeSingleResult({ label: 'msnWeatherLifecycle', outcome: 'failure', log, outDir: root });
  const result = JSON.parse(fs.readFileSync(path.join(root, 'msnWeatherLifecycle.json'), 'utf8'));
  assert.deepStrictEqual(result.executedTestCounts, { total: 1, passing: 0, failing: 1, pending: 0 });
  assert.strictEqual(result.total, 1);
  assert.strictEqual(result.failing, 1);
  assert.deepStrictEqual(result.failedTests, ['Runtime scenario']);
  assert.deepStrictEqual(result.passedTests, [], 'Earlier preparation passes must not appear as passed run-phase tests');
  assert.strictEqual(result.harnessFailures, undefined, 'The native assertion failure must not be counted twice as a harness failure');
  const xml = fs.readFileSync(path.join(root, 'msnWeatherLifecycle.junit.xml'), 'utf8');
  assert.strictEqual((xml.match(/<testcase /g) || []).length, 1);

  fs.writeFileSync(
    log,
    '  ✔ Actual runtime body\n  1) "after all" hook for "Actual runtime body"\n  1 passing (1s)\n  1 failing\n  1) Generated Workspace Designer Lifecycle Tests\n       "after all" hook for "Actual runtime body":\n     AggregateError: owned host teardown failed\n'
  );
  writeSingleResult({ label: 'msnWeatherLifecycle', outcome: 'failure', log, outDir: root });
  const hookResult = JSON.parse(fs.readFileSync(path.join(root, 'msnWeatherLifecycle.json'), 'utf8'));
  assert.deepStrictEqual(hookResult.executedTestCounts, { total: 1, passing: 1, failing: 0, pending: 0 });
  assert.strictEqual(hookResult.total, 2);
  assert.strictEqual(hookResult.failing, 1);
  assert.deepStrictEqual(hookResult.failedTests, [
    'Generated Workspace Designer Lifecycle Tests: "after all" hook for "Actual runtime body"',
  ]);
  assert.strictEqual(hookResult.harnessFailures.length, 1);
  assert.strictEqual(hookResult.harnessFailures[0].kind, 'mocha-hook');
}

function testOgfGateControls() {
  assert.strictEqual(getMochaPassingCount('\n  0 passing (10ms)\n'), 0);
  assert.strictEqual(getMochaPassingCount('\n  1 passing (1s)\n  6 passing (2s)\n'), 6);
  assert.strictEqual(getMochaPassingCount('\n\u001b[92m \u001b[0m\u001b[32m 1 passing\u001b[0m\u001b[90m (35s)\u001b[0m\n'), 1);
  assert.deepStrictEqual(buildOgfScenariosForPhase('createWorkspaceCoreMatrix:standard-stateful', {}, { passed: false }), []);
  assert.deepStrictEqual(buildOgfScenariosForPhase('createWorkspaceCoreMatrix:custom-code-stateful', {}, { passed: true }), []);
  assert.strictEqual(
    buildOgfScenariosForPhase(
      'createWorkspaceCoreMatrix:standard-stateful',
      { LA_E2E_CLI_CREATE_WORKSPACE_CASE: 'standard-stateful' },
      { passed: true }
    ).length,
    1
  );
  assert.deepStrictEqual(collectOgfScenarios([{ ogfScenarios: [] }, { phaseId: 'unmapped' }]), []);
}

function testAggregateCompletenessAndDiagnosticRerun() {
  const suites = [SUITE_REGISTRY.unitTests, SUITE_REGISTRY.msnWeatherLifecycle];
  const incomplete = buildBatchAggregate({
    batchRoot: tempRoot,
    suites,
    observed: [
      {
        id: 'unitTests',
        finalOutcome: 'success',
        classification: 'success',
      },
    ],
  });
  assert.strictEqual(incomplete.complete, false);
  assert.strictEqual(incomplete.fullRollup, false);
  assert.deepStrictEqual(incomplete.missingSuiteIds, ['msnWeatherLifecycle']);

  const diagnostic = buildBatchAggregate({
    batchRoot: tempRoot,
    suites: [SUITE_REGISTRY.unitTests],
    observed: [{ id: 'unitTests', finalOutcome: 'success', classification: 'success' }],
    diagnosticOnly: true,
  });
  assert.strictEqual(diagnostic.complete, true);
  assert.strictEqual(diagnostic.fullRollup, false);
  assert.strictEqual(diagnostic.aggregateOutcome, 'success');
  assert.strictEqual(diagnostic.selectedRunSuccess, true);

  const selectedOnly = buildBatchAggregate({
    batchRoot: tempRoot,
    suites: [SUITE_REGISTRY.unitTests],
    observed: [{ id: 'unitTests', finalOutcome: 'success', classification: 'success' }],
    trustedFullExecution: true,
    platform: 'linux',
  });
  assert.strictEqual(selectedOnly.complete, true);
  assert.strictEqual(selectedOnly.canonicalInventory, false);
  assert.strictEqual(selectedOnly.fullRollup, false);

  const fullLinux = buildBatchAggregate({
    batchRoot: tempRoot,
    suites: [
      SUITE_REGISTRY.unitTests,
      SUITE_REGISTRY.createWorkspaceBehavior,
      SUITE_REGISTRY.createWorkspaceCoreMatrix,
      SUITE_REGISTRY.createWorkspacePreviewMatrix,
      SUITE_REGISTRY.createWorkspaceCodeful,
      SUITE_REGISTRY.msnWeatherLifecycle,
    ],
    observed: [
      'unitTests',
      'createWorkspaceBehavior',
      'createWorkspaceCoreMatrix',
      'createWorkspacePreviewMatrix',
      'createWorkspaceCodeful',
      'msnWeatherLifecycle',
    ].map((id) => ({ id, finalOutcome: 'success', classification: 'success' })),
    trustedFullExecution: true,
    platform: 'linux',
    admissionContext: {
      producerDefinitionId: '24067',
      producerRunId: '123',
      sourceSHA: 'a'.repeat(40),
      artifactSHA256: 'b'.repeat(64),
      resolvedVSCodeBuild: '1.100.0',
    },
  });
  assert.strictEqual(fullLinux.canonicalInventory, true);
  assert.strictEqual(fullLinux.hasAdmissionContext, true);
  assert.strictEqual(fullLinux.fullRollup, true);
  assert.strictEqual(fullLinux.aggregateOutcome, 'success');

  const summaryAggregate = buildSummaryAggregate(
    [
      {
        label: 'unitTests',
        outcome: 'success',
        total: 2,
        passing: 2,
        failing: 0,
        pending: 0,
        passRate: 100,
      },
    ],
    { expectedLabels: ['unitTests', 'msnWeatherLifecycle'], diagnosticOnly: true }
  );
  assert.strictEqual(summaryAggregate.complete, false);
  assert.strictEqual(summaryAggregate.fullRollup, false);
  assert.deepStrictEqual(summaryAggregate.missingLabels, ['msnWeatherLifecycle']);
  assert.ok(summaryAggregate.failedLabels.some((label) => label.includes('diagnosticOnly')));
}

function testAggregateCliOptions() {
  const resultsDir = path.join(tempRoot, 'aggregate-cli-input');
  const outDir = path.join(tempRoot, 'aggregate-cli-output');
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(
    path.join(resultsDir, 'unitTests.json'),
    `${JSON.stringify(
      {
        label: 'unitTests',
        outcome: 'success',
        total: 1,
        passing: 1,
        failing: 0,
        pending: 0,
        passRate: 100,
      },
      null,
      2
    )}\n`
  );

  execFileSync(
    process.execPath,
    [
      path.join(__dirname, 'summarize-e2e-cli-results.js'),
      '--aggregate',
      '--results-dir',
      resultsDir,
      '--out-dir',
      outDir,
      '--expected-suites',
      'unitTests,msnWeatherLifecycle',
      '--diagnostic-only',
      'true',
    ],
    { stdio: 'pipe' }
  );

  const aggregate = JSON.parse(fs.readFileSync(path.join(outDir, 'vscode-e2e-cli-create-workspace-results.json'), 'utf-8'));
  assert.deepStrictEqual(aggregate.expectedLabels, ['unitTests', 'msnWeatherLifecycle']);
  assert.deepStrictEqual(aggregate.missingLabels, ['msnWeatherLifecycle']);
  assert.strictEqual(aggregate.diagnosticOnly, true);
  assert.strictEqual(aggregate.fullRollup, false);
  assert.ok(aggregate.failedLabels.includes('diagnosticOnly (not a full rollup)'));
}

function testSingleSummarySupportsDiagnosticsArtifactName() {
  const result = {
    label: 'unitTests',
    outcome: 'success',
    passing: 12,
    failing: 0,
    pending: 0,
    passRate: 100,
  };
  const defaultSummary = buildSingleSummary(result);
  assert.match(defaultSummary, /vscode-e2e-cli-test-results-unitTests/);
  assert.match(defaultSummary, /vscode-e2e-cli-log-unitTests/);
  assert.match(defaultSummary, /vscode-e2e-cli-screenshots-unitTests/);

  const diagnosticsSummary = buildSingleSummary({
    ...result,
    diagnosticsArtifactName: 'vscode-e2e-cli-diagnostics-linux-unit-tests',
  });
  assert.match(diagnosticsSummary, /vscode-e2e-cli-diagnostics-linux-unit-tests/);
  assert.match(diagnosticsSummary, /structured results under `results\/`/);
  assert.match(diagnosticsSummary, /VS Code profile logs under `log\/`/);
  assert.doesNotMatch(diagnosticsSummary, /vscode-e2e-cli-test-results-unitTests/);
  assert.doesNotMatch(diagnosticsSummary, /vscode-e2e-cli-log-unitTests/);
  assert.doesNotMatch(diagnosticsSummary, /vscode-e2e-cli-screenshots-unitTests/);
}

function testSummarizerMergesDirectOgfTerminalResult() {
  const outDir = path.join(tempRoot, 'summarizer-ogf-success');
  fs.mkdirSync(outDir, { recursive: true });
  const label = 'createWorkspaceCoreMatrix';
  const log = path.join(outDir, `${label}.log`);
  fs.writeFileSync(log, '\n  ✔ creates Standard Stateful workspace and generated debug launch config\n\n  1 passing (1s)\n');
  fs.writeFileSync(
    path.join(outDir, `${label}.terminal-result.json`),
    `${JSON.stringify(
      {
        complete: true,
        phaseId: 'createWorkspaceCoreMatrix:rules-engine-stateless',
        mochaPassingCount: 1,
        ogfScenarios: buildOgfScenariosForPhase(
          'createWorkspaceCoreMatrix:standard-stateful',
          { LA_E2E_CLI_CREATE_WORKSPACE_CASE: 'standard-stateful', BUILD_SOURCEVERSION: 'a'.repeat(40) },
          { passed: true }
        ).map((evidence) => ({ ...evidence, source: { system: 'tracking.example.test', caseId: 812 } })),
      },
      null,
      2
    )}\n`
  );

  writeSingleResult({ label, log, outDir, outcome: 'success' });
  const result = JSON.parse(fs.readFileSync(path.join(outDir, `${label}.json`), 'utf-8'));
  assert.strictEqual(result.outcome, 'success');
  assert.strictEqual(result.ogfScenarios.length, 1);
  assert.strictEqual(result.ogfScenarios[0].source, undefined);
  const terminal = JSON.parse(fs.readFileSync(path.join(outDir, `${label}.terminal-result.json`), 'utf-8'));
  assert.strictEqual(terminal.ogfScenarios[0].source, undefined);
  assert.strictEqual(result.ogfScenarios[0].executedVariant, 'standard-stateful');
}

function testSummarizerDoesNotMergeFailedOgfTerminalResult() {
  const outDir = path.join(tempRoot, 'summarizer-ogf-failure');
  fs.mkdirSync(outDir, { recursive: true });
  const label = 'createWorkspaceCoreMatrix';
  const log = path.join(outDir, `${label}.log`);
  fs.writeFileSync(log, '\n  0 passing (1s)\n');
  fs.writeFileSync(
    path.join(outDir, `${label}.terminal-result.json`),
    `${JSON.stringify(
      {
        complete: false,
        ogfScenarios: [{ scenarioId: 'must-not-merge' }],
        phaseResults: [
          {
            phaseId: 'createWorkspaceCoreMatrix:standard-stateful',
            ogfScenarios: [{ scenarioId: 'must-not-retain-in-phase-history' }],
          },
        ],
      },
      null,
      2
    )}\n`
  );

  writeSingleResult({ label, log, outDir, outcome: 'failure' });
  const result = JSON.parse(fs.readFileSync(path.join(outDir, `${label}.json`), 'utf-8'));
  const terminal = JSON.parse(fs.readFileSync(path.join(outDir, `${label}.terminal-result.json`), 'utf-8'));
  assert.strictEqual(result.ogfScenarios, undefined);
  assert.strictEqual(terminal.ogfScenarios, undefined);
  assert.strictEqual(terminal.phaseResults[0].ogfScenarios, undefined);
}

function writeSuiteTerminalAndCleanup(context, options = {}) {
  fs.mkdirSync(path.dirname(context.terminalResultPath), { recursive: true });
  fs.writeFileSync(
    context.terminalResultPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        complete: true,
        cleanupVerified: options.cleanupVerified !== false,
        exitCode: options.exitCode ?? 0,
        signal: null,
        diagnosticsError: '',
        phaseCompleteness: true,
      },
      null,
      2
    )}\n`
  );
  fs.writeFileSync(
    context.cleanupLedgerPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        verified: options.cleanupVerified !== false,
        phaseCleanupVerified: options.cleanupVerified !== false,
        processTreeVerified: options.cleanupVerified !== false,
      },
      null,
      2
    )}\n`
  );
}

function createWrapperFixtureScript(mode) {
  const scriptPath = path.join(tempRoot, `wrapper-fixture-${mode}-${Date.now()}-${Math.random().toString(36).slice(2)}.js`);
  fs.writeFileSync(
    scriptPath,
    [
      "const fs = require('fs');",
      "const net = require('net');",
      "const path = require('path');",
      "const { spawn } = require('child_process');",
      `const mode = ${JSON.stringify(mode)};`,
      "const role = process.argv.includes('--grandchild') ? 'grandchild' : 'parent';",
      'const recordsPath = process.env.LA_E2E_CLI_PROCESS_RECORDS_PATH;',
      'function record(value) { if (recordsPath) { fs.mkdirSync(path.dirname(recordsPath), { recursive: true }); fs.appendFileSync(recordsPath, `${JSON.stringify(value)}\\n`); } }',
      'function appendPhase(exitCode) {',
      '  const target = process.env.LA_E2E_CLI_SUITE_PHASE_RESULTS_PATH;',
      '  if (!target) { return; }',
      '  fs.mkdirSync(path.dirname(target), { recursive: true });',
      '  const phaseIds = JSON.parse(process.env.LA_E2E_CLI_BATCH_EXPECTED_PHASES || \'["unitTests"]\');',
      "  for (const phaseId of phaseIds) { fs.appendFileSync(target, `${JSON.stringify({ schemaVersion: 1, phaseId, exitCode, signal: null, cleanupVerified: true, diagnosticsError: '', complete: true })}\\n`); }",
      '}',
      "if (mode === 'sleep') { setInterval(() => undefined, 1000); }",
      "else if (mode === 'descendant') {",
      '  record({ pid: process.pid, role });',
      '  const server = net.createServer();',
      "  server.listen(0, '127.0.0.1', () => record({ pid: process.pid, role, port: server.address().port }));",
      "  if (role === 'parent') { spawn(process.execPath, [__filename, '--grandchild'], { stdio: 'ignore', env: process.env }); }",
      '  setInterval(() => undefined, 1000);',
      '}',
      "else if (mode === 'signal-resistant-descendant') {",
      "  process.on('SIGTERM', () => undefined);",
      '  record({ pid: process.pid, role });',
      "  if (role === 'parent') { spawn(process.execPath, [__filename, '--grandchild'], { stdio: 'ignore', env: process.env }); }",
      '  setInterval(() => undefined, 1000);',
      '}',
      "else if (mode === 'escaped-descendant') {",
      '  record({ pid: process.pid, role });',
      "  if (role === 'grandchild') { setInterval(() => undefined, 1000); }",
      '  else {',
      "    const escaped = spawn(process.execPath, [__filename, '--grandchild'], { detached: true, stdio: 'ignore', env: process.env });",
      '    escaped.unref();',
      '    setTimeout(() => { appendPhase(0); process.exit(0); }, 250);',
      '  }',
      '}',
      'else { setTimeout(() => { appendPhase(0); process.exit(0); }, 1500); }',
    ].join('\n')
  );
  return scriptPath;
}

function readJsonLines(filePath) {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === 'ESRCH') {
      return false;
    }
    throw error;
  }
}

function listenerAvailable(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createSyntheticGeneratedWorkspace(name, parent = tempRoot) {
  const workspaceDir = path.join(parent, name);
  const appDir = path.join(workspaceDir, 'LogicApp');
  const workflowDir = path.join(appDir, 'Workflow1');
  fs.mkdirSync(path.join(appDir, '.vscode'), { recursive: true });
  fs.mkdirSync(workflowDir, { recursive: true });
  fs.writeFileSync(path.join(workspaceDir, 'test.code-workspace'), JSON.stringify({ folders: [{ path: 'LogicApp' }] }, null, 2));
  fs.writeFileSync(path.join(appDir, 'host.json'), `${JSON.stringify({ version: '2.0' }, null, 2)}\n`);
  fs.writeFileSync(
    path.join(appDir, 'local.settings.json'),
    `${JSON.stringify(
      {
        Values: {
          AzureWebJobsStorage: 'UseDevelopmentStorage=true;AccountKey=secret-account-key',
          WORKFLOWS_SUBSCRIPTION_ID: '00000000-0000-4000-8000-000000000001',
          WORKFLOWS_RESOURCE_GROUP_NAME: 'LogicAppsVSCode-E2E-Fixtures',
          WORKFLOWS_LOCATION_NAME: 'westus',
          WORKFLOWS_TENANT_ID: '00000000-0000-4000-8000-000000000002',
          WORKFLOWS_MANAGEMENT_BASE_URI: 'https://management.azure.com/',
          connectionKey: 'live-runtime-connection-key',
          MSN_CONNECTION_KEY: 'live-prefixed-runtime-connection-key',
          'connection-key': 'live-dash-runtime-connection-key',
          connection_key: 'live-underscore-runtime-connection-key',
          SECRET_KEY: 'should-not-appear',
        },
      },
      null,
      2
    )}\n`
  );
  fs.writeFileSync(
    path.join(appDir, 'connections.json'),
    `${JSON.stringify(
      {
        managedApiConnections: {
          msnweather: {
            api: {
              id: '/subscriptions/00000000-0000-4000-8000-000000000001/providers/Microsoft.Web/locations/westus/managedApis/msnweather',
            },
            connection: {
              id: '/subscriptions/00000000-0000-4000-8000-000000000001/resourceGroups/rg/providers/Microsoft.Web/connections/msnweather',
            },
            connectionRuntimeUrl: 'https://example.invalid/runtime/webhooks/workflow/api/secret?sig=live-runtime-signature',
            MSN_CONNECTION_RUNTIME_URL:
              'https://example.invalid/runtime/webhooks/workflow/api/prefixed?sig=live-prefixed-runtime-signature',
            'connection-runtime-url': 'https://example.invalid/runtime/webhooks/workflow/api/dash?sig=live-dash-runtime-signature',
            connection_runtime_url:
              'https://example.invalid/runtime/webhooks/workflow/api/underscore?sig=live-underscore-runtime-signature',
          },
        },
      },
      null,
      2
    )}\n`
  );
  fs.writeFileSync(path.join(appDir, '.vscode', 'tasks.json'), `${JSON.stringify({ version: '2.0.0', tasks: [] }, null, 2)}\n`);
  fs.writeFileSync(path.join(appDir, '.vscode', 'launch.json'), `${JSON.stringify({ version: '0.2.0', configurations: [] }, null, 2)}\n`);
  fs.writeFileSync(
    path.join(appDir, '.vscode', 'settings.json'),
    `${JSON.stringify({ 'azureLogicAppsStandard.projectRuntime': '~4' }, null, 2)}\n`
  );
  fs.mkdirSync(path.join(workspaceDir, '.vscode-e2e-diagnostics', 'LogicApp'), { recursive: true });
  fs.writeFileSync(
    path.join(workspaceDir, '.vscode-e2e-diagnostics', 'LogicApp', 'msn-weather-local-settings-after-save.json'),
    `${JSON.stringify(
      {
        stage: 'after-save',
        requiredKeys: [
          'WORKFLOWS_SUBSCRIPTION_ID',
          'WORKFLOWS_RESOURCE_GROUP_NAME',
          'WORKFLOWS_LOCATION_NAME',
          'WORKFLOWS_TENANT_ID',
          'WORKFLOWS_MANAGEMENT_BASE_URI',
        ],
        keys: {
          WORKFLOWS_SUBSCRIPTION_ID: {
            expected: '00000000-0000-4000-8000-000000000001',
            actual: '00000000-0000-4000-8000-000000000001',
            status: 'valid',
          },
          WORKFLOWS_RESOURCE_GROUP_NAME: {
            expected: 'LogicAppsVSCode-E2E-Fixtures',
            actual: 'LogicAppsVSCode-E2E-Fixtures',
            status: 'valid',
          },
          WORKFLOWS_LOCATION_NAME: { expected: 'westus', actual: 'westus', status: 'valid' },
          WORKFLOWS_TENANT_ID: {
            expected: '00000000-0000-4000-8000-000000000002',
            actual: '00000000-0000-4000-8000-000000000002',
            status: 'valid',
          },
          WORKFLOWS_MANAGEMENT_BASE_URI: {
            expected: 'https://management.azure.com',
            actual: 'https://management.azure.com',
            status: 'valid',
          },
        },
      },
      null,
      2
    )}\n`
  );
  fs.writeFileSync(
    path.join(workspaceDir, '.vscode-e2e-diagnostics', 'LogicApp', 'msn-weather-lifecycle-trace.json'),
    `${JSON.stringify(
      [
        {
          phase: 'savedworkflowverified',
          status: 'FAILED',
          timestamp: '2026-09-28T00:00:00.000Z',
          detail: {
            accessToken: 'trace-access-token',
            nested: {
              clientSecret: 'trace-client-secret',
            },
          },
        },
      ],
      null,
      2
    )}\n`
  );
  fs.writeFileSync(
    path.join(workflowDir, 'workflow.json'),
    `${JSON.stringify(
      {
        definition: {
          triggers: {
            manual: {
              type: 'Request',
              inputs: {
                callbackUrl: 'https://example.invalid/workflows/run?api-version=2019-10-01&sig=secret-signature',
              },
            },
          },
        },
      },
      null,
      2
    )}\n`
  );
  fs.mkdirSync(path.join(appDir, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(appDir, 'bin', 'generated.dll'), 'binary');
  fs.mkdirSync(path.join(appDir, 'node_modules', 'package'), { recursive: true });
  fs.writeFileSync(path.join(appDir, 'node_modules', 'package', 'index.js'), 'module');
  fs.writeFileSync(path.join(appDir, 'oversized.txt'), Buffer.alloc(1024 * 1024 + 1, 'x'));
  try {
    fs.symlinkSync(path.dirname(workspaceDir), path.join(appDir, 'outside-link'), 'junction');
  } catch {
    // Symlink creation can require privileges on Windows; bulky/generated exclusion coverage remains deterministic.
  }
  return workspaceDir;
}

function findFileByName(root, name) {
  if (!fs.existsSync(root)) {
    return undefined;
  }

  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(entryPath);
      } else if (entry.name === name) {
        return entryPath;
      }
    }
  }
  return undefined;
}

function withEnvironment(values, callback) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

async function testMsnLifecycleCleanupRetainsOriginalErrors() {
  const sequence = [];
  const original = new Error('original-native-phase-control');
  const workspace = new Error('workspace-removal-control');
  const dependencies = new Error('dependency-removal-control');
  const observation = new Error('root-observation-control');
  const persistence = new Error('terminal-persistence-control');
  await assert.rejects(
    finalizeMsnLifecycleCleanup({
      lifecycleError: original,
      cleanupSteps: [
        async () => {
          sequence.push('workspace');
          throw workspace;
        },
        async () => {
          sequence.push('dependencies');
          throw dependencies;
        },
      ],
      observeCleanup: () => {
        sequence.push('observe-both-roots');
        throw observation;
      },
      finalizeEvidence: (outcome) => {
        sequence.push('finalize-terminal');
        assert.deepStrictEqual(outcome, {
          cleanupVerified: false,
          lifecycleError: true,
          errors: [original, workspace, dependencies, observation],
        });
        throw persistence;
      },
    }),
    (error) => {
      assert.deepStrictEqual(error.errors, [original, workspace, dependencies, observation, persistence]);
      return true;
    }
  );
  assert.deepStrictEqual(sequence, ['workspace', 'dependencies', 'observe-both-roots', 'finalize-terminal']);
  const options = { cleanupSteps: [], observeCleanup: () => false, finalizeEvidence: () => ({ complete: true }) };
  await assert.rejects(finalizeMsnLifecycleCleanup(options), /incomplete-or-unclean-lifecycle/);
  await assert.rejects(
    finalizeMsnLifecycleCleanup({ ...options, observeCleanup: () => true, finalizeEvidence: () => ({ complete: false }) }),
    /incomplete-or-unclean-lifecycle/
  );
  const success = await finalizeMsnLifecycleCleanup({ ...options, observeCleanup: () => true });
  assert.deepStrictEqual(success, { cleanupVerified: true, terminal: { complete: true } });
}
