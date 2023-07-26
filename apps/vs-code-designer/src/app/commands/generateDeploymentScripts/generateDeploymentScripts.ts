/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { workflowResourceGroupNameKey, workflowSubscriptionIdKey } from '../../../constants';
import type { IAzureScriptWizard } from './azureScriptWizard';
import { createAzureWizard } from './azureScriptWizard';
import { UserInput, FileManagement, monitorFolderForChanges } from './iacGestureHelperFunctions';
import type { IActionContext, AzureWizard } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import type * as vscode from 'vscode';

export class ScriptGeneration {
  static async generateDeploymentScripts(context: IActionContext, folder: vscode.Uri): Promise<void> {
    // Ensure we have a valid workspace
    if (!FileManagement.isFolderInWorkspace(folder)) {
      await FileManagement.convertToWorkspace(folder);
    }
    const scriptContext: IAzureScriptWizard = context as IAzureScriptWizard;

    let subscriptionId = await UserInput.promptForSetting(scriptContext, folder, workflowSubscriptionIdKey);
    let resourceGroup = await UserInput.promptForSetting(scriptContext, folder, workflowResourceGroupNameKey);
    let sourceControlPath = scriptContext.sourceControlPath || '';

    // If subscriptionId or resourceGroup is missing, trigger the wizard
    if (!subscriptionId || !resourceGroup) {
      const wizard: AzureWizard<IAzureScriptWizard> = createAzureWizard(scriptContext, folder.fsPath);

      await wizard.prompt();
      await wizard.execute();

      // Update missing details from wizard context
      subscriptionId = subscriptionId || scriptContext.subscriptionId;
      resourceGroup = resourceGroup || scriptContext.resourceGroup;
    }

    // If sourceControlPath is missing, prompt the user for it
    if (!sourceControlPath) {
      sourceControlPath = await UserInput.promptForSourceControlPath();
      console.log(`The selected source control path is: ${sourceControlPath}`);
    }

    // Create a subfolder for the selected Logic App in the Deployment folder
    const logicAppFolderPath = FileManagement.createFolderForLogicApp(folder.fsPath, path.basename(folder.fsPath));

    // Define the logic to generate scripts, download them, and place in the respective directory.
    const generateAndPlaceFiles = async (apiFunction: string, folderName: string) => {
      try {
        const zipUrl = await callApi(apiFunction, subscriptionId, resourceGroup, sourceControlPath);
        const destinationPath = path.join(logicAppFolderPath, folderName);
        await downloadAndUnzip(zipUrl, destinationPath);
      } catch (err) {
        // Handle API failure and incomplete file downloads
        console.error(`Failed to generate ${folderName}: ${err.message}`);
        throw err;
      }
    };

    // Generate and place ADO pipeline scripts
    await generateAndPlaceFiles('generateAdoPipelineScripts', 'ado-pipeline-scripts');

    // Generate and place ARM Templates
    await generateAndPlaceFiles('generateArmTemplates', 'arm-templates');

    // Generate and place Workflow Parameters
    await generateAndPlaceFiles('generateWorkflowParameters', 'workflow-parameters');

    // Monitor the Logic App folder for changes and regenerate scripts if needed
    monitorFolderForChanges(folder.fsPath, (changedFolder) => {
      if (changedFolder === folder.fsPath) {
        ScriptGeneration.generateDeploymentScripts(context, folder);
      }
    });
  }
}

async function callApi(_apiFunction: string, _subscriptionId: string, _resourceGroup: string, _sourceControlPath: string): Promise<string> {
  // TODO: Implement API calls
  return '';
}

async function downloadAndUnzip(_zipUrl: string, _destination: string): Promise<void> {
  // TODO: Implement file download and extraction
}
