/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { COMMON_ERRORS } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { addLocalFuncTelemetry } from '../../utils/funcCoreTools/funcVersion';
import { tryGetLogicAppProjectRoot } from '../../utils/verifyIsProject';
import { getWorkspaceFolder } from '../../utils/workspace';
import { AzureWizard, type IActionContext } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import type * as vscode from 'vscode';
import { DeploymentScriptTypeStep } from './deploymentScriptTypeStep';
import { GenerateADODeploymentScriptsStep } from './generateADODeploymentScriptsStep';
import { GenerateDeploymentCenterScriptsStep } from './generateDeploymentCenterScriptsStep';

/**
 * Generates deployment scripts for a Logic App project.
 * @param {IActionContext} context - The action context.
 * @param {string} node - The node representing the Logic App project. If not provided, the user will be prompted to select a project.
 * @returns {Promise<void>} - A promise that resolves when the deployment scripts are generated.
 */
export async function generateDeploymentScripts(context: IActionContext, node?: vscode.Uri): Promise<void> {
  let projectPath: string;

  try {
    ext.outputChannel.show();
    ext.outputChannel.appendLog(localize('initScriptGen', 'Initiating script generation...'));

    addLocalFuncTelemetry(context);
    if (node) {
      projectPath = node.fsPath;
    } else {
      const workspaceFolder = await getWorkspaceFolder(context);
      projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);
    }

    const options = {
      projectPath,
    };
    const wizardContext: Partial<IProjectWizardContext> & IActionContext = Object.assign(context, options);
    const wizard: AzureWizard<IProjectWizardContext> = new AzureWizard(wizardContext, {
      title: localize('generateDeploymentScripts', 'Generate Logic App Deployment Scripts'),
      promptSteps: [new DeploymentScriptTypeStep()],
      executeSteps: [new GenerateADODeploymentScriptsStep(), new GenerateDeploymentCenterScriptsStep()],
    });

    await wizard.prompt();
    await wizard.execute();
  } catch (error) {
    const errorMessage = localize('errorScriptGen', 'Error during deployment script generation: {0}', error.message ?? error);
    ext.outputChannel.appendLog(errorMessage);
    context.telemetry.properties.error = errorMessage;
    context.telemetry.properties.pinnedBundleVersion = ext.pinnedBundleVersion.has(projectPath)
      ? ext.pinnedBundleVersion.get(projectPath).toString()
      : 'false';
    context.telemetry.properties.currentWorkflowBundleVersion = ext.currentBundleVersion.has(projectPath)
      ? ext.currentBundleVersion.get(projectPath)
      : ext.defaultBundleVersion;
    if (!errorMessage.includes(COMMON_ERRORS.OPERATION_CANCELLED)) {
      throw new Error(errorMessage);
    }
  }
}
