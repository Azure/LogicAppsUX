/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  Platform,
  ProjectDirectoryPath,
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
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { updateFuncIgnore } from '../codeless/common';
import { writeFormattedJson } from '../fs';
import { getFunctionsCommand } from '../funcCoreTools/funcVersion';
import { tryGetLogicAppProjectRoot } from '../verifyIsProject';
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
import axios from 'axios';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as portfinder from 'portfinder';
import * as vscode from 'vscode';
import { Uri, window, workspace } from 'vscode';
import type { MessageItem } from 'vscode';

export async function startDesignTimeApi(projectPath: string): Promise<void> {
  await callWithTelemetryAndErrorHandling('azureLogicAppsStandard.startDesignTimeApi', async (actionContext: IActionContext) => {
    actionContext.telemetry.properties.startDesignTimeApi = 'false';

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
        FUNCTIONS_WORKER_RUNTIME: WorkerRuntime.Node,
        APP_KIND: logicAppKind,
      },
    };
    if (!ext.designTimePort) {
      ext.designTimePort = await portfinder.getPortPromise();
    }

    const url = `http://localhost:${ext.designTimePort}${designerStartApi}`;
    if (await isDesignTimeUp(url)) {
      actionContext.telemetry.properties.isDesignTimeUp = 'true';
      return;
    }

    try {
      window.showInformationMessage(
        localize('azureFunctions.designTimeApi', 'Starting workflow design-time API, which might take a few seconds.'),
        'OK'
      );

      const designTimeDirectory: Uri | undefined = await getOrCreateDesignTimeDirectory(designTimeDirectoryName, projectPath);
      settingsFileContent.Values[ProjectDirectoryPath] = path.join(projectPath);

      if (designTimeDirectory) {
        await createJsonFile(designTimeDirectory, hostFileName, hostFileContent);
        await createJsonFile(designTimeDirectory, localSettingsFileName, settingsFileContent);
        await updateFuncIgnore(projectPath, [`${designTimeDirectoryName}/`]);
        const cwd: string = designTimeDirectory.fsPath;
        const portArgs = `--port ${ext.designTimePort}`;
        startDesignTimeProcess(ext.outputChannel, cwd, getFunctionsCommand(), 'host', 'start', portArgs);
        await waitForDesignTimeStartUp(url, new Date().getTime());
        actionContext.telemetry.properties.startDesignTimeApi = 'true';
      } else {
        throw new Error(localize('DesignTimeDirectoryError', 'Failed to create design-time directory.'));
      }
    } catch (ex) {
      const viewOutput: MessageItem = { title: localize('viewOutput', 'View output') };
      const message: string = localize('DesignTimeError', "Can't start the background design-time process.");
      await window.showErrorMessage(message, viewOutput).then(async (result) => {
        if (result === viewOutput) {
          ext.outputChannel.show();
        }
      });
    }
  });
}

export async function getOrCreateDesignTimeDirectory(designTimeDirectory: string, projectRoot: string): Promise<Uri | undefined> {
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

export async function waitForDesignTimeStartUp(url: string, initialTime: number): Promise<void> {
  while (!(await isDesignTimeUp(url)) && new Date().getTime() - initialTime < designerApiLoadTimeout) {
    await delay(2000);
  }
  if (await isDesignTimeUp(url)) {
    return Promise.resolve();
  } else {
    return Promise.reject();
  }
}

export async function isDesignTimeUp(url: string): Promise<boolean> {
  try {
    await axios.get(url);
    return Promise.resolve(true);
  } catch (ex) {
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

  ext.designChildProcess = cp.spawn(command, args, options);

  if (outputChannel) {
    outputChannel.appendLog(
      localize('runningCommand', 'Running command: "{0} {1}" with pid: "{2}"...', command, formattedArgs, ext.designChildProcess.pid)
    );
  }

  ext.designChildProcess.stdout.on('data', (data: string | Buffer) => {
    data = data.toString();
    cmdOutput = cmdOutput.concat(data);
    cmdOutputIncludingStderr = cmdOutputIncludingStderr.concat(data);
    if (outputChannel) {
      outputChannel.append(data);
    }
  });

  ext.designChildProcess.stderr.on('data', (data: string | Buffer) => {
    data = data.toString();
    cmdOutputIncludingStderr = cmdOutputIncludingStderr.concat(data);
    if (outputChannel) {
      outputChannel.append(data);
    }
  });
}

export function stopDesignTimeApi(): void {
  ext.outputChannel.appendLog('Stopping Design Time Api');
  if (ext.designChildProcess === null || ext.designChildProcess === undefined) {
    return;
  }

  if (os.platform() === Platform.windows) {
    cp.exec('taskkill /pid ' + `${ext.designChildProcess.pid}` + ' /t /f');
  } else {
    ext.designChildProcess.kill();
  }
  ext.designChildProcess = undefined;
}

export async function promptStartDesignTimeOption(context: IActionContext) {
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
    const workspaceFolder = await getWorkspaceFolder(context);
    const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);
    const autoStartDesignTime = !!getWorkspaceSetting<boolean>(autoStartDesignTimeSetting);
    const showStartDesignTimeMessage = !!getWorkspaceSetting<boolean>(showStartDesignTimeMessageSetting);
    if (projectPath) {
      if (autoStartDesignTime) {
        startDesignTimeApi(projectPath);
      } else if (showStartDesignTimeMessage) {
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
            startDesignTimeApi(projectPath);
          } else if (result === DialogResponses.learnMore) {
            await openUrl('https://learn.microsoft.com/en-us/azure/azure-functions/functions-develop-local');
          } else if (result === DialogResponses.dontWarnAgain) {
            await updateGlobalSetting(showStartDesignTimeMessageSetting, false);
          }
        } while (result === DialogResponses.learnMore);
      }
    }
  }
}
