/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  managementApiPrefix,
  workflowLocationKey,
  workflowResourceGroupNameKey,
  workflowSubscriptionIdKey,
  localSettingsFileName,
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { getLocalSettingsJson } from '../../utils/appSettings/localSettings';
import { addLocalFuncTelemetry } from '../../utils/funcCoreTools/funcVersion';
import { unzipLogicAppArtifacts } from '../../utils/taskUtils';
import type { IAzureScriptWizard } from './azureScriptWizard';
import { createAzureWizard } from './azureScriptWizard';
import { FileManagement } from './iacGestureHelperFunctions';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension';
import * as path from 'path';
import * as portfinder from 'portfinder';
import * as requestP from 'request-promise';
import * as vscode from 'vscode';
import { window } from 'vscode';

export async function generateDeploymentScripts(context: IActionContext, folder: vscode.Uri): Promise<void> {
  try {
    addLocalFuncTelemetry(context);
    const scriptContext = await setupWizardScriptContext(context, folder);
    const inputs = await gatherAndValidateInputs(scriptContext, folder);
    const zipContent = await callApiForDeploymentArtifact(inputs);
    const sourceControlPath = scriptContext.sourceControlPath;
    await handleApiResponse(zipContent, sourceControlPath, scriptContext);
  } catch (error) {
    window.showErrorMessage('An error occurred:', error);
  }
}

/**
 * Initializes the wizard script context based on the action context and folder.
 * @param context - IActionContext object providing the action context.
 * @param folder - URI object indicating the folder path.
 * @returns - Promise<IAzureScriptWizard> with the modified script context.
 */
async function setupWizardScriptContext(context: IActionContext, folder: vscode.Uri): Promise<IAzureScriptWizard> {
  const parentDirPath: string = path.normalize(path.dirname(folder.fsPath));
  const scriptContext = context as IAzureScriptWizard;
  scriptContext.folderPath = path.normalize(folder.fsPath);
  scriptContext.customWorkspaceFolderPath = parentDirPath;
  scriptContext.projectPath = parentDirPath;
  return scriptContext;
}

/**
 * Calls the deployment API to obtain the deployment artifact.
 * @param inputs - Object containing required inputs like subscriptionId, resourceGroup etc.
 * @returns - Promise<Buffer> containing the API response as a buffer.
 */
async function callApiForDeploymentArtifact(inputs: any): Promise<Buffer> {
  try {
    const { subscriptionId, resourceGroup, storageAccount, location, logicAppName, appServicePlan } = inputs;
    return await callApi(subscriptionId, resourceGroup, storageAccount, location, logicAppName, appServicePlan);
  } catch (error) {
    window.showErrorMessage('API call failed due to error:', error);
    throw new Error(`API call failed: ${error}`);
  }
}

/**
 * Handles the API response and exports the artifacts.
 * @param zipContent - Buffer containing the API response.
 * @param targetDirectory - String indicating the directory to export to.
 * @param scriptContext - IAzureScriptWizard object for the script context.
 * @returns - Promise<void> indicating success or failure.
 */
async function handleApiResponse(zipContent: Buffer, targetDirectory: string, scriptContext: IAzureScriptWizard): Promise<void> {
  if (!zipContent) {
    window.showErrorMessage('API response content not valid');
    throw new Error('No valid API response');
  }
  await unzipLogicAppArtifacts(zipContent, targetDirectory);

  if (scriptContext.isValidWorkspace) {
    FileManagement.addFolderToWorkspace(targetDirectory);
  } else {
    FileManagement.convertToValidWorkspace(targetDirectory);
  }
  if (scriptContext.workspaceFilePath) {
    const uri = vscode.Uri.file(scriptContext.workspaceFilePath);
    await vscode.commands.executeCommand('vscode.openFolder', uri, true);
  }

  vscode.window.showInformationMessage('artifacts exported successfully to:', targetDirectory);
}

