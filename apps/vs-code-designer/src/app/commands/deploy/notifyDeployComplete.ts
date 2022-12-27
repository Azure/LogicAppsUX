/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import type { SlotTreeItemBase } from '../../tree/slotsTree/SlotTreeItemBase';
import { uploadAppSettings } from '../../utils/appSettings/uploadAppSettings';
import { startStreamingLogs } from '../logstream/startStreamingLogs';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import type { MessageItem, WorkspaceFolder } from 'vscode';
import { window } from 'vscode';

export async function notifyDeployComplete(
  node: SlotTreeItemBase,
  workspaceFolder: WorkspaceFolder,
  settingsToExclude?: string[]
): Promise<void> {
  const deployComplete: string = localize('deployComplete', 'Deployment to "{0}" completed.', node.site.fullName);
  const viewOutput: MessageItem = { title: localize('viewOutput', 'View output') };
  const streamLogs: MessageItem = { title: localize('streamLogs', 'Stream logs') };
  const uploadSettings: MessageItem = { title: localize('uploadAppSettings', 'Upload settings') };

  window.showInformationMessage(deployComplete, streamLogs, uploadSettings, viewOutput).then(async (result) => {
    await callWithTelemetryAndErrorHandling('postDeploy', async (postDeployContext: IActionContext) => {
      postDeployContext.telemetry.properties.dialogResult = result && result.title;
      if (result === viewOutput) {
        ext.outputChannel.show();
      } else if (result === streamLogs) {
        await startStreamingLogs(postDeployContext, node);
      } else if (result === uploadSettings) {
        await uploadAppSettings(postDeployContext, node.appSettingsTreeItem, workspaceFolder, settingsToExclude);
      }
    });
  });
}
