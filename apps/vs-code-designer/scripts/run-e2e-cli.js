/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global __dirname, console, process, require, setTimeout */
const { execFileSync, spawn } = require('child_process');
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
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
} else if (createWorkspaceFull) {
  runCreateWorkspaceFull(visibleDelayMs).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
} else if (nugetConversionLifecycle) {
  runNugetConversionLifecycle(visibleDelayMs).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
} else if (codefulDebugTasks) {
  runCodefulDebugTasks(visibleDelayMs).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
} else if (msnWeatherLifecycle) {
  runMsnWeatherLifecycle(visibleDelayMs).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
} else if (workspaceLifecycle) {
  runWorkspaceLifecycle(visibleDelayMs).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
} else if (args.length === 0) {
  runDefaultBaseline(visibleDelayMs).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
} else {
  runVscodeTest(args, { visibleDelayMs })
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}

async function runCreateWorkspaceFull(visibleDelayMs) {
  for (const label of ['createWorkspaceBehavior', 'createWorkspaceCoreMatrix', 'createWorkspacePreviewMatrix', 'createWorkspaceCodeful']) {
    await runVscodeTest(['--label', label], { visibleDelayMs });
  }
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
  fs.mkdirSync(lifecycleDir, { recursive: true });
  const manifestPath = path.join(lifecycleDir, `manifest-standard-${Date.now()}.json`);
  await runVscodeTest(['--label', 'msnWeatherLifecycle'], {
    visibleDelayMs,
    extraEnv: {
      LA_E2E_CLI_INCLUDE_MSN_WEATHER_LIFECYCLE: '1',
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
      LA_E2E_CLI_INCLUDE_MSN_WEATHER_LIFECYCLE: '1',
      LA_E2E_CLI_MINIMAL_ACTIVATION: '1',
      LA_E2E_CLI_SKIP_ACTIVATION_WORKSPACE_ENSURE: '1',
      LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE: 'msn-weather-run',
      LA_E2E_CLI_WORKSPACE_LIFECYCLE_CASE: JSON.stringify(entry),
      LA_E2E_CLI_STARTUP_RESOURCE: entry.appDir,
      ...azureEnv,
    },
  });

  if (process.env.LA_E2E_CLI_PRESERVE_WORKSPACES !== '1') {
    fs.rmSync(entry.workspaceDir, { recursive: true, force: true });
  }
}

function ensureMsnWeatherProfile() {
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

function runVscodeTest(args, options = {}) {
  const userDataSuffix = process.env.LA_E2E_CLI_USER_DATA_SUFFIX ?? `run-${Date.now()}-${process.pid}`;
  const label = getLabelArg(args);
  const deferredWorkspaceParent = getDeferredCreateWorkspaceParent(label);
  const outputFilter = createOutputFilter();
  const { command, commandArgs } = getVscodeTestCommand(args);
  const child = spawn(command, commandArgs, {
    env: {
      ...process.env,
      LA_E2E_CLI_USER_DATA_SUFFIX: userDataSuffix,
      ...(options.visibleDelayMs ? { LA_E2E_CLI_VISIBLE_DELAY_MS: options.visibleDelayMs } : {}),
      ...(deferredWorkspaceParent
        ? {
            LA_E2E_CLI_CREATE_WORKSPACE_PARENT: deferredWorkspaceParent,
            LA_E2E_CLI_DEFER_WORKSPACE_CLEANUP: '1',
          }
        : {}),
      ...(options.extraEnv ?? {}),
    },
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
    child.on('close', async (code) => {
      const remainingOutput = outputFilter.flush();
      if (remainingOutput) {
        process.stdout.write(remainingOutput);
      }
      await cleanupDeferredWorkspaceParent(deferredWorkspaceParent);

      const matchedPattern = forbiddenOutputPatterns.find(({ pattern }) => pattern.test(output));
      if (matchedPattern) {
        reject(new Error(`\n[activation-smoke] Failed because VS Code output contained: ${matchedPattern.name}`));
        return;
      }
      if (code && code !== 0) {
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
