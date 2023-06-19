/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { nodeJsCurrentVersion, nodeWingetPackageName, NodeVersion, Platform } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { executeCommand } from '../../utils/funcCoreTools/cpUtils';
import { hasNode, isCompatibleNodeVersion } from '../../utils/nodeJs/nodeUtils';
import { hasCompatibleNodeVersion, hasNvm, installNodeVersion, setCurrentNodeVersion } from '../../utils/nodeJs/nvmUtils';
import { installNvm } from './nvm/installNvm';
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
        await executeCommand(
          ext.outputChannel,
          undefined,
          'winget',
          'install',
          '-e',
          '--id',
          nodeWingetPackageName,
          '-v',
          nodeJsCurrentVersion
        );
        break;
      }

      // Has nvm = good scenario
      if (hasNodeVersionManager) {
        const hasCompatibleNodeVer = hasCompatibleNodeVersion();
        const message: string = hasCompatibleNodeVer
          ? localize('nvmDetected', 'Node Version Manager Detected. Use NodeJs v16?')
          : localize('nvmDetected', 'Node Version Manager Detected. Install NodeJs v16?');
        const action: MessageItem = hasCompatibleNodeVer ? { title: localize('action', 'Use') } : { title: localize('action', 'Install') };

        let result: MessageItem;
        do {
          result = await context.ui.showWarningMessage(message, action);
          if (result === action) {
            hasCompatibleNodeVer ? setCurrentNodeVersion(NodeVersion.v16) : installNodeVersion(NodeVersion.v16);
          }
        } while (result === DialogResponses.learnMore);
      }

      // Has node but no nvm
      if (hasNodeJs) {
        if (!isCompatibleNodeVersion()) {
          // windows nvm will ask users if nvm can manage the current node version
          const message: string = localize('existingNode', 'Existing incompatible NodeJs detected');
          const install: MessageItem = { title: localize('install', 'Install NVM') };
          let result: MessageItem;
          do {
            result = await context.ui.showWarningMessage(message, DialogResponses.learnMore);
            if (result === DialogResponses.learnMore) {
              openUrl('https://learn.microsoft.com/en-us/azure/logic-apps/create-single-tenant-workflows-visual-studio-code#prerequisites');
            } else if (result == install) {
              installNvm(context);
            }
          } while (result === DialogResponses.learnMore);
        }
      }
    }
  }
}
