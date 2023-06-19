/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { DialogResponses, openUrl } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { MessageItem } from 'vscode';

export async function uninstallNvm(context: IActionContext): Promise<void> {
  ext.outputChannel.show();

  // Uninstalling nvm will uninstall ALL node-versions
  const message: string = localize('uninstall', 'Unable to uninstall Node Version Manager');
  let result: MessageItem;
  do {
    result = await context.ui.showWarningMessage(message, DialogResponses.learnMore);
    if (result === DialogResponses.learnMore) {
      openUrl('https://github.com/coreybutler/nvm-windows/wiki#uninstall');
    }
  } while (result === DialogResponses.learnMore);
}
