/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { managedEnvironmentsAppProvider } from '../../../../../constants';
import { ext } from '../../../../../extensionVariables';
import { localize } from '../../../../../localize';
import { createContainerClient } from '../../../../utils/azureClients';
import type { IManagedEnvironmentContext } from './CreateManagedEnvironment';
import type { ContainerAppsAPIClient } from '@azure/arm-appcontainers';
import { createOperationalInsightsManagementClient } from '@microsoft/vscode-azext-azureappservice';
import { getResourceGroupFromId, LocationListStep } from '@microsoft/vscode-azext-azureutils';
import { AzureWizardExecuteStep, nonNullProp, nonNullValueAndProp } from '@microsoft/vscode-azext-utils';
import type { Progress } from 'vscode';

export class ManagedEnvironmentCreateStep extends AzureWizardExecuteStep<IManagedEnvironmentContext> {
  public priority = 250;

  public async execute(
    context: IManagedEnvironmentContext,
    progress: Progress<{ message?: string | undefined; increment?: number | undefined }>
  ): Promise<void> {
    const client: ContainerAppsAPIClient = await createContainerClient(context);
    const opClient = await createOperationalInsightsManagementClient(context);
    const rgName = nonNullValueAndProp(context.resourceGroup, 'name');
    const logAnalyticsWorkspace = nonNullProp(context, 'logAnalyticsWorkspace');

    const creatingKuEnv = localize(
      'creatingManagedEnvironment',
      'Creating new Container Apps environment "{0}"...',
      context.newManagedEnvironmentName
    );
    progress.report({ message: creatingKuEnv });
    ext.outputChannel.appendLog(creatingKuEnv);

    const sharedKeys = await opClient.sharedKeysOperations.getSharedKeys(
      getResourceGroupFromId(nonNullProp(logAnalyticsWorkspace, 'id')),
      nonNullProp(logAnalyticsWorkspace, 'name')
    );

    context.managedEnvironment = await client.managedEnvironments.beginCreateOrUpdateAndWait(
      rgName,
      nonNullProp(context, 'newManagedEnvironmentName'),
      {
        location: (await LocationListStep.getLocation(context)).name,
        appLogsConfiguration: {
          destination: 'log-analytics',
          logAnalyticsConfiguration: {
            customerId: nonNullProp(context, 'logAnalyticsWorkspace').customerId,
            sharedKey: sharedKeys.primarySharedKey,
          },
        },
      }
    );

    context.activityResult = {
      id: nonNullProp(context.managedEnvironment, 'id'),
      name: nonNullProp(context, 'newManagedEnvironmentName'),
      type: managedEnvironmentsAppProvider,
    };

    const createdKuEnv = localize(
      'createKuEnv',
      'Successfully created new Container Apps environment "{0}".',
      context.newManagedEnvironmentName
    );
    ext.outputChannel.appendLog(createdKuEnv);
  }

  public shouldExecute(context: IManagedEnvironmentContext): boolean {
    return !context.managedEnvironment;
  }
}
