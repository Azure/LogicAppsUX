/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { getLogicAppProjectRoot, getParentLogicAppRoot } from '../../../utils/workspace';
import { StatelessWorkflowsListStep } from './switchDebugModeSteps/StatelessWorkflowsListStep';
import { UpdateDebugModeStep } from './switchDebugModeSteps/UpdateDebugModeStep';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { AzureWizard } from '@microsoft/vscode-azext-utils';
import type * as vscode from 'vscode';

export async function switchDebugMode(context: IActionContext, node?: vscode.Uri): Promise<void> {
  const projectPath = node?.fsPath
    ? await getParentLogicAppRoot(node.fsPath)
    : await getLogicAppProjectRoot(context);

  if (!projectPath) {
    throw new Error(localize('LogicAppRootError', 'Unable to determine logic app project root.'));
  }

  const wizardContext = { ...context, projectPath, workflowName: '' };
  const wizard = new AzureWizard(wizardContext, {
    promptSteps: [new StatelessWorkflowsListStep()],
    executeSteps: [new UpdateDebugModeStep()],
  });

  await wizard.prompt();
  await wizard.execute();

  ext.outputChannel.appendLog(
    localize('debugMode.debugModeUpdated', `Successfully updated debug mode for workflow ${wizardContext.workflowName}`)
  );
}
