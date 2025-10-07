/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  Platform,
  autoStartAzuriteSetting,
  verifyConnectionKeysSetting,
  defaultFuncPort,
  hostStartTaskName,
  pickProcessTimeoutSetting,
} from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { getMatchingWorkspaceFolder, preDebugValidate } from '../debug/validatePreDebug';
import { verifyLocalConnectionKeys } from '../utils/appSettings/connectionKeys';
import { activateAzurite } from '../utils/azurite/activateAzurite';
import { getFuncPortFromTaskOrProject, isFuncHostTask, runningFuncTaskMap } from '../utils/funcCoreTools/funcHostTask';
import type { IRunningFuncTask } from '../utils/funcCoreTools/funcHostTask';
import { isTimeoutError } from '../utils/requestUtils';
import { executeIfNotActive } from '../utils/taskUtils';
import { runWithDurationTelemetry } from '../utils/telemetry';
import { tryGetLogicAppProjectRoot } from '../utils/verifyIsProject';
import { getWorkspaceSetting } from '../utils/vsCodeConfig/settings';
import { getWindowsProcess } from '../utils/windowsProcess';
import { HTTP_METHODS } from '@microsoft/logic-apps-shared';
import type { AzExtRequestPrepareOptions } from '@microsoft/vscode-azext-azureutils';
import { sendRequestWithTimeout } from '@microsoft/vscode-azext-azureutils';
import { UserCancelledError, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ProjectLanguage, type IProcessInfo } from '@microsoft/vscode-extension-logic-apps';
import unixPsTree from 'ps-tree';
import * as vscode from 'vscode';
import parser from 'yargs-parser';
import { buildCustomCodeFunctionsProject } from './buildCustomCodeFunctionsProject';
import { getProjFiles } from '../utils/dotnet/dotnet';
import { delay } from '../utils/delay';

type OSAgnosticProcess = { command: string | undefined; pid: number | string };
type ActualUnixPS = unixPsTree.PS & { COMM?: string };

/**
 * Starts the function host task and waits for it to be ready, then returns the child func.exe process ID.
 * @param context The action context.
 * @param debugConfig The debug configuration.
 * @returns A promise that resolves to the child process ID or undefined if not found.
 */
export async function pickFuncProcess(context: IActionContext, debugConfig: vscode.DebugConfiguration): Promise<string | undefined> {
  const workspaceFolder: vscode.WorkspaceFolder = getMatchingWorkspaceFolder(debugConfig);
  const projectPath: string | undefined = await tryGetLogicAppProjectRoot(context, workspaceFolder);
  if (!projectPath) {
    throw new Error(localize('noProjectRoot', 'Unable to find the project root.'));
  }

  return await pickFuncProcessInternal(context, debugConfig, workspaceFolder, projectPath);
}

/**
 * An internal helper to start the function host task and return the child func.exe process ID.
 * @param context The action context.
 * @param debugConfig The debug configuration.
 * @param workspaceFolder The workspace folder containing the logic app.
 * @param projectPath The path to the logic app project root.
 * @returns A promise that resolves to the child process ID or undefined if not found.
 */
