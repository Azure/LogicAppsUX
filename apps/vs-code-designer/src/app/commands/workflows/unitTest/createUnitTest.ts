/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { getWorkflowsInLocalProject } from '../../../utils/codeless/common';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { getWorkflowNode, getWorkspaceFolder } from '../../../utils/workspace';
import { type IAzureConnectorsContext } from '../azureConnectorWizard';
import OpenDesignerForLocalProject from '../openDesigner/openDesignerForLocalProject';
import { type IAzureQuickPickItem, type IActionContext } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Creates a unit test for a Logic App workflow.
 * @param {IAzureConnectorsContext} context - The context object for Azure Connectors.
 * @param {vscode.Uri | undefined} node - The URI of the workflow node, if available.
 * @returns A Promise that resolves when the unit test is created.
 */
export async function createUnitTest(context: IAzureConnectorsContext, node: vscode.Uri | undefined): Promise<void> {
  const unitTestName = await context.ui.showInputBox({
    prompt: localize('unitTestNamePrompt', 'Provide Unit Test name'),
  });

  let workflowNode;

  if (node) {
    workflowNode = getWorkflowNode(node) as vscode.Uri;
  } else {
    const workflow = await pickWorkflow(context);
    workflowNode = vscode.Uri.file(workflow.data);
  }
  console.log('charlie', workflowNode);

  const openDesignerObj = new OpenDesignerForLocalProject(context, workflowNode, unitTestName);
  await openDesignerObj?.createPanel();
}

/**
 * Prompts the user to select a workflow and returns the selected workflow.
 * @param {IActionContext} context - The action context.
 * @returns A Promise that resolves to the selected workflow.
 */
const pickWorkflow = async (context: IActionContext) => {
  const placeHolder: string = localize('selectLogicApp', 'Select workflow to create unit test');
  return await context.ui.showQuickPick(getWorkflowsPicks(context), { placeHolder });
};

/**
 * Retrieves the list of workflows in the local project.
 * @param {IActionContext} context - The action context.
 * @returns A promise that resolves to an array of Azure Quick Pick items representing the workflows.
 */
const getWorkflowsPicks = async (context: IActionContext) => {
  const workspaceFolder = await getWorkspaceFolder(context);
  const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);
  const listOfLogicApps = await getWorkflowsInLocalProject(projectPath);
  const picks: IAzureQuickPickItem<string>[] = Array.from(Object.keys(listOfLogicApps)).map((workflowName) => {
    return { label: workflowName, data: path.join(projectPath, workflowName) };
  });

  picks.sort((a, b) => a.label.localeCompare(b.label));
  return picks;
};
