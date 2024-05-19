/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { isMultiRootWorkspace } from '../../utils/workspace';
import { ResourceGroupListStep } from '@microsoft/vscode-azext-azureutils';
import { AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IActionContext, IWizardOptions } from '@microsoft/vscode-azext-utils';
import { OpenBehavior, type IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

export interface IAzureScriptWizard extends IProjectWizardContext, IActionContext {
  credentials: any;
  subscriptionId: any;
  resourceGroup: any;
  enabled: boolean;
  tenantId: any;
  environment: any;
  sourceControlPath?: string;
  storageAccountName: string;
  workspaceName?: string;
  logicAppName: string;
  appServicePlan: string;
  isValidWorkspace: boolean;
  folderPath?: string;
}

/**
 * Creates an instance of the Azure Wizard for the Azure Script Wizard.
 * @param wizardContext - The wizard context.
 * @returns An instance of the Azure Wizard.
 */
// Your existing function for creating the Azure Wizard
export function createAzureWizard(wizardContext: IAzureScriptWizard): AzureWizard<IAzureScriptWizard> {
  if (isMultiRootWorkspace) {
    wizardContext.isValidWorkspace = true;
  } else {
    wizardContext.isValidWorkspace = false;
  }

  // Create the Azure Wizard with the modified steps
  return new AzureWizard(wizardContext, {
    title: localize('generateDeploymentScripts', 'Generate deployment scripts'),
    promptSteps: [new ConfigureInitialLogicAppStep(), new setLogicappName(), new setStorageAccountName(), new setAppPlanName()],
    executeSteps: [new SourceControlPathListStep()],
    showLoadingPrompt: true,
  });
}

export class SourceControlPathListStep extends AzureWizardExecuteStep<IAzureScriptWizard> {
  public hideStepCount = true;
  public priority = 250;

  private async createDeploymentFolder(rootDir: string): Promise<string> {
    const deploymentsDir = path.join(rootDir, 'deployment');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }
    return deploymentsDir;
  }

  public static setSourceControlPath(context: Partial<IAzureScriptWizard>, artifactsPath: string): void {
    context.sourceControlPath = artifactsPath;
    context.workspacePath = (context.workspaceFolder && context.workspaceFolder.uri.fsPath) || context.customWorkspaceFolderPath;
    if (context.workspaceFolder) {
      context.openBehavior = OpenBehavior.alreadyOpen;
    }
  }

  public async execute(context: IAzureScriptWizard): Promise<void> {
    const workspaceFileUri = vscode.workspace.workspaceFile;
    let rootDir = context.customWorkspaceFolderPath;
    //change the root directory if unable to locate workspace file
    if (workspaceFileUri) {
      rootDir = path.dirname(workspaceFileUri.fsPath);
    } else {
      rootDir = context.folderPath;
    }

    const selectedPath = await this.createDeploymentFolder(rootDir);
    SourceControlPathListStep.setSourceControlPath(context, selectedPath);
  }

  public shouldExecute(): boolean {
    return true;
  }
}

// Define the ConfigureInitialLogicAppStep class
class ConfigureInitialLogicAppStep extends AzureWizardPromptStep<IAzureScriptWizard> {
  public async prompt(context: IAzureScriptWizard): Promise<void> {
    context.enabled = true;
  }

  public shouldPrompt(): boolean {
    return true;
  }

  public async getSubWizard(context: IAzureScriptWizard): Promise<IWizardOptions<IAzureScriptWizard> | undefined> {
    const azurePromptSteps: AzureWizardPromptStep<IActionContext>[] = [];
    const subscriptionPromptStep: AzureWizardPromptStep<IActionContext> | undefined =
      await ext.azureAccountTreeItem.getSubscriptionPromptStep(context);
    if (subscriptionPromptStep) {
      azurePromptSteps.push(subscriptionPromptStep);
    }

    azurePromptSteps.push(new ResourceGroupListStep());
    return { promptSteps: azurePromptSteps, showLoadingPrompt: true };
  }
}

// Define the setLogicappName class
export class setLogicappName extends AzureWizardPromptStep<IAzureScriptWizard> {
  public hideStepCount = true;

  public async prompt(context: IAzureScriptWizard): Promise<void> {
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

  public shouldPrompt(context: IAzureScriptWizard): boolean {
    return !context.logicAppName;
  }
}

// Define the setStorageAccountName class
export class setStorageAccountName extends AzureWizardPromptStep<IAzureScriptWizard> {
  public hideStepCount = true;

  public async prompt(context: IAzureScriptWizard): Promise<void> {
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

  public shouldPrompt(context: IAzureScriptWizard): boolean {
    return !context.storageAccountName;
  }
}

// Define the setAppPlanName class
export class setAppPlanName extends AzureWizardPromptStep<IAzureScriptWizard> {
  public hideStepCount = true;

  public async prompt(context: IAzureScriptWizard): Promise<void> {
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

  public shouldPrompt(context: IAzureScriptWizard): boolean {
    return !context.appServicePlan;
  }
}
