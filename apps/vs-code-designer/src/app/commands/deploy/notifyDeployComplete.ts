/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import type { SlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';
// import { uploadAppSettings } from "../appSettings/uploadAppSettings";
import { startStreamingLogs } from '../logstream/startStreamingLogs';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import type { MessageItem, WorkspaceFolder } from 'vscode';
import { Uri, env, window } from 'vscode';

/**
 * Shows information message after deployment has been completed and let user select post actions.
 * @param {SlotTreeItem} node - Logic app node structure.
 * @param {WorkspaceFolder} workspaceFolder - Workspace folder path.
 * @param {string[]} settingsToExclude - Array of settings to exclude from uploading.
 */
export async function notifyDeployComplete(
  node: SlotTreeItem,
  _workspaceFolder: WorkspaceFolder,
  _settingsToExclude?: string[]
): Promise<void> {
  const deployComplete: string = localize('deployComplete', 'Deployment to "{0}" completed.', node.containerAppName);
  const viewOutput: MessageItem = {
    title: localize('viewOutput', 'View output'),
  };
  const streamLogs: MessageItem = {
    title: localize('streamLogs', 'Stream logs'),
  };
  const openLogicApp: MessageItem = {
    title: localize('openLogicApp', 'Open Logic App resource'),
  };
  // const uploadSettings: MessageItem = { title: localize('uploadAppSettings', 'Upload settings') };

  window.showInformationMessage(deployComplete, streamLogs, viewOutput, openLogicApp).then(async (result) => {
    await callWithTelemetryAndErrorHandling('postDeploy', async (postDeployContext: IActionContext) => {
      postDeployContext.telemetry.properties.dialogResult = result && result.title;
      if (result === viewOutput) {
        ext.outputChannel.show();
      } else if (result === streamLogs) {
        await startStreamingLogs(postDeployContext, node);
      } else if (result === openLogicApp) {
        env.openExternal(
          Uri.parse(
            `https://ms.portal.azure.com/?feature.canmodifystamps=true&Microsoft_Azure_EMA=travis&WebsitesExtension=beta&feature.fastmanifest=false&nocdn=force&websitesextension_functionsnext=true&WebsitesExtension_useReactFrameBlade=true&websitesextension_newchangeasp=true&feature.fullscreenblades=true&websitesextension_loglevel=verbose&Microsoft_Azure_PaasServerless_functionsnext=true&Microsoft_Azure_PaasServerless=beta#@microsoft.onmicrosoft.com/resource/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/resourceGroups/hybridresourcegroup/providers/Microsoft.App/containerApps/${node.containerAppName}/containerapp`
          )
        );
      }
    });
  });
}
