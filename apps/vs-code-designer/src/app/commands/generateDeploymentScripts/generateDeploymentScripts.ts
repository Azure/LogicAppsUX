/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  azureWebJobsStorageKey,
  localSettingsFileName,
  workflowLocationKey,
  workflowResourceGroupNameKey,
  workflowSubscriptionIdKey,
} from '../../../constants';
import { getLocalSettingsJson } from '../../utils/appSettings/localSettings';
import type { IAzureScriptWizard } from './azureScriptWizard';
import { createAzureWizard } from './azureScriptWizard';
import { UserInput, FileManagement } from './iacGestureHelperFunctions';
import type { IActionContext, AzureWizard } from '@microsoft/vscode-azext-utils';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension';
import axios from 'axios';
import path from 'path';
import type * as vscode from 'vscode';

export async function generateDeploymentScripts(context: IActionContext, folder: vscode.Uri): Promise<void> {
  // Ensure we have a valid workspace
  if (!FileManagement.isFolderInWorkspace(folder)) {
    await FileManagement.convertToWorkspace(folder);
  }

  console.log(`The selected source control path is: ${folder}`);
  console.log(`The selected source control path is: ${folder.fsPath}`);
  const scriptContext: IAzureScriptWizard = context as IAzureScriptWizard;
  const projectPath: string = folder.fsPath; // Set projectPath to the folder path
  console.log('Project Path:', projectPath);
  const localSettingsFilePath: string = path.join(projectPath, localSettingsFileName);
  const localSettings: ILocalSettingsJson = await getLocalSettingsJson(context, localSettingsFilePath);

  // Data from local settings
  let subscriptionId: string = localSettings.Values[workflowSubscriptionIdKey];
  let resourceGroup: string = localSettings.Values[workflowResourceGroupNameKey];
  const storageAccount: string = localSettings.Values[azureWebJobsStorageKey];
  const location: string = localSettings.Values[workflowLocationKey];

  // Data from wizard
  let logicAppName: string = scriptContext.site?.name || '';
  let appServicePlan: string = scriptContext.hostingPlan?.name || '';
  let sourceControlPath = scriptContext.sourceControlPath || '';

  // If any of the values are empty, prompt the AzureWizard<IAzureScriptWizard>
  // Removed ';' character at the end of 'await wizard.execute()'. It was enclosed in brackets and was an obvious bug.
  if (!subscriptionId || !resourceGroup || !logicAppName || !appServicePlan) {
    const wizard: AzureWizard<IAzureScriptWizard> = createAzureWizard(scriptContext, folder.fsPath);

    await wizard.prompt();
    await wizard.execute();

    // Update missing details from wizard context
    subscriptionId = subscriptionId || scriptContext.subscriptionId;
    resourceGroup = resourceGroup || scriptContext.resourceGroup;
    logicAppName = logicAppName || scriptContext.site.name;
    appServicePlan = appServicePlan || scriptContext.hostingPlan.name;
  }

  // If sourceControlPath is missing, prompt the user for it
  // Added check if sourceControlPath is still empty after prompting the user. If it is, we throw an error.
  if (!sourceControlPath) {
    sourceControlPath = await UserInput.promptForSourceControlPath();
    console.log(`The selected source control path is: ${sourceControlPath}`);
    if (!sourceControlPath) {
      throw new Error('Source control path is still empty after prompting the user.');
    }
  }

  // Call the API
  try {
    const response = await callApi(
      subscriptionId,
      resourceGroup,
      storageAccount,
      location,
      logicAppName,
      appServicePlan,
      sourceControlPath
    );

    console.log('API response:', response);
  } catch (error) {
    console.error('Failed to call the API:', error);
  }
}

async function callApi(
  subscriptionId: string,
  resourceGroup: string,
  storageAccount: string,
  location: string,
  logicAppName: string,
  appServicePlan: string,
  sourceControlPath: string
): Promise<string> {
  const apiUrl = 'https://your-api-url.com'; // Replace with your API URL

  try {
    const response = await axios.post(apiUrl, {
      subscriptionId,
      resourceGroup,
      storageAccount,
      location,
      logicAppName,
      appServicePlan,
      sourceControlPath,
    });

    return response.data;
  } catch (error) {
    // Handle error
    throw new Error('Failed to call the API');
  }
}

// async function callApi(_apiFunction: string, _subscriptionId: string, _resourceGroup: string, _sourceControlPath: string): Promise<string> {
//   // TODO: Implement API calls - returns storage blob uri link
//   return '';
// }

// async function downloadAndUnzip(_zipUrl: string, _destination: string): Promise<void> {
//   // TODO: Implement file download and extraction
// }
