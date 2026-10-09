import { defineConfig } from '@vscode/test-cli';
import { createHash } from 'crypto';
import * as fs from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const checkoutHash = createHash('sha1').update(__dirname).digest('hex').slice(0, 8);
const remoteDebuggingPort =
  process.env.LA_E2E_CLI_REMOTE_DEBUGGING_PORT ?? String(9200 + (Number.parseInt(checkoutHash.slice(0, 4), 16) % 500));
const userDataSuffix = process.env.LA_E2E_CLI_USER_DATA_SUFFIX;
const nonWindowsUserDataSuffix = userDataSuffix ?? String(process.pid);
const userDataDirOverride = process.env.LA_E2E_CLI_USER_DATA_DIR;
const userDataParent = process.env.LA_E2E_CLI_USER_DATA_PARENT;
const userDataDir =
  userDataDirOverride ??
  (userDataParent ? path.join(userDataParent, userDataSuffix ? `user-data-${userDataSuffix}` : `user-data-${process.pid}`) : undefined) ??
  (process.platform === 'win32'
    ? path.join(__dirname, '.vscode-test', userDataSuffix ? `user-data-${userDataSuffix}` : 'user-data')
    : path.join(tmpdir(), `la-vscode-test-${checkoutHash}-${nonWindowsUserDataSuffix}`));
const extensionDevelopmentPath = path.join(__dirname, 'dist');
const startupResource = process.env.LA_E2E_CLI_STARTUP_RESOURCE;
const extensionsDir = process.env.LA_E2E_CLI_EXTENSIONS_DIR;
const includeWorkspaceLifecycle = process.env.LA_E2E_CLI_INCLUDE_WORKSPACE_LIFECYCLE === '1' || process.argv.includes('workspaceLifecycle');
const includeNugetConversionLifecycle =
  process.env.LA_E2E_CLI_INCLUDE_NUGET_CONVERSION_LIFECYCLE === '1' || process.argv.includes('nugetConversionLifecycle');
const includeCodefulDebugTasks = process.env.LA_E2E_CLI_INCLUDE_CODEFUL_DEBUG_TASKS === '1' || process.argv.includes('codefulDebugTasks');
const includeMsnWeatherLifecycle =
  process.env.LA_E2E_CLI_INCLUDE_MSN_WEATHER_LIFECYCLE === '1' || process.argv.includes('msnWeatherLifecycle');
const includeRuntimeDependencyBootstrap =
  process.env.LA_E2E_CLI_INCLUDE_RUNTIME_DEPENDENCY_BOOTSTRAP === '1' || process.argv.includes('runtimeDependencyBootstrap');
const includeAzureAuthWarmup = process.env.LA_E2E_CLI_INCLUDE_AZURE_AUTH_WARMUP === '1' || process.argv.includes('azureAuthWarmup');
const httpTimeoutRequestMode = process.env.LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MODE;
const includeHttpTimeoutRequestLifecycle =
  (process.env.LA_E2E_CLI_INCLUDE_HTTP_TIMEOUT_REQUEST_LIFECYCLE === '1' || process.argv.includes('httpTimeoutLifecycle')) &&
  (httpTimeoutRequestMode === 'create' || httpTimeoutRequestMode === 'run');
const includeStatelessVariables =
  process.env.LA_E2E_CLI_INCLUDE_STATELESS_VARIABLES === '1' || process.argv.includes('statelessVariablesLifecycle');
