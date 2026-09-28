/* global __dirname, console, process, require, setTimeout */
const assert = require('assert');
const { Buffer } = require('buffer');
const { execFileSync } = require('child_process');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');

const {
  _test: {
    collectRuntimeDependencyDiagnostics,
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
    hasOwnedWorkspaceParentDiagnosticFailure,
    getMsnWeatherLifecycleRunExtraEnv,
    getMsnWeatherAzureTargetEnv,
    getMsnWeatherAzureAuthEnv,
    hasHeadlessMsnWeatherAzureAuth,
    getNoGeneratedWorkspaceSnapshotReason,
    getVscodeUserDataDir,
    getWorkspaceSourcesFromManifestPath,
    redactGeneratedWorkspaceJsonValue,
    redactGeneratedWorkspacePlainText,
    runSuiteWrapperProcess,
    verifyFuncCoreToolsAtDependencyRoot,
    writeVscodeProfileLogIndex,
  },
} = require('./run-e2e-cli.js');
const {
  buildBatchAggregate,
  buildSuiteEnvironment,
  classifySuiteRunResult,
  createSuiteContext,
  getSuiteScopedCredentialEnv,
  normalizeSuiteSelection,
  prepareSuiteExtensionsDirectory,
  runBatchSuites,
  SUITE_REGISTRY,
} = require('./e2e-cli-batch.js');
const {
  _test: { buildAggregate: buildSummaryAggregate },
} = require('./summarize-e2e-cli-results.js');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'run-e2e-cli-unit-'));

