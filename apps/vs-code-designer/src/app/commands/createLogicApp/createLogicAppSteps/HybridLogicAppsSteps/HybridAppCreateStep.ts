/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardExecuteStep } from '@microsoft/vscode-azext-utils';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';
import type { Progress } from 'vscode';
import { localize } from '../../../../../localize';
import { ext } from '../../../../../extensionVariables';
import { createHybridApp, createLogicAppExtension } from '../../../../utils/codeless/hybridLogicApp/hybridApp';
import type { ServiceClientCredentials } from '@azure/ms-rest-js';
import { getAccountCredentials } from '../../../../utils/credentials';
import { getAuthorizationToken } from '../../../../utils/codeless/getAuthorizationToken';

export class HybridAppCreateStep extends AzureWizardExecuteStep<ILogicAppWizardContext> {
  public priority = 120;

  public async execute(context: ILogicAppWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
    try {
      const message: string = localize('creatingNewHybridApp', 'Creating hybrid app "{0}"...', context.newSiteName);
      ext.outputChannel.appendLog(message);
      progress.report({ message });

      const credentials: ServiceClientCredentials | undefined = await getAccountCredentials();
      const accessToken = await getAuthorizationToken(credentials);

      const hybridAppOptions = {
        sqlConnectionString: context.sqlConnectionString,
        location: context._location.name,
        connectedEnvironment: context.connectedEnvironment,
        storageName: context.newSiteName,
        subscriptionId: context.subscriptionId,
        resourceGroup: context.resourceGroup.name,
        siteName: context.newSiteName,
      };

      context.hybridSite = await createHybridApp(context, accessToken, hybridAppOptions);
      await createLogicAppExtension(context, accessToken);
    } catch (error) {
      throw new Error(error);
    }
  }

  public shouldExecute(wizardContext: ILogicAppWizardContext): boolean {
    return !!wizardContext.connectedEnvironment && !!wizardContext.fileShare;
  }
}
