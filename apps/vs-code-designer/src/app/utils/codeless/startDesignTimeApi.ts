/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  ProjectDirectoryPathKey,
  autoStartDesignTimeSetting,
  defaultVersionRange,
  designTimeDirectoryName,
  designerStartApi,
  extensionBundleId,
  hostFileName,
  localSettingsFileName,
  logicAppKind,
  showStartDesignTimeMessageSetting,
  designerApiLoadTimeout,
  type hostFileContent,
  workerRuntimeKey,
  appKindSetting,
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { addOrUpdateLocalAppSettings, getLocalSettingsSchema } from '../appSettings/localSettings';
import { updateFuncIgnore } from '../codeless/common';
import { writeFormattedJson } from '../fs';
import { getFunctionsCommand } from '../funcCoreTools/funcVersion';
import { getWorkspaceSetting, updateGlobalSetting } from '../vsCodeConfig/settings';
import { getWorkspaceLogicAppFolders } from '../workspace';
import { delay } from '../delay';
import {
  DialogResponses,
  openUrl,
  type IActionContext,
  type IAzExtOutputChannel,
  callWithTelemetryAndErrorHandling,
} from '@microsoft/vscode-azext-utils';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension-logic-apps';
import { Platform, WorkerRuntime } from '@microsoft/vscode-extension-logic-apps';
import axios from 'axios';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as portfinder from 'portfinder';
import * as vscode from 'vscode';
import { Uri, window, workspace, type MessageItem } from 'vscode';
import { findChildProcess } from '../../commands/pickFuncProcess';
import find_process from 'find-process';
import { getChildProcessesWithScript } from '../findChildProcess/findChildProcess';

const maxDesignTimeValidationRestarts = 1;

function normalizeTrackedChildProcessId(parentProcessId: number, childFuncPid?: string): string | undefined {
  return childFuncPid && childFuncPid !== parentProcessId.toString() ? childFuncPid : undefined;
}

async function isTrackedUnixFuncProcessRunning(...trackedProcessIds: Array<number | string | undefined>): Promise<boolean> {
  for (const trackedProcessId of trackedProcessIds) {
    if (!trackedProcessId) {
      continue;
    }

    try {
      const processList = await find_process('pid', trackedProcessId);
      if (processList.length > 0 && /(func|dotnet)(\.exe)?$/i.test(processList[0].name ?? '')) {
        return true;
      }
    } catch {
      // Ignore lookup failures and continue checking tracked pids.
    }
  }

  return false;
}

function killTrackedUnixProcesses(process: cp.ChildProcess, childFuncPid?: string): void {
  const trackedProcessIds = new Set<string>();
  if (childFuncPid) {
    trackedProcessIds.add(childFuncPid);
  }
  if (process.pid) {
    trackedProcessIds.add(process.pid.toString());
  }

  for (const trackedProcessId of trackedProcessIds) {
    cp.spawn('kill', ['-9', trackedProcessId]);
  }
}

