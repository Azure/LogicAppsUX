import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ProgressLocation, window } from 'vscode';
import type { SlotTreeItem } from '../../../tree/slotsTree/SlotTreeItem';
import { localize } from '../../../../localize';
import { connectToSMB } from './connectToSMB';
import { cleanSMB } from './cleanResources';

export const deployHybridLogicApp = async (context: IActionContext, node: SlotTreeItem) => {
  await window.withProgress(
    {
      location: ProgressLocation.Notification,
      title: localize('deployingHibridLogicApp', 'Deploying hybrid logic app'),
      cancellable: true,
    },
    async (progress) => {
      context.telemetry.properties.lastStep = 'connectToSMB';
      progress.report({ increment: 10, message: 'Connecting to SMB' });
      await connectToSMB(context, node);
      await cleanSMB(context, node);
    }
  );
};
