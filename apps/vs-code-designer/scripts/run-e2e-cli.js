/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global __dirname, console, process, require */
const { spawn } = require('child_process');
const fs = require('fs');
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

const { args, visibleDelayMs, workspaceLifecycle } = parseArgs(process.argv.slice(2));

if (workspaceLifecycle) {
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
  const child = spawn('vscode-test', args, {
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      LA_E2E_CLI_USER_DATA_SUFFIX: userDataSuffix,
      ...(options.visibleDelayMs ? { LA_E2E_CLI_VISIBLE_DELAY_MS: options.visibleDelayMs } : {}),
      ...(options.extraEnv ?? {}),
    },
  });

  let output = '';

  child.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stdout.write(text);
  });

  child.stderr.on('data', (data) => {
    const text = data.toString();
    output += text;
    process.stderr.write(text);
  });

  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => {
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

function parseArgs(rawArgs) {
  const args = [];
  let visibleDelayMs;
  let workspaceLifecycle = false;

  for (let index = 0; index < rawArgs.length; index++) {
    const arg = rawArgs[index];
    if (arg === '--visible-delay-ms') {
      visibleDelayMs = rawArgs[index + 1];
      index++;
      continue;
    }
    if (arg === '--workspace-lifecycle') {
      workspaceLifecycle = true;
      continue;
    }

    args.push(arg);
  }

  return { args, visibleDelayMs, workspaceLifecycle };
}
