/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import type { SlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';
import { uploadAppSettings } from '../appSettings/uploadAppSettings';
import { startStreamingLogs } from '../logstream/startStreamingLogs';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import type { MessageItem, WorkspaceFolder } from 'vscode';
import { window } from 'vscode';

/**
 * Shows information message after deployment has been completed and let user select post actions.
 * @param {SlotTreeItem} node - Logic app node structure.
 * @param {WorkspaceFolder} workspaceFolder - Workspace folder path.
 * @param {string[]} settingsToExclude - Array of settings to exclude from uploading.
 */
export async function notifyDeployComplete(
  node: SlotTreeItem,
  workspaceFolder: WorkspaceFolder,
  isHybridLogiApp: boolean,
  settingsToExclude?: string[]
): Promise<void> {
  const deployComplete: string = localize(
    'deployComplete',
    'Deployment to "{0}" completed.',
    node.isHybridLogicApp ? node.hybridSite.name : node.site.fullName
  );

  if (isHybridLogiApp) {
    window.showInformationMessage(deployComplete);
  }

  const viewOutput: MessageItem = { title: localize('viewOutput', 'View output') };
  const streamLogs: MessageItem = { title: localize('streamLogs', 'Stream logs') };
  const uploadSettings: MessageItem = { title: localize('uploadAppSettings', 'Upload settings') };

  // NOTE(anandgmenon): For hybrid, we update app settings by default already.
  const items = node.isHybridLogicApp ? [viewOutput, streamLogs] : [viewOutput, streamLogs, uploadSettings];

  window.showInformationMessage(deployComplete, ...items).then(async (result) => {
    await callWithTelemetryAndErrorHandling('postDeploy', async (postDeployContext: IActionContext) => {
      postDeployContext.telemetry.properties.dialogResult = result && result.title;
      if (result === viewOutput) {
        ext.outputChannel.show();
      } else if (result === streamLogs) {
        await startStreamingLogs(postDeployContext, node);
      } else if (result === uploadSettings) {
        await uploadAppSettings(postDeployContext, node.appSettingsTreeItem, undefined, workspaceFolder, settingsToExclude);
      }
    });
  });
}
