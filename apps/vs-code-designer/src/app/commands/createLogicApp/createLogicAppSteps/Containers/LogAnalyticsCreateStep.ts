/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../../../extensionVariables';
import { localize } from '../../../../../localize';
import type { IManagedEnvironmentContext } from './CreateManagedEnvironment';
import { createOperationalInsightsManagementClient } from '@microsoft/vscode-azext-azureappservice';
import { LocationListStep } from '@microsoft/vscode-azext-azureutils';
import { AzureWizardExecuteStep, nonNullProp, nonNullValue } from '@microsoft/vscode-azext-utils';
import type { Progress } from 'vscode';

export class LogAnalyticsCreateStep extends AzureWizardExecuteStep<IManagedEnvironmentContext> {
  public priority = 220;

  public async execute(
    context: IManagedEnvironmentContext,
    progress: Progress<{ message?: string | undefined; increment?: number | undefined }>
  ): Promise<void> {
    const opClient = await createOperationalInsightsManagementClient(context);
    const rg = nonNullValue(context.resourceGroup);
    const creatingLaw: string = localize('creatingLogAnalyticsWorkspace', 'Creating new Log Analytics workspace...');
    progress.report({ message: creatingLaw });
    ext.outputChannel.appendLog(creatingLaw);
    context.logAnalyticsWorkspace = await opClient.workspaces.beginCreateOrUpdateAndWait(
      nonNullProp(rg, 'name'),
      nonNullProp(context, 'newManagedEnvironmentName'),
      { location: (await LocationListStep.getLocation(context)).name }
    );

    const createdLaw: string = localize('createdLogAnalyticWorkspace', 'Successfully created new log analytic workspace.');
    ext.outputChannel.appendLog(createdLaw);
    void progress.report({ message: createdLaw });
  }

  public shouldExecute(context: IManagedEnvironmentContext): boolean {
    return !context.logAnalyticsWorkspace;
  }
}
