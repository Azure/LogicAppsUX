// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
//
// Test-only "fake listener" extension.
//
// Subscribes to vscode.tasks lifecycle events and appends each event as a
// single JSON line to a file whose path is read from `process.env.LA_E2E_TASK_EVENTS_JSONL`
// (preferred) or `process.env.CODEFUL_TASK_EVENTS_JSONL` (alias).
//
// Each line:
//   {
//     phase: 'taskStart' | 'taskEnd' | 'processStart' | 'processEnd',
//     taskName: string,
//     scopeFsPath: string | null,
//     processId: number | null,
//     exitCode: number | null,
//     timestamp: string  // ISO 8601
//   }
//
// The extension also contributes three commands:
//   - la-e2e.startDebug   Start the first 'logicapp' launch config in the first workspace folder.
//   - la-e2e.stopDebug    Stop all active debug sessions.
//   - la-e2e.recorderPing Append a single { phase: 'ping' } line so the test can verify the recorder is alive.
//
// Pattern: deterministic task-event capture. The test process can read the JSONL
// file at any time and filter by `scopeFsPath` to assert exactly which tasks ran
// during a specific F5 invocation. This avoids brittle scraping of the
// integrated terminal or the tasks output channel.

const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const path = require('path');

function resolveEventsFile() {
  try {
    const fromEnv = process.env.LA_E2E_TASK_EVENTS_JSONL || process.env.CODEFUL_TASK_EVENTS_JSONL;
    if (fromEnv && typeof fromEnv === 'string' && fromEnv.length > 0) {
      try {
        fs.mkdirSync(path.dirname(fromEnv), { recursive: true });
      } catch {
        /* ignore */
      }
      return fromEnv;
    }
  } catch {
    /* ignore */
  }
  // Fallback to a deterministic temp path.
  const fallbackDir = path.join(os.tmpdir(), 'la-e2e-test');
  try {
    fs.mkdirSync(fallbackDir, { recursive: true });
  } catch {
    /* ignore */
  }
  return path.join(fallbackDir, 'la-e2e-task-events.jsonl');
}

function appendEvent(eventsFile, payload) {
  try {
    const line = `${JSON.stringify(payload)}\n`;
    // Synchronous append so events are observed in their natural order.
    fs.appendFileSync(eventsFile, line, { encoding: 'utf8' });
  } catch {
    // Never throw from the recorder.
  }
}

