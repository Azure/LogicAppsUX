/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  ProjectDirectoryPath,
  defaultVersionRange,
  designerStartApi,
  extensionBundleId,
  hostFileName,
  localSettingsFileName,
  logicAppKind,
  workflowDesignerLoadTimeout,
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { updateFuncIgnore } from '../codeless/common';
import { writeFormattedJson } from '../fs';
import { tryGetFunctionProjectRoot } from '../verifyIsProject';
import { getWorkspaceSetting, updateGlobalSetting } from '../vsCodeConfig/settings';
import { getWorkspaceFolder } from '../workspace';
import { delay } from '@azure/ms-rest-js';
import {
  DialogResponses,
  openUrl,
  type IActionContext,
  type IAzExtOutputChannel,
  callWithTelemetryAndErrorHandling,
} from '@microsoft/vscode-azext-utils';
import { WorkerRuntime } from '@microsoft/vscode-extension';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as portfinder from 'portfinder';
import * as requestP from 'request-promise';
import * as vscode from 'vscode';
import { Uri, window, workspace } from 'vscode';
import type { MessageItem } from 'vscode';

export async function startDesignTimeApi(projectPath: string): Promise<void> {
  await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.startDesignTimeApi', async (actionContext: IActionContext) => {
    actionContext.telemetry.properties.startDesignTimeApi = 'false';

    const designTimeDirectoryName = 'workflow-designtime';
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
    const settingsFileContent: any = {
      IsEncrypted: false,
      Values: {
        AzureWebJobsSecretStorageType: 'Files',
        FUNCTIONS_WORKER_RUNTIME: os.platform() === 'win32' ? WorkerRuntime.DotnetIsolated : WorkerRuntime.Node,
        APP_KIND: logicAppKind,
      },
    };
    if (!ext.workflowDesignTimePort) {
      ext.workflowDesignTimePort = await portfinder.getPortPromise();
    }

    const url = `http://localhost:${ext.workflowDesignTimePort}${designerStartApi}`;
    if (await isDesignTimeUp(url)) {
      actionContext.telemetry.properties.isDesignTimeUp = 'true';
      return;
    }

    try {
      window.showInformationMessage(
        localize('azureFunctions.designTimeApi', 'Starting workflow design time api. It might take a few seconds.'),
        'OK'
      );

      const designTimeDirectory: Uri | undefined = await getOrCreateDesignTimeDirectory(designTimeDirectoryName, projectPath);
      settingsFileContent.Values[ProjectDirectoryPath] = path.join(designTimeDirectory.fsPath);

      if (designTimeDirectory) {
        await createJsonFile(designTimeDirectory, hostFileName, hostFileContent);
        await createJsonFile(designTimeDirectory, localSettingsFileName, settingsFileContent);
        await updateFuncIgnore(projectPath, [`${designTimeDirectoryName}/`]);
        const cwd: string = designTimeDirectory.fsPath;
        const portArgs = `--port ${ext.workflowDesignTimePort}`;
        startDesignTimeProcess(ext.outputChannel, cwd, 'func', 'host', 'start', portArgs);
        await waitForDesingTimeStartUp(url, new Date().getTime());
        actionContext.telemetry.properties.startDesignTimeApi = 'true';
      } else {
        throw new Error(localize('DesignTimeDirectoryError', 'Design time directory could not be created.'));
      }
    } catch (ex) {
      const viewOutput: MessageItem = { title: localize('viewOutput', 'View output') };
      const message: string = localize('DesignTimeError', 'Workflow design time could not be started.');
      await window.showErrorMessage(message, viewOutput).then(async (result) => {
        if (result === viewOutput) {
          ext.outputChannel.show();
        }
      });
    }
  });
}

async function getOrCreateDesignTimeDirectory(designTimeDirectory: string, projectRoot: string): Promise<Uri | undefined> {
  const directory: string = designTimeDirectory + path.sep;
  const designTimeDirectoryUri: Uri = Uri.file(path.join(projectRoot, directory));
  if (!fs.existsSync(designTimeDirectoryUri.fsPath)) {
    await workspace.fs.createDirectory(designTimeDirectoryUri);
  }
  return designTimeDirectoryUri;
}