const includeNativeEditorClick = process.env.LA_E2E_CLI_INCLUDE_NATIVE_EDITOR_CLICK === '1' || process.argv.includes('nativeEditorClick');
const nativeEditorClickWorkspace = path.join(__dirname, 'scripts', 'fixtures', 'native-editor-click');
const vscodeVersion = process.env.LA_E2E_CLI_VSCODE_VERSION || 'stable';
const dependencyRoot =
  process.env.LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT ??
  (process.env.LA_E2E_CLI_BATCH_MODE === '1'
    ? failBatchRuntimeDependencyRoot()
    : path.join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.azurelogicapps', 'dependencies'));
const dotnetExecutablePath = findExecutable('dotnet') ?? 'dotnet';

prepareUserSettings(userDataDir);

const baseConfig = {
  version: vscodeVersion,
  extensionDevelopmentPath,
  ...(startupResource ? { workspaceFolder: startupResource } : {}),
  env: {
    VSCODE_RUNNING_TESTS: '1',
    DEBUGTELEMETRY: '1',
    LA_E2E_CLI_VISIBLE_DELAY_MS: process.env.LA_E2E_CLI_VISIBLE_DELAY_MS ?? '0',
    LA_E2E_CLI_REMOTE_DEBUGGING_PORT: remoteDebuggingPort,
    LA_E2E_CLI_USER_DATA_DIR: userDataDir,
    ...getForwardedTestEnvironment(),
  },
  launchArgs: [
    '--user-data-dir',
    userDataDir,
    '--disable-gpu',
    '--disable-updates',
    '--disable-restore-windows',
    '--disable-workspace-trust',
    '--skip-welcome',
    '--skip-release-notes',
    '--locale=en-US',
    '--window-size=1920,1080',
    `--remote-debugging-port=${remoteDebuggingPort}`,
    '--remote-debugging-address=127.0.0.1',
    ...(extensionsDir ? ['--extensions-dir', extensionsDir] : []),
  ],
  ...(extensionsDir ? { skipExtensionDependencies: true } : {}),
};

const configs = [
  {
    label: 'unitTests',
    ...baseConfig,
    files: ['out/test/e2e/extension.test.js', 'out/test/e2e/commands.test.js'],
    mocha: {
      ui: 'tdd',
      timeout: 120000,
    },
  },
  {
    label: 'createWorkspace',
    ...createWorkspaceConfig('default', 600000),
  },
  {
    label: 'createWorkspaceBehavior',
    ...createWorkspaceConfig('behavior', 240000),
  },
  {
    label: 'createWorkspaceBehaviorSmoke',
    ...createWorkspaceConfig('behavior-smoke', 240000),
  },
  {
    label: 'createWorkspaceCoreMatrix',
    ...createWorkspaceConfig('core-matrix', 900000),
  },
  {
    label: 'createWorkspacePreviewMatrix',
    ...createWorkspaceConfig('preview-matrix', 900000),
  },
  {
    label: 'createWorkspaceCodeful',
    ...createWorkspaceConfig('codeful', 600000),
  },
  {
    label: 'createWorkspaceFixturesManifest',
    ...createWorkspaceConfig('fixtures-manifest', 700000, {
      LA_E2E_CLI_CREATE_WORKSPACE_FIXTURE_MANIFEST:
        process.env.LA_E2E_CLI_CREATE_WORKSPACE_FIXTURE_MANIFEST ?? path.join(tmpdir(), 'la-e2e-test', 'created-workspaces.json'),
    }),
  },
];

if (includeStatelessVariables) {
  configs.push({
    label: 'statelessVariablesLifecycle',
    ...baseConfig,
    files: ['out/test/e2e/statelessVariablesLifecycle.test.js'],
    mocha: {
      ui: 'tdd',
      timeout: 1500000,
    },
  });
}

if (includeNativeEditorClick) {
  configs.push({
    label: 'nativeEditorClick',
    ...baseConfig,
    workspaceFolder: nativeEditorClickWorkspace,
    files: ['out/test/e2e/nativeEditorClick.test.js'],
    mocha: {
      ui: 'tdd',
      timeout: 120000,
    },
  });
}

if (includeWorkspaceLifecycle) {
  configs.push({
    label: 'workspaceLifecycle',
    ...baseConfig,
    files: ['out/test/e2e/workspaceLifecycle.test.js'],
    mocha: {
      ui: 'tdd',
      timeout: 1200000,
    },
  });
}

if (includeHttpTimeoutRequestLifecycle) {
  configs.push({
    label: 'httpTimeoutLifecycle',
    ...baseConfig,
    files: ['out/test/e2e/httpTimeoutComposeOriginal.test.js'],
    mocha: { ui: 'tdd', timeout: 1200000 },
  });
}

if (includeNugetConversionLifecycle) {
  configs.push({
    label: 'nugetConversionLifecycle',
    ...baseConfig,
    files: ['out/test/e2e/workspaceLifecycle.test.js'],
    mocha: {
      ui: 'tdd',
      timeout: 1800000,
    },
  });
}

if (includeCodefulDebugTasks) {
  configs.push({
    label: 'codefulDebugTasks',
    ...baseConfig,
    files: ['out/test/e2e/workspaceLifecycle.test.js'],
    mocha: {
      ui: 'tdd',
      timeout: 1800000,
    },
  });
}

if (includeMsnWeatherLifecycle) {
  configs.push({
    label: 'msnWeatherLifecycle',
    ...baseConfig,
    files: ['out/test/e2e/workspaceLifecycle.test.js'],
    mocha: {
      ui: 'tdd',
      timeout: 1800000,
    },
  });
}

if (includeRuntimeDependencyBootstrap) {
  configs.push({
    label: 'runtimeDependencyBootstrap',
    ...baseConfig,
    files: ['out/test/e2e/runtimeDependencyBootstrap.test.js'],
    mocha: {
      ui: 'tdd',
      timeout: 600000,
    },
  });
}

if (includeAzureAuthWarmup) {
  configs.push({
    label: 'azureAuthWarmup',
    ...baseConfig,
    files: ['out/test/e2e/azureAuthWarmup.test.js'],
    mocha: {
      ui: 'tdd',
      timeout: 300000,
    },
  });
}

export default defineConfig(configs);

function createWorkspaceConfig(group, timeout, extraEnv = {}) {
  return {
    ...baseConfig,
    env: {
      ...baseConfig.env,
      LA_E2E_CLI_CREATE_WORKSPACE_GROUP: group,
      ...extraEnv,
    },
    files: ['out/test/e2e/createWorkspace.test.js'],
    mocha: {
      ui: 'tdd',
      timeout,
    },
  };
}

function getForwardedTestEnvironment() {
  const names = [
    'LA_E2E_CLI_STATELESS_VARIABLES_MODE',
    'LA_E2E_CLI_WORKSPACE_PARENT',
    'LA_E2E_CLI_MSN_LIFECYCLE_INVOCATION',
    'LA_E2E_CLI_MSN_DIAGNOSTICS_DIR',
    'LA_E2E_CLI_DISABLE_UNOWNED_PORT_KILL',
    'LA_E2E_CLI_WORKSPACE_LIFECYCLE_MANIFEST',
    'LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE',
    'LA_E2E_CLI_AZURE_ACCESS_TOKEN',
    'LA_E2E_CLI_AZURE_CLIENT_ID',
    'LA_E2E_CLI_AZURE_TENANT_ID',
    'LA_E2E_CLI_AZURE_SUBSCRIPTION_ID',
    'LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME',
    'LA_E2E_CLI_AZURE_LOCATION_NAME',
    'LA_E2E_CLI_AZURE_MANAGEMENT_BASE_URL',
    'LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT',
    'LA_E2E_CLI_CREATE_WORKSPACE_FIXTURE_MANIFEST',
    'LA_E2E_CLI_CREATE_WORKSPACE_PARENT',
    'LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MANIFEST',
    'LA_E2E_CLI_HTTP_TIMEOUT_REQUEST_MODE',
    'LA_E2E_CLI_CANCEL_HANDOFF_PATH',
    'LA_E2E_CLI_CANCEL_CONTEXT',
    'LA_E2E_CLI_MULTI_ROOT_HANDOFF',
    'LA_E2E_CLI_MULTI_ROOT_CONTEXT',
    'LA_E2E_CLI_MULTI_ROOT_BOOTSTRAP_CONTEXT',
    'LA_E2E_CLI_MULTI_ROOT_BOOTSTRAP_ATTESTATION',
    'LA_E2E_CLI_EXTENSIONS_DIR',
    'LA_E2E_CLI_EXPECT_EMPTY_RUNTIME_DEPENDENCIES_ROOT',
    'LA_E2E_CLI_EMPTY_RUNTIME_DEPENDENCIES_ROOT_CONFIRMED',
    'LA_E2E_CLI_VALIDATE_DEPENDENCIES',
    'LA_E2E_CLI_PROFILE_PHASE',
    'LA_E2E_STRICT_DEPENDENCY_VALIDATION',
    'WORKFLOWS_TENANT_ID',
    'WORKFLOWS_SUBSCRIPTION_ID',
    'WORKFLOWS_RESOURCE_GROUP_NAME',
    'WORKFLOWS_LOCATION_NAME',
    'WORKFLOWS_MANAGEMENT_BASE_URI',
  ];
  return Object.fromEntries(names.flatMap((name) => (process.env[name] ? [[name, process.env[name]]] : [])));
}

function failBatchRuntimeDependencyRoot() {
  throw new Error(
    'LA_E2E_CLI_RUNTIME_DEPENDENCIES_ROOT is required in --suites batch mode; refusing to fall back to the user home dependency cache.'
  );
}

function prepareUserSettings(userDataPath) {
  const userSettingsPath = path.join(userDataPath, 'User', 'settings.json');
  fs.mkdirSync(path.dirname(userSettingsPath), { recursive: true });
  fs.writeFileSync(
    userSettingsPath,
    `${JSON.stringify(
      {
        'azureLogicAppsStandard.autoRuntimeDependenciesValidationAndInstallation': process.env.LA_E2E_CLI_VALIDATE_DEPENDENCIES === '1',
        'azureLogicAppsStandard.e2eStrictDependencyValidation': process.env.LA_E2E_STRICT_DEPENDENCY_VALIDATION === '1',
        'azureLogicAppsStandard.validateDotNetSDK': false,
        'azureLogicAppsStandard.autoRuntimeDependenciesPath': dependencyRoot,
        'azureLogicAppsStandard.funcCoreToolsBinaryPath': path.join(
          dependencyRoot,
          'FuncCoreTools',
          process.platform === 'win32' ? 'func.exe' : 'func'
        ),
        'azureLogicAppsStandard.dotnetBinaryPath': dotnetExecutablePath,
        'azureLogicAppsStandard.nodeJsBinaryPath': findExecutable('node') ?? 'node',
        'azureLogicAppsStandard.autoStartDesignTime': process.env.LA_E2E_CLI_AUTO_START_DESIGN_TIME === '1',
        'azureLogicAppsStandard.autoStartAzurite': true,
        'azureLogicAppsStandard.azuriteLocationSetting': path.join(userDataPath, 'azurite'),
        'azureLogicAppsStandard.silentAuth': true,
        'azurite.location': path.join(userDataPath, 'azurite'),
        'azureLogicAppsStandard.parameterizeConnectionsInProjectLoad': false,
        'azureLogicAppsStandard.enableManagedIdentityAuth': false,
        'dotnetAcquisitionExtension.sharedExistingDotnetPath': dotnetExecutablePath,
        'dotnetAcquisitionExtension.existingDotnetPath': [
          { extensionId: 'ms-dotnettools.csharp', path: dotnetExecutablePath },
          { extensionId: 'ms-dotnettools.csdevkit', path: dotnetExecutablePath },
          { extensionId: 'ms-azuretools.vscode-azurefunctions', path: dotnetExecutablePath },
          { extensionId: 'ms-azuretools.vscode-azurelogicapps', path: dotnetExecutablePath },
        ],
        'telemetry.telemetryLevel': 'off',
        'update.mode': 'none',
      },
      null,
      2
    )}\n`
  );
}

function findExecutable(command) {
  const pathEnv = process.env.PATH ?? '';
  const extensions = process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : [''];
  for (const directory of pathEnv.split(path.delimiter)) {
    for (const extension of extensions) {
      const candidate = path.join(directory, `${command}${extension}`);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return undefined;
}