function getDesignTimeInstance(projectPath: string) {
  let designTimeInst = ext.designTimeInstances.get(projectPath);
  if (!designTimeInst) {
    designTimeInst = {};
    ext.designTimeInstances.set(projectPath, designTimeInst);
  }

  return designTimeInst;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function stopTrackedDesignTimeProcess(projectPath: string): void {
  const designTimeInst = ext.designTimeInstances.get(projectPath);
  if (!designTimeInst?.process) {
    return;
  }

  const { process, childFuncPid } = designTimeInst;
  designTimeInst.process = undefined;
  designTimeInst.childFuncPid = undefined;

  if (os.platform() === Platform.windows) {
    if (childFuncPid) {
      cp.exec(`taskkill /pid ${childFuncPid} /t /f`);
    }
    cp.exec(`taskkill /pid ${process.pid} /t /f`);
  } else {
    killTrackedUnixProcesses(process, childFuncPid);
  }
}

function scheduleStartDesignTimeApi(projectPath: string): void {
  startDesignTimeApi(projectPath).catch((error) => {
    ext.outputChannel.appendLog(
      localize(
        'scheduleDesignTimeApiFailed',
        'Background design-time startup failed for project "{0}". Error: {1}',
        projectPath,
        getErrorMessage(error)
      )
    );
  });
}

export async function startDesignTimeApi(projectPath: string): Promise<void> {
  const designTimeInst = getDesignTimeInstance(projectPath);

  if (designTimeInst.startupPromise) {
    await designTimeInst.startupPromise;
    return;
  }

  designTimeInst.startupPromise = (async () => {
    try {
      await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.startDesignTimeApi', async (actionContext: IActionContext) => {
        const loadDesignTimeStart = Date.now();
        actionContext.telemetry.properties.startDesignTimeApi = 'false';

        designTimeInst.startupError = undefined;
        designTimeInst.isStarting = true;

        if (!designTimeInst.port) {
          designTimeInst.port = await portfinder.getPortPromise();
        }

        const url = `http://localhost:${designTimeInst.port}${designerStartApi}`;
        if (await isDesignTimeUp(url)) {
          designTimeInst.isStarting = false;
          actionContext.telemetry.properties.isDesignTimeUp = 'true';
          await validateRunningFuncProcess(projectPath);
          return;
        }

        try {
          ext.outputChannel.appendLog(localize('startingDesignTimeApi', 'Starting Design Time Api for project: {0}', projectPath));

          const designTimeDirectory: Uri | undefined = await getOrCreateDesignTimeDirectory(designTimeDirectoryName, projectPath);
          const settingsFileContent = getLocalSettingsSchema(true, projectPath);

          const hostFileContent: any = {
            version: '2.0',
            extensionBundle: {
              id: extensionBundleId,
              version: defaultVersionRange,
            },
            extensions: {
              workflow: {
                settings: {
                  'Runtime.WorkflowOperationDiscoveryHostMode': 'true',
                },
              },
            },
          };

          if (!designTimeDirectory) {
            throw new Error(localize('DesignTimeDirectoryError', 'Failed to create design-time directory.'));
          }

          await createJsonFile(designTimeDirectory, hostFileName, hostFileContent);
          await createJsonFile(designTimeDirectory, localSettingsFileName, settingsFileContent);
          await addOrUpdateLocalAppSettings(
            actionContext,
            designTimeDirectory.fsPath,
            {
              [appKindSetting]: logicAppKind,
              [ProjectDirectoryPathKey]: projectPath,
              [workerRuntimeKey]: WorkerRuntime.Node,
            },
            true
          );
          const cwd: string = designTimeDirectory.fsPath;
          const portArgs = `--port ${designTimeInst.port}`;
          ext.outputChannel.appendLog(
            localize(
              'startingDesignTimeApiDetails',
              'Launching design-time host for project "{0}" from "{1}" on port {2}.',
              projectPath,
              cwd,
              designTimeInst.port
            )
          );

          startDesignTimeProcess(ext.outputChannel, cwd, getFunctionsCommand(), 'host', 'start', portArgs);
          await waitForDesignTimeStartUp(actionContext, projectPath, url, true);
          actionContext.telemetry.properties.isDesignTimeUp = 'true';

          ext.pinnedBundleVersion.set(projectPath, false);
          const hostfilepath: Uri = Uri.file(path.join(cwd, hostFileName));
          const data = JSON.parse(fs.readFileSync(hostfilepath.fsPath, 'utf-8'));
          if (data.extensionBundle) {
            const versionWithoutSpaces = data.extensionBundle.version.replace(/\s+/g, '');
            const rangeWithoutSpaces = defaultVersionRange.replace(/\s+/g, '');
            if (data.extensionBundle.id === extensionBundleId && versionWithoutSpaces === rangeWithoutSpaces) {
              ext.currentBundleVersion.set(projectPath, ext.latestBundleVersion);
            } else if (data.extensionBundle.id === extensionBundleId && versionWithoutSpaces !== rangeWithoutSpaces) {
              ext.currentBundleVersion.set(projectPath, extractPinnedVersion(data.extensionBundle.version) ?? data.extensionBundle.version);
              ext.pinnedBundleVersion.set(projectPath, true);
            }
          }
          designTimeInst.startupError = undefined;
          designTimeInst.validationRetryCount = 0;
          actionContext.telemetry.properties.startDesignTimeApi = 'true';
          updateFuncIgnore(projectPath, [`${designTimeDirectoryName}/`]);
          actionContext.telemetry.measurements.startDesignTimeApiDuration = (Date.now() - loadDesignTimeStart) / 1000;
        } catch (error) {
          const errorMessage = getErrorMessage(error);
          const viewOutput: MessageItem = { title: localize('viewOutput', 'View output') };
          const message = localize('DesignTimeError', "Can't start the background design-time process.") + errorMessage;
          designTimeInst.startupError = errorMessage;
          designTimeInst.validationRetryCount = 0;
          stopTrackedDesignTimeProcess(projectPath);
          actionContext.telemetry.properties.startDesignTimeApiError = errorMessage;
          ext.outputChannel.appendLog(
            localize('designTimeApiFailed', 'Design-time startup failed for project "{0}". Error: {1}', projectPath, errorMessage)
          );

          window.showErrorMessage(message, viewOutput).then(async (result) => {
            if (result === viewOutput) {
              ext.outputChannel.show();
            }
          });
        } finally {
          designTimeInst.isStarting = false;
        }
      });
    } finally {
      const currentInst = ext.designTimeInstances.get(projectPath);
      if (currentInst) {
        currentInst.startupPromise = undefined;
      }
    }
  })();

  await designTimeInst.startupPromise;
}

