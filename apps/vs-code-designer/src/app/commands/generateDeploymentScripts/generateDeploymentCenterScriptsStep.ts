/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AzureWizardExecuteStep, type IActionContext } from '@microsoft/vscode-azext-utils';
import type { ILocalSettingsJson, IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { DeploymentScriptType } from '@microsoft/vscode-extension-logic-apps';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { createAzureDeploymentScriptsWizard, type IAzureDeploymentScriptsContext } from './azureDeploymentScriptsWizard';
import {
  assetsFolderName,
  deploymentDirectory,
  deploymentScriptTemplatesFolderName,
  localSettingsFileName,
  workflowLocationKey,
  workflowResourceGroupNameKey,
  workflowSubscriptionIdKey,
} from '../../../constants';
import { getLocalSettingsJson } from '../../utils/appSettings/localSettings';
import * as path from 'path';
import * as fse from 'fs-extra';
import * as vscode from 'vscode';
import { syncCloudSettings } from '../syncCloudSettings';

export class GenerateDeploymentCenterScriptsStep extends AzureWizardExecuteStep<IProjectWizardContext> {
  public priority = 250;

  /**
   * Executes the step to generate deployment scripts for Azure Deployment Center.
   * @param context The context object for the project wizard.
   * @returns A Promise that resolves when the scripts are generated.
   */
  public async execute(context: IProjectWizardContext): Promise<void> {
    // Get user inputs for deployment script parameters
    const deploymentScriptsContext = await GenerateDeploymentCenterScriptsStep.getDeploymentScriptsWizardContext(
      context,
      context.projectPath
    );
    const inputs = await GenerateDeploymentCenterScriptsStep.gatherAndValidateInputs(deploymentScriptsContext, context.projectPath);
    if (!context.customWorkspaceFolderPath) {
      throw new Error(
        localize(
          'customWorkspaceFolderPathError',
          'The workspace folder path is not defined. A workspace must be opened to generate deployment scripts.'
        )
      );
    }

    // Read the template files and replace placeholders
    const deploymentScriptTemplateFileName = 'DeploymentCenterScript';
    const deploymentScriptTemplatePath = path.join(
      __dirname,
      assetsFolderName,
      deploymentScriptTemplatesFolderName,
      deploymentScriptTemplateFileName
    );
    const deploymentScriptTemplate = await fse.readFile(deploymentScriptTemplatePath, 'utf-8');
    const deploymentScriptContent = deploymentScriptTemplate
      .replace(/<%= subscriptionId %>/g, inputs.subscriptionId)
      .replace(/<%= resourceGroup %>/g, inputs.resourceGroup)
      .replace(/<%= location %>/g, inputs.location)
      .replace(/<%= logicAppName %>/g, inputs.logicAppName)
      .replace(/<%= localLogicAppName %>/g, inputs.localLogicAppName)
      .replace(/<%= uamiClientId %>/g, inputs.uamiClientId);

    const dotDeploymentTemplateFileName = 'dotdeployment';
    const dotDeploymentTemplatePath = path.join(
      __dirname,
      assetsFolderName,
      deploymentScriptTemplatesFolderName,
      dotDeploymentTemplateFileName
    );
    const dotDeploymentContent = await fse.readFile(dotDeploymentTemplatePath, 'utf-8');

    // Ensure deployment directory, clear existing files if exist, and create new files
    const deploymentDirectoryPath = path.join(context.customWorkspaceFolderPath, deploymentDirectory);
    await fse.ensureDir(deploymentDirectoryPath);
    await fse.emptyDir(deploymentDirectoryPath);

    const deploymentScriptFileName = 'deploy.ps1';
    const deploymentScriptPath = path.join(deploymentDirectoryPath, deploymentScriptFileName);
    await fse.writeFile(deploymentScriptPath, deploymentScriptContent);

    const dotDeploymentFileName = '.deployment';
    const dotDeploymentPath = path.join(context.customWorkspaceFolderPath, dotDeploymentFileName);
    await fse.writeFile(dotDeploymentPath, dotDeploymentContent);

    // Add deployment folder and cloud.settings.json to workspace
    const deploymentFolderNode = vscode.Uri.file(deploymentDirectoryPath);
    const workspaceFolders = vscode.workspace.workspaceFolders || [];
    vscode.workspace.updateWorkspaceFolders(workspaceFolders.length, undefined, { uri: deploymentFolderNode });
    await syncCloudSettings(context, vscode.Uri.file(context.projectPath));

    ext.outputChannel.appendLog(
      localize(
        'deploymentScriptGenerated',
        'Custom deployment script for Azure Deployment Center generated successfully at {0}',
        deploymentScriptPath
      )
    );
  }

  /**
   * Determines whether this step should be executed based on the user's input.
   * @param context The context object for the project wizard.
   * @returns A boolean value indicating whether this step should be executed.
   */
  public shouldExecute(context: IProjectWizardContext): boolean {
    return context.deploymentScriptType === DeploymentScriptType.azureDeploymentCenter;
  }

  /**
   * Creates the deployment scripts wizard context.
   * @param context - IActionContext object providing the action context.
   * @param projectPath - The path to the logic app project root.
   * @returns {Promise<IAzureDeploymentScriptsContext>} - The deployment scripts wizard context.
   */
  private static async getDeploymentScriptsWizardContext(
    context: IActionContext,
    projectPath: string
  ): Promise<IAzureDeploymentScriptsContext> {
    try {
      const parentDirPath: string = path.normalize(path.dirname(projectPath));
      const deploymentScriptsContext = context as IAzureDeploymentScriptsContext;
      deploymentScriptsContext.customWorkspaceFolderPath = parentDirPath;
      deploymentScriptsContext.projectPath = path.normalize(projectPath);
      return deploymentScriptsContext;
    } catch (error) {
      const errorMessage = localize('setupWizardScriptContextError', 'Error in setupWizardScriptContext: {0}', error.message ?? error);
      ext.outputChannel.appendLog(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Gathers and validates the input required to generate custom deployment scripts.
   * @param deploymentScriptsContext - The generate deployment scripts context.
   * @param projectPath - The path to the logic app project root.
   * @returns - Object containing validated inputs.
   */
  private static async gatherAndValidateInputs(deploymentScriptsContext: IAzureDeploymentScriptsContext, projectPath: string) {
    let localSettings: ILocalSettingsJson;

    try {
      localSettings = await GenerateDeploymentCenterScriptsStep.getLocalSettings(deploymentScriptsContext, projectPath);
    } catch (error) {
      const errorMessage = localize('errorFetchLocalSettings', 'Error fetching local settings: {0}', error.message ?? error);
      ext.outputChannel.appendLog(errorMessage);
      throw new Error(errorMessage);
    }

    const {
      [workflowSubscriptionIdKey]: defaultSubscriptionId,
      [workflowResourceGroupNameKey]: defaultResourceGroup,
      [workflowLocationKey]: defaultLocation,
    } = localSettings.Values;

    ext.outputChannel.appendLog(
      localize(
        'extractDefaultValues',
        `Extracted default values: ${JSON.stringify({ defaultSubscriptionId, defaultResourceGroup, defaultLocation })}`
      )
    );

    const {
      subscriptionId = defaultSubscriptionId,
      resourceGroup = { name: defaultResourceGroup, location: defaultLocation },
      logicAppName = '',
      storageAccountName = '',
      appServicePlan = '',
    } = deploymentScriptsContext;

    ext.outputChannel.appendLog(
      localize(
        'contextValues',
        `Context values: ${JSON.stringify({ subscriptionId, resourceGroup, logicAppName, storageAccountName, appServicePlan })}`
      )
    );

    try {
      ext.outputChannel.appendLog(localize('AttemptingExecuteAzureWizardSuccess', 'Launching Azure Wizard...'));
      const wizard = createAzureDeploymentScriptsWizard(deploymentScriptsContext);
      await wizard.prompt();
      await wizard.execute();
      ext.outputChannel.appendLog(localize('executeAzureWizardSuccess', 'Azure Wizard executed successfully.'));
    } catch (error) {
      const errorMessage = localize('executeAzureWizardError', 'Error executing Azure Wizard: {0}', error.message ?? error);
      ext.outputChannel.appendLog(errorMessage);
      throw new Error(errorMessage);
    }

    return {
      subscriptionId: deploymentScriptsContext.subscriptionId || subscriptionId,
      resourceGroup: deploymentScriptsContext.resourceGroup.name || resourceGroup.name,
      logicAppName: deploymentScriptsContext.logicAppName || logicAppName,
      localLogicAppName: deploymentScriptsContext.localLogicAppName || logicAppName,
      storageAccount: deploymentScriptsContext.storageAccountName || storageAccountName,
      location: deploymentScriptsContext.resourceGroup.location || resourceGroup.location,
      appServicePlan: deploymentScriptsContext.appServicePlan || appServicePlan,
      uamiClientId: deploymentScriptsContext.uamiClientId,
      localSubscriptionId: defaultSubscriptionId,
      localResourceGroup: defaultResourceGroup,
    };
  }

  /**
   * Reads local settings from a JSON file.
   * @param {IAzureDeploymentScriptsContext} context - The context object for the Azure deployment scripts.
   * @param {string} projectPath - The path to the logic app project root.
   * @returns {Promise<ILocalSettingsJson>} - A promise that resolves to the local settings JSON object.
   */
  private static async getLocalSettings(context: IAzureDeploymentScriptsContext, projectPath: string): Promise<ILocalSettingsJson> {
    const localSettingsFilePath = path.join(projectPath, localSettingsFileName);
    return await getLocalSettingsJson(context, localSettingsFilePath);
  }
}
