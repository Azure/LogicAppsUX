/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global __dirname, console, process, require */
const { spawn, spawnSync } = require('child_process');
const { createHash } = require('crypto');
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs');
const { tmpdir } = require('os');
const { join } = require('path');
const { downloadAndUnzipVSCode, resolveCliPathFromVSCodeExecutablePath } = require('@vscode/test-electron');

const extensionRoot = join(__dirname, '..');
const checkoutHash = createHash('sha1').update(extensionRoot).digest('hex').slice(0, 8);
const distPath = join(extensionRoot, 'dist');
const visibleStateRoot = join(extensionRoot, '.vscode-test', 'visible');
const useAzureAuthProfile = process.argv.includes('--azure-auth-profile');
const warmAzureAuth = process.argv.includes('--warm-azure-auth');
const userDataSuffix = process.env.LA_E2E_CLI_USER_DATA_SUFFIX;
const userDataDirOverride = process.env.LA_E2E_CLI_USER_DATA_DIR;
const visibleRunRoot = join(visibleStateRoot, userDataSuffix ? `profile-${userDataSuffix}` : `run-${process.pid}-${Date.now()}`);
const userDataDir =
  userDataDirOverride ??
  (useAzureAuthProfile ? join(extensionRoot, '.vscode-test', 'local-azure-auth', 'user-data') : undefined) ??
  (process.platform === 'win32'
    ? userDataSuffix
      ? join(extensionRoot, '.vscode-test', `user-data-${userDataSuffix}`)
      : join(visibleRunRoot, 'user-data')
    : join(tmpdir(), `la-vscode-visible-${checkoutHash}${userDataSuffix ? `-${userDataSuffix}` : `-${process.pid}`}`));
const extensionsDir = join(visibleStateRoot, 'extensions');
const activationNotesPath = join(visibleRunRoot, 'activation-check.md');

async function main() {
  if (!existsSync(distPath)) {
    console.error(`Extension dist folder does not exist: ${distPath}`);
    process.exit(1);
  }

  const extensionPackageJson = readExtensionPackageJson();

  prepareUserSettings(userDataDir);
  writeActivationNotes(extensionPackageJson);

  console.log('Downloading or reusing latest stable VS Code for the visible activation check...');
  const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');
  const cliPath = resolveCliPathFromVSCodeExecutablePath(vscodeExecutablePath);
  const version = runCodeCli(cliPath, ['--version'], { allowFailure: false }).stdout.split(/\r?\n/)[0]?.trim();

  installExtensionDependencies(cliPath, extensionPackageJson);
  logInstalledExtensions(cliPath);
  const authWarmupExtensionPath = warmAzureAuth ? prepareAuthWarmupExtension() : undefined;

  const launchArgs = [
    `--user-data-dir=${userDataDir}`,
    `--extensions-dir=${extensionsDir}`,
    `--extensionDevelopmentPath=${authWarmupExtensionPath ?? distPath}`,
    '--disable-workspace-trust',
    '--disable-updates',
    '--skip-welcome',
    '--skip-release-notes',
    '--locale=en-US',
    '--new-window',
    activationNotesPath,
  ];

  const child = spawn(cliPath, launchArgs, {
    detached: true,
    env: {
      ...process.env,
      VSCODE_RUNNING_TESTS: '1',
      DEBUGTELEMETRY: '1',
    },
    shell: process.platform === 'win32',
    stdio: 'ignore',
  });
  child.unref();

  console.log(`Launched VS Code ${version || 'stable'} from: ${vscodeExecutablePath}`);
  console.log(`User data dir: ${userDataDir}`);
  if (authWarmupExtensionPath) {
    console.log(`Extension development path: ${authWarmupExtensionPath}`);
    console.log(`Azure auth warm-up extension path: ${authWarmupExtensionPath}`);
    console.log('Complete the VS Code Microsoft sign-in prompt in the opened window, then close the window normally.');
  } else {
    console.log(`Extension development path: ${distPath}`);
    console.log('In the VS Code window, run "Developer: Show Running Extensions" and look for "Azure Logic Apps (Standard)".');
    console.log('Run "Extensions: Show Installed Extensions" to confirm the dependency extensions are installed in the test profile.');
  }
  console.log('Workspace: none (empty VS Code window)');
}

function installExtensionDependencies(cliPath, packageJson) {
  const extensionDependencies = packageJson.extensionDependencies ?? [];

  if (!extensionDependencies.length) {
    return;
  }

  mkdirSync(extensionsDir, { recursive: true });
  for (const extensionId of extensionDependencies) {
    console.log(`Installing extension dependency into visible test profile: ${extensionId}`);
    runCodeCli(cliPath, [`--extensions-dir=${extensionsDir}`, '--install-extension', extensionId, '--force'], { allowFailure: false });
  }
}