function extractPinnedVersion(input: string): string | null {
  // Regular expression to match the format "[1.24.58]"
  const regex = /^\[(\d{1}\.\d{1,2}\.\d{1,2})\]$/;
  const match = input.match(regex);

  if (match) {
    // Extracted time part is in the first capturing group
    return match[1];
  }
  return null;
}

async function validateRunningFuncProcess(projectPath: string): Promise<void> {
  const designTimeInst = ext.designTimeInstances.get(projectPath);
  if (!designTimeInst) {
    return;
  }

  const correctFuncProcess = await checkFuncProcessId(projectPath);
  if (!correctFuncProcess) {
    const retryCount = designTimeInst.validationRetryCount ?? 0;
    if (retryCount >= maxDesignTimeValidationRestarts) {
      designTimeInst.validationRetryCount = 0;
      ext.outputChannel.appendLog(
        localize(
          'invalidChildFuncPidSkipRestart',
          'Unable to validate the func child process PID for project at "{0}" after {1} restart attempt(s). Keeping the current design-time host running.',
          projectPath,
          retryCount
        )
      );
      return;
    }

    designTimeInst.validationRetryCount = retryCount + 1;
    ext.outputChannel.appendLog(
      localize(
        'invalidChildFuncPid',
        'Invalid func child process PID set for project at "{0}". Restarting workflow design-time API.',
        projectPath
      )
    );
    stopDesignTimeApi(projectPath);
    await startDesignTimeApi(projectPath);
    return;
  }

  designTimeInst.validationRetryCount = 0;
}

