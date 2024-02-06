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
import { localize } from '../../../localize';
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
import axios from 'axios';
import * as path from 'path';
import * as portfinder from 'portfinder';
import * as vscode from 'vscode';
import { window } from 'vscode';

export async function generateDeploymentScripts(context: IActionContext, projectRoot: vscode.Uri): Promise<void> {
  try {
    ext.outputChannel.show();
    ext.outputChannel.appendLog(localize('initScriptGen', 'Initiating script generation...'));

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
    const localizedLogMessage = localize(
      'scriptGenSuccess',
      `Deployment script generation completed successfully. The scripts are added at location: {0}. Warning: One or more workflows in your logic app may contain user-based authentication for managed connectors. You are required to manually authenticate the connection from the Azure portal after the resource is deployed by the DevOps pipeline.`,
      deploymentScriptLocation
    );
    ext.outputChannel.appendLog(localizedLogMessage);

    if (scriptContext.isValidWorkspace) {
      FileManagement.addFolderToWorkspace(sourceControlPath);
    } else {
      FileManagement.convertToValidWorkspace(sourceControlPath);
    }
  } catch (error) {
    const localizedErrorMessage = localize('errorScriptGen', '[Error] generateDeploymentScripts failed: {0}', error);
    ext.outputChannel.appendLog(localizedErrorMessage);
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
    ext.outputChannel.appendLog(localize('initCallConsumption', 'Initiating call to Consumption API for deployment artifacts.'));

    const { subscriptionId, resourceGroup, logicAppName } = inputs;
    ext.outputChannel.appendLog(
      localize(
        'operationalContext',
        'Operational context: Subscription ID: {0}, Resource Group: {1}, Logic App: {2}',
        subscriptionId,
        resourceGroup,
        logicAppName
      )
    );

    // Retrieve managed connections
    ext.outputChannel.appendLog(localize('fetchingManagedConnections', 'Fetching list of managed connections...'));
    const managedConnections: { refEndPoint: string; originalKey: string }[] = await getConnectionNames(scriptContext.folderPath);

    for (const connectionObj of managedConnections) {
      try {
        ext.outputChannel.appendLog(
          localize('initiatingApiCallForConnection', 'Initiating API call for managed connection: {0}', connectionObj.originalKey)
        );

        // The line below has been modified to pass both originalKey and refEndPoint
        const bufferData = await callManagedConnectionsApi(
          subscriptionId,
          resourceGroup,
          logicAppName,
          connectionObj.originalKey,
          connectionObj.refEndPoint
        );

        if (!bufferData) {
          vscode.window.showErrorMessage(localize('dataRetrievalFailedFor', 'Data retrieval failed for: {0}', connectionObj.originalKey));
          continue;
        }

        // Specify the unzip path and handle the API response
        const unzipPath = path.join(scriptContext.sourceControlPath);
        ext.outputChannel.appendLog(
          localize('attemptingUnzipArtifacts', 'Attempting to unzip artifacts for {0} at {1}', connectionObj.originalKey, unzipPath)
        );
        await handleApiResponse(bufferData, unzipPath);
      } catch (error) {
        const errorString = JSON.stringify(error, Object.getOwnPropertyNames(error));
        ext.outputChannel.appendLog(
          localize(
            'failedApiCallForConnectionWithError',
            'Failed API call for managed connection: {0}. Error: {1}',
            connectionObj.originalKey,
            errorString
          )
        );
        vscode.window.showErrorMessage(localize('apiCallFailedWithError', 'API call failed: {0}', errorString));
        throw new Error(localize('apiCallToConsumptionResourcesFailed', 'API call to Consumption Resources failed: {0}', errorString));
      }
    }
  } catch (error) {
    ext.outputChannel.appendLog(
      localize('failedAllConsumptionCalls', 'Failed to complete Consumption API calls for all managed connections.')
    );
    await handleError(error, localize('errorConsumptionResources', 'Error calling Consumption Resources API Connections'));
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
      window.showErrorMessage(localize('invalidApiResponseContent', 'Invalid API response content.'));
      ext.outputChannel.appendLog(localize('invalidApiResponseExiting', 'Invalid API response received. Exiting...'));
      return;
    }
    await unzipLogicAppArtifacts(zipContent, targetDirectory);
    ext.outputChannel.appendLog(localize('artifactsSuccessfullyUnzipped', 'Artifacts successfully unzipped.'));
  } catch (error) {
    ext.outputChannel.appendLog(localize('errorHandlingApiResponse', 'Error occurred while handling API response.'));
    await handleError(error, localize('errorInHandleApiResponse', 'Error in handleApiResponse'));
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
    ext.outputChannel.appendLog(localize('initApiWorkflowDesignerPort', 'Initiating API connection through workflow designer port...'));
    if (!ext.designTimePort) {
      ext.outputChannel.appendLog(
        localize(
          'connectionAttemptFailed',
          'Connection attempt failed. Workflow designer port not set. Trying to find an available port...'
        )
      );
      ext.designTimePort = await portfinder.getPortPromise();
      ext.outputChannel.appendLog(
        localize('newPortSet', `New workflow designer port set to ${ext.designTimePort}. Retrying API connection.`)
      );
    }

    const apiUrl = `http://localhost:${ext.designTimePort}${managementApiPrefix}/generateDeploymentArtifacts`;
    ext.outputChannel.appendLog(localize('apiUrl', `Calling API URL: ${apiUrl}`));

    // Construct the request body based on the parameters
    const deploymentArtifactsInput = {
      targetSubscriptionName: subscriptionId,
      targetResourceGroupName: resourceGroup,
      targetStorageAccountName: storageAccount,
      targetLocation: location,
      targetLogicAppName: logicAppName,
      targetAppServicePlanName: appServicePlan,
    };

    ext.outputChannel.appendLog(
      localize(
        'operationalContext',
        `Operational context: Subscription ID: ${subscriptionId}, Resource Group: ${resourceGroup}, Logic App: ${logicAppName}`
      )
    );
    ext.outputChannel.appendLog(localize('initiatingStandardResourcesApiCall', 'Initiating Standard Resources API call...'));
    const response = await axios.post(apiUrl, deploymentArtifactsInput, {
      headers: {
        Accept: 'application/zip',
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer',
    });
    ext.outputChannel.appendLog(localize('apiCallSuccessful', 'API call successful, processing response...'));
    return Buffer.from(response.data, 'binary');
  } catch (error) {
    ext.outputChannel.appendLog(
      localize('failedStandardResourcesApiCall', `Failed to call Standard Resources API. Error: ${error.message || error}`)
    );
    if (error.stack) {
      ext.outputChannel.appendLog(localize('errorStack', `Error Stack: ${error.stack}`));
    }
    await handleError(error, localize('errorStandardResourcesApi', 'Error calling Standard Resources API'));
  }
}

