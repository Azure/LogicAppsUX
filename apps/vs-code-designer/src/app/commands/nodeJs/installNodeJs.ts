/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NodeVersion, Platform } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { hasNode, isCompatibleNodeVersion } from '../../utils/nodeJs/nodeUtils';
import { hasCompatibleNodeVersion, hasNvm, installNodeVersion, setCurrentNodeVersion } from '../../utils/nodeJs/nvmUtils';
import { DialogResponses, openUrl } from '@microsoft/vscode-azext-utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { MessageItem } from 'vscode';

export async function installNodeJs(context: IActionContext): Promise<void> {
  ext.outputChannel.show();
  context.telemetry.properties.installNodeJs = 'true';

  const hasNodeJs: boolean = await hasNode();
  const hasNodeVersionManager: boolean = await hasNvm();

  switch (process.platform) {
    case Platform.windows: {
      // No node & no nvm = good scenario
      if (!hasNodeJs && !hasNodeVersionManager) {
        await executeCommand(ext.outputChannel, undefined, 'winget', 'install', `nodejs`);
        break;
      }
      // Has nvm = good scenario
      if (hasNodeVersionManager) {
        // Could we just always install node 16?
        hasCompatibleNodeVersion() ? setCurrentNodeVersion(NodeVersion.v16) : installNodeVersion(NodeVersion.v16);
      }
      // Yes node but No nvm
      if (hasNodeJs) {
        if (!isCompatibleNodeVersion()) {
          // Notifies Users of existing incompatible node version
          // Users have to manually uninstall node and then install nvm
          // Should we do this for them? risk of losing existing node_modules
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
    }
  }
}
