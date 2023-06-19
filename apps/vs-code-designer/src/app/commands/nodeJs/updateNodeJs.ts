/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { hasNvm } from '../../utils/nodeJs/nvmUtils';
import { DialogResponses, openUrl } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { MessageItem } from 'vscode';

export async function updateNodeJs(context: IActionContext): Promise<void> {
  ext.outputChannel.show();
  context.telemetry.properties.isUpdating = 'true';
  // prerequisite check: Checked that there is a node version installed != v16
  // Must have nvm installed in order to upgrade
  if (!hasNvm()) {
    const message: string = localize('existingNode', 'Existing NodeJs detected');
    let result: MessageItem;
    do {
      result = await context.ui.showWarningMessage(message, DialogResponses.learnMore);
      if (result === DialogResponses.learnMore) {
        openUrl(
          'https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-windows#install-nvm-windows-nodejs-and-npm'
        );
      }
    } while (result === DialogResponses.learnMore);
  }
}