function prepareAuthWarmupExtension() {
  const warmupRoot = join(extensionRoot, '.vscode-test', 'auth-warmup-extension');
  mkdirSync(warmupRoot, { recursive: true });
  writeFileSync(
    join(warmupRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: 'logic-apps-e2e-azure-auth-warmup',
        publisher: 'ms-azuretools',
        version: '0.0.0',
        engines: {
          vscode: '^1.104.0',
        },
        activationEvents: ['onStartupFinished'],
        main: './extension.js',
      },
      null,
      2
    )}\n`
  );
  writeFileSync(
    join(warmupRoot, 'extension.js'),
    `'use strict';
const vscode = require('vscode');

function normalizeScope(resourceOrScope) {
  if (resourceOrScope.endsWith('.default')) {
    return resourceOrScope;
  }
  return \`\${resourceOrScope.endsWith('/') ? resourceOrScope : \`\${resourceOrScope}/\`}.default\`;
}

async function activate() {
  const output = vscode.window.createOutputChannel('Logic Apps E2E Azure Auth Warm-up');
  output.show(true);
  output.appendLine('[azure-auth-warmup] Requesting VS Code Microsoft authentication session...');
  const tenantId = process.env.LA_E2E_CLI_AUTH_WARMUP_TENANT_ID || process.env.LA_E2E_CLI_AZURE_TENANT_ID;
  const scopes = [normalizeScope(process.env.LA_E2E_CLI_AUTH_WARMUP_SCOPE || 'https://management.core.windows.net')];
  if (tenantId) {
    scopes.push(\`VSCODE_TENANT:\${tenantId}\`);
  }

  try {
    const session = await vscode.authentication.getSession('microsoft', scopes, { createIfNone: true });
    output.appendLine(\`[azure-auth-warmup] Session ready for \${session.account.label || session.account.id}\`);
    output.appendLine(\`[azure-auth-warmup] Scopes: \${scopes.join(', ')}\`);
    vscode.window.showInformationMessage('Azure auth warm-up completed for the Logic Apps test profile.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(\`[azure-auth-warmup] Failed: \${message}\`);
    vscode.window.showErrorMessage(\`Azure auth warm-up failed: \${message}\`);
  }
}

function deactivate() {}

module.exports = { activate, deactivate };
`
  );
  return warmupRoot;
}

function logInstalledExtensions(cliPath) {
  console.log('Installed extensions in visible test profile:');
  runCodeCli(cliPath, [`--extensions-dir=${extensionsDir}`, '--list-extensions', '--show-versions'], { allowFailure: false });
}

function prepareUserSettings(userDataPath) {
  const userSettingsPath = join(userDataPath, 'User', 'settings.json');
  mkdirSync(join(userDataPath, 'User'), { recursive: true });
  writeFileSync(
    userSettingsPath,
    `${JSON.stringify(
      {
        'azureLogicAppsStandard.autoRuntimeDependenciesValidationAndInstallation': false,
        'azureLogicAppsStandard.autoStartDesignTime': false,
        'azureLogicAppsStandard.parameterizeConnectionsInProjectLoad': false,
        'azureLogicAppsStandard.enableManagedIdentityAuth': false,
        'telemetry.telemetryLevel': 'off',
        'update.mode': 'none',
      },
      null,
      2
    )}\n`
  );
}

function writeActivationNotes(packageJson) {
  mkdirSync(visibleRunRoot, { recursive: true });
  const extensionDependencies = packageJson.extensionDependencies ?? [];
  writeFileSync(
    activationNotesPath,
    [
      '# Logic Apps @vscode/test-cli activation check',
      '',
      'This window was launched by `pnpm run test:e2e-cli:open` against latest stable VS Code.',
      '',
      'To confirm activation visually:',
      '',
      '1. Open the Command Palette.',
      '2. Run `Developer: Show Running Extensions`.',
      '3. Confirm `Azure Logic Apps (Standard)` appears as an activated extension.',
      `4. Confirm its extension path is \`${distPath}\` so you know the locally built development extension loaded.`,
      '5. Search the Command Palette for `Azure Logic Apps` commands, such as `Create new project...`.',
      '6. Run `Azure Logic Apps: Create new logic app workspace...` to open the Create Workspace experience manually.',
      '',
      'This window intentionally starts without a folder or `.code-workspace` loaded. The Create Workspace flow should be the first project/workspace entry point.',
      '',
      'To confirm extension dependencies are installed:',
      '',
      '1. Open the Command Palette.',
      '2. Run `Extensions: Show Installed Extensions`.',
      '3. Confirm these manifest dependencies are present:',
      '',
      ...extensionDependencies.map((extensionId) => `- \`${extensionId}\``),
      '',
      'The window uses the same isolated test environment variables as the automated smoke:',
      '',
      '- `VSCODE_RUNNING_TESTS=1`',
      '- `DEBUGTELEMETRY=1`',
    ].join('\n')
  );
}

function readExtensionPackageJson() {
  const packageJsonPath = join(distPath, 'package.json');
  return JSON.parse(readFileSync(packageJsonPath, 'utf8'));
}

function runCodeCli(cliPath, args, options) {
  const result = spawnSync(cliPath, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (!options.allowFailure && result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