export async function pickFuncProcessInternal(
  context: IActionContext,
  debugConfig: vscode.DebugConfiguration,
  workspaceFolder: vscode.WorkspaceFolder,
  projectPath: string
): Promise<string | undefined> {
  await callWithTelemetryAndErrorHandling(autoStartAzuriteSetting, async (actionContext: IActionContext) => {
    await runWithDurationTelemetry(actionContext, autoStartAzuriteSetting, async () => {
      await activateAzurite(context, projectPath);
    });
  });

  await callWithTelemetryAndErrorHandling(verifyConnectionKeysSetting, async (actionContext: IActionContext) => {
    await runWithDurationTelemetry(actionContext, verifyConnectionKeysSetting, async () => {
      await verifyLocalConnectionKeys(context, projectPath);
    });
  });

  context.telemetry.properties.debugType = debugConfig.type;
  const shouldContinue: boolean = await preDebugValidate(context, projectPath);
  if (!shouldContinue) {
    throw new UserCancelledError('preDebugValidate');
  }

  await buildCustomCodeFunctionsProject(context, workspaceFolder.uri);

  await waitForPrevFuncTaskToStop(workspaceFolder);
  const projectFiles = await getProjFiles(context, ProjectLanguage.CSharp, projectPath);
  const isBundleProject: boolean = projectFiles.length > 0 ? false : true;

  const preLaunchTaskName: string | undefined = debugConfig.preLaunchTask;
  const tasks: vscode.Task[] = await vscode.tasks.fetchTasks();
  const funcTask: vscode.Task | undefined = tasks.find((task) => {
    return task.scope === workspaceFolder && (preLaunchTaskName ? task.name === preLaunchTaskName : isFuncHostTask(task));
  });

  const debugTask: vscode.Task | undefined = tasks.find((task) => {
    return task.scope === workspaceFolder && task.name === 'generateDebugSymbols';
  });

  if (!funcTask) {
    throw new Error(localize('noFuncTask', 'Failed to find "{0}" task.', preLaunchTaskName || hostStartTaskName));
  }

  ext.workflowRuntimePort = getFunctionRuntimePort(funcTask);

  getPickProcessTimeout(context);

  if (debugTask && !debugConfig['noDebug'] && (isBundleProject || !debugConfig.isCodeless)) {
    await startDebugTask(debugTask, workspaceFolder);
  }

  const taskInfo = await startFuncTask(context, workspaceFolder, funcTask);
  return await pickChildProcess(taskInfo);
}

/**
 * Waits for functions tasks to stop.
 * @param {vscode.WorkspaceFolder} workspaceFolder - Workspace path.
 */
async function waitForPrevFuncTaskToStop(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
  const timeoutInSeconds = 30;
  const maxTime: number = Date.now() + timeoutInSeconds * 1000;
  while (Date.now() < maxTime) {
    if (!runningFuncTaskMap.has(workspaceFolder)) {
      return;
    }
    await delay(1000);
  }
  throw new Error(
    localize(
      'failedToFindFuncHost',
      'Failed to stop previous running Functions host within "{0}" seconds. Make sure the task has stopped before you debug again.',
      timeoutInSeconds
    )
  );
}

/**
 * Gets functions runtime port.
 * @param {vscode.Task} funcTask - Function task.
 * @returns {number} Returns specified port in tasks.json or the default function port.
 */
function getFunctionRuntimePort(funcTask: vscode.Task): number {
  const { command } = funcTask.definition;
  try {
    const args = parser(command);
    const port = args['port'] || args['p'] || undefined;
    return port ?? Number(defaultFuncPort);
  } catch {
    // Returning the default port in case of error in parsing.
    return Number(defaultFuncPort);
  }
}

/**
 * Gets pick process timeout setting value from workspace settings.
 * @param {IActionContext} context - Command context.
 * @returns {number} Timeout value in seconds.
 */
function getPickProcessTimeout(context: IActionContext): number {
  const pickProcessTimeoutValue: number | undefined = getWorkspaceSetting<number>(pickProcessTimeoutSetting);
  const timeoutInSeconds = Number(pickProcessTimeoutValue);
  if (Number.isNaN(timeoutInSeconds)) {
    throw new Error(
      localize(
        'invalidSettingValue',
        'The setting "{0}" must be a number, but instead found "{1}".',
        pickProcessTimeoutSetting,
        pickProcessTimeoutValue
      )
    );
  }
  context.telemetry.properties.timeoutInSeconds = timeoutInSeconds.toString();

  return timeoutInSeconds;
}

/**
 * Executes the debug symbols task.
 * @param {vscode.Task} debugTask - Debug Task.
 * @param {vscode.WorkspaceFolder} workspaceFolder - Workspace path.
 */
