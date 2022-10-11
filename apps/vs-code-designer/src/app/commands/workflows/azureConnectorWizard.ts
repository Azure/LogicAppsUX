/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  workflowLocationKey,
  workflowManagementBaseURIKey,
  workflowResourceGroupNameKey,
  workflowSubscriptionIdKey,
  workflowTenantIdKey,
} from '../../../constants';
import { localize } from '../../../localize';
import { addOrUpdateLocalAppSettings } from '../../funcConfig/local.settings';
import { ResourceGroupListStep } from '@microsoft/vscode-azext-azureutils';
import { AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IActionContext, IAzureQuickPickItem, IWizardOptions } from '@microsoft/vscode-azext-utils';
import type { Progress } from 'vscode';

export interface IAzureConnectorsContext extends IActionContext {
  credentials: any;
  subscriptionId: any;
  resourceGroup: any;
  enabled: boolean;
  tenantId: any;
  environment: any;
}

export function createAzureWizard(wizardContext: IAzureConnectorsContext, projectPath: string): AzureWizard<IAzureConnectorsContext> {
  return new AzureWizard(wizardContext, {
    promptSteps: [new GetSubscriptionDetailsStep()],
    executeSteps: [new SaveAzureContext(projectPath)],
  });
}

class GetSubscriptionDetailsStep extends AzureWizardPromptStep<IAzureConnectorsContext> {
  public async prompt(context: IAzureConnectorsContext): Promise<void> {
    const placeHolder: string = localize('enableAzureResource', 'Enable connectors in Azure');
    const picks: IAzureQuickPickItem<string>[] = [
      { label: localize('useConnectorsFromAzure', 'Use connectors from Azure'), data: 'yes' },
      { label: localize('skipConnectorsFromAzure', 'Skip for now'), data: 'no' },
    ];
    // eslint-disable-next-line no-param-reassign
    context.enabled = (await context.ui.showQuickPick(picks, { placeHolder })).data === 'yes';
  }

  public shouldPrompt(context: IAzureConnectorsContext): boolean {
    return context.enabled === undefined;
  }

  public async getSubWizard(context: IAzureConnectorsContext): Promise<IWizardOptions<IAzureConnectorsContext> | undefined> {
    if (context.enabled) {
      const azurePromptSteps: AzureWizardPromptStep<IActionContext>[] = [];
      const subscriptionPromptStep: AzureWizardPromptStep<IActionContext> | undefined = undefined;
      if (subscriptionPromptStep) {
        azurePromptSteps.push(subscriptionPromptStep);
      }

      azurePromptSteps.push(new ResourceGroupListStep());

      return { promptSteps: azurePromptSteps };
    } else {
      return undefined;
    }
  }
}

class SaveAzureContext extends AzureWizardExecuteStep<IAzureConnectorsContext> {
  public priority = 100;
  private _projectPath: string;

  constructor(projectPath: string) {
    super();
    this._projectPath = projectPath;
  }

  public async execute(
    context: IAzureConnectorsContext,
    _progress: Progress<{ message?: string | undefined; increment?: number | undefined }>
  ): Promise<void> {
    const valuesToUpdateInSettings: Record<string, string> = {};
    if (context.enabled === false) {
      valuesToUpdateInSettings[workflowSubscriptionIdKey] = '';
    } else {
      const { resourceGroup, subscriptionId, tenantId, environment } = context;
      valuesToUpdateInSettings[workflowTenantIdKey] = tenantId;
      valuesToUpdateInSettings[workflowSubscriptionIdKey] = subscriptionId;
      valuesToUpdateInSettings[workflowResourceGroupNameKey] = resourceGroup?.name || '';
      valuesToUpdateInSettings[workflowLocationKey] = resourceGroup?.location || '';
      valuesToUpdateInSettings[workflowManagementBaseURIKey] = environment.resourceManagerEndpointUrl;
    }

    await addOrUpdateLocalAppSettings(context, this._projectPath, valuesToUpdateInSettings);
  }

  public shouldExecute(context: IAzureConnectorsContext): boolean {
    return context.enabled === false || !!context.subscriptionId || !!context.resourceGroup;
  }
}