async function checkFuncProcessId(projectPath: string): Promise<boolean> {
  const designTimeInst = ext.designTimeInstances.get(projectPath);
  const processId = designTimeInst?.process?.pid;
  if (!designTimeInst?.process || !processId) {
    return false;
  }

  if (os.platform() === Platform.windows) {
    let { childFuncPid } = designTimeInst;
    let retries = 0;
    while (!childFuncPid && retries < 3) {
      await delay(1000);
      const refreshedDesignTimeInst = ext.designTimeInstances.get(projectPath);
      if (!refreshedDesignTimeInst?.process) {
        return false;
      }
      childFuncPid = refreshedDesignTimeInst.childFuncPid;
      retries++;
    }
    if (!childFuncPid) {
      const children = await getChildProcessesWithScript(processId);
      const funcChildProcess = children.find((p) => p.name === 'func.exe');
      if (funcChildProcess) {
        designTimeInst.childFuncPid = funcChildProcess.processId.toString();
        return true;
      }
      return false;
    }

    const children = await getChildProcessesWithScript(processId);
    return children.some((p) => p.processId.toString() === childFuncPid && p.name === 'func.exe');
  }

  designTimeInst.childFuncPid = normalizeTrackedChildProcessId(processId, designTimeInst.childFuncPid);
  if (await isTrackedUnixFuncProcessRunning(designTimeInst.childFuncPid, processId)) {
    return true;
  }

  let retries = 0;
  while (retries < 3) {
    await delay(1000);
    const refreshedDesignTimeInst = ext.designTimeInstances.get(projectPath);
    const refreshedProcessId = refreshedDesignTimeInst?.process?.pid;
    if (!refreshedDesignTimeInst?.process || !refreshedProcessId) {
      return false;
    }

    refreshedDesignTimeInst.childFuncPid = normalizeTrackedChildProcessId(refreshedProcessId, refreshedDesignTimeInst.childFuncPid);
    if (!refreshedDesignTimeInst.childFuncPid) {
      const foundChildProcessId = await findChildProcess(refreshedProcessId);
      refreshedDesignTimeInst.childFuncPid = normalizeTrackedChildProcessId(refreshedProcessId, foundChildProcessId);
    }

    if (await isTrackedUnixFuncProcessRunning(refreshedDesignTimeInst.childFuncPid, refreshedProcessId)) {
      return true;
    }

    retries++;
  }

  return false;
}

export async function getOrCreateDesignTimeDirectory(designTimeDirectory: string, projectRoot: string): Promise<Uri | undefined> {
  const directory: string = designTimeDirectory + path.sep;
  if (projectRoot.includes(designTimeDirectoryName)) {
    return Uri.file(projectRoot);
  }

  const designTimeDirectoryUri: Uri = Uri.file(path.join(projectRoot, directory));
  if (!fs.existsSync(designTimeDirectoryUri.fsPath)) {
    await workspace.fs.createDirectory(designTimeDirectoryUri);
  }
  return designTimeDirectoryUri;
}

export async function waitForDesignTimeStartUp(
  context: IActionContext,
  projectPath: string,
  url: string,
  setDesignTimeInst = false
): Promise<void> {
  const initialTime = Date.now();
  let isDesignTimeStarted = false;
  while (Date.now() - initialTime < designerApiLoadTimeout) {
    if (await isDesignTimeUp(url)) {
      isDesignTimeStarted = true;
      break;
    }
    await delay(1000);
  }
  if (isDesignTimeStarted) {
    if (!ext.designTimeInstances.has(projectPath)) {
      return Promise.reject(
        new Error(localize('missingDesignTimeInstance', 'Design-time startup state was lost for project "{0}".', projectPath))
      );
    }
    if (setDesignTimeInst) {
      const designTimeInst = ext.designTimeInstances.get(projectPath);
      const processId = designTimeInst?.process?.pid;
      if (!designTimeInst?.process || !processId) {
        return Promise.reject(
          new Error(localize('missingDesignTimeProcess', 'Design-time process was not found for project "{0}".', projectPath))
        );
      }
      const foundChildProcessId = await findChildProcess(processId);
      designTimeInst.childFuncPid = normalizeTrackedChildProcessId(processId, foundChildProcessId);
      designTimeInst.isStarting = false;
    }
    context.telemetry.measurements.waitForDesignTimeStartupDuration = (Date.now() - initialTime) / 1000;
    return Promise.resolve();
  }
  ext.outputChannel.appendLog(
    localize(
      'designTimeStartupTimeout',
      'Timed out waiting for design-time startup for project "{0}" at "{1}" after {2} ms.',
      projectPath,
      url,
      designerApiLoadTimeout
    )
  );
  return Promise.reject(
    new Error(localize('designTimeStartupTimeoutError', 'Timed out waiting for design-time startup for project "{0}".', projectPath))
  );
}

