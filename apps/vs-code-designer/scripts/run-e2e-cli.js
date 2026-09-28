/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global __dirname, console, module, process, require, setTimeout */
const { execFileSync, spawn } = require('child_process');
const { createHash } = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

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

if (require.main === module) {
  main();
}

function main() {
  const {
    args,
    azureAuthWarmup,
    codefulDebugTasks,
    createWorkspaceFull,
    msnWeatherLifecycle,
    nugetConversionLifecycle,
    visibleDelayMs,
    workspaceLifecycle,
  } = parseArgs(process.argv.slice(2));

  if (azureAuthWarmup) {
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
  const lifecycleDir = path.resolve(__dirname, '..', '.vscode-test', 'workspace-lifecycle');
  fs.mkdirSync(lifecycleDir, { recursive: true });
  const manifest = [];

  for (const label of ['standard', 'custom-code', 'rules-engine']) {
    const manifestPath = path.join(lifecycleDir, `manifest-${label}-${Date.now()}.json`);
    await runVscodeTest(['--label', 'workspaceLifecycle'], {
      visibleDelayMs,
      extraEnv: {
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

  if (process.env.LA_E2E_CLI_PRESERVE_WORKSPACES !== '1') {
    for (const entry of manifest) {
      try {
        fs.rmSync(entry.workspaceDir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`[workspace-lifecycle] Unable to remove temp workspace ${entry.workspaceDir}: ${String(error)}`);
      }
    }
  }
}

async function runNugetConversionLifecycle(visibleDelayMs) {
  const lifecycleDir = path.resolve(__dirname, '..', '.vscode-test', 'nuget-conversion-lifecycle');
  fs.mkdirSync(lifecycleDir, { recursive: true });
  const manifestPath = path.join(lifecycleDir, `manifest-standard-${Date.now()}.json`);
  await runVscodeTest(['--label', 'nugetConversionLifecycle'], {
    visibleDelayMs,
    extraEnv: {
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
      LA_E2E_CLI_INCLUDE_NUGET_CONVERSION_LIFECYCLE: '1',
      LA_E2E_CLI_USER_DATA_SUFFIX: `nuget-conversion-run-${Date.now()}`,
      LA_E2E_CLI_MINIMAL_ACTIVATION: '1',
      LA_E2E_CLI_SKIP_ACTIVATION_WORKSPACE_ENSURE: '1',
      LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE: 'nuget-run',
      LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE: JSON.stringify(entry),
      LA_E2E_CLI_STARTUP_RESOURCE: entry.appDir,
    },
  });

  if (process.env.LA_E2E_CLI_PRESERVE_WORKSPACES !== '1') {
    fs.rmSync(entry.workspaceDir, { recursive: true, force: true });
  }
}

async function runCodefulDebugTasks(visibleDelayMs) {
  ensureCSharpDevKitServerShim();
  const lifecycleDir = path.resolve(__dirname, '..', '.vscode-test', 'codeful-debug-tasks');
  fs.mkdirSync(lifecycleDir, { recursive: true });
  const manifest = [];

  for (const label of ['codeful-modern', 'codeful-legacy']) {
    const manifestPath = path.join(lifecycleDir, `manifest-${label}-${Date.now()}.json`);
    await runVscodeTest(['--label', 'codefulDebugTasks'], {
      visibleDelayMs,
      extraEnv: {
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
      extraEnv: {
        LA_E2E_CLI_INCLUDE_CODEFUL_DEBUG_TASKS: '1',
        LA_E2E_CLI_USER_DATA_SUFFIX: `codeful-debug-run-${sanitizeEnvSegment(entry.label)}-${Date.now()}`,
        LA_E2E_CLI_AUTO_START_DESIGN_TIME: '1',
        LA_E2E_CLI_VALIDATE_DEPENDENCIES: '1',
        LA_E2E_CLI_CODEFUL_EVIDENCE_NOT_BEFORE: String(Date.now() - 1000),
        LA_E2E_CLI_MINIMAL_ACTIVATION: '1',
        LA_E2E_CLI_SKIP_ACTIVATION_WORKSPACE_ENSURE: '1',
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE: 'codeful-run',
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE: JSON.stringify(entry),
        LA_E2E_CLI_STARTUP_RESOURCE: entry.workspaceFilePath,
      },
    });
  }

  if (process.env.LA_E2E_CLI_PRESERVE_WORKSPACES !== '1') {
    for (const entry of manifest) {
      fs.rmSync(entry.workspaceDir, { recursive: true, force: true });
    }
  }
}

async function runMsnWeatherLifecycle(visibleDelayMs) {
  ensureMsnWeatherProfile();
  const azureEnv = getMsnWeatherAzureEnv();
  const lifecycleDir = path.resolve(__dirname, '..', '.vscode-test', 'msn-weather-lifecycle');
  const lifecycleRunId = Date.now();
  const runtimeDependenciesRoot = createIsolatedRuntimeDependenciesRoot('msnWeatherLifecycle');
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
      extraEnv: {
        ...commonEnv,
        LA_E2E_CLI_INCLUDE_MSN_WEATHER_LIFECYCLE: '1',
        LA_E2E_CLI_MINIMAL_ACTIVATION: '1',
        LA_E2E_CLI_SKIP_ACTIVATION_WORKSPACE_ENSURE: '1',
        LA_E2E_CLI_PROFILE_PHASE: 'msn-weather-run',
        LA_E2E_CLI_USER_DATA_SUFFIX: `msn-weather-run-${lifecycleRunId}`,
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE: 'msn-weather-run',
        LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE: JSON.stringify(entry),
        LA_E2E_CLI_STARTUP_RESOURCE: entry.workspaceFilePath,
        ...azureEnv,
      },
    });

    lifecycleSucceeded = true;
    if (process.env.LA_E2E_CLI_PRESERVE_WORKSPACES !== '1') {
      fs.rmSync(entry.workspaceDir, { recursive: true, force: true });
    }
  } finally {
    if (lifecycleSucceeded && process.env.LA_E2E_CLI_PRESERVE_WORKSPACES !== '1') {
      await cleanupRuntimeDependenciesRoot(runtimeDependenciesRoot);
    }
  }
}

function ensureMsnWeatherProfile() {
  const hasHeadlessAzureAuth =
    !!process.env.LA_E2E_CLI_AZURE_ACCESS_TOKEN?.trim() ||
    !/^(false|0)?$/i.test(process.env.AzCode_UseAzureFederatedCredentials ?? '') ||
    !!process.env.FC_SERVICE_CONNECTION_ID?.trim() ||
    !!process.env.AzCode_ServiceConnectionID?.trim();
  if (hasHeadlessAzureAuth && !process.env.LA_E2E_CLI_USER_DATA_DIR?.trim()) {
    console.log('[workspace-lifecycle][msn-weather] Using per-phase VS Code profiles with headless Azure auth from environment.');
    return;
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
  const account = explicitSubscriptionId && explicitTenantId ? undefined : tryGetAzureCliAccount();
  const resourceGroupName = explicitResourceGroupName ?? tryGetAzureCliDefaultResourceGroup();
  const location = explicitLocation ?? 'westus';

  if (!(explicitSubscriptionId ?? account?.id) || !resourceGroupName || !location) {
    throw new Error(
      [
        'MSN Weather lifecycle needs Azure connector target settings before opening the designer.',
        'Set LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME, or configure an Azure CLI default group with:',
        "  az configure --defaults group='<resource-group-name>'",
        'The wrapper can auto-detect the Azure CLI subscription/tenant and defaults LA_E2E_CLI_AZURE_LOCATION_NAME to westus.',
      ].join('\n')
    );
  }

  const env = {
    LA_E2E_CLI_AZURE_SUBSCRIPTION_ID: explicitSubscriptionId ?? account.id,
    LA_E2E_CLI_AZURE_RESOURCE_GROUP_NAME: resourceGroupName,
    LA_E2E_CLI_AZURE_LOCATION_NAME: location,
  };

  const tenantId = explicitTenantId ?? account?.tenantId;
  if (tenantId) {
    env.LA_E2E_CLI_AZURE_TENANT_ID = tenantId;
  }

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

function getMsnWeatherAzureAuthEnv() {
  if (process.env.LA_E2E_CLI_AZURE_ACCESS_TOKEN?.trim()) {
    console.log('[workspace-lifecycle][msn-weather] Reusing LA_E2E_CLI_AZURE_ACCESS_TOKEN from the current shell.');
    return {};
  }

  if (process.env.LA_E2E_CLI_DISABLE_AZURE_CLI_TOKEN_FALLBACK === '1') {
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

  const extensionsDir = path.resolve(__dirname, '..', '.vscode-test', 'extensions');
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
  const deferredWorkspaceParent = getDeferredCreateWorkspaceParent(label);
  const outputFilter = createOutputFilter();
  const { command, commandArgs } = getVscodeTestCommand(args);
  const childEnv = {
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
  };
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
      await cleanupDeferredWorkspaceParent(deferredWorkspaceParent);
      collectVscodeProfileLogs(label, childEnv);

      const matchedPattern = forbiddenOutputPatterns.find(({ pattern }) => pattern.test(output));
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

function collectVscodeProfileLogs(label, env) {
  const userDataDir = getVscodeUserDataDir(env);
  const sourceLogsDir = path.join(userDataDir, 'logs');
  const logRoot = process.env.LA_E2E_CLI_VSCODE_LOG_DIR ?? path.resolve(__dirname, '..', '.vscode-test', 'vscode-logs', 'cli');
  const artifactLabel = env.LA_E2E_CLI_VSCODE_LOG_ARTIFACT_LABEL?.trim() || label || 'default';
  const profileName = sanitizeEnvSegment(
    [env.LA_E2E_CLI_PROFILE_PHASE, env.LA_E2E_CLI_USER_DATA_SUFFIX].filter((part) => part?.trim()).join('__') || 'default'
  );
  const destination = path.join(logRoot, sanitizeEnvSegment(artifactLabel), profileName);

  try {
    fs.rmSync(destination, { recursive: true, force: true });
    fs.mkdirSync(destination, { recursive: true });

    if (!fs.existsSync(sourceLogsDir)) {
      fs.writeFileSync(path.join(destination, 'no-vscode-profile-logs.txt'), `VS Code profile logs were not found at ${sourceLogsDir}\n`);
      console.warn(`[vscode-test-cli] VS Code profile logs not found: ${sourceLogsDir}`);
      return;
    }

    fs.cpSync(sourceLogsDir, path.join(destination, 'logs'), { recursive: true, force: true });
    const channelLogs = copyAzureLogicAppsChannelLogs(sourceLogsDir, destination);
    writeVscodeProfileLogIndex(destination, {
      label: label ?? 'default',
      phase: env.LA_E2E_CLI_PROFILE_PHASE ?? '',
      userDataSuffix: env.LA_E2E_CLI_USER_DATA_SUFFIX ?? '',
      sourceLogsDir,
      userDataDir,
      channelLogs,
      expectAzureLogicAppsChannel: env.LA_E2E_CLI_EXPECT_AZURE_LOGIC_APPS_CHANNEL === '1',
    });
    console.log(`[vscode-test-cli] Captured VS Code profile logs: ${sourceLogsDir} -> ${destination}`);
  } catch (error) {
    console.warn(`[vscode-test-cli] Unable to capture VS Code profile logs from ${sourceLogsDir}: ${String(error)}`);
  }
}

function copyAzureLogicAppsChannelLogs(sourceLogsDir, destination) {
  const channelLogs = findAzureLogicAppsChannelLogs(sourceLogsDir);
  const channelDestination = path.join(destination, 'azure-logic-apps-channel');
  fs.mkdirSync(channelDestination, { recursive: true });

  for (const [index, source] of channelLogs.entries()) {
    const relativeSource = path.relative(sourceLogsDir, source);
    const destinationName = `${String(index + 1).padStart(2, '0')}-${sanitizeEnvSegment(relativeSource)}.log`;
    fs.copyFileSync(source, path.join(channelDestination, destinationName));
  }

  if (channelLogs.length === 0) {
    fs.writeFileSync(
      path.join(channelDestination, 'missing-azure-logic-apps-channel.txt'),
      `No Azure Logic Apps (Standard) output-channel logs were found under ${sourceLogsDir}\n`
    );
  }

  return channelLogs.map((source) => path.relative(sourceLogsDir, source));
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
    collectRuntimeDependencyDiagnostics,
    copyAzureLogicAppsChannelLogs,
    createIsolatedRuntimeDependenciesRoot,
    findAzureLogicAppsChannelLogs,
    getFuncCoreToolsCandidatePaths,
    getFuncCoreToolsBinaryPath,
    safeReadDirectory,
    sanitizeEnvSegment,
    verifyFuncCoreToolsAtDependencyRoot,
    walkFiles,
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
  let azureAuthWarmup = false;

  for (let index = 0; index < rawArgs.length; index++) {
    const arg = rawArgs[index];
    if (arg === '--visible-delay-ms') {
      visibleDelayMs = rawArgs[index + 1];
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

  return fs.mkdtempSync(path.join(os.tmpdir(), 'la-e2e-cli-create-workspace-'));
}

async function cleanupDeferredWorkspaceParent(workspaceParent) {
  if (!workspaceParent) {
    return;
  }

  await delay(1000);
  try {
    fs.rmSync(workspaceParent, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
  } catch (error) {
    console.warn(`[create-workspace-smoke] Unable to remove temp workspace parent after VS Code exit ${workspaceParent}: ${String(error)}`);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
