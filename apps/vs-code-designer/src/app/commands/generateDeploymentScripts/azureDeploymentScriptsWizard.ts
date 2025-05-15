/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { Site } from '@azure/arm-appservice';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { isMultiRootWorkspace } from '../../utils/workspace';
import { ResourceGroupListStep } from '@microsoft/vscode-azext-azureutils';
import { AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type {
  AzExtParentTreeItem,
  IActionContext,
  IAzureQuickPickItem,
  ISubscriptionContext,
  IWizardOptions,
} from '@microsoft/vscode-azext-utils';
import { DeploymentScriptType, OpenBehavior, type IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { LogicAppResolver } from '../../../LogicAppResolver';
import { SlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';
import { LogicAppResourceTree } from '../../tree/LogicAppResourceTree';
import { createContainerClient } from '../../utils/azureClients';
import { deploymentDirectory } from '../../../constants';

export interface IAzureDeploymentScriptsContext extends IProjectWizardContext, IActionContext {
  credentials: any;
  subscriptionId: any;
  resourceGroup: any;
  enabled: boolean;
  tenantId: any;
  environment: any;
  deploymentFolderPath?: string;
  storageAccountName: string;
  workspaceName?: string;
  logicAppName: string;
  localLogicAppName?: string;
  appServicePlan: string;
  isValidWorkspace: boolean;
  logicAppNode?: SlotTreeItem;
  uamiClientId?: string;
}

/**
 * Creates an instance of the Azure Wizard for deployment scripts generation.
 * @param context - The wizard context.
 * @returns An instance of the Azure Wizard.
 */
// Your existing function for creating the Azure Wizard
export function createAzureDeploymentScriptsWizard(context: IAzureDeploymentScriptsContext): AzureWizard<IAzureDeploymentScriptsContext> {
  context.isValidWorkspace = isMultiRootWorkspace();

  return new AzureWizard(context, {
    title: localize('generateDeploymentScripts', 'Generate deployment scripts'),
    promptSteps: [
      new SetSubscriptionAndResourceGroupStep(),
      new SetLogicAppNameStep(),
      new SetStorageAccountNameStep(),
      new SetAppPlanNameStep(),
      new SetLocalLogicAppNameStep(),
      new SetLogicAppStep(),
      new SetLogicAppUAMIStep(),
    ],
    executeSteps: [new SetDeploymentFolderPath()],
    showLoadingPrompt: true,
  });
}

export class SetDeploymentFolderPath extends AzureWizardExecuteStep<IAzureDeploymentScriptsContext> {
  public hideStepCount = true;
  public priority = 250;

  public async execute(context: IAzureDeploymentScriptsContext): Promise<void> {
    const workspaceFileUri = vscode.workspace.workspaceFile;
    let rootDir = context.customWorkspaceFolderPath;
    // Change the root directory if unable to locate workspace file
    if (workspaceFileUri) {
      rootDir = path.dirname(workspaceFileUri.fsPath);
    }

    SetDeploymentFolderPath.createDeploymentFolder(context, rootDir);
  }

  public shouldExecute(context: IAzureDeploymentScriptsContext): boolean {
    return context.deploymentScriptType === DeploymentScriptType.azureDevOpsPipeline;
  }

  private static createDeploymentFolder(context: IAzureDeploymentScriptsContext, rootDir: string) {
    const deploymentFolderPath = path.join(rootDir, deploymentDirectory);
    if (!fs.existsSync(deploymentFolderPath)) {
      fs.mkdirSync(deploymentFolderPath);
    }

    context.deploymentFolderPath = deploymentFolderPath;
    context.workspacePath = (context.workspaceFolder && context.workspaceFolder.uri.fsPath) || context.customWorkspaceFolderPath;
    if (context.workspaceFolder) {
      context.openBehavior = OpenBehavior.alreadyOpen;
    }
  }
}

class SetSubscriptionAndResourceGroupStep extends AzureWizardPromptStep<IAzureDeploymentScriptsContext> {
  public async prompt(_: IAzureDeploymentScriptsContext): Promise<void> {
    // No prompt needed for this step
  }

  public shouldPrompt(): boolean {
    return true;
  }

  public async getSubWizard(context: IAzureDeploymentScriptsContext): Promise<IWizardOptions<IAzureDeploymentScriptsContext> | undefined> {
    // TODO - this looks like it may have side effects by setting context.subscriptionId and context.resourceGroup
    const promptSteps: AzureWizardPromptStep<IActionContext>[] = [];
    const subscriptionPromptStep: AzureWizardPromptStep<IActionContext> | undefined =
      await ext.azureAccountTreeItem.getSubscriptionPromptStep(context);
    if (subscriptionPromptStep) {
      promptSteps.push(subscriptionPromptStep);
    }

    promptSteps.push(new ResourceGroupListStep());
    return { promptSteps, showLoadingPrompt: true };
  }
}

export class SetLogicAppNameStep extends AzureWizardPromptStep<IAzureDeploymentScriptsContext> {
  public hideStepCount = true;

  public async prompt(context: IAzureDeploymentScriptsContext): Promise<void> {
    context.logicAppName = await context.ui.showInputBox({
      placeHolder: localize('setLogicAppName', 'Logic app name'),
      prompt: localize('logicAppNamePrompt', 'Provide a unique name for the logic app.'),
      validateInput: (value: string): string | undefined => {
        if (!value || value.length === 0) {
          return localize('logicAppNameEmpty', 'Logic app name cannot be empty');
        }
        return undefined;
      },
    });
  }

  public shouldPrompt(context: IAzureDeploymentScriptsContext): boolean {
    return !context.logicAppName && context.deploymentScriptType === DeploymentScriptType.azureDevOpsPipeline;
  }
}

export class SetStorageAccountNameStep extends AzureWizardPromptStep<IAzureDeploymentScriptsContext> {
  public hideStepCount = true;

  public async prompt(context: IAzureDeploymentScriptsContext): Promise<void> {
    context.storageAccountName = await context.ui.showInputBox({
      placeHolder: localize('setStorageAccountName', 'Storage account name'),
      prompt: localize('storageAccountNamePrompt', 'Provide a unique name for the storage account.'),
      validateInput: (value: string): string | undefined => {
        if (!value || value.length === 0) {
          return localize('storageAccountNameEmpty', 'Storage account name cannot be empty');
        }
        return undefined;
      },
    });
  }

  public shouldPrompt(context: IAzureDeploymentScriptsContext): boolean {
    return !context.storageAccountName && context.deploymentScriptType === DeploymentScriptType.azureDevOpsPipeline;
  }
}

export class SetAppPlanNameStep extends AzureWizardPromptStep<IAzureDeploymentScriptsContext> {
  public hideStepCount = true;

  public async prompt(context: IAzureDeploymentScriptsContext): Promise<void> {
    context.appServicePlan = await context.ui.showInputBox({
      placeHolder: localize('setAppPlanName', 'App Service plan name'),
      prompt: localize('appPlanNamePrompt', 'Provide a unique name for the App Service plan.'),
      validateInput: (value: string): string | undefined => {
        if (!value || value.length === 0) {
          return localize('appPlanNameEmpty', 'App Service plan name cannot be empty');
        }
        return undefined;
      },
    });
  }

  public shouldPrompt(context: IAzureDeploymentScriptsContext): boolean {
    return !context.appServicePlan && context.deploymentScriptType === DeploymentScriptType.azureDevOpsPipeline;
  }
}

export class SetLocalLogicAppNameStep extends AzureWizardPromptStep<IAzureDeploymentScriptsContext> {
  public hideStepCount = true;

  public async prompt(context: IAzureDeploymentScriptsContext): Promise<void> {
    context.localLogicAppName = path.basename(context.projectPath);
  }

  public shouldPrompt(context: IAzureDeploymentScriptsContext): boolean {
    return !context.localLogicAppName && context.deploymentScriptType === DeploymentScriptType.azureDeploymentCenter;
  }
}

export class SetLogicAppStep extends AzureWizardPromptStep<IAzureDeploymentScriptsContext> {
  public hideStepCount = true;

  public async prompt(context: IAzureDeploymentScriptsContext): Promise<void> {
    const placeHolder: string = localize('selectLogicApp', 'Select Logic App (Standard) in Azure');
    const subscriptionNode = await ext.rgApi.appResourceTree.findTreeItem(`/subscriptions/${context.subscriptionId}`, context);
    if (!subscriptionNode) {
      throw new Error(localize('noMatchingSubscription', 'Failed to find a subscription matching id "{0}".', context.subscriptionId));
    }

    let site = (await context.ui.showQuickPick(SetLogicAppStep.getLogicAppsPicks(context, subscriptionNode.subscription), { placeHolder }))
      .data;

    if (site.id.includes('Microsoft.App')) {
      // NOTE(anandgmenon): Getting latest metadata for hybrid app as the one loaded from the cache can have outdated definition and cause deployment to fail.
      const clientContainer = await createContainerClient({ ...context, ...subscriptionNode.subscription });
      site = (await clientContainer.containerApps.get(site.id.split('/')[4], site.name)) as undefined as Site;
    }
    const resourceTree = new LogicAppResourceTree(subscriptionNode.subscription, site);

    context.logicAppNode = new SlotTreeItem(subscriptionNode as AzExtParentTreeItem, resourceTree);
    context.logicAppName = context.logicAppNode.site.siteName;
  }

  public shouldPrompt(context: IAzureDeploymentScriptsContext): boolean {
    return context.deploymentScriptType === DeploymentScriptType.azureDeploymentCenter;
  }

  private static async getLogicAppsPicks(context: IActionContext, subContext: ISubscriptionContext): Promise<IAzureQuickPickItem<Site>[]> {
    const logicAppsResolver = new LogicAppResolver();
    const sites = await logicAppsResolver.getAppResourceSiteBySubscription(context, subContext);
    const picks: { label: string; data: Site; description?: string }[] = [];

    Array.from(sites.logicApps).forEach(([_id, site]) => {
      picks.push({ label: site.name, data: site });
    });

    Array.from(sites.hybridLogicApps).forEach(([_id, site]) => {
      picks.push({ label: `${site.name} (Hybrid)`, data: site as unknown as Site });
    });

    picks.sort((a, b) => a.label.localeCompare(b.label));

    return picks;
  }
}

export class SetLogicAppUAMIStep extends AzureWizardPromptStep<IAzureDeploymentScriptsContext> {
  public hideStepCount = true;

  public async prompt(context: IAzureDeploymentScriptsContext): Promise<void> {
    const placeHolder: string = localize(
      'selectLogicAppUserAssignedManagedIdentity',
      'Select the Logic App User-Assigned Managed Identity to use for deployment'
    );
    const uamis = context.logicAppNode.site.rawSite.identity?.userAssignedIdentities;
    if (!uamis) {
      throw new Error(
        localize(
          'noUAMI',
          'No user assigned managed identity found. The Logic App must have a user assigned managed identity with contributor role on the deployment resource group.'
        )
      );
    }
    const uamiPicks: IAzureQuickPickItem<string>[] = Object.entries(uamis).map(([key, value]) => ({
      label: path.basename(key),
      data: value.clientId,
    }));

    context.uamiClientId = (await context.ui.showQuickPick(uamiPicks, { placeHolder })).data;
  }

  public shouldPrompt(context: IAzureDeploymentScriptsContext): boolean {
    return context.deploymentScriptType === DeploymentScriptType.azureDeploymentCenter;
  }
}