export async function isDesignTimeUp(url: string): Promise<boolean> {
  try {
    await axios.get(url);
    return Promise.resolve(true);
  } catch {
    return Promise.resolve(false);
  }
}

export function startDesignTimeProcess(
  outputChannel: IAzExtOutputChannel | undefined,
  workingDirectory: string | undefined,
  command: string,
  ...args: string[]
): void {
  let cmdOutput = '';
  let cmdOutputIncludingStderr = '';
  const formattedArgs: string = args.join(' ');

  const options: cp.SpawnOptions = {
    cwd: workingDirectory || os.tmpdir(),
    shell: true,
  };

  const designChildProcess = cp.spawn(command, args, options);

  if (outputChannel) {
    outputChannel.appendLog(
      localize('runningCommand', 'Running command: "{0} {1}" with pid: "{2}"...', command, formattedArgs, designChildProcess.pid)
    );
  }

  const projectPath = workingDirectory ? path.dirname(workingDirectory) : '';
  const stdout = designChildProcess.stdout;
  stdout?.on('data', (data: string | Buffer) => {
    data = data.toString();
    cmdOutput = cmdOutput.concat(data);
    cmdOutputIncludingStderr = cmdOutputIncludingStderr.concat(data);
    const languageWorkerText = 'Failed to start a new language worker for runtime: node';
    if (outputChannel) {
      outputChannel.append(data);
    }
    if (data.toLowerCase().includes(languageWorkerText.toLowerCase())) {
      ext.outputChannel.appendLog(
        'Language worker issue found when launching func most likely due to a conflicting port. Restarting design-time process.'
      );

      stopDesignTimeApi(projectPath);
      scheduleStartDesignTimeApi(projectPath);
    }
  });

  const stderr = designChildProcess.stderr;
  stderr?.on('data', (data: string | Buffer) => {
    data = data.toString();
    cmdOutputIncludingStderr = cmdOutputIncludingStderr.concat(data);
    const portUnavailableText = 'is unavailable. Close the process using that port, or specify another port using';
    if (outputChannel) {
      outputChannel.append(data);
    }
    if (data.toLowerCase().includes(portUnavailableText.toLowerCase())) {
      ext.outputChannel.appendLog('Conflicting port found when launching func. Restarting design-time process.');

      stopDesignTimeApi(projectPath);
      scheduleStartDesignTimeApi(projectPath);
    }
  });

  const designTimeInst = ext.designTimeInstances.get(projectPath);
  if (designTimeInst) {
    designTimeInst.process = designChildProcess;
  }
}

export function stopAllDesignTimeApis(): void {
  for (const projectPath of ext.designTimeInstances.keys()) {
    stopDesignTimeApi(projectPath);
  }
}

export function stopDesignTimeApi(projectPath: string): void {
  ext.outputChannel.appendLog(`Stopping Design Time Api for project: ${projectPath}`);
  const designTimeInst = ext.designTimeInstances.get(projectPath);
  if (!designTimeInst) {
    return;
  }

  const { process, childFuncPid } = designTimeInst;
  ext.designTimeInstances.delete(projectPath);
  if (process === null || process === undefined) {
    return;
  }

  if (os.platform() === Platform.windows) {
    cp.exec(`taskkill /pid ${childFuncPid} /t /f`);
    cp.exec(`taskkill /pid ${process.pid} /t /f`);
  } else {
    killTrackedUnixProcesses(process, childFuncPid);
  }
}

export function scheduleStartAllDesignTimeApis(): void {
  ext.outputChannel.appendLog(
    localize('scheduleAllDesignTimeApis', 'Scheduling background design-time startup for the current workspace.')
  );
  startAllDesignTimeApis().catch((error) => {
    ext.outputChannel.appendLog(
      localize('scheduleAllDesignTimeApisFailed', 'Background design-time startup encountered an error. Error: {0}', getErrorMessage(error))
    );
  });
}

