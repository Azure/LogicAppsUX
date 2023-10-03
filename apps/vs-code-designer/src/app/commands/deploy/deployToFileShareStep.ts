/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { hostFileName, workflowFileName, wwwrootDirectory } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { createStorageClient } from '../../utils/azureClients';
import { getWorkflowsPathInLocalProject } from '../../utils/codeless/common';
import { tryGetFunctionProjectRoot } from '../../utils/verifyIsProject';
import { getWorkspaceFolderPath } from '../workflows/switchDebugMode/switchDebugMode';
import type { StorageManagementClient, StorageAccountListKeysResult } from '@azure/arm-storage';
import { type ShareClient, ShareServiceClient, StorageSharedKeyCredential } from '@azure/storage-file-share';
import { AzureWizardExecuteStep, type IActionContext, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension';
import * as fse from 'fs-extra';
import * as path from 'path';
import type * as vscode from 'vscode';

type File = {
  path: string;
  name: string;
};

export class DeployToFileShareStep extends AzureWizardExecuteStep<ILogicAppWizardContext> {
  public priority = 140;

  public async execute(
    wizardContext: ILogicAppWizardContext,
    progress: vscode.Progress<{ message?: string; increment?: number }>
  ): Promise<void> {
    await callWithTelemetryAndErrorHandling('createFileShareStep', async (context: IActionContext) => {
      context.telemetry.properties.storage = wizardContext.storageAccount?.name;
      context.telemetry.properties.fileShare = wizardContext.newSiteName;

      const message: string = localize('creatingFileShare', 'Creating File Share "{0}"...', wizardContext.newSiteName);
      ext.outputChannel.appendLog(message);
      progress.report({ message });

      const storageClient: StorageManagementClient = await createStorageClient(wizardContext);
      const storageShareClient = await this.createStorageClient(wizardContext, storageClient);
      const shareName = 'getNameFromAppsettings';
      const shareClient = storageShareClient.getShareClient(shareName);

      if (shareClient.exists()) {
        const workspaceFolder = await getWorkspaceFolderPath(wizardContext);
        const projectPath: string | undefined = await tryGetFunctionProjectRoot(wizardContext, workspaceFolder, true /* suppressPrompt */);
        await this.uploadRootFiles(shareClient, projectPath);
        await this.uploadWorkflowsFiles(shareClient, projectPath);
      }
    });
  }

  public shouldExecute(): boolean {
    return true;
  }

  private async createStorageClient(context: ILogicAppWizardContext, client: StorageManagementClient): Promise<ShareServiceClient> {
    const keys: StorageAccountListKeysResult = await client.storageAccounts.listKeys(
      context.resourceGroup.name,
      context.storageAccount.name
    );
    const credential = new StorageSharedKeyCredential(context.storageAccount.name, keys.keys[0].value);
    return new ShareServiceClient(`https://${context.storageAccount.name}.file.core.windows.net`, credential);
  }

  private async createDirectories(shareClient: ShareClient, directories: string[]) {
    for (const directory of directories) {
      const directoryClient = shareClient.getDirectoryClient(directory);
      await directoryClient.createIfNotExists();
    }
  }

  private async uploadFiles(shareClient: ShareClient, files: File[], directoryPath: string) {
    for (const file of files) {
      const directoryClient = shareClient.getDirectoryClient(directoryPath);
      const fileClient = directoryClient.getFileClient(file.name);
      await fileClient.uploadFile(file.path);
    }
  }

  private async uploadRootFiles(shareClient: ShareClient, projectPath: string | undefined) {
    const hostJsonPath: string = path.join(projectPath, hostFileName);
    if (await fse.pathExists(hostJsonPath)) {
      await this.uploadFiles(shareClient, [{ path: hostJsonPath, name: hostFileName }], wwwrootDirectory);
    }
  }

  private async uploadWorkflowsFiles(shareClient: ShareClient, projectPath: string | undefined) {
    const workflowFiles = await getWorkflowsPathInLocalProject(projectPath);
    for (const workflowFile of workflowFiles) {
      const directoryPath = path.join(wwwrootDirectory, workflowFile.name);
      await this.createDirectories(shareClient, [directoryPath]);
      await this.uploadFiles(shareClient, [{ ...workflowFile, name: workflowFileName }], directoryPath);
    }
  }
}
