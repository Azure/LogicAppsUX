import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ProgressLocation, window } from 'vscode';
import type { SlotTreeItem } from '../../../tree/slotsTree/SlotTreeItem';
import { localize } from '../../../../localize';
import { connectToSMB } from './connectToSMB';
import { cleanSMB, unMountSMB } from './cleanResources';

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
        progress.report({ increment: 33, message: 'Connecting to SMB' });
        await connectToSMB(context, node);

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