async function startDebugTask(debugTask: vscode.Task, workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
  await vscode.tasks.executeTask(debugTask);

  return new Promise<void>((resolve) => {
    const disposable: vscode.Disposable = vscode.tasks.onDidEndTaskProcess((e) => {
      if (e.execution.task.scope === workspaceFolder && e.execution.task === debugTask) {
        if (e.exitCode !== 0) {
          vscode.window.showWarningMessage(
            localize('azureLogicAppsStandard.debugSymbols', 'Unable to debug the workflow app. Debug symbols could not be generated.')
          );
        }
        disposable.dispose();
        resolve();
      }
    });
  });
}

/**
 * Executes the start functions task.
 * @param {IActionContext} context - Command context.
 * @param {vscode.WorkspaceFolder} workspaceFolder - Workspace path.
 * @param {vscode.Task} funcTask - Start functions Task.
 */
async function startFuncTask(
  context: IActionContext,
  workspaceFolder: vscode.WorkspaceFolder,
  funcTask: vscode.Task
): Promise<IRunningFuncTask> {
  const funcTaskReadyEmitter = new vscode.EventEmitter<vscode.WorkspaceFolder>();
  const pickProcessTimeout = getPickProcessTimeout(context);

  let taskError: Error | undefined;
  const errorListener: vscode.Disposable = vscode.tasks.onDidEndTaskProcess((e: vscode.TaskProcessEndEvent) => {
    if (e.execution.task.scope === workspaceFolder && e.exitCode !== 0) {
      context.errorHandling.suppressReportIssue = true;
      // Throw if _any_ task fails, not just funcTask (since funcTask often depends on build/clean tasks)
      taskError = new Error(
        localize(
          'taskFailed',
          'Error exists after running preLaunchTask "{0}". View task output for more information.',
          e.execution.task.name,
          e.exitCode
        )
      );
      errorListener.dispose();
    }
  });

  try {
    // The "IfNotActive" part helps when the user starts, stops and restarts debugging quickly in succession. We want to use the already-active task to avoid two func tasks causing a port conflict error
    // The most common case we hit this is if the "clean" or "build" task is running when we get here. It's unlikely the "func host start" task is active, since we would've stopped it in `waitForPrevFuncTaskToStop` above
    await executeIfNotActive(funcTask);

    const intervalMs = 500;
    const funcPort: string = await getFuncPortFromTaskOrProject(context, funcTask, workspaceFolder);
    let statusRequestTimeout: number = intervalMs;
    const maxTime: number = Date.now() + pickProcessTimeout * 1000;
    while (Date.now() < maxTime) {
      if (taskError !== undefined) {
        throw taskError;
      }

      const taskInfo: IRunningFuncTask | undefined = runningFuncTaskMap.get(workspaceFolder);
      if (taskInfo) {
        for (const scheme of ['http', 'https']) {
          const statusRequest: AzExtRequestPrepareOptions = {
            url: `${scheme}://localhost:${funcPort}/admin/host/status`,
            method: HTTP_METHODS.GET,
          };
          if (scheme === 'https') {
            statusRequest.rejectUnauthorized = false;
          }

          try {
            // wait for status url to indicate functions host is running
            const response = await sendRequestWithTimeout(context, statusRequest, statusRequestTimeout, undefined);
            if (response.parsedBody.state.toLowerCase() === 'running') {
              funcTaskReadyEmitter.fire(workspaceFolder);
              taskInfo.childProcessId = [await pickChildProcess(taskInfo), await pickFuncHostChildProcess(taskInfo)];
              return taskInfo;
            }
          } catch (error) {
            if (isTimeoutError(error)) {
              // Timeout likely means localhost isn't ready yet, but we'll increase the timeout each time it fails just in case it's a slow computer that can't handle a request that fast
              statusRequestTimeout *= 2;
              context.telemetry.measurements.maxStatusTimeout = statusRequestTimeout;
            } else {
              // ignore
            }
          }
        }
      }

      await delay(intervalMs);
    }

    throw new Error(
      localize(
        'failedToFindFuncHost',
        'Failed to detect running Functions host within "{0}" seconds. You may want to adjust the "{1}" setting.',
        pickProcessTimeout,
        `${ext.prefix}.${pickProcessTimeoutSetting}`
      )
    );
  } finally {
    errorListener.dispose();
  }
}

