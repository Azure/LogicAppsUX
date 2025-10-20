/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ResourceGroupListStep } from '@microsoft/vscode-azext-azureutils';
import { AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IActionContext, IAzureQuickPickItem, IWizardOptions } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import * as path from 'path';
import type { Progress } from 'vscode';
import {
  workflowAuthenticationMethodKey,
  workflowLocationKey,
  workflowManagementBaseURIKey,
  workflowResourceGroupNameKey,
  workflowSubscriptionIdKey,
  workflowTenantIdKey,
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { addOrUpdateLocalAppSettings } from '../../utils/appSettings/localSettings';
import { AuthenticationMethodSelectionStep } from './authenticationMethodStep';

export interface IAzureConnectorsContext extends IActionContext, IProjectWizardContext {
  credentials: any;
  subscriptionId: any;
  resourceGroup: any;
  enabled: boolean;
  tenantId: any;
  environment: any;
  authenticationMethod?: string;
  MSIenabled?: boolean;
}

export function createAzureWizard(wizardContext: IAzureConnectorsContext, projectPath: string): AzureWizard<IAzureConnectorsContext> {
  return new AzureWizard(wizardContext, {
    promptSteps: [new GetSubscriptionDetailsStep(projectPath), createAuthenticationStep()],
    executeSteps: [new SaveAzureContext(projectPath)],
  });
}
class GetSubscriptionDetailsStep extends AzureWizardPromptStep<IAzureConnectorsContext> {
  private _projectPath: string;

  constructor(projectPath: string) {
    super();
    this._projectPath = projectPath;
  }

  public async prompt(context: IAzureConnectorsContext): Promise<void> {
    const placeHolder: string = localize(
      'enableAzureResource',
      `Enable connectors in Azure for Logic App ${path.basename(this._projectPath)}`
    );
    const picks: IAzureQuickPickItem<string>[] = [
      { label: localize('useConnectorsFromAzure', 'Use connectors from Azure'), data: 'yes' },
      { label: localize('skipConnectorsFromAzure', 'Skip for now'), data: 'no' },
    ];
    context.enabled = (await context.ui.showQuickPick(picks, { placeHolder })).data === 'yes';
  }

  public shouldPrompt(context: IAzureConnectorsContext): boolean {
    return context.enabled === undefined;
  }

  public async getSubWizard(context: IAzureConnectorsContext): Promise<IWizardOptions<IAzureConnectorsContext> | undefined> {
    if (context.enabled) {
      const azurePromptSteps: AzureWizardPromptStep<IActionContext>[] = [];
      const subscriptionPromptStep: AzureWizardPromptStep<IActionContext> | undefined =
        await ext.azureAccountTreeItem.getSubscriptionPromptStep(context);
      if (subscriptionPromptStep) {
        azurePromptSteps.push(subscriptionPromptStep);
      }

      azurePromptSteps.push(new ResourceGroupListStep());

      return { promptSteps: azurePromptSteps };
    }
    return undefined;
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
      // Save the authentication method to local settings
      if (context.authenticationMethod) {
        valuesToUpdateInSettings[workflowAuthenticationMethodKey] = context.authenticationMethod;
      }
    }

    await addOrUpdateLocalAppSettings(context, this._projectPath, valuesToUpdateInSettings);
  }

  public shouldExecute(context: IAzureConnectorsContext): boolean {
    return context.enabled === false || !!context.subscriptionId || !!context.resourceGroup;
  }
}

//TODO: Update to be in webview after ignite redesign is done

/**
 * Creates an authentication step with MSIenabled setting
 */
function createAuthenticationStep(): AuthenticationMethodSelectionStep<IAzureConnectorsContext> {
  return new AuthenticationMethodSelectionStep<IAzureConnectorsContext>();
}
