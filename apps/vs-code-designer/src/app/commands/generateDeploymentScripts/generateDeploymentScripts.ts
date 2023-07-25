/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createAzureWizard, type IAzureScriptWizard } from './azureScriptWizard';
import {
  convertToWorkspace,
  createFileStructure,
  promptForSubscriptionId,
  promptForResourceGroup,
  promptForSourceControlPath,
  isFolderInWorkspace,
} from './iacGestureHelperFunctions';
import type { IActionContext, AzureWizard } from '@microsoft/vscode-azext-utils';
import * as fs from 'fs';
import type * as vscode from 'vscode';

/**
 * Generates deployment scripts for the specified folder.
 * @param {IActionContext} context - The action context.
 * @param {vscode.Uri} folder - The folder to generate deployment scripts for.
 * @returns {Promise<void>} - A promise that resolves when the deployment scripts are generated.
 */
export async function generateDeploymentScripts(context: IActionContext, folder: vscode.Uri): Promise<void> {
  if (!isFolderInWorkspace(folder)) {
    await convertToWorkspace(folder);
  }

  const scriptContext: IAzureScriptWizard = context as IAzureScriptWizard;

  let subscriptionId = await promptForSubscriptionId(scriptContext, folder);
  let resourceGroup = await promptForResourceGroup(scriptContext, folder);

  if (!subscriptionId || !resourceGroup) {
    const wizard: AzureWizard<IAzureScriptWizard> = createAzureWizard(scriptContext, folder.fsPath);

    await wizard.prompt();
    await wizard.execute();

    subscriptionId = scriptContext.subscriptionId;
    resourceGroup = scriptContext.resourceGroup;
  }

  const sourceControlPath = await promptForSourceControlPath();

  const zipFolder = await callApi(subscriptionId, resourceGroup, sourceControlPath);

  await unzipFiles(zipFolder, folder.fsPath);

  createFileStructure(folder.fsPath);
}

/**
 * Calls the API with the provided details and returns a .zip folder containing the files for the templates.
 * @param {string} _subscriptionId - The subscription ID.
 * @param {string} _resourceGroup - The resource group.
 * @param {string} _sourceControlPath - The source control path.
 * @returns {Promise<string>} - A promise that resolves with the path to the .zip folder.
 */
async function callApi(_subscriptionId: string, _resourceGroup: string, _sourceControlPath: string): Promise<string> {
  // TODO: Call the API with the details provided by the user
  // The API will return a .zip folder containing the files for the templates
  return '';
}

/**
 * Unzips the files from the .zip folder and stores them in the specified destination folder.
 * @param {string} zipFolder - The path to the .zip folder.
 * @param {string} destination - The destination folder.
 */
async function unzipFiles(zipFolder: string, _destination: string) {
  // Unzip the files from the .zip folder and store them in the selected folder
  fs.createReadStream(zipFolder);
  //  .pipe(unzipper.Extract({ path: destination }));
}
