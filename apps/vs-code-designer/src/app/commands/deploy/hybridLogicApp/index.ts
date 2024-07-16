import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ProgressLocation, window } from 'vscode';
import type { SlotTreeItem } from '../../../tree/slotsTree/SlotTreeItem';
import { localize } from '../../../../localize';
import { connectToSMB } from './connectToSMB';
import { cleanSMB, deleteSMBFolder, unMountSMB } from './cleanResources';
import { guid } from '@microsoft/logic-apps-shared';
import { createHybridAppSMB } from './createHybridSMB';

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
        const smbFolderName = `${node.hybridSite.name}-${guid()}`;
        const mountDrive = 'X:';
        progress.report({ increment: 20, message: 'Connecting to SMB' });
        await connectToSMB(context, node, smbFolderName, mountDrive);

        progress.report({ increment: 20, message: 'Connecting to SMB' });
        await createHybridAppSMB(context, node, smbFolderName, mountDrive);
        
        progress.report({ increment: 20, message: 'Unmounting SMB' });
        await unMountSMB(mountDrive);

        progress.report({ increment: 20, message: 'Deleting SMB folder' });
        await deleteSMBFolder(mountDrive, smbFolderName);

        progress.report({ increment: 20, message: 'Cleaning SMB' });
        await cleanSMB(node);

      }
    );
  } catch (error) {
    console.log('error', error);
  }
};
