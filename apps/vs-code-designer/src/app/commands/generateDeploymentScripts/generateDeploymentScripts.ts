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
import { handleError, showPreviewWarning, unzipLogicAppArtifacts } from '../../utils/taskUtils';
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
    ext.outputChannel.show();
    ext.outputChannel.appendLog('Initiating script generation...');

    addLocalFuncTelemetry(context);
    const commandIdentifier = extensionCommand.generateDeploymentScripts;
    showPreviewWarning(commandIdentifier);
    const scriptContext = await setupWizardScriptContext(context, projectRoot);
    const inputs = await gatherAndValidateInputs(scriptContext, projectRoot);
    const sourceControlPath = scriptContext.sourceControlPath;
    await callConsumptionApi(scriptContext, inputs);
    const standardArtifactsContent = await callStandardApi(scriptContext, inputs);
    await handleApiResponse(standardArtifactsContent, sourceControlPath);
    const deploymentScriptLocation = `workspace/${scriptContext.sourceControlPath}`;
    ext.outputChannel.appendLog(
      `Deployment script generation completed successfully. The scripts are added at location: ${deploymentScriptLocation}. ` +
        'Warning: One or more workflows in your logic app may contain user-based authentication for managed connectors. ' +
        'You are required to manually authenticate the connection from the Azure portal after the resource is deployed by the DevOps pipeline.'
    );

    if (scriptContext.isValidWorkspace) {
      FileManagement.addFolderToWorkspace(sourceControlPath);
    } else {
      FileManagement.convertToValidWorkspace(sourceControlPath);
    }
  } catch (error) {
    ext.outputChannel.appendLog(`[Error] generateDeploymentScripts failed: ${error}`);
    await handleError(error, 'Error during deployment script generation');
  }
}

/**
 * Initializes the wizard script context based on the action context and folder.
 * @param context - IActionContext object providing the action context.
 * @param projectRoot - URI object indicating the folder path.
 * @returns - Promise<IAzureScriptWizard> with the modified script context.
 */
async function setupWizardScriptContext(context: IActionContext, projectRoot: vscode.Uri): Promise<IAzureScriptWizard> {
  try {
    const parentDirPath: string = path.normalize(path.dirname(projectRoot.fsPath));
    const scriptContext = context as IAzureScriptWizard;
    scriptContext.folderPath = path.normalize(projectRoot.fsPath);
    scriptContext.customWorkspaceFolderPath = parentDirPath;
    scriptContext.projectPath = parentDirPath;
    return scriptContext;
  } catch (error) {
    await handleError(error, 'Error in setupWizardScriptContext');
    throw error;
  }
}

/**
 * Calls the iac API to obtain the deployment standard artifacts.
 * @param inputs - Object containing required inputs like subscriptionId, resourceGroup etc.
 * @returns - Promise<Buffer> containing the API response as a buffer.
 */
async function callStandardApi(scriptContext: IAzureScriptWizard, inputs: any): Promise<Buffer> {
  try {
    const { subscriptionId, resourceGroup, storageAccount, location, logicAppName, appServicePlan } = inputs;
    return await callStandardResourcesApi(subscriptionId, resourceGroup, storageAccount, location, logicAppName, appServicePlan);
  } catch (error) {
    await handleError(error, 'Error calling Standard Resources API');
  }
}

/**
 * Calls the iac API to obtain the deployment consumption artifacts for each managed connection.
 * @param scriptContext - The script context containing the source control path.
 * @param inputs - An object containing the subscription ID, resource group, and logic app name.
 * @returns A Promise that resolves when all artifacts are processed.
 */
