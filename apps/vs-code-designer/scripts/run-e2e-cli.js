/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global __dirname, console, module, process, require, setTimeout */
const { execFileSync, spawn } = require('child_process');
const { Buffer } = require('buffer');
const { createHash } = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { URL } = require('url');

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
  /(access[_-]?token|account[_-]?key|api[_-]?key|authorization|authentication|azurewebjobsstorage|client[_-]?secret|connection[_-]?string|credential|password|sas|secret|sig|signature|token)/i;
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
  const lifecycleDir = path.resolve(__dirname, '..', '.vscode-test', 'nuget-conversion-lifecycle');
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
  const lifecycleDir = path.resolve(__dirname, '..', '.vscode-test', 'codeful-debug-tasks');
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

  await cleanupOwnedWorkspaceParent(workspaceParent, 'codeful debug task lifecycle');
}

async function runMsnWeatherLifecycle(visibleDelayMs) {
  ensureMsnWeatherProfile();
  const azureEnv = getMsnWeatherAzureEnv();
  const lifecycleDir = path.resolve(__dirname, '..', '.vscode-test', 'msn-weather-lifecycle');
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
      extraEnv: {
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
      },
    });

    lifecycleSucceeded = true;
  } finally {
    await cleanupOwnedWorkspaceParent(workspaceParent, 'MSN Weather lifecycle');
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
  const hasExplicitTargetValue = Boolean(
    explicitSubscriptionId || explicitTenantId || explicitResourceGroupName || explicitLocation || explicitManagementBaseUrl
  );
  if (!hasExplicitTargetValue && canUseInteractiveMsnWeatherAzureTargetEnv(process.env)) {
    console.log(
      '[workspace-lifecycle][msn-weather] Explicit local interactive Azure settings mode enabled; wrapper will not preseed Azure connector target env.'
    );
    return {};
  }
  const account = explicitSubscriptionId && explicitTenantId ? undefined : tryGetAzureCliAccount();
  const resourceGroupName = explicitResourceGroupName ?? tryGetAzureCliDefaultResourceGroup();
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
  const allow = env.LA_E2E_CLI_MSN_WEATHER_ALLOW_INTERACTIVE_AZURE_SETTINGS?.trim();
  if (!/^(1|true)$/i.test(allow ?? '')) {
    return false;
  }

  return !/^(1|true)$/i.test(env.CI ?? '') && !/^(1|true)$/i.test(env.TF_BUILD ?? '') && !/^(1|true)$/i.test(env.GITHUB_ACTIONS ?? '');
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
      let diagnosticsError;
      try {
        captureGeneratedWorkspaceDiagnostics({
          env: childEnv,
          label,
          outcome: code === 0 ? 'success' : 'failure',
          ownedRoots: [deferredWorkspaceParent].filter(Boolean),
        });
      } catch (error) {
        diagnosticsError = error;
        markOwnedWorkspaceParentsWithDiagnosticFailure(childEnv, [deferredWorkspaceParent].filter(Boolean));
        console.error(
          `[generated-workspace-diagnostics] Failed to capture generated workspace diagnostics; preserving owned workspace data: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
      await cleanupDeferredWorkspaceParent(deferredWorkspaceParent);
      collectVscodeProfileLogs(label, childEnv);

      if (diagnosticsError) {
        reject(diagnosticsError instanceof Error ? diagnosticsError : new Error(String(diagnosticsError)));
        return;
      }

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
    const reason = getNoGeneratedWorkspaceSnapshotReason({ env, label, trustedRootRecords });
    fs.writeFileSync(path.join(snapshotRoot, 'no-workspace-created.txt'), `${reason}\n`);
    skipped.push({ source: '<none>', reason });
  }

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
}

function getNoGeneratedWorkspaceSnapshotReason({ env, label, trustedRootRecords }) {
  if (label === 'createWorkspaceBehavior') {
    return [
      'createWorkspaceBehavior intentionally validates Create Workspace wizard content, field validation, review/back, and app-type cleanup without clicking Create.',
      'No generated Logic App project/workspace is expected for this label.',
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
  let redacted = content.replace(
    /((?:access[_-]?token|account[_-]?key|api[_-]?key|authorization|authentication|azurewebjobsstorage|client[_-]?secret|connection[_-]?string|credential|password|sas|secret|sig|signature|token)\s*[=:]\s*)("[^"]*"|'[^']*'|[^\s,;]+)/gi,
    '$1<redacted>'
  );
  redacted = redacted.replace(
    /((?:access[_-]?token|account[_-]?key|api[_-]?key|authorization|authentication|azurewebjobsstorage|client[_-]?secret|connection[_-]?string|credential|password|sas|secret|sig|signature|token)["']?\s*:\s*)("[^"]*"|'[^']*'|[^\s,}\]]+)/gi,
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
    canUseInteractiveMsnWeatherAzureTargetEnv,
    captureGeneratedWorkspaceDiagnostics,
    collectRuntimeDependencyDiagnostics,
    collectGeneratedWorkspaceSnapshotSources,
    cleanupOwnedWorkspaceParent,
    copyGeneratedWorkspaceSnapshot,
    copyAzureLogicAppsChannelLogs,
    createOwnedWorkspaceParent,
    createIsolatedRuntimeDependenciesRoot,
    findAzureLogicAppsChannelLogs,
    getMsnWeatherAzureTargetEnv,
    getNoGeneratedWorkspaceSnapshotReason,
    getGeneratedWorkspaceSnapshotRoot,
    getFuncCoreToolsCandidatePaths,
    getFuncCoreToolsBinaryPath,
    getWorkspaceSourcesFromManifestPath,
    safeReadDirectory,
    sanitizeEnvSegment,
    redactGeneratedWorkspaceJsonValue,
    redactGeneratedWorkspacePlainText,
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

function createOwnedWorkspaceParent(label) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `la-e2e-cli-${sanitizeEnvSegment(label)}-`));
  console.log(`[generated-workspace-diagnostics] Registered owned workspace parent: ${root}`);
  return root;
}

async function cleanupOwnedWorkspaceParent(workspaceParent, context) {
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
  }
}

async function cleanupDeferredWorkspaceParent(workspaceParent) {
  if (!workspaceParent) {
    return;
  }
  if (workspaceParentsWithDiagnosticFailures.has(path.resolve(workspaceParent))) {
    console.warn(
      `[generated-workspace-diagnostics] Preserving deferred workspace parent because diagnostics capture failed: ${workspaceParent}`
    );
    return;
  }

  await delay(1000);
  try {
    fs.rmSync(workspaceParent, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
  } catch (error) {
    console.warn(`[create-workspace-smoke] Unable to remove temp workspace parent after VS Code exit ${workspaceParent}: ${String(error)}`);
  }
}

function markOwnedWorkspaceParentsWithDiagnosticFailure(env, ownedRoots = []) {
  for (const root of [env.LA_E2E_CLI_WORKSPACE_PARENT, env.LA_E2E_CLI_CREATE_WORKSPACE_PARENT, ...ownedRoots].filter((candidate) =>
    candidate?.trim()
  )) {
    workspaceParentsWithDiagnosticFailures.add(path.resolve(root));
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