(async () => {
  try {
    testCreatesEmptyIsolatedDependencyRoot();
    testFailFastMissingFuncDiagnostics();
    testFailFastMissingInProc8Diagnostics();
    testCopiesAzureLogicAppsChannelLogs();
    testVscodeProfileLogsUseSuiteUserDataParentAndRedact();
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
    testCodefulDebugTasksRunEnvCarriesOwnedRoot();
    testGeneratedWorkspaceSnapshotFallsBackToOwnedRootForPartialManifest();
    testGeneratedWorkspaceSnapshotSourcesSupportLifecycleAndManifestShapes();
    testGeneratedWorkspaceSnapshotWritesNoWorkspaceMarker();
    testGeneratedWorkspaceSnapshotWritesNoWorkspaceMarkerForSmokeLabels();
    testGeneratedWorkspaceSnapshotExplainsBehaviorNoWorkspace();
    testMsnWeatherTargetEnvAllowsLocalInteractiveMode();
    testMsnWeatherTargetEnvBlocksInteractiveModeInCi();
    testBatchMsnWeatherDisablesLocalCliFallback();
    testBatchSuiteRegistryValidation();
    testBatchSuiteEnvironmentIsolation();
    await testBatchSuiteScopedCredentials();
    await testBatchContinuesAfterOrdinaryFailure();
    await testBatchStopsAfterContainmentBreach();
    await testRunSuiteWrapperProcessWritesStructuredResults();
    await testRunSuiteWrapperProcessTimeoutCancelsDisposableChild();
    await testRunSuiteWrapperProcessTimeoutCancelsGrandchildListener();
    testAggregateCompletenessAndDiagnosticRerun();
    testAggregateCliOptions();
    console.log('[run-e2e-cli.unit] all tests passed');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

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

  assert.throws(
    () =>
      collectVscodeProfileLogs('msnWeatherLifecycle', {
        ...env,
        LA_E2E_CLI_USER_DATA_SUFFIX: 'missing',
      }),
    /Required VS Code profile logs were not found/
  );
}

function testGeneratedWorkspaceSnapshotCopiesUsefulRedactedTree() {
  const source = createSyntheticGeneratedWorkspace('snapshot-source');
  const destination = path.join(tempRoot, 'snapshot-destination');
  const result = copyGeneratedWorkspaceSnapshot(source, destination);

  assert.ok(result.copiedFiles >= 7, `expected useful generated project files to be copied, got ${result.copiedFiles}`);
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
  assert.strictEqual(localSettings.Values.WORKFLOWS_SUBSCRIPTION_ID, 'f11e76f5-6d71-4e8b-9571-9c5f147628ed');
  assert.strictEqual(localSettings.Values.WORKFLOWS_RESOURCE_GROUP_NAME, 'LogicAppsVSCode-E2E-Fixtures');
  assert.strictEqual(localSettings.Values.WORKFLOWS_LOCATION_NAME, 'westus');
  assert.strictEqual(localSettings.Values.WORKFLOWS_TENANT_ID, '72f988bf-86f1-41af-91ab-2d7cd011db47');
  assert.strictEqual(localSettings.Values.AzureWebJobsStorage, '<redacted>');
  assert.strictEqual(localSettings.Values.SECRET_KEY, '<redacted>');
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
  const secret = '2b2c2fad-1d28-4470-9b12-947c876e1691';
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
    ['unitTests', 'createWorkspaceBehaviorSmoke', 'msnWeatherLifecycle']
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
  assert.strictEqual(env.LA_E2E_CLI_DISABLE_UNOWNED_PORT_KILL, '1');

  const seedDir = path.join(tempRoot, 'extensions-seed');
  fs.mkdirSync(path.join(seedDir, 'publisher.extension-1.0.0'), { recursive: true });
  fs.writeFileSync(path.join(seedDir, 'extensions.json'), '[]');
  prepareSuiteExtensionsDirectory({ seedDir, targetDir: context.extensionsDir });
  assert.ok(fs.existsSync(path.join(context.extensionsDir, 'extensions.json')), 'suite extensions dir should be copied from seed');
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
  assert.strictEqual(cleanup.verified, true);
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
      "  fs.appendFileSync(target, `${JSON.stringify({ schemaVersion: 1, phaseId: 'unitTests', exitCode, signal: null, cleanupVerified: true, diagnosticsError: '', complete: true })}\\n`);",
      '}',
      "if (mode === 'sleep') { setInterval(() => undefined, 1000); }",
      "else if (mode === 'descendant') {",
      '  record({ pid: process.pid, role });',
      '  const server = net.createServer();',
      "  server.listen(0, '127.0.0.1', () => record({ pid: process.pid, role, port: server.address().port }));",
      "  if (role === 'parent') { spawn(process.execPath, [__filename, '--grandchild'], { stdio: 'ignore', env: process.env }); }",
      '  setInterval(() => undefined, 1000);',
      '}',
      'else { appendPhase(0); process.exit(0); }',
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
          WORKFLOWS_SUBSCRIPTION_ID: 'f11e76f5-6d71-4e8b-9571-9c5f147628ed',
          WORKFLOWS_RESOURCE_GROUP_NAME: 'LogicAppsVSCode-E2E-Fixtures',
          WORKFLOWS_LOCATION_NAME: 'westus',
          WORKFLOWS_TENANT_ID: '72f988bf-86f1-41af-91ab-2d7cd011db47',
          WORKFLOWS_MANAGEMENT_BASE_URI: 'https://management.azure.com/',
          SECRET_KEY: 'should-not-appear',
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
            expected: 'f11e76f5-6d71-4e8b-9571-9c5f147628ed',
            actual: 'f11e76f5-6d71-4e8b-9571-9c5f147628ed',
            status: 'valid',
          },
          WORKFLOWS_RESOURCE_GROUP_NAME: {
            expected: 'LogicAppsVSCode-E2E-Fixtures',
            actual: 'LogicAppsVSCode-E2E-Fixtures',
            status: 'valid',
          },
          WORKFLOWS_LOCATION_NAME: { expected: 'westus', actual: 'westus', status: 'valid' },
          WORKFLOWS_TENANT_ID: {
            expected: '72f988bf-86f1-41af-91ab-2d7cd011db47',
            actual: '72f988bf-86f1-41af-91ab-2d7cd011db47',
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
