/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardExecuteStep } from '@microsoft/vscode-azext-utils';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';
import type { Progress } from 'vscode';
import { localize } from '../../../../../localize';
import { ext } from '../../../../../extensionVariables';
import { updateSMBConnectedEnvironment } from '../../../../utils/codeless/hybridLogicApp/connectedEnvironment';
import { getAuthorizationToken } from '../../../../utils/codeless/getAuthorizationToken';

/**
 * Represents a step in the hybrid logic app creation process that connects the SMB to a connected environment.
 */
export class ConnectEnvironmentStep extends AzureWizardExecuteStep<ILogicAppWizardContext> {
  public priority = 100;

  /**
   * Executes the step to connect to the environment.
   * @param {ILogicAppWizardContext} context - The logic app wizard context.
   * @param {Progress} progress - The progress object to report progress and messages.
   */
  public async execute(context: ILogicAppWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
    try {
      const message: string = localize('linkingSMBEnvironment', 'Linking SMB to connected environment  "{0}"...', context.newSiteName);
      ext.outputChannel.appendLog(message);
      progress.report({ message });
      const accessToken = await getAuthorizationToken(context.tenantId);

      await updateSMBConnectedEnvironment(
        accessToken,
        context.subscriptionId,
        context.connectedEnvironment.id,
        context.newSiteName,
        context.fileShare
      );
    } catch (error) {
      throw new Error(error);
    }
  }

  /**
   * Determines whether this step should be executed based on the wizard context.
   * @param wizardContext The logic app wizard context.
   * @returns A boolean indicating whether this step should be executed.
   */
  public shouldExecute(wizardContext: ILogicAppWizardContext): boolean {
    return !!wizardContext.connectedEnvironment && !!wizardContext.fileShare && !!wizardContext.useHybrid;
  }
}