/**
 * Starts the design-time API for all Logic Apps in the workspace.
 * @returns {Promise<void>} A promise that resolves when each design-time API is in the starting state.
 */
export async function startAllDesignTimeApis(): Promise<void> {
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    const logicAppFolders = await getWorkspaceLogicAppFolders();
    ext.outputChannel.appendLog(
      localize(
        'startingAllDesignTimeApis',
        'Starting design-time APIs for {0} Logic App project(s) in the current workspace.',
        logicAppFolders.length
      )
    );
    await Promise.all(logicAppFolders.map(startDesignTimeApi));
  } else {
    ext.outputChannel.appendLog(localize('noWorkspaceFoldersForDesignTime', 'No workspace folders found. Skipping design-time startup.'));
  }
}

/**
 * Optionally prompts the user to automatically start the design-time process at launch. If auto start is enabled, start the design-time API for all Logic Apps in the workspace.
 * @param {IActionContext} context - The action context.
 * @returns {Promise<void>} A promise that resolves when each design-time API is in the starting state or the user rejects auto start.
 */
export async function promptStartDesignTimeOption(context: IActionContext) {
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    const logicAppFolders = await getWorkspaceLogicAppFolders();
    const showStartDesignTimeMessage = !!getWorkspaceSetting<boolean>(showStartDesignTimeMessageSetting);
    let autoStartDesignTime = !!getWorkspaceSetting<boolean>(autoStartDesignTimeSetting);

    if (logicAppFolders && logicAppFolders.length > 0) {
      if (!autoStartDesignTime && showStartDesignTimeMessage) {
        const message = localize(
          'startDesignTimeApi',
          'Always start the background design-time process at launch? The workflow designer will open faster.'
        );
        const confirm = { title: localize('yesRecommended', 'Yes (Recommended)') };
        let result: MessageItem;
        do {
          result = await context.ui.showWarningMessage(message, confirm, DialogResponses.learnMore, DialogResponses.dontWarnAgain);
          if (result === confirm) {
            await updateGlobalSetting(autoStartDesignTimeSetting, true);
            autoStartDesignTime = true;
          } else if (result === DialogResponses.learnMore) {
            await openUrl('https://learn.microsoft.com/en-us/azure/azure-functions/functions-develop-local');
          } else if (result === DialogResponses.dontWarnAgain) {
            await updateGlobalSetting(showStartDesignTimeMessageSetting, false);
          }
        } while (result === DialogResponses.learnMore);
      }

      for (const projectPath of logicAppFolders) {
        if (!fs.existsSync(path.join(projectPath, localSettingsFileName))) {
          const settingsFileContent = getLocalSettingsSchema(false, projectPath);
          const projectUri: Uri = Uri.file(projectPath);
          await createJsonFile(projectUri, localSettingsFileName, settingsFileContent);
        }

        if (autoStartDesignTime) {
          scheduleStartDesignTimeApi(projectPath);
        }
      }
    }
  }
}

/**
 * Creates a JSON file in the specified directory with the given file name and content.
 * If the file already exists, it will not be overwritten.
 * @param {Uri} directory - The directory where the file will be created.
 * @param {string} fileName - The name of the file to be created.
 * @param {hostFileContent | ILocalSettingsJson}fileContent - The content of the file to be created.
 * @returns A Promise that resolves when the file is created successfully.
 */
export async function createJsonFile(
  directory: Uri,
  fileName: string,
  fileContent: typeof hostFileContent | ILocalSettingsJson
): Promise<void> {
  const filePath: Uri = Uri.file(path.join(directory.fsPath, fileName));

  // Create file
  if (!fs.existsSync(filePath.fsPath)) {
    await writeFormattedJson(filePath.fsPath, fileContent);
  }
}
