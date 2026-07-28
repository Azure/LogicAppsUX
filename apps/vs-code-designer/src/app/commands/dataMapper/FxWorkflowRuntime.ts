/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { WorkerRuntime } from '@microsoft/vscode-extension-logic-apps';
import {
  ProjectDirectoryPathKey,
  appKindSetting,
  designTimeDirectoryName,
  designerStartApi,
  functionsInprocNet8Enabled,
  functionsInprocNet8EnabledTrue,
  hostFileContent,
  hostFileName,
  localSettingsFileName,
  logicAppKind,
  workerRuntimeKey,
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { addOrUpdateLocalAppSettings, getLocalSettingsSchema } from '../../utils/appSettings/localSettings';
import { useNodeDesignTimeWorker } from '../../utils/vsCodeConfig/settings';
import {
  createJsonFile,
  getOrCreateDesignTimeDirectory,
  isDesignTimeUp,
  startDesignTimeProcess,
  waitForDesignTimeStartUp,
} from '../../utils/codeless/startDesignTimeApi';
import { getFunctionsCommand } from '../../utils/funcCoreTools/funcVersion';
import { reserveFreePort } from '../../utils/portReservation';
import { backendRuntimeBaseUrl } from './extensionConfig';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ProgressLocation, type Uri, window } from 'vscode';

// NOTE: LA Standard ext does this in workflowFolder/workflow-designtime
// For now at least, DM is just going to do everything in workflowFolder

export async function startBackendRuntime(context: IActionContext, projectPath: string): Promise<void> {
  const designTimeDirectory: Uri | undefined = await getOrCreateDesignTimeDirectory(designTimeDirectoryName, projectPath);
  if (!ext.designTimeInstances.has(projectPath)) {
    ext.designTimeInstances.set(projectPath, {
      port: await reserveFreePort(),
    });
  }
  const designTimeInst = ext.designTimeInstances.get(projectPath);

  if (!designTimeInst.port) {
    designTimeInst.port = await reserveFreePort();
  }

  // Note: Must append operationGroups as it's a valid endpoint to ping
  const url = `${backendRuntimeBaseUrl}${designTimeInst.port}${designerStartApi}`;

  await window.withProgress({ location: ProgressLocation.Notification }, async (progress) => {
    progress.report({ message: 'Starting backend runtime, this may take a few seconds...' });

    if (await isDesignTimeUp(url)) {
      ext.outputChannel.appendLine(localize('RuntimeAlreadyRunning', 'Backend runtime is already running'));
      return;
    }

    const useNodeWorker = useNodeDesignTimeWorker(projectPath);
    const settingsFileContent = getLocalSettingsSchema(true, projectPath, undefined, useNodeWorker);

    try {
      if (designTimeDirectory) {
        await createJsonFile(designTimeDirectory, hostFileName, hostFileContent);
        await createJsonFile(designTimeDirectory, localSettingsFileName, settingsFileContent);
        const runtimeSettings: Record<string, string> = {
          [appKindSetting]: logicAppKind,
          [ProjectDirectoryPathKey]: projectPath,
          [workerRuntimeKey]: useNodeWorker ? WorkerRuntime.Node : WorkerRuntime.Dotnet,
        };
        if (!useNodeWorker) {
          runtimeSettings[functionsInprocNet8Enabled] = functionsInprocNet8EnabledTrue;
        }
        await addOrUpdateLocalAppSettings(context, designTimeDirectory.fsPath, runtimeSettings, true);
        const cwd: string = designTimeDirectory.fsPath;
        const portArgs = `--port ${designTimeInst.port}`;
        startDesignTimeProcess(ext.outputChannel, cwd, getFunctionsCommand(), 'host', 'start', portArgs);

        await waitForDesignTimeStartUp(context, projectPath, url, true);
      } else {
        throw new Error("Workflow folder doesn't exist");
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
      ext.outputChannel.appendLine(localize('RuntimeFailedToStart', 'Backend runtime failed to start. Error: "{0}".', errMsg));
    }
  });
}