/**
 * Calls the Managed Connections API to retrieve deployment artifacts for a given Logic App.
 * @param subscriptionId - The Azure subscription ID.
 * @param resourceGroup - The Azure resource group name.
 * @param logicAppName - The name of the Logic App.
 * @param managedConnection - The reference name for the managed connection template generation.
 * @param connectionId - The parameter for connection ID endpoint deployed in portal.
 * @returns A Buffer containing the API response.
 */
async function callManagedConnectionsApi(
  subscriptionId: string,
  resourceGroup: string,
  logicAppName: string,
  connectionName: string,
  connectionId: string
): Promise<Buffer> {
  try {
    const apiVersion = '2018-07-01-preview';
    const credentials: ServiceClientCredentials | undefined = await getAccountCredentials();
    const accessToken = await getAuthorizationToken(credentials);
    const cloudHost = await getCloudHost(credentials);
    const baseGraphUri = getBaseGraphApi(cloudHost);

    // Build the URL for the API call
    const apiUrl = `${baseGraphUri}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/connections/${connectionId}/generateDeploymentArtifacts?api-version=${apiVersion}`;
    // Define the request body
    const requestBody = {
      TargetLogicAppName: logicAppName,
      ConnectionReferenceName: connectionName,
    };

    // Execute the API call
    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${accessToken}`,
      },
      responseType: 'arraybuffer',
    });

    // Convert and log the successful response
    const buffer = Buffer.from(response.data, 'binary');
    ext.outputChannel.appendLog(
      localize('successfulManagedConnection', `Successfully retrieved deployment artifacts for connection: ${connectionName}.`)
    );
    return buffer;
  } catch (error) {
    ext.outputChannel.appendLog(
      localize(
        'errorManagedConnectionsApi',
        `Error encountered while calling Managed Connections API: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`
      )
    );
    await handleError(error, localize('handleErrorManagedConnectionsApi', 'Error calling Managed Connections API'));
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
    ext.outputChannel.appendLog(localize('fetchLocalSettingsAttempt', 'Attempting to fetch local settings...'));
    localSettings = await getLocalSettings(scriptContext, folder);
    ext.outputChannel.appendLog(localize('fetchLocalSettingsSuccess', `Successfully fetched local settings from ${localSettings}`));
  } catch (error) {
    ext.outputChannel.appendLog(localize('fetchLocalSettingsError', `Error fetching local settings: ${error}`));
    await handleError(error, localize('handleErrorFetchLocalSettings', 'Error fetching local settings'));
    return;
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
  } = scriptContext;

  ext.outputChannel.appendLog(
    localize(
      'contextValues',
      `Context values: ${JSON.stringify({ subscriptionId, resourceGroup, logicAppName, storageAccountName, appServicePlan })}`
    )
  );

  try {
    if (!subscriptionId || !resourceGroup.name || !logicAppName || !storageAccountName || !appServicePlan) {
      ext.outputChannel.appendLog(
        localize('AttemptingExecuteAzureWizardSuccess', 'One or more required values are missing. Launching Azure Wizard...')
      );
      const wizard = createAzureWizard(scriptContext);
      await wizard.prompt();
      ext.outputChannel.appendLog(localize('executeAzureWizardSuccess', 'Azure Wizard executed successfully.'));
    }
  } catch (error) {
    ext.outputChannel.appendLog(localize('executeAzureWizardError', `Error executing Azure Wizard: ${error}`));
    await handleError(error, localize('handleErrorExecuteAzureWizard', 'Error executing Azure Wizard'));
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
export async function getConnectionNames(projectRoot: string): Promise<{ refEndPoint: string; originalKey: string }[]> {
  const data: string = await getConnectionsJson(projectRoot);
  const managedConnections: { refEndPoint: string; originalKey: string }[] = [];

  if (data) {
    const connectionsJson = JSON.parse(data);
    const managedApiConnections = connectionsJson['managedApiConnections'];
    for (const connection in managedApiConnections) {
      if (Object.prototype.hasOwnProperty.call(managedApiConnections, connection)) {
        const idPath = managedApiConnections[connection]['connection']['id'];
        const lastParam = idPath.substring(idPath.lastIndexOf('/') + 1);
        managedConnections.push({ refEndPoint: lastParam, originalKey: connection });
      }
    }
  }
  return managedConnections;
}
