/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  localSettingsFileName,
  managementApiPrefix,
  workflowLocationKey,
  workflowResourceGroupNameKey,
  workflowSubscriptionIdKey,
} from '../../../constants';
import { ext } from '../../../extensionVariables';
import { getLocalSettingsJson } from '../../utils/appSettings/localSettings';
import type { IAzureScriptWizard } from './azureScriptWizard';
import { createAzureWizard } from './azureScriptWizard';
import { UserInput, FileManagement } from './iacGestureHelperFunctions';
import type { IActionContext, AzureWizard } from '@microsoft/vscode-azext-utils';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension';
import * as AdmZip from 'adm-zip';
import * as path from 'path';
import * as portfinder from 'portfinder';
import * as requestP from 'request-promise';
import type * as vscode from 'vscode';

export async function generateDeploymentScripts(context: IActionContext, folder: vscode.Uri): Promise<void> {
  // Ensure we have a valid workspace
  if (!FileManagement.isFolderInWorkspace(folder)) {
    await FileManagement.convertToWorkspace(folder);
  }
  const scriptContext: IAzureScriptWizard = context as IAzureScriptWizard;
  const projectPath: string = folder.fsPath;
  const localSettingsFilePath: string = path.join(projectPath, localSettingsFileName);
  const localSettings: ILocalSettingsJson = await getLocalSettingsJson(context, localSettingsFilePath);
  // Data from local settings
  let subscriptionId = localSettings.Values[workflowSubscriptionIdKey];
  let resourceGroup = localSettings.Values[workflowResourceGroupNameKey];
  let location = localSettings.Values[workflowLocationKey];
  // If any of the values are empty, prompt the AzureWizard<IAzureScriptWizard>
  // Data from user Input
  let sourceControlPath = scriptContext.sourceControlPath || '';
  let storageAccount = scriptContext.storageAccountName || '';
  let appServicePlan = scriptContext.newPlanName || '';
  let logicAppName = scriptContext.logicAppName || '';
  if (!subscriptionId || !resourceGroup) {
    const wizard: AzureWizard<IAzureScriptWizard> = createAzureWizard(scriptContext, folder.fsPath);
    await wizard.prompt();
    await wizard.execute();
    // Update missing details from wizard context
    subscriptionId = subscriptionId || scriptContext.subscriptionId;
    resourceGroup = resourceGroup || scriptContext.resourceGroup;
  }
  // If location is empty, fetch it from local settings
  if (!location) {
    location = localSettings.Values[workflowLocationKey];
    scriptContext.location = location;
  }
  // If sourceControlPath is missing, prompt the user for it
  if (!sourceControlPath) {
    sourceControlPath = await UserInput.promptForSourceControlPath();
    scriptContext.sourceControlPath = sourceControlPath;
    console.log(`The selected source control path is: ${sourceControlPath}`);
    if (!sourceControlPath) {
      throw new Error('Source control path is still empty after prompting the user.');
    }
  }
  if (!storageAccount) {
    storageAccount = await UserInput.promptForStorageAccountName();
    scriptContext.storageAccountName = storageAccount;
    console.log(`The selected storage account name is: ${storageAccount}`);
    if (!storageAccount) {
      throw new Error('Storage account name is still empty after prompting the user.');
    }
  }
  if (!appServicePlan) {
    appServicePlan = await UserInput.promptForPlanServiceName();
    scriptContext.newPlanName = appServicePlan;
    console.log(`The selected app service plan name is: ${appServicePlan}`);
    if (!appServicePlan) {
      throw new Error('App service plan name is still empty after prompting the user.');
    }
  }
  if (!logicAppName) {
    logicAppName = await UserInput.promptForLogicAppName();
    scriptContext.logicAppName = logicAppName;
    console.log(`The selected logic app name is: ${logicAppName}`);
    if (!logicAppName) {
      throw new Error('Logic app name is still empty after prompting the user.');
    }
  }
  // Call the API after gathering all necessary details
  const zipContent = await callApi(context, subscriptionId, resourceGroup, storageAccount, location, logicAppName, appServicePlan);
  // Handle the response
  if (zipContent) {
    console.log('Successfully received response from API.');
    // Use the sourceControlPath as the target directory
    await unzipLogicAppArtifacts(zipContent, sourceControlPath);
    console.log('Successfully unzipped Logic App content to:', sourceControlPath);
  } else {
    console.error('Failed to receive a valid response from API.');
  }
}
export async function callApi(
  context: IActionContext,
  subscriptionId: string,
  resourceGroup: string,
  storageAccount: string,
  location: string,
  logicAppName: string,
  appServicePlan: string
): Promise<Buffer> {
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
}
async function unzipLogicAppArtifacts(zipBuffer: Buffer, targetDirectory: string) {
  try {
    // Use 'adm-zip' to unzip the content
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(targetDirectory, true); // true means it will overwrite existing files
    console.log('Logic App exported successfully to:', targetDirectory);
  } catch (error) {
    console.error('Failed to unzip Logic App:', error);
  }
}
