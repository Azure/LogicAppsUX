/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { workflowLocationKey, workflowResourceGroupNameKey, workflowSubscriptionIdKey, workflowTenantIdKey } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { addLocalFuncTelemetry } from '../../utils/funcCoreTools/funcVersion';
import { selectLogicAppRoot, isMultiRootWorkspace, isLogicApp } from '../../utils/workspace';
import { AzureWizard, callWithTelemetryAndErrorHandling, UserCancelledError, type IActionContext } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext, DeploymentTargetType } from '@microsoft/vscode-extension-logic-apps';
import { DeploymentScriptTypeStep } from './generateDeploymentScriptsSteps/DeploymentScriptTypeStep';
import { ensureWorkspace } from '../ensureWorkspace';
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
  msiClientId?: string;
  // Hybrid deployment support — determines which pipeline templates and ARM templates are generated.
  deploymentTarget?: DeploymentTargetType;
  connectedEnvironmentName?: string;
  connectedEnvironmentResourceGroup?: string;
}

/**
 * Generates deployment scripts for a Logic App project.
 * @param {IActionContext} context - The action context.
 * @param {string} node - The node representing the Logic App project. If not provided, the user will be prompted to select a project.
 * @returns {Promise<void>} - A promise that resolves when the deployment scripts are generated.
 */
export async function generateDeploymentScripts(context: IActionContext, node?: vscode.Uri): Promise<void> {
  try {
    ext.outputChannel.show();
    ext.outputChannel.appendLog(localize('initScriptGen', 'Starting deployment script generation...'));
    addLocalFuncTelemetry(context);

    context.telemetry.properties.lastStep = 'ensureWorkspace';
    const isWorkspaceReady = await callWithTelemetryAndErrorHandling(
      'generateDeploymentScripts.ensureWorkspace',
      async (actionContext: IActionContext) => {
        actionContext.errorHandling.rethrow = true;
        actionContext.errorHandling.suppressDisplay = true;
        return await ensureWorkspace(actionContext);
      }
    );

    if (!isWorkspaceReady) {
      ext.outputChannel.appendLog(localize('exitScriptGen', 'Exiting deployment script generation...'));
      context.telemetry.properties.result = 'Canceled';
      return;
    }

    context.telemetry.properties.lastStep = 'getLogicAppProjectRoot';
    const projectPath = node && (await isLogicApp(node.fsPath)) ? node.fsPath : await selectLogicAppRoot(context);

    if (!projectPath) {
      throw new Error(localize('LogicAppRootError', 'Unable to determine logic app project root.'));
    }

    context.telemetry.properties.pinnedBundleVersion = ext.pinnedBundleVersion.has(projectPath)
      ? ext.pinnedBundleVersion.get(projectPath)!.toString()
      : 'false';

    context.telemetry.properties.currentWorkflowBundleVersion = ext.currentBundleVersion.has(projectPath)
      ? ext.currentBundleVersion.get(projectPath)
      : ext.defaultBundleVersion;

    context.telemetry.properties.lastStep = 'getDeploymentScriptsWizardContext';
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
    if (error instanceof UserCancelledError) {
      context.telemetry.properties.result = 'Canceled';
      return;
    }

    const errorMessageTemplate = 'Error during deployment script generation: {0}';
    const errorMessage = errorMessageTemplate.replace('{0}', error.message ?? error);
    const localizedErrorMessage = localize('deploymentScriptGenError', errorMessageTemplate, error.message ?? error);

    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.errorMessage = errorMessage;
    ext.outputChannel.appendLog(localizedErrorMessage);
    throw new Error(localizedErrorMessage);
  }
}

/**
 * Creates the deployment scripts wizard context.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The path to the logic app project root.
 * @returns {Promise<IAzureDeploymentScriptsContext>} - The deployment scripts wizard context.
 */
async function getDeploymentScriptsWizardContext(context: IActionContext, projectPath: string): Promise<IAzureDeploymentScriptsContext> {
  const wizardContext = context as IAzureDeploymentScriptsContext;
  wizardContext.workspacePath = path.normalize(path.dirname(projectPath));
  wizardContext.projectPath = path.normalize(projectPath);
  wizardContext.isValidWorkspace = isMultiRootWorkspace();

  const localSettings = await getLocalSettingsJson(context, projectPath);

  const {
    [workflowTenantIdKey]: defaultTenantId,
    [workflowSubscriptionIdKey]: defaultSubscriptionId,
    [workflowResourceGroupNameKey]: defaultResourceGroup,
    [workflowLocationKey]: defaultLocation,
  } = localSettings.Values;

  wizardContext.tenantId = defaultTenantId;
  wizardContext.subscriptionId = defaultSubscriptionId !== '' ? defaultSubscriptionId : undefined;
  if (defaultResourceGroup && defaultLocation) {
    wizardContext.resourceGroup = {
      name: defaultResourceGroup,
      location: defaultLocation,
    };
  }

  return wizardContext;
}
