/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { selectWorkspaceFile } from '../../../utils/workspace';
import { StatelessWorkflowsListStep } from './StatelessWorkflowsListStep';
import { UpdateDebugModeStep } from './UpdateDebugModeStep';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { AzureWizard } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';

export async function switchDebugMode(context: IActionContext): Promise<void> {
  const workspacePath = await getWorkspaceFolderPath(context);
  const projectPath: string | undefined = await tryGetLogicAppProjectRoot(context, workspacePath, true /* suppressPrompt */);

  if (projectPath) {
    const wizardContext = { ...context, projectPath, workflowName: '' };
    const wizard = new AzureWizard(wizardContext, {
      promptSteps: [new StatelessWorkflowsListStep()],
      executeSteps: [new UpdateDebugModeStep()],
    });

    await wizard.prompt();
    await wizard.execute();
    vscode.window.showInformationMessage(
      localize('debugMode.debugModeUpdated', `Successfully updated debug mode for workflow ${wizardContext.workflowName}`)
    );
  } else {
    vscode.window.showErrorMessage(localize('debugMode.projectNotFound', 'No project found for the workspace'));
  }
}

/**
 * Gets project folder path if it is open, otherwise will prompt selection
 * @param {IActionContext} context - Command context
 * @returns {Promise<string>} Workspace path.
 */
async function getWorkspaceFolderPath(context: IActionContext): Promise<string> {
  const folders = vscode.workspace.workspaceFolders || [];
  if (folders.length === 1) {
    return folders[0].uri.fsPath;
  }

  return await selectWorkspaceFile(context, localize('logicapp.pickWorkspaceFolder', 'Select your workspace folder.'));
}