async function createJsonFile(directory: Uri, fileName: string, fileContent: any): Promise<void> {
  const filePath: Uri = Uri.file(path.join(directory.fsPath, fileName));
  if (!fs.existsSync(filePath.fsPath)) {
    await writeFormattedJson(filePath.fsPath, fileContent);
  }
}

async function waitForDesingTimeStartUp(url: string, initialTime: number): Promise<void> {
  while (!(await isDesignTimeUp(url)) && new Date().getTime() - initialTime < workflowDesignerLoadTimeout) {
    await delay(2000);
  }
  if (await isDesignTimeUp(url)) {
    return Promise.resolve();
  } else {
    return Promise.reject();
  }
}

async function isDesignTimeUp(url: string): Promise<boolean> {
  try {
    await requestP(url);
    return Promise.resolve(true);
  } catch (ex) {
    return Promise.resolve(false);
  }
}

function startDesignTimeProcess(
  outputChannel: IAzExtOutputChannel | undefined,
  workingDirectory: string | undefined,
  command: string,
  ...args: string[]
): void {
  let cmdOutput = '';
  let cmdOutputIncludingStderr = '';
  const formattedArgs: string = args.join(' ');
  workingDirectory = workingDirectory || os.tmpdir();
  const options: cp.SpawnOptions = {
    cwd: workingDirectory,
    shell: true,
  };
  ext.workflowDesignChildProcess = cp.spawn(command, args, options);

  if (outputChannel) {
    outputChannel.appendLog(localize('runningCommand', 'Running command: "{0} {1}"...', command, formattedArgs));
  }

  ext.workflowDesignChildProcess.stdout.on('data', (data: string | Buffer) => {
    data = data.toString();
    cmdOutput = cmdOutput.concat(data);
    cmdOutputIncludingStderr = cmdOutputIncludingStderr.concat(data);
    if (outputChannel) {
      outputChannel.append(data);
    }
  });

  ext.workflowDesignChildProcess.stderr.on('data', (data: string | Buffer) => {
    data = data.toString();
    cmdOutputIncludingStderr = cmdOutputIncludingStderr.concat(data);
    if (outputChannel) {
      outputChannel.append(data);
    }
  });
}

export function stopDesignTimeApi(): void {
  if (ext.workflowDesignChildProcess === null || ext.workflowDesignChildProcess === undefined) {
    return;
  }

  if (os.platform() === 'win32') {
    cp.exec('taskkill /pid ' + `${ext.workflowDesignChildProcess.pid}` + ' /T /F');
  } else {
    ext.workflowDesignChildProcess.kill();
  }
  ext.workflowDesignChildProcess = undefined;
}

export async function promptStartDesignTimeOption(context: IActionContext) {
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    const workspace = await getWorkspaceFolder(context);
    const projectPath = await tryGetFunctionProjectRoot(context, workspace);
    const autoStartDesignTimeKey = 'autoStartDesignTime';
    const autoStartDesignTime = !!getWorkspaceSetting<boolean>(autoStartDesignTimeKey);
    const showStartDesignTimeWarningKey = 'showStartDesignTimeWarning';
    const showStartDesignTimeWarning = !!getWorkspaceSetting<boolean>(showStartDesignTimeWarningKey);
    if (projectPath) {
      if (autoStartDesignTime) {
        startDesignTimeApi(projectPath);
      } else if (showStartDesignTimeWarning) {
        const message = localize('startDesignTimeApi', 'Always start design time on launch?');
        const confirm = { title: 'Yes (Recommended)' };
        let result: MessageItem;
        do {
          result = await context.ui.showWarningMessage(message, confirm, DialogResponses.learnMore, DialogResponses.dontWarnAgain);
          if (result === confirm) {
            await updateGlobalSetting(autoStartDesignTimeKey, true);
            startDesignTimeApi(projectPath);
          } else if (result === DialogResponses.learnMore) {
            await openUrl('https://learn.microsoft.com/en-us/azure/azure-functions/functions-develop-local');
          } else if (result === DialogResponses.dontWarnAgain) {
            await updateGlobalSetting(showStartDesignTimeWarningKey, false);
          }
        } while (result === DialogResponses.learnMore);
      }
    }
  }
}
