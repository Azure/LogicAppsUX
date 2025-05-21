/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AzureWizardExecuteStep } from '@microsoft/vscode-azext-utils';
import { ext } from '../../../../../extensionVariables';
import { localize } from '../../../../../localize';
import { assetsFolderName, deploymentDirectory, deploymentScriptTemplatesFolderName } from '../../../../../constants';
import * as path from 'path';
import * as fse from 'fs-extra';
import * as vscode from 'vscode';
import { syncCloudSettings } from '../../../syncCloudSettings';
import type { IAzureDeploymentScriptsContext } from '../../generateDeploymentScripts';

export class GenerateDeploymentCenterScriptsStep extends AzureWizardExecuteStep<IAzureDeploymentScriptsContext> {
  public priority = 250;

  /**
   * Executes the step to generate deployment scripts for Azure Deployment Center.
   * @param context The context object for the project wizard.
   * @returns A Promise that resolves when the scripts are generated.
   */
  public async execute(context: IAzureDeploymentScriptsContext): Promise<void> {
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
      .replace(/<%= subscriptionId %>/g, context.subscriptionId)
      .replace(/<%= resourceGroup %>/g, context.resourceGroup.name)
      .replace(/<%= location %>/g, context.resourceGroup.location)
      .replace(/<%= logicAppName %>/g, context.logicAppName)
      .replace(/<%= localLogicAppName %>/g, context.localLogicAppName)
      .replace(/<%= uamiClientId %>/g, context.uamiClientId);

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
    // TODO: May want to clear the deployment directory, leaving for now to avoid overwriting IaC files
    // await fse.emptyDir(deploymentDirectoryPath);

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
   * @returns A boolean value indicating whether this step should be executed.
   */
  public shouldExecute(): boolean {
    return true;
  }
}
