/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import type { SlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import type { MessageItem } from 'vscode';
import { window } from 'vscode';

/**
 * Shows information message after the creation of Logic app has been completed and let user select post actions.
 * @param {SlotTreeItem} node - Logic app node structure.
 */
export async function notifyCreateLogicAppComplete(node: SlotTreeItem): Promise<void> {
  const deployComplete: string = localize(
    'creationComplete',
    'Creation of "{0}" completed.',
    node.isHybridLogicApp ? node.hybridSite.name : node.site.fullName
  );
  const viewOutput: MessageItem = { title: localize('viewOutput', 'View output') };

  window.showInformationMessage(deployComplete, viewOutput).then(async (result) => {
    await callWithTelemetryAndErrorHandling('postCreation', async (postDeployContext: IActionContext) => {
      postDeployContext.telemetry.properties.dialogResult = result && result.title;
      if (result === viewOutput) {
        ext.outputChannel.show();
      }
    });
  });
}
