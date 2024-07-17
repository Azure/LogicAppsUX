import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ProgressLocation, window } from 'vscode';
import type { SlotTreeItem } from '../../../tree/slotsTree/SlotTreeItem';
import { localize } from '../../../../localize';
import { connectToSMB } from './connectToSMB';
import { cleanSMB, deleteSMBFolder, unMountSMB } from './cleanResources';
import { getRandomHexString } from '../../../utils/fs';
import { createHybridApp } from '../../../utils/codeless/hybridLogicApp/hybridApp';
import { updateSMBConnectedEnvironment } from '../../../utils/codeless/hybridLogicApp/connectedEnvironment';
import path from 'path';
import type { ServiceClientCredentials } from '@azure/ms-rest-js';
import { getAuthorizationToken } from '../../../utils/codeless/getAuthorizationToken';
import { getAccountCredentials } from '../../../utils/credentials';

export const deployHybridLogicApp = async (context: IActionContext, node: SlotTreeItem) => {
  try {
    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: localize('deployingHibridLogicApp', 'Deploying hybrid logic app'),
        cancellable: true,
      },
      async (progress) => {
        context.telemetry.properties.lastStep = 'connectToSMB';
        const smbFolderName = `${node.hybridSite.name}-${getRandomHexString(32 - node.hybridSite.name.length - 1)}`.toLowerCase();
        const mountDrive = 'X:';

        const credentials: ServiceClientCredentials | undefined = await getAccountCredentials();
        const accessToken = await getAuthorizationToken(credentials);

        progress.report({ increment: 16, message: 'Connecting to SMB' });
        await connectToSMB(context, node, smbFolderName, mountDrive);

        progress.report({ increment: 16, message: 'Update SMB connected environment' });
        await updateSMBConnectedEnvironment(accessToken, node.subscription.subscriptionId, node.connectedEnvironment, smbFolderName, {
          ...node.fileShare,
          path: path.join(node.fileShare.path, smbFolderName),
        });

        progress.report({ increment: 16, message: 'Connecting to SMB' });
        const hybridAppOptions = {
          sqlConnectionString: node.sqlConnectionString,
          location: node.location,
          connectedEnvironment: node.connectedEnvironment,
          storageName: smbFolderName,
          subscriptionId: node.subscription.subscriptionId,
          resourceGroup: node.resourceGroupName,
          siteName: node.hybridSite.name,
        };
        await createHybridApp(context, accessToken, hybridAppOptions);

        progress.report({ increment: 16, message: 'Deleting SMB folder' });
        await deleteSMBFolder(mountDrive, smbFolderName);

        progress.report({ increment: 16, message: 'Unmounting SMB' });
        await unMountSMB(mountDrive);

        progress.report({ increment: 20, message: 'Cleaning SMB' });
        await cleanSMB(node, accessToken);
      }
    );
  } catch (error) {
    throw new Error(`${localize('errorDeployingHybridLogicApp', 'Error deploying hybrid logic app')} - ${error.message}`);
  }
};