function scopeFsPath(task) {
  try {
    const scope = task && task.scope;
    if (scope && typeof scope === 'object' && scope.uri && typeof scope.uri.fsPath === 'string') {
      return scope.uri.fsPath;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function taskName(task) {
  try {
    if (task && typeof task.name === 'string') {
      return task.name;
    }
  } catch {
    /* ignore */
  }
  return '';
}

async function waitForLogicAppsExtension(timeoutMs = 360_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const commands = await vscode.commands.getCommands(true);
      if (commands.includes('azureLogicAppsStandard.debugLogicApp')) {
        return true;
      }
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function startDebugCommand() {
  try {
    const folders = vscode.workspace.workspaceFolders || [];
    if (folders.length === 0) {
      console.log('[la-e2e-recorder] startDebug: no workspace folder');
      return false;
    }
    const folder = folders[0];

    // Read the launch.json from disk so we don't depend on VS Code's launch-config cache.
    let configName;
    try {
      const launchPath = path.join(folder.uri.fsPath, '.vscode', 'launch.json');
      const raw = fs.readFileSync(launchPath, 'utf8');
      // Strip simple // comments before parsing — launch.json is JSONC.
      const cleaned = raw.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      const launch = JSON.parse(cleaned);
      const configs = Array.isArray(launch?.configurations) ? launch.configurations : [];
      const picked = configs.find((c) => c && c.type === 'logicapp') || configs[0];
      configName = picked && picked.name;
    } catch (err) {
      console.log(`[la-e2e-recorder] startDebug: launch.json read failed: ${err && err.message}`);
    }

    if (!configName) {
      console.log('[la-e2e-recorder] startDebug: no debug configuration name found');
      return false;
    }

    // The Logic Apps extension's `activate()` is async and registers
    // `azureLogicAppsStandard.debugLogicApp` only after several telemetry
    // operations complete. The `type: 'logicapp'` debug configuration
    // provider calls that command from its `resolveDebugConfiguration` hook,
    // so we have to wait until the command is on the registry before we ask
    // VS Code to start debugging.
    const ready = await waitForLogicAppsExtension();
    if (!ready) {
      console.log('[la-e2e-recorder] startDebug: timed out waiting for azureLogicAppsStandard.debugLogicApp');
      return false;
    }

    console.log(`[la-e2e-recorder] startDebug: starting "${configName}" in ${folder.uri.fsPath}`);
    return await vscode.debug.startDebugging(folder, configName);
  } catch (err) {
    console.log(`[la-e2e-recorder] startDebug failed: ${err && err.message}`);
    return false;
  }
}

async function stopDebugCommand() {
  try {
    await vscode.debug.stopDebugging();
    return true;
  } catch (err) {
    console.log(`[la-e2e-recorder] stopDebug failed: ${err && err.message}`);
    return false;
  }
}

function resolveTriggerDir() {
  try {
    const fromEnv = process.env.LA_E2E_TRIGGER_DIR;
    if (fromEnv && typeof fromEnv === 'string' && fromEnv.length > 0) {
      try {
        fs.mkdirSync(fromEnv, { recursive: true });
      } catch {
        /* ignore */
      }
      return fromEnv;
    }
  } catch {
    /* ignore */
  }
  const fallback = path.join(os.tmpdir(), 'la-e2e-test', 'triggers');
  try {
    fs.mkdirSync(fallback, { recursive: true });
  } catch {
    /* ignore */
  }
  return fallback;
}

function activate(context) {
  const eventsFile = resolveEventsFile();
  const triggerDir = resolveTriggerDir();
  console.log(`[la-e2e-recorder] activate; events=${eventsFile} triggerDir=${triggerDir}`);

  appendEvent(eventsFile, {
    phase: 'activate',
    taskName: '',
    scopeFsPath: null,
    processId: null,
    exitCode: null,
    timestamp: new Date().toISOString(),
  });

  // File-watcher-based trigger. Tests can drop a marker file into
  // `${LA_E2E_TRIGGER_DIR}` and the recorder picks it up without needing
  // to interact with VS Code's command palette (which can be flaky right
  // after a workspace switch). Recognised marker filenames:
  //   - `start-debug`  → start the first 'logicapp' launch config
  //   - `stop-debug`   → stop all debug sessions
  //   - `ping`         → write a single { phase: 'ping' } JSONL entry
  // Marker files are consumed (deleted) immediately so a second test
  // variant can drop fresh markers without colliding with the previous run.
  const triggerInterval = setInterval(() => {
    let entries = [];
    try {
      entries = fs.readdirSync(triggerDir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const markerPath = path.join(triggerDir, entry);
      try {
        fs.unlinkSync(markerPath);
      } catch {
        // If we couldn't consume the marker, skip — don't act twice on the same file.
        continue;
      }
      if (entry === 'start-debug') {
        appendEvent(eventsFile, {
          phase: 'debugStart',
          taskName: '',
          scopeFsPath: null,
          processId: null,
          exitCode: null,
          timestamp: new Date().toISOString(),
        });
        startDebugCommand()
          .then((ok) => {
            appendEvent(eventsFile, {
              phase: ok ? 'debugStarted' : 'debugStartFailed',
              taskName: '',
              scopeFsPath: null,
              processId: null,
              exitCode: ok ? 0 : 1,
              timestamp: new Date().toISOString(),
            });
          })
          .catch((err) => {
            console.log(`[la-e2e-recorder] startDebug (file) failed: ${err && err.message}`);
            appendEvent(eventsFile, {
              phase: 'debugStartFailed',
              taskName: '',
              scopeFsPath: null,
              processId: null,
              exitCode: 1,
              timestamp: new Date().toISOString(),
            });
          });
      } else if (entry === 'stop-debug') {
        stopDebugCommand().catch((err) => console.log(`[la-e2e-recorder] stopDebug (file) failed: ${err && err.message}`));
      } else if (entry === 'ping') {
        appendEvent(eventsFile, {
          phase: 'ping',
          taskName: '',
          scopeFsPath: null,
          processId: null,
          exitCode: null,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }, 500);
  context.subscriptions.push({ dispose: () => clearInterval(triggerInterval) });

  context.subscriptions.push(
    vscode.tasks.onDidStartTask((event) => {
      try {
        const task = event && event.execution && event.execution.task;
        if (!task) {
          return;
        }
        appendEvent(eventsFile, {
          phase: 'taskStart',
          taskName: taskName(task),
          scopeFsPath: scopeFsPath(task),
          processId: null,
          exitCode: null,
          timestamp: new Date().toISOString(),
        });
      } catch {
        /* ignore */
      }
    })
  );

  context.subscriptions.push(
    vscode.tasks.onDidEndTask((event) => {
      try {
        const task = event && event.execution && event.execution.task;
        if (!task) {
          return;
        }
        appendEvent(eventsFile, {
          phase: 'taskEnd',
          taskName: taskName(task),
          scopeFsPath: scopeFsPath(task),
          processId: null,
          exitCode: null,
          timestamp: new Date().toISOString(),
        });
      } catch {
        /* ignore */
      }
    })
  );

  context.subscriptions.push(
    vscode.tasks.onDidStartTaskProcess((event) => {
      try {
        const task = event && event.execution && event.execution.task;
        if (!task) {
          return;
        }
        appendEvent(eventsFile, {
          phase: 'processStart',
          taskName: taskName(task),
          scopeFsPath: scopeFsPath(task),
          processId: typeof event.processId === 'number' ? event.processId : null,
          exitCode: null,
          timestamp: new Date().toISOString(),
        });
      } catch {
        /* ignore */
      }
    })
  );

  context.subscriptions.push(
    vscode.tasks.onDidEndTaskProcess((event) => {
      try {
        const task = event && event.execution && event.execution.task;
        if (!task) {
          return;
        }
        appendEvent(eventsFile, {
          phase: 'processEnd',
          taskName: taskName(task),
          scopeFsPath: scopeFsPath(task),
          processId: null,
          exitCode: typeof event.exitCode === 'number' ? event.exitCode : null,
          timestamp: new Date().toISOString(),
        });
      } catch {
        /* ignore */
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('la-e2e.startDebug', async () => {
      return await startDebugCommand();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('la-e2e.stopDebug', async () => {
      return await stopDebugCommand();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('la-e2e.recorderPing', () => {
      appendEvent(eventsFile, {
        phase: 'ping',
        taskName: '',
        scopeFsPath: null,
        processId: null,
        exitCode: null,
        timestamp: new Date().toISOString(),
      });
      return true;
    })
  );
}

function deactivate() {
  // no-op
}

module.exports = { activate, deactivate };
