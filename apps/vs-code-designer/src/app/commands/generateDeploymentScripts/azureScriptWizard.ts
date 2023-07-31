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
import { ext } from '../../../extensionVariables';
import { addOrUpdateLocalAppSettings } from '../../utils/appSettings/localSettings';
import { UserInput } from './iacGestureHelperFunctions';
import { ResourceGroupListStep } from '@microsoft/vscode-azext-azureutils';
import { AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IActionContext, IWizardOptions } from '@microsoft/vscode-azext-utils';
import type { Progress } from 'vscode';

// Define the interface for the Azure Script Wizard
export interface IAzureScriptWizard extends IActionContext {
  credentials: any;
  subscriptionId: any;
  resourceGroup: any;
  enabled: boolean;
  tenantId: any;
  environment: any;
  sourceControlPath?: string;
}

// Define a new Wizard Step class
class GetSourceControlPathStep extends AzureWizardPromptStep<IAzureScriptWizard> {
  public async prompt(context: IAzureScriptWizard): Promise<void> {
    context.sourceControlPath = await UserInput.promptForSourceControlPath();
  }

  public shouldPrompt(context: IAzureScriptWizard): boolean {
    return context.sourceControlPath === undefined;
  }
}

/**
 * Creates an instance of the Azure Wizard for the Azure Script Wizard.
 * @param wizardContext - The wizard context.
 * @param projectPath - The path of the project.
 * @returns An instance of the Azure Wizard.
 */
export function createAzureWizard(wizardContext: IAzureScriptWizard, projectPath: string): AzureWizard<IAzureScriptWizard> {
  return new AzureWizard(wizardContext, {
    promptSteps: [new GetSubscriptionDetailsStep(), new GetSourceControlPathStep()],
    executeSteps: [new SaveAzureContext(projectPath)],
  });
}

// Define the GetSubscriptionDetailsStep class
class GetSubscriptionDetailsStep extends AzureWizardPromptStep<IAzureScriptWizard> {
  public async prompt(context: IAzureScriptWizard): Promise<void> {
    context.enabled = true; // Set the enabled flag to true to skip the connector prompt
  }

  public shouldPrompt(context: IAzureScriptWizard): boolean {
    return context.enabled === undefined;
  }

  public async getSubWizard(context: IAzureScriptWizard): Promise<IWizardOptions<IAzureScriptWizard> | undefined> {
    const azurePromptSteps: AzureWizardPromptStep<IActionContext>[] = [];
    const subscriptionPromptStep: AzureWizardPromptStep<IActionContext> | undefined =
      await ext.azureAccountTreeItem.getSubscriptionPromptStep(context);
    if (subscriptionPromptStep) {
      azurePromptSteps.push(subscriptionPromptStep);
    }

    azurePromptSteps.push(new ResourceGroupListStep());

    return { promptSteps: azurePromptSteps };
  }
}

// Define the SaveAzureContext class
class SaveAzureContext extends AzureWizardExecuteStep<IAzureScriptWizard> {
  public priority = 100;
  private _projectPath: string;

  constructor(projectPath: string) {
    super();
    this._projectPath = projectPath;
  }

  public async execute(
    context: IAzureScriptWizard,
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

  public shouldExecute(context: IAzureScriptWizard): boolean {
    return context.enabled === false || !!context.subscriptionId || !!context.resourceGroup;
  }
}
