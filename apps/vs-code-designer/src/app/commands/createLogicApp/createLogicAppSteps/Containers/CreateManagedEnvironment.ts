/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { appProvider, managedEnvironmentsId, operationalInsightsProvider } from '../../../../../constants';
import { localize } from '../../../../../localize';
import { createActivityContext } from '../../../../utils/activityUtils';
import { LogAnalyticsCreateStep } from './LogAnalyticsCreateStep';
import { ManagedEnvironmentCreateStep } from './ManagedEnvironmentCreateStep';
import { ManagedEnvironmentNameStep } from './ManagedEnvironmentNameStep';
import type { ManagedEnvironment } from '@azure/arm-appcontainers';
import type { Workspace } from '@azure/arm-operationalinsights';
import {
  type IResourceGroupWizardContext,
  LocationListStep,
  ResourceGroupCreateStep,
  VerifyProvidersStep,
} from '@microsoft/vscode-azext-azureutils';
import {
  AzureWizard,
  type AzureWizardExecuteStep,
  type AzureWizardPromptStep,
  type ExecuteActivityContext,
  type IActionContext,
  type ISubscriptionActionContext,
  createSubscriptionContext,
  nonNullProp,
} from '@microsoft/vscode-azext-utils';
import type { AzureSubscription } from '@microsoft/vscode-azureresources-api';

export interface IManagedEnvironmentContext extends ISubscriptionActionContext, IResourceGroupWizardContext, ExecuteActivityContext {
  subscription: AzureSubscription;
  newManagedEnvironmentName?: string;
  logAnalyticsWorkspace?: Workspace;
  managedEnvironment?: ManagedEnvironment;
}

export async function createManagedEnvironment(context: IActionContext, subscription: AzureSubscription): Promise<ManagedEnvironment> {
  const wizardContext: IManagedEnvironmentContext = {
    ...context,
    ...createSubscriptionContext(subscription),
    ...(await createActivityContext()),
    subscription,
  };

  const title: string = localize('createManagedEnv', 'Create Container Apps environment');
  const promptSteps: AzureWizardPromptStep<IManagedEnvironmentContext>[] = [];
  const executeSteps: AzureWizardExecuteStep<IManagedEnvironmentContext>[] = [];

  promptSteps.push(new ManagedEnvironmentNameStep());
  executeSteps.push(
    new VerifyProvidersStep([appProvider, operationalInsightsProvider]),
    new ResourceGroupCreateStep(),
    new LogAnalyticsCreateStep(),
    new ManagedEnvironmentCreateStep()
  );
  LocationListStep.addProviderForFiltering(wizardContext, appProvider, managedEnvironmentsId);
  LocationListStep.addStep(wizardContext, promptSteps);

  const wizard: AzureWizard<IManagedEnvironmentContext> = new AzureWizard(wizardContext, {
    title,
    promptSteps,
    executeSteps,
    showLoadingPrompt: true,
  });

  await wizard.prompt();
  const newManagedEnvName = nonNullProp(wizardContext, 'newManagedEnvironmentName');
  wizardContext.newResourceGroupName = newManagedEnvName;
  wizardContext.activityTitle = localize('createNamedManagedEnv', 'Create Container Apps environment "{0}"', newManagedEnvName);
  await wizard.execute();

  return wizardContext.managedEnvironment;
}
