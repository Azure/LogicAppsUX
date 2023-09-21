/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { hostFileName } from '../../../../constants';
import { createStorageClient } from '../../../utils/azureClients';
import { getWorkflowsPathInLocalProject } from '../../../utils/codeless/common';
import { tryGetFunctionProjectRoot } from '../../../utils/verifyIsProject';
import { getWorkspaceFolderPath } from '../../workflows/switchDebugMode/switchDebugMode';
import type { StorageManagementClient, StorageAccountListKeysResult } from '@azure/arm-storage';
import { type ShareClient, ShareServiceClient, StorageSharedKeyCredential } from '@azure/storage-file-share';
import { AzureWizardExecuteStep } from '@microsoft/vscode-azext-utils';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension';
import * as path from 'path';
import type { Progress } from 'vscode';

type File = {
  path: string;
  name: string;
};

export class LogicAppFileShareStep extends AzureWizardExecuteStep<ILogicAppWizardContext> {
  public priority = 140;

  public async execute(context: ILogicAppWizardContext, _progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
    try {
      const storageClient: StorageManagementClient = await createStorageClient(context);
      const storageShareClient = await this.createStorageClient(context, storageClient);
      const shareName = context.newSiteName;
      const shareClient = storageShareClient.getShareClient(shareName);

      await this.createFileShare(shareClient);

      const rootDirectories = ['deployments', 'diagnostics', 'locks', 'wwwroot'];
      await this.createDirectories(shareClient, rootDirectories);

      const workspaceFolder = await getWorkspaceFolderPath(context);
      const projectPath: string | undefined = await tryGetFunctionProjectRoot(context, workspaceFolder, true /* suppressPrompt */);
      await this.uploadRootFiles(shareClient, projectPath);

      await this.uploadWorkflowsFiles(shareClient, projectPath);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  public shouldExecute(context: ILogicAppWizardContext): boolean {
    return !!context.useContainerApps;
  }

  private async createStorageClient(context: ILogicAppWizardContext, client: StorageManagementClient): Promise<ShareServiceClient> {
    const keys: StorageAccountListKeysResult = await client.storageAccounts.listKeys(
      context.resourceGroup.name,
      context.storageAccount.name
    );
    const credential = new StorageSharedKeyCredential(context.storageAccount.name, keys.keys[0].value);
    return new ShareServiceClient(`https://${context.storageAccount.name}.file.core.windows.net`, credential);
  }

  private async createFileShare(shareClient: ShareClient) {
    await shareClient.create();
  }

  private async createDirectories(shareClient: ShareClient, directories: string[]) {
    for (const directory of directories) {
      const directoryClient = shareClient.getDirectoryClient(directory);
      await directoryClient.create();
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
    await this.uploadFiles(shareClient, [{ path: hostJsonPath, name: hostFileName }], 'wwwroot');
  }

  private async uploadWorkflowsFiles(shareClient: ShareClient, projectPath: string | undefined) {
    const workflowFiles = await getWorkflowsPathInLocalProject(projectPath);

    for (const workflowFile of workflowFiles) {
      const directoryPath = path.join('wwwroot', workflowFile.name);
      await this.createDirectories(shareClient, [directoryPath]);
      await this.uploadFiles(shareClient, [workflowFile], directoryPath);
    }
  }
}
