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
  extensionCommand,
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { getLocalSettingsJson } from '../../utils/appSettings/localSettings';
import { getConnectionsJson } from '../../utils/codeless/connection';
import { getAuthorizationToken, getCloudHost } from '../../utils/codeless/getAuthorizationToken';
import { getAccountCredentials } from '../../utils/credentials';
import { addLocalFuncTelemetry } from '../../utils/funcCoreTools/funcVersion';
import { showPreviewWarning, unzipLogicAppArtifacts } from '../../utils/taskUtils';
import type { IAzureScriptWizard } from './azureScriptWizard';
import { createAzureWizard } from './azureScriptWizard';
import { FileManagement } from './iacGestureHelperFunctions';
import type { ServiceClientCredentials } from '@azure/ms-rest-js';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { getBaseGraphApi, type ILocalSettingsJson } from '@microsoft/vscode-extension';
import * as path from 'path';
import * as portfinder from 'portfinder';
import * as requestP from 'request-promise';
import * as vscode from 'vscode';
import { window } from 'vscode';

export async function generateDeploymentScripts(context: IActionContext, projectRoot: vscode.Uri): Promise<void> {
  try {
    addLocalFuncTelemetry(context);
    const commandIdentifier = extensionCommand.generateDeploymentScripts;
    showPreviewWarning(commandIdentifier);
    const scriptContext = await setupWizardScriptContext(context, projectRoot);
    const inputs = await gatherAndValidateInputs(scriptContext, projectRoot);
    const consumptionArtifactsContent = await callConsumptionApi(scriptContext, inputs);
    const standardArtifactsContent = await callStandardApi(scriptContext, inputs);
    const sourceControlPath = scriptContext.sourceControlPath;
    await handleApiResponse(consumptionArtifactsContent, sourceControlPath);
    await handleApiResponse(standardArtifactsContent, sourceControlPath);

    if (scriptContext.isValidWorkspace) {
      FileManagement.addFolderToWorkspace(sourceControlPath);
    } else {
      FileManagement.convertToValidWorkspace(sourceControlPath);
    }

    //TODO: Move to new function in the same code as Handle Api Response
    // Update the workspace with the source control path, even if the API call fails
    //const uri = vscode.Uri.file(sourceControlPath);
    //vscode.workspace.updateWorkspaceFolders(0, vscode.workspace.workspaceFolders?.length, { uri });
  } catch (error) {
    vscode.window.showErrorMessage('The following error occurred: ', error);
  }
}

/**
 * Initializes the wizard script context based on the action context and folder.
 * @param context - IActionContext object providing the action context.
 * @param projectRoot - URI object indicating the folder path.
 * @returns - Promise<IAzureScriptWizard> with the modified script context.
 */
async function setupWizardScriptContext(context: IActionContext, projectRoot: vscode.Uri): Promise<IAzureScriptWizard> {
  const parentDirPath: string = path.normalize(path.dirname(projectRoot.fsPath));
  const scriptContext = context as IAzureScriptWizard;
  scriptContext.folderPath = path.normalize(projectRoot.fsPath);
  scriptContext.customWorkspaceFolderPath = parentDirPath;
  scriptContext.projectPath = parentDirPath;
  return scriptContext;
}

/**
 * Calls the deployment API to obtain the deployment artifact.
 * @param inputs - Object containing required inputs like subscriptionId, resourceGroup etc.
 * @returns - Promise<Buffer> containing the API response as a buffer.
 */
async function callStandardApi(scriptContext: IAzureScriptWizard, inputs: any): Promise<Buffer> {
  try {
    const { subscriptionId, resourceGroup, storageAccount, location, logicAppName, appServicePlan } = inputs;
    return await callStandardResourcesApi(subscriptionId, resourceGroup, storageAccount, location, logicAppName, appServicePlan);
  } catch (error) {
    window.showErrorMessage('The API call failed due to the following error: ', error);
    throw new Error(`API call failed: ${error}`);
  }
}

