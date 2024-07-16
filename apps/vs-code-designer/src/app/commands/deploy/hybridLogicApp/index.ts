import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ProgressLocation, window } from 'vscode';
import type { SlotTreeItem } from '../../../tree/slotsTree/SlotTreeItem';
import { localize } from '../../../../localize';
import { connectToSMB } from './connectToSMB';
import { cleanSMB, unMountSMB } from './cleanResources';
import { guid } from '@microsoft/logic-apps-shared';

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
        progress.report({ increment: 33, message: 'Connecting to SMB' });
        await connectToSMB(context, node, smbFolderName, mountDrive);

        progress.report({ increment: 33, message: 'Cleaning SMB' });
        await cleanSMB(context, node);

        progress.report({ increment: 34, message: 'Unmounting SMB' });
        await unMountSMB(node.fileShare.hostName);
      }
    );
  } catch (error) {
    console.log('error', error);
  }
};