/**
 * Performs the API call.
 * @param subscriptionId - Subscription ID for Azure services.
 * @param resourceGroup - Azure resource group name.
 * @param storageAccount - Azure storage account name.
 * @param location - Azure location/region.
 * @param logicAppName - Azure Logic App name.
 * @param appServicePlan - Azure App Service Plan name.
 * @returns - Promise<Buffer> containing the API response.
 */
async function callApi(
  subscriptionId: string,
  resourceGroup: string,
  storageAccount: string,
  location: string,
  logicAppName: string,
  appServicePlan: string
): Promise<Buffer> {
  try {
    // Construct the URL based on your requirements
    if (!ext.workflowDesignTimePort) {
      ext.workflowDesignTimePort = await portfinder.getPortPromise();
    }
    const apiUrl = `http://localhost:${ext.workflowDesignTimePort}${managementApiPrefix}/deploymentArtifacts`; // Add the rest of your endpoint URL

    // Construct the request body based on the parameters
    const deploymentArtifactsInput = {
      targetSubscriptionName: subscriptionId,
      targetResourceGroupName: resourceGroup,
      targetStorageAccountName: storageAccount,
      targetLocation: location,
      targetLogicAppName: logicAppName,
      targetAppServicePlanName: appServicePlan,
    };

    // Set up the options for the POST request
    const requestOptions = {
      method: 'POST',
      uri: apiUrl,
      body: deploymentArtifactsInput,
      json: true,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/zip',
      },
      encoding: 'binary', // <-- Ensure response is treated as binary data
    };

    // Use the requestP function to send the POST request
    const response = await requestP(requestOptions);
    return Buffer.from(response, 'binary'); // Convert the response to a buffer
  } catch (error) {
    window.showErrorMessage('An error occurred while calling the API:', error);
    // Handle the error gracefully, display an error message, or perform any necessary cleanup
    throw error;
  }
}

/**
 * Gathers and validates the input required for API calls.
 * @param scriptContext - IAzureScriptWizard object for the script context.
 * @param folder - URI object indicating the folder path.
 * @returns - Object containing validated inputs.
 */
async function gatherAndValidateInputs(scriptContext: IAzureScriptWizard, folder: vscode.Uri) {
  // Get initial values from local settings
  const localSettings = await getLocalSettings(scriptContext, folder);

  let {
    [workflowSubscriptionIdKey]: subscriptionId,
    [workflowResourceGroupNameKey]: resourceGroup,
    [workflowLocationKey]: location,
  } = localSettings.Values;

  let logicAppName = scriptContext.logicAppName || '';
  let storageAccount = scriptContext.storageAccountName || '';
  let appServicePlan = scriptContext.appServicePlan || '';

  if (!subscriptionId || !resourceGroup || !logicAppName || !storageAccount || !appServicePlan) {
    // Use Azure Wizard to get missing details
    const wizard = createAzureWizard(scriptContext, folder.fsPath);
    await wizard.prompt();
    await wizard.execute();

    // Update missing details from wizard context
    subscriptionId = subscriptionId || scriptContext.subscriptionId;
    resourceGroup = resourceGroup || scriptContext.resourceGroup.name;
    logicAppName = scriptContext.logicAppName;
    storageAccount = scriptContext.storageAccountName || storageAccount;
    appServicePlan = scriptContext.appServicePlan || appServicePlan;
    location = scriptContext.resourceGroup.location || location;
  }
  return { subscriptionId, resourceGroup, logicAppName, storageAccount, location, appServicePlan };
}

/**
 * Reads local settings from a JSON file.
 * @param context - IAzureScriptWizard object for the script context.
 * @param folder - URI object indicating the folder path.
 * @returns - Promise<ILocalSettingsJson> containing local settings.
 */
async function getLocalSettings(context: IAzureScriptWizard, folder: vscode.Uri): Promise<ILocalSettingsJson> {
  const targetFolderPath = folder.fsPath;
  const localSettingsFilePath = path.join(targetFolderPath, localSettingsFileName);
  return await getLocalSettingsJson(context, localSettingsFilePath);
}
