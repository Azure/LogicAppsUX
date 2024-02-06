/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { isMultiRootWorkspace, selectWorkspaceFolder } from '../../utils/workspace';
import { ResourceGroupListStep } from '@microsoft/vscode-azext-azureutils';
import { AzureWizard, AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IActionContext, IWizardOptions } from '@microsoft/vscode-azext-utils';
import { OpenBehavior, type IProjectWizardContext } from '@microsoft/vscode-extension';
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
 * @param projectPath - The path of the project.
 * @returns An instance of the Azure Wizard.
 */
// Your existing function for creating the Azure Wizard
export function createAzureWizard(wizardContext: IAzureScriptWizard): AzureWizard<IAzureScriptWizard> {
  const promptSteps = [
    new ConfigureInitialLogicAppStep(),
    new setLogicappName(),
    new setStorageAccountName(),
    new setAppPlantName(),
    new SourceControlPathListStep(),
  ];

  if (!isMultiRootWorkspace) {
    wizardContext.isValidWorkspace = false;
  } else {
    wizardContext.isValidWorkspace = true;
  }

  // Create the Azure Wizard with the modified steps
  return new AzureWizard(wizardContext, {
    promptSteps,
  });
}

export class SourceControlPathListStep extends AzureWizardPromptStep<IAzureScriptWizard> {
  public hideStepCount = true;

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

  public async prompt(context: IAzureScriptWizard): Promise<void> {
    const workspaceFileUri = vscode.workspace.workspaceFile;
    let rootDir = context.customWorkspaceFolderPath;
    //change the root directory if unable to locate workspace file
    if (!workspaceFileUri) {
      rootDir = context.folderPath;
    } else {
      rootDir = path.dirname(workspaceFileUri.fsPath);
    }

    let deploymentFolderExists = false;
    if (rootDir) {
      deploymentFolderExists = fs.existsSync(path.join(rootDir, 'deployment'));
    }

    const deploymentLabel = deploymentFolderExists ? 'Deployment folder in current workspace' : 'New deployment folder';

    const placeHolder = 'Select the folder to store your deployment artifacts';
    const options: vscode.QuickPickItem[] = [
      {
        label: deploymentLabel,
        description: deploymentFolderExists
          ? 'Uses the existing deployment folder in the current workspace.'
          : 'Creates a new deployment folder in the current workspace.',
      },
      {
        label: 'Choose a different folder.',
        description: 'Select a different folder in the current workspace.',
      },
    ];

    const userChoice = await vscode.window.showQuickPick(options, { placeHolder });

    if (userChoice) {
      let selectedPath: string | undefined;

      if (userChoice.label === deploymentLabel && rootDir) {
        selectedPath = await this.createDeploymentFolder(rootDir);
      } else if (userChoice.label === 'Choose a different folder.') {
        selectedPath = await selectWorkspaceFolder(context, placeHolder);
      }

      if (selectedPath) {
        SourceControlPathListStep.setSourceControlPath(context, selectedPath);
      }
    }
  }

  public shouldPrompt(_context: IAzureScriptWizard): boolean {
    return true;
  }
}

// Define the ConfigureInitialLogicAppStep class
class ConfigureInitialLogicAppStep extends AzureWizardPromptStep<IAzureScriptWizard> {
  public async prompt(context: IAzureScriptWizard): Promise<void> {
    context.enabled = true;
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

// Define the setLogicappName class
export class setLogicappName extends AzureWizardPromptStep<IAzureScriptWizard> {
  public hideStepCount = true;

  public async prompt(context: IAzureScriptWizard): Promise<void> {
    context.logicAppName = await context.ui.showInputBox({
      placeHolder: localize('setLogicappName', 'logicappName'),
      prompt: localize('logicappNamePrompt', 'Provide a unique name for the logic app.'),
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
      placeHolder: localize('setStorageAccountName', 'storageAccountName'),
      prompt: localize('storageAccountNamePrompt', 'Provide a unique name for the storage account.'),
    });
  }

  public shouldPrompt(context: IAzureScriptWizard): boolean {
    return !context.storageAccountName;
  }
}

// Define the setAppPlantName class
export class setAppPlantName extends AzureWizardPromptStep<IAzureScriptWizard> {
  public hideStepCount = true;

  public async prompt(context: IAzureScriptWizard): Promise<void> {
    context.appServicePlan = await context.ui.showInputBox({
      placeHolder: localize('setAppPlantName', 'appPlanName'),
      prompt: localize('appPlanNamePrompt', 'Provide a unique name for the App Service plan.'),
    });
  }

  public shouldPrompt(context: IAzureScriptWizard): boolean {
    return !context.appServicePlan;
  }
}
