/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deploymentsDirectory, diagnosticsDirectory, locksDirectory, wwwrootDirectory } from '../../../../../constants';
import { ext } from '../../../../../extensionVariables';
import { localize } from '../../../../../localize';
import { createStorageClient } from '../../../../utils/azureClients';
import { getNewFileShareName } from '../LogicAppCreateStep';
import type { StorageManagementClient, StorageAccountListKeysResult } from '@azure/arm-storage';
import { type ShareClient, ShareServiceClient, StorageSharedKeyCredential } from '@azure/storage-file-share';
import { AzureWizardExecuteStep, type IActionContext, callWithTelemetryAndErrorHandling, nonNullProp } from '@microsoft/vscode-azext-utils';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension';
import type * as vscode from 'vscode';

export class LogicAppCreateFileShareStep extends AzureWizardExecuteStep<ILogicAppWizardContext> {
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
      const storageShareClient = await this.createStorageShareClient(wizardContext, storageClient);
      const shareName = getNewFileShareName(nonNullProp(wizardContext, 'newSiteName'));
      const shareClient = storageShareClient.getShareClient(shareName);

      await this.createFileShare(shareClient);

      const rootDirectories = [deploymentsDirectory, diagnosticsDirectory, locksDirectory, wwwrootDirectory];
      await this.createDirectories(shareClient, rootDirectories);
    });
  }

  public shouldExecute(context: ILogicAppWizardContext): boolean {
    return !!context.useContainerApps;
  }

  private async createStorageShareClient(context: ILogicAppWizardContext, client: StorageManagementClient): Promise<ShareServiceClient> {
    const keys: StorageAccountListKeysResult = await client.storageAccounts.listKeys(
      context.resourceGroup.name,
      context.storageAccount.name
    );
    const credential = new StorageSharedKeyCredential(context.storageAccount.name, keys.keys[0].value);
    return new ShareServiceClient(`https://${context.storageAccount.name}.file.core.windows.net`, credential);
  }

  private async createFileShare(shareClient: ShareClient) {
    await shareClient.createIfNotExists();
  }

  private async createDirectories(shareClient: ShareClient, directories: string[]) {
    for (const directory of directories) {
      const directoryClient = shareClient.getDirectoryClient(directory);
      await directoryClient.createIfNotExists();
    }
  }
}