//TODO: Add comments
async function callConsumptionApi(scriptContext: IAzureScriptWizard, inputs: any): Promise<Buffer[]> {
  try {
    const { subscriptionId, resourceGroup, logicAppName } = inputs;
    const managedConnections: string[] = await getConnectionNames(scriptContext.folderPath);
    return await callManagedConnectionsApi(subscriptionId, resourceGroup, logicAppName, managedConnections);
  } catch (error) {
    window.showErrorMessage('The API call failed due to the following error: ', error);
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
async function handleApiResponse(zipContent: Buffer | Buffer[], targetDirectory: string): Promise<void> {
  if (!zipContent) {
    window.showErrorMessage('API response content not valid');
    window.showErrorMessage("The API response content isn't valid.");
  }
  await unzipLogicAppArtifacts(zipContent, targetDirectory);

  //TODO: Move code into a new helper function

  vscode.window.showInformationMessage('artifacts successfully exported to the following directory: ', targetDirectory);
}

/**
 * Performs the API call for standard azure resouces
 * @param subscriptionId - Subscription ID for Azure services.
 * @param resourceGroup - Azure resource group name.
 * @param storageAccount - Azure storage account name.
 * @param location - Azure location/region.
 * @param logicAppName - Azure Logic App name.
 * @param appServicePlan - Azure App Service Plan name.
 * @returns - Promise<Buffer> containing the API response.
 */
async function callStandardResourcesApi(
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
    const apiUrl = `http://localhost:${ext.workflowDesignTimePort}${managementApiPrefix}/generateDeploymentArtifacts`; // Add the rest of your endpoint URL

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
    window.showErrorMessage('The following error occurred while calling the API: ', error);
    throw error;
  }
}

/**
 * Calls the managed connections API to retrieve deployment artifacts.
 * @param {string} subscriptionId - The ID of the subscription.
 * @param {string} resourceGroup - The name of the resource group.
 * @param {string} logicAppName - The name of the logic app.
 * @param {any[]} managedConnections - An array of managed connections binary data.
 * @returns {Promise<Buffer[]>} - A promise that resolves to an array of buffers containing the deployment artifacts.
 * @throws {Error} - If an error occurs while calling the API.
 */
async function callManagedConnectionsApi(
  subscriptionId: string,
  resourceGroup: string,
  logicAppName: string,
  managedConnections: any[]
): Promise<Buffer[]> {
  try {
    // Loop through each managed connection
    const connectionsDataBuffer: Buffer[] = []; // Array to store multiple buffers
    const apiVersion = '2018-07-01-preview';
    const credentials: ServiceClientCredentials | undefined = await getAccountCredentials();
    const accessToken = await getAuthorizationToken(credentials);
    const cloudHost = await getCloudHost(credentials);
    const baseGraphUri = getBaseGraphApi(cloudHost);

    for (const connection of managedConnections) {
      const connectionName = connection as string;
      const targetLogicAppName = logicAppName;
      const connectionReferenceName = connectionName;

      // Construct the URL
      const apiUrl = `${baseGraphUri}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/connections/${connectionName}/generateDeploymentArtifacts?api-version=${apiVersion}`;

      // Construct the request body based on the parameters
      const requestBody = {
        TargetLogicAppName: targetLogicAppName,
        ConnectionReferenceName: connectionReferenceName,
      };

      // Set up the options for the POST request
      const requestOptions = {
        method: 'POST',
        uri: apiUrl,
        body: requestBody,
        json: true,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${accessToken}`, // Added Authorization header
        },
        encoding: 'binary',
      };

      // Send the POST request
      const response = await requestP(requestOptions);
      const buffer = Buffer.from(response, 'binary');
      connectionsDataBuffer.push(buffer);
      window.showInformationMessage(`Successfully retrieved deployment artifacts for ${connectionName}`);
    }
    return connectionsDataBuffer;
  } catch (error) {
    window.showErrorMessage(`'The following error occurred while calling the API: ${error}`);
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
    subscriptionId = scriptContext.subscriptionId || subscriptionId;
    resourceGroup = scriptContext.resourceGroup.name || resourceGroup;
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

/**
 * Retrieves the names of connections from a connections JSON file.
 * @param projectRoot The root directory of the project.
 * @returns A promise that resolves to an array of connection reference names.
 */
export async function getConnectionNames(projectRoot: string): Promise<string[]> {
  const data: string = await getConnectionsJson(projectRoot);
  const connectionRefNames: string[] = [];

  if (data) {
    const connectionsJson = JSON.parse(data);
    const managedApiConnections = connectionsJson['managedApiConnections'];
    for (const connection in managedApiConnections) {
      if (Object.prototype.hasOwnProperty.call(managedApiConnections, connection)) {
        const refName = connection.trim();
        connectionRefNames.push(refName);
      }
    }
  }
  return connectionRefNames;
}
