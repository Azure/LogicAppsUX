/* global console, process, require */
const assert = require('assert');
const { Buffer } = require('buffer');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  _test: {
    collectRuntimeDependencyDiagnostics,
    canUseInteractiveMsnWeatherAzureTargetEnv,
    captureGeneratedWorkspaceDiagnostics,
    collectGeneratedWorkspaceSnapshotSources,
    copyGeneratedWorkspaceSnapshot,
    copyAzureLogicAppsChannelLogs,
    createIsolatedRuntimeDependenciesRoot,
    findAzureLogicAppsChannelLogs,
    getFuncCoreToolsCandidatePaths,
    getFuncCoreToolsBinaryPath,
    getMsnWeatherAzureTargetEnv,
    getWorkspaceSourcesFromManifestPath,
    redactGeneratedWorkspaceJsonValue,
    redactGeneratedWorkspacePlainText,
    verifyFuncCoreToolsAtDependencyRoot,
    writeVscodeProfileLogIndex,
  },
} = require('./run-e2e-cli.js');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'run-e2e-cli-unit-'));

try {
  testCreatesEmptyIsolatedDependencyRoot();
  testFailFastMissingFuncDiagnostics();
  testFailFastMissingInProc8Diagnostics();
  testCopiesAzureLogicAppsChannelLogs();
  testGeneratedWorkspaceSnapshotCopiesUsefulRedactedTree();
  testGeneratedWorkspaceSnapshotRedactsNestedSecrets();
  testGeneratedWorkspaceSnapshotOmitsUnsafeFormats();
  testGeneratedWorkspaceSnapshotRejectsUnownedManifestSources();
  testGeneratedWorkspaceSnapshotRejectsSymlinkRoots();
  testGeneratedWorkspaceSnapshotOmitsUnparseableJsonWithArbitrarySecrets();
  testGeneratedWorkspaceSnapshotHandlesOwnedRootFiles();
  testGeneratedWorkspaceSnapshotFallsBackToOwnedRootForPartialManifest();
  testGeneratedWorkspaceSnapshotSourcesSupportLifecycleAndManifestShapes();
  testGeneratedWorkspaceSnapshotWritesNoWorkspaceMarker();
  testGeneratedWorkspaceSnapshotWritesNoWorkspaceMarkerForSmokeLabels();
  testMsnWeatherTargetEnvAllowsLocalInteractiveMode();
  testMsnWeatherTargetEnvBlocksInteractiveModeInCi();
  console.log('[run-e2e-cli.unit] all tests passed');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
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
  fs.writeFileSync(channelLog, 'bundle healthy\nfunc not found\n');

  const profileDestination = path.join(tempRoot, 'profile-destination');
  fs.mkdirSync(profileDestination, { recursive: true });

  const discovered = findAzureLogicAppsChannelLogs(logsRoot);
  assert.deepStrictEqual(discovered, [channelLog]);

  const copied = copyAzureLogicAppsChannelLogs(logsRoot, profileDestination);
  assert.deepStrictEqual(copied, [path.relative(logsRoot, channelLog)]);
  assert.ok(
    fs.readdirSync(path.join(profileDestination, 'azure-logic-apps-channel')).some((name) => name.endsWith('.log')),
    'channel log should be copied to top-level channel directory'
  );

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