export async function callConsumptionApi(scriptContext: IAzureScriptWizard, inputs: any): Promise<void> {
  try {
    ext.outputChannel.appendLog('Initiating call to Consumption API for deployment artifacts.');

    const { subscriptionId, resourceGroup, logicAppName } = inputs;
    ext.outputChannel.appendLog(
      `Operational context: Subscription ID: ${subscriptionId}, Resource Group: ${resourceGroup}, Logic App: ${logicAppName}`
    );

    // Retrieve managed connections
    ext.outputChannel.appendLog('Fetching list of managed connections...');
    const managedConnections: { refEndPoint: string }[] = await getConnectionNames(scriptContext.folderPath);

    for (const connectionObj of managedConnections) {
      try {
        ext.outputChannel.appendLog(`Initiating API call for managed connection: ${connectionObj.refEndPoint}`);

        const bufferData = await callManagedConnectionsApi(subscriptionId, resourceGroup, logicAppName, connectionObj.refEndPoint);

        if (!bufferData) {
          vscode.window.showErrorMessage(`Data retrieval failed for: ${connectionObj.refEndPoint}`);
          continue;
        }

        // Specify the unzip path and handle the API response
        const unzipPath = path.join(scriptContext.sourceControlPath);
        ext.outputChannel.appendLog(`Attempting to unzip artifacts for ${connectionObj.refEndPoint} at ${unzipPath}`);
        await handleApiResponse(bufferData, unzipPath);
      } catch (error) {
        const errorString = JSON.stringify(error, Object.getOwnPropertyNames(error));
        ext.outputChannel.appendLog(`Failed API call for managed connection: ${connectionObj.refEndPoint}. Error: ${errorString}`);
        vscode.window.showErrorMessage(`API call failed: ${errorString}`);
        throw new Error(`API call to Consumption Resources failed: ${errorString}`);
      }
    }
  } catch (error) {
    ext.outputChannel.appendLog('Failed to complete Consumption API calls for all managed connections.');
    await handleError(error, 'Error calling Consumption Resources API Connections');
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
  try {
    if (!zipContent) {
      window.showErrorMessage('Invalid API response content.');
      ext.outputChannel.appendLog('Invalid API response received. Exiting...');
      return;
    }
    await unzipLogicAppArtifacts(zipContent, targetDirectory);
    ext.outputChannel.appendLog('Artifacts successfully unzipped.');
  } catch (error) {
    ext.outputChannel.appendLog('Error occurred while handling API response.');
    await handleError(error, 'Error in handleApiResponse');
  }
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
    ext.outputChannel.appendLog('Initiating API connection through workflow designer port...');
    if (!ext.workflowDesignTimePort) {
      ext.outputChannel.appendLog('Connection attempt failed. Workflow designer port not set. Trying to find an available port...');
      ext.workflowDesignTimePort = await portfinder.getPortPromise();
      ext.outputChannel.appendLog(`New workflow designer port set to ${ext.workflowDesignTimePort}. Retrying API connection.`);
    }

    const apiUrl = `http://localhost:${ext.workflowDesignTimePort}${managementApiPrefix}/generateDeploymentArtifacts`;

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
    ext.outputChannel.appendLog(
      `Operational context: Subscription ID: ${subscriptionId}, Resource Group: ${resourceGroup}, Logic App: ${logicAppName}`
    );
    ext.outputChannel.appendLog('Initiating Standard Resources API call...');
    const response = await requestP(requestOptions);
    ext.outputChannel.appendLog('API call successful, processing response...');
    return Buffer.from(response, 'binary'); // Convert the response to a buffer
  } catch (error) {
    ext.outputChannel.appendLog('Failed to call Standard Resources API.');
    await handleError(error, 'Error calling Standard Resources API');
  }
}
/**
 * Calls the Managed Connections API to retrieve deployment artifacts for a given Logic App.
 * @param subscriptionId - The Azure subscription ID.
 * @param resourceGroup - The Azure resource group name.
 * @param logicAppName - The name of the Logic App.
 * @param managedConnection - The reference name for the managed connection to call.
 * @returns A Buffer containing the API response.
 */
