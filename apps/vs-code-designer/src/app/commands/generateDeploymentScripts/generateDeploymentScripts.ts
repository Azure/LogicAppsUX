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
import type { IAzureScriptWizard } from './azureScriptWizard';
import { createAzureWizard } from './azureScriptWizard';
import { FileManagement, UserInput } from './iacGestureHelperFunctions';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension';
import * as AdmZip from 'adm-zip';
import * as path from 'path';
import * as portfinder from 'portfinder';
import * as requestP from 'request-promise';
import * as vscode from 'vscode';

export async function generateDeploymentScripts(context: IActionContext, folder: vscode.Uri): Promise<void> {
  try {
    addLocalFuncTelemetry(context);

    // Setup script context
    const scriptContext = await setupScriptContext(context, folder);

    // Gather and validate inputs
    const inputs = await gatherAndValidateInputs(scriptContext, folder);

    // Get source control path
    const sourceControlPath = await getSourceControlPath(scriptContext);

    // Call API to get deployment artifact
    const zipContent = await callApiForDeploymentArtifact(inputs);

    // Handle API response
    await handleApiResponse(zipContent, sourceControlPath, scriptContext);
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

/**
 * Sets up the initial context for the script.
 * @param context - The action context.
 * @param folder - The folder URI.
 * @returns The script context.
 */
async function setupScriptContext(context: IActionContext, folder: vscode.Uri): Promise<IAzureScriptWizard> {
  const scriptContext = context as IAzureScriptWizard;
  scriptContext.workspaceFilePath = await FileManagement.checkFolderInWorkspace(scriptContext, folder);
  return scriptContext;
}

/**
 * Calls the API to get the deployment artifact.
 * @param inputs - The inputs for the API call.
 * @returns The deployment artifact as a Buffer.
 * @throws If the API call fails.
 */
async function callApiForDeploymentArtifact(inputs: any): Promise<Buffer> {
  try {
    const { subscriptionId, resourceGroup, storageAccount, location, logicAppName, appServicePlan } = inputs;
    return await callApi(subscriptionId, resourceGroup, storageAccount, location, logicAppName, appServicePlan);
  } catch (error) {
    throw new Error(`API call failed: ${error}`);
  }
}

/**
 * Handles the API response.
 * @param zipContent - The response content as a Buffer.
 * @param targetDirectory - The target directory for unzipping.
 * @param scriptContext - The script context.
 * @returns A Promise that resolves when the handling is complete.
 */
async function handleApiResponse(zipContent: Buffer, targetDirectory: string, scriptContext: IAzureScriptWizard): Promise<void> {
  if (!zipContent) {
    throw new Error('No valid API response');
  }
  await unzipLogicAppArtifacts(zipContent, targetDirectory);
  if (scriptContext.workspaceFilePath) {
    const uri = vscode.Uri.file(scriptContext.workspaceFilePath);
    await vscode.commands.executeCommand('vscode.openFolder', uri, true);
  }
  vscode.window.showInformationMessage('Logic app script artifacts exported successfully to:', targetDirectory);
}

/**
 * Calls the API to retrieve the deployment artifact.
 * @param subscriptionId - The subscription ID.
 * @param resourceGroup - The resource group.
 * @param storageAccount - The storage account.
 * @param location - The location.
 * @param logicAppName - The logic app name.
 * @param appServicePlan - The app service plan.
 * @returns The deployment artifact as a Buffer.
 * @throws If an error occurs while calling the API.
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
    console.error('An error occurred while calling the API:', error);
    // Handle the error gracefully, display an error message, or perform any necessary cleanup
    throw error;
  }
}

/**
 * Unzips the Logic App artifacts.
 * @param zipContent - The zip content as a Buffer.
 * @param targetDirectory - The target directory for unzipping.
 * @returns A Promise that resolves when the unzipping is complete.
 * @throws If an error occurs while unzipping.
 */
async function unzipLogicAppArtifacts(zipContent: Buffer, targetDirectory: string): Promise<void> {
  try {
    const zip = new AdmZip(zipContent);
    zip.extractAllTo(targetDirectory, true); // true means it will overwrite existing files
  } catch (error) {
    console.error('Failed to unzip Logic App:', error);
    // Handle the error gracefully, display an error message, or perform any necessary cleanup
    throw error;
  }
}

/**
 * Gathers and validates all the required inputs.
 * @param scriptContext - The script context.
 * @param folder - The folder URI.
 * @returns The validated inputs.
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

  if (!subscriptionId || !resourceGroup || !logicAppName || storageAccount || appServicePlan) {
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
 * Gets the local settings.
 * @param context - The script context.
 * @param folder - The folder URI.
 * @returns The local settings JSON.
 */
async function getLocalSettings(context: IAzureScriptWizard, folder: vscode.Uri): Promise<ILocalSettingsJson> {
  const targetFolderPath = folder.fsPath;
  const localSettingsFilePath = path.join(targetFolderPath, localSettingsFileName);
  return await getLocalSettingsJson(context, localSettingsFilePath);
}

/**
 * Gets the source control path.
 * @param scriptContext - The script context.
 * @returns The source control path.
 * @throws If the source control path is empty after prompting the user.
 */
async function getSourceControlPath(scriptContext: IAzureScriptWizard): Promise<string> {
  let sourceControlPath = scriptContext.sourceControlPath || '';
  if (!sourceControlPath) {
    sourceControlPath = await UserInput.promptForSourceControlPath(scriptContext);
    if (!sourceControlPath) {
      throw new Error('Source control path is still empty after prompting the user.');
    }
    scriptContext.sourceControlPath = sourceControlPath;
  }
  return sourceControlPath;
}