export async function findChildProcess(processId: number): Promise<string | undefined> {
  const children: OSAgnosticProcess[] =
    process.platform === Platform.windows ? await getWindowsChildren(processId) : await getUnixChildren(processId);
  const child: OSAgnosticProcess | undefined = children.reverse().find((c) => /(dotnet|func)(\.exe|)$/i.test(c.command || ''));
  return child ? child.pid.toString() : String(processId);
}

/**
 * Picks the child process that we want to use. Scenarios to keep in mind:
 * 1. On Windows, the rootPid is almost always the parent PowerShell process
 * 2. On Unix, the rootPid may be a wrapper around the main func exe if installed with npm
 * 3. Starting with the .NET 5 worker, Windows sometimes has an inner process we _don't_ want like 'conhost.exe'
 * The only processes we should want to attach to are the "func" process itself or a "dotnet" process running a dll, so we will pick the innermost one of those
 */
export async function pickChildProcess(taskInfo: IRunningFuncTask): Promise<string> {
  // Workaround for https://github.com/microsoft/vscode-azurefunctions/issues/2656
  if (!isRunning(taskInfo.processId) && vscode.window.activeTerminal) {
    const terminalPid = await vscode.window.activeTerminal.processId;
    if (terminalPid) {
      // NOTE: Intentionally updating the object so that `runningFuncTaskMap` is affected, too
      taskInfo.processId = terminalPid;
    }
  }
  const children: OSAgnosticProcess[] =
    process.platform === Platform.windows ? await getWindowsChildren(taskInfo.processId) : await getUnixChildren(taskInfo.processId);
  const child: OSAgnosticProcess | undefined = children.reverse().find((c) => /(dotnet|func)(\.exe|)$/i.test(c.command || ''));
  return child ? child.pid.toString() : String(taskInfo.processId);
}

/**
 * Returns wheter the task with the specific pid is running.
 * This method will throw an error if the target pid does not exist. As a special case, a signal of 0 can be used to test for the existence of a process.
 * Even though the name of this function is process.kill(), it is really just a signal sender, like the kill system call.
 * @param {number} pid - Task pid.
 * @returns {number} Returns true if the task is running, otherwise returns false.
 */
function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function getUnixChildren(pid: number): Promise<OSAgnosticProcess[]> {
  const processes: ActualUnixPS[] = await new Promise((resolve, reject): void => {
    unixPsTree(pid, (error: Error | null, result: unixPsTree.PS[]) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
  return processes.map((c) => {
    return { command: c.COMMAND || c.COMM, pid: c.PID };
  });
}

export async function getWindowsChildren(pid: number): Promise<OSAgnosticProcess[]> {
  const processes: IProcessInfo[] = await getWindowsProcess(pid);
  return (processes || []).map((c) => {
    return { command: c.name, pid: c.pid };
  });
}

async function pickFuncHostChildProcess(taskInfo: IRunningFuncTask): Promise<string | undefined> {
  const funcPid = Number(await pickChildProcess(taskInfo));
  if (!funcPid) {
    return undefined;
  }

  const children: OSAgnosticProcess[] =
    process.platform === Platform.windows ? await getWindowsChildren(funcPid) : await getUnixChildren(funcPid);
  const childRegex = /(func|dotnet)(\.exe|)?$/i;
  let child: OSAgnosticProcess | undefined = children.reverse().find((c) => childRegex.test(c.command || ''));

  // If child is null or undefined, look one level deeper in child processes
  if (!child) {
    for (const possibleParent of children) {
      const childrenOfChild =
        process.platform === Platform.windows
          ? await getWindowsChildren(Number(possibleParent.pid))
          : await getUnixChildren(Number(possibleParent.pid));

      child = childrenOfChild.reverse().find((c) => childRegex.test(c.command || ''));
      if (child) {
        break;
      }
    }
  }
  return child ? child.pid.toString() : undefined;
}