async function callManagedConnectionsApi(
  subscriptionId: string,
  resourceGroup: string,
  logicAppName: string,
  managedConnection: any
): Promise<Buffer> {
  try {
    const apiVersion = '2018-07-01-preview';
    const credentials: ServiceClientCredentials | undefined = await getAccountCredentials();
    const accessToken = await getAuthorizationToken(credentials);
    const cloudHost = await getCloudHost(credentials);
    const baseGraphUri = getBaseGraphApi(cloudHost);

    // Use explicit names to clarify intent
    const connectionName = managedConnection as string;
    const targetLogicAppName = logicAppName;
    const connectionReferenceName = connectionName;

    // Build the URL for the API call
    const apiUrl = `${baseGraphUri}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/connections/${connectionName}/generateDeploymentArtifacts?api-version=${apiVersion}`;

    // Define the request body
    const requestBody = {
      TargetLogicAppName: targetLogicAppName,
      ConnectionReferenceName: connectionReferenceName,
    };

    // Configure the POST request options
    const requestOptions = {
      method: 'POST',
      uri: apiUrl,
      body: requestBody,
      json: true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${accessToken}`,
      },
      encoding: 'binary',
    };

    // Execute the API call
    const response = await requestP(requestOptions);

    // Convert and log the successful response
    const buffer = Buffer.from(response, 'binary');
    ext.outputChannel.appendLog(`Successfully retrieved deployment artifacts for connection: ${connectionName}.`);

    return buffer;
  } catch (error) {
    // Handle and log errors
    ext.outputChannel.appendLog(
      `Error encountered while calling Managed Connections API: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`
    );
    await handleError(error, 'Error calling Managed Connections API');
  }
}

/**
 * Gathers and validates the input required for API calls.
 * @param scriptContext - IAzureScriptWizard object for the script context.
 * @param folder - URI object indicating the folder path.
 * @returns - Object containing validated inputs.
 */
async function gatherAndValidateInputs(scriptContext: IAzureScriptWizard, folder: vscode.Uri) {
  let localSettings;

  try {
    ext.outputChannel.appendLog('Attempting to fetch local settings...');
    localSettings = await getLocalSettings(scriptContext, folder);
    ext.outputChannel.appendLog(`Successfully fetched local settings: ${JSON.stringify(localSettings)}`);
  } catch (error) {
    ext.outputChannel.appendLog(`Error fetching local settings: ${error}`);
    await handleError(error, 'Error fetching local settings');
    return;
  }

  const {
    [workflowSubscriptionIdKey]: defaultSubscriptionId,
    [workflowResourceGroupNameKey]: defaultResourceGroup,
    [workflowLocationKey]: defaultLocation,
  } = localSettings.Values;

  ext.outputChannel.appendLog(
    `Extracted default values: ${JSON.stringify({ defaultSubscriptionId, defaultResourceGroup, defaultLocation })}`
  );

  const {
    subscriptionId = defaultSubscriptionId,
    resourceGroup = { name: defaultResourceGroup, location: defaultLocation },
    logicAppName = '',
    storageAccountName = '',
    appServicePlan = '',
  } = scriptContext;

  ext.outputChannel.appendLog(
    `Context values: ${JSON.stringify({ subscriptionId, resourceGroup, logicAppName, storageAccountName, appServicePlan })}`
  );

  try {
    if (!subscriptionId || !resourceGroup.name || !logicAppName || !storageAccountName || !appServicePlan) {
      ext.outputChannel.appendLog('One or more required values are missing. Launching Azure Wizard...');
      const wizard = createAzureWizard(scriptContext, folder.fsPath);
      await wizard.prompt();
      await wizard.execute();
      ext.outputChannel.appendLog('Azure Wizard executed successfully.');
    }
  } catch (error) {
    ext.outputChannel.appendLog(`Error executing Azure Wizard: ${error}`);
    await handleError(error, 'Error executing Azure Wizard');
    return;
  }

  return {
    subscriptionId: scriptContext.subscriptionId || subscriptionId,
    resourceGroup: scriptContext.resourceGroup.name || resourceGroup.name,
    logicAppName: scriptContext.logicAppName || logicAppName,
    storageAccount: scriptContext.storageAccountName || storageAccountName,
    location: scriptContext.resourceGroup.location || resourceGroup.location,
    appServicePlan: scriptContext.appServicePlan || appServicePlan,
  };
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
 * Retrieves the ref names s of connections from a connections JSON file.
 * @param projectRoot The root directory of the project.
 * @returns A promise that resolves to an array of objects, each containing a reference name and the last parameter in the connection id.
 */
export async function getConnectionNames(projectRoot: string): Promise<{ refEndPoint: string }[]> {
  const data: string = await getConnectionsJson(projectRoot);
  const managedConnections: { refEndPoint: string }[] = [];

  if (data) {
    const connectionsJson = JSON.parse(data);
    const managedApiConnections = connectionsJson['managedApiConnections'];
    for (const connection in managedApiConnections) {
      if (Object.prototype.hasOwnProperty.call(managedApiConnections, connection)) {
        const idPath = managedApiConnections[connection]['connection']['id'];
        const lastParam = idPath.substring(idPath.lastIndexOf('/') + 1);
        managedConnections.push({ refEndPoint: lastParam });
      }
    }
  }
  return managedConnections;
}
