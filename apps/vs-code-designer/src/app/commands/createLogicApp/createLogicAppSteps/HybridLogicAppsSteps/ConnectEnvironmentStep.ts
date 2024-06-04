/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardExecuteStep } from '@microsoft/vscode-azext-utils';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';
import type { Progress } from 'vscode';
import { localize } from '../../../../../localize';
import { ext } from '../../../../../extensionVariables';
import { updateSMBConnectedEnvironment } from '../../../../utils/codeless/connectedEnvironment';

export class ConnectEnvironmentStep extends AzureWizardExecuteStep<ILogicAppWizardContext> {
  public priority = 140;

  public async execute(context: ILogicAppWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
    try {
      const message: string = localize('creatingNewApp', 'Updating SMB to connected environment  "{0}"...', context.newSiteName);
      ext.outputChannel.appendLog(message);
      progress.report({ message });

      const response = await updateSMBConnectedEnvironment(context);
      console.log(response);
    } catch (error) {
      return undefined;
    }
  }

  public shouldExecute(wizardContext: ILogicAppWizardContext): boolean {
    return !!wizardContext.customLocation && !!wizardContext.connectedEnvironment && !!wizardContext.fileShare;
  }
}
