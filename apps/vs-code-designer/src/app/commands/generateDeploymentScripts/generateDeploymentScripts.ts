/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  COMMON_ERRORS,
  localSettingsFileName,
  workflowLocationKey,
  workflowResourceGroupNameKey,
  workflowSubscriptionIdKey,
  workflowTenantIdKey,
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { addLocalFuncTelemetry } from '../../utils/funcCoreTools/funcVersion';
import { isLogicAppProject, tryGetLogicAppProjectRoot } from '../../utils/verifyIsProject';
import { getWorkspaceFolder, isMultiRootWorkspace } from '../../utils/workspace';
import { AzureWizard, type IActionContext } from '@microsoft/vscode-azext-utils';
import type { ILocalSettingsJson, IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { DeploymentScriptTypeStep } from './generateDeploymentScriptsSteps/DeploymentScriptTypeStep';
import { convertToWorkspace } from '../createNewCodeProject/CodeProjectBase/ConvertToWorkspace';
import type { SlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';
import type * as vscode from 'vscode';
import * as path from 'path';
import { getLocalSettingsJson } from '../../utils/appSettings/localSettings';

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
 * Generates deployment scripts for a Logic App project.
 * @param {IActionContext} context - The action context.
 * @param {string} node - The node representing the Logic App project. If not provided, the user will be prompted to select a project.
 * @returns {Promise<void>} - A promise that resolves when the deployment scripts are generated.
 */
export async function generateDeploymentScripts(context: IActionContext, node?: vscode.Uri): Promise<void> {
  let projectPath: string;

  try {
    ext.outputChannel.show();
    ext.outputChannel.appendLog(localize('initScriptGen', 'Starting deployment script generation...'));
    addLocalFuncTelemetry(context);

    if (!(await convertToWorkspace(context))) {
      ext.outputChannel.appendLog(localize('exitScriptGen', 'Exiting deployment script generation...'));
      return;
    }

    if (node && node.fsPath && (await isLogicAppProject(node.fsPath))) {
      projectPath = node.fsPath;
    } else {
      const workspaceFolder = await getWorkspaceFolder(context);
      projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);
    }
    if (!projectPath) {
      throw new Error(localize('noProjectSelected', 'No Logic App project found.'));
    }

    const wizardContext = await getDeploymentScriptsWizardContext(context, projectPath);

    const wizard: AzureWizard<IAzureDeploymentScriptsContext> = new AzureWizard(wizardContext, {
      title: localize('generateDeploymentScripts', 'Generate Logic App deployment scripts'),
      promptSteps: [new DeploymentScriptTypeStep()],
    });

    ext.outputChannel.appendLog(localize('launchAzureDeploymentScriptsWizard', 'Launching Azure deployment scripts wizard...'));
    await wizard.prompt();
    await wizard.execute();
    ext.outputChannel.appendLog(localize('completeAzureDeploymentScriptsWizard', 'Azure deployment scripts wizard executed successfully.'));
  } catch (error) {
    const errorMessage = localize('errorScriptGen', 'Error during deployment script generation: {0}', error.message ?? error);
    ext.outputChannel.appendLog(errorMessage);
    context.telemetry.properties.error = errorMessage;
    context.telemetry.properties.pinnedBundleVersion = ext.pinnedBundleVersion.has(projectPath)
      ? ext.pinnedBundleVersion.get(projectPath).toString()
      : 'false';
    context.telemetry.properties.currentWorkflowBundleVersion = ext.currentBundleVersion.has(projectPath)
      ? ext.currentBundleVersion.get(projectPath)
      : ext.defaultBundleVersion;
    if (!errorMessage.includes(COMMON_ERRORS.OPERATION_CANCELLED)) {
      throw new Error(errorMessage);
    }
  }
}

/**
 * Creates the deployment scripts wizard context.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The path to the logic app project root.
 * @returns {Promise<IAzureDeploymentScriptsContext>} - The deployment scripts wizard context.
 */
async function getDeploymentScriptsWizardContext(context: IActionContext, projectPath: string): Promise<IAzureDeploymentScriptsContext> {
  try {
    const wizardContext = context as IAzureDeploymentScriptsContext;
    wizardContext.projectPath = projectPath;
    wizardContext.customWorkspaceFolderPath = path.normalize(path.dirname(projectPath)); // TODO - why are we overriding the existing context.customWorkspaceFolderPath?
    wizardContext.projectPath = path.normalize(projectPath);
    wizardContext.isValidWorkspace = isMultiRootWorkspace();

    let localSettings: ILocalSettingsJson;
    try {
      const localSettingsFilePath = path.join(projectPath, localSettingsFileName);
      localSettings = await getLocalSettingsJson(context, localSettingsFilePath);
    } catch (error) {
      const errorMessage = localize('errorReadingLocalSettings', 'Error reading local settings: {0}', error.message ?? error);
      ext.outputChannel.appendLog(errorMessage);
      throw new Error(errorMessage);
    }

    wizardContext.tenantId = localSettings.Values[workflowTenantIdKey];
    wizardContext.subscriptionId = localSettings.Values[workflowSubscriptionIdKey];
    wizardContext.resourceGroup = {
      name: localSettings.Values[workflowResourceGroupNameKey],
      location: localSettings.Values[workflowLocationKey],
    };

    return wizardContext;
  } catch (error) {
    const errorMessage = localize('setupWizardScriptContextError', 'Error in setupWizardScriptContext: {0}', error.message ?? error);
    ext.outputChannel.appendLog(errorMessage);
    throw new Error(errorMessage);
  }
}
