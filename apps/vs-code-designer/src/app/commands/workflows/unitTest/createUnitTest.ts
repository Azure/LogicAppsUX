/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { workflowFileName } from '../../../../constants';
import { localize } from '../../../../localize';
import { getWorkflowsInLocalProject } from '../../../utils/codeless/common';
import { validateUnitTestName } from '../../../utils/unitTests';
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
  let workflowNode: vscode.Uri;
  const workspaceFolder = await getWorkspaceFolder(context);
  const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);

  if (node) {
    workflowNode = getWorkflowNode(node) as vscode.Uri;
  } else {
    const workflow = await pickWorkflow(context, projectPath);
    workflowNode = vscode.Uri.file(workflow.data) as vscode.Uri;
  }

  const workflowName = path.basename(path.dirname(workflowNode.fsPath));
  const unitTestName = await context.ui.showInputBox({
    prompt: localize('unitTestNamePrompt', 'Provide a unit test name'),
    placeHolder: localize('unitTestNamePlaceholder', 'Unit test name'),
    validateInput: async (name: string): Promise<string | undefined> => await validateUnitTestName(projectPath, workflowName, name),
  });

  const openDesignerObj = new OpenDesignerForLocalProject(context, workflowNode, unitTestName);
  await openDesignerObj?.createPanel();
}

/**
 * Prompts the user to select a workflow and creates a unit test for it.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The path of the project.
 * @returns A promise that resolves to the selected workflow.
 */
const pickWorkflow = async (context: IActionContext, projectPath: string) => {
  const placeHolder: string = localize('selectLogicApp', 'Select workflow to create unit test');
  return await context.ui.showQuickPick(getUnitTestPicks(projectPath), { placeHolder });
};

/**
 * Retrieves the list of logic apps in a local project and returns an array of Azure Quick Pick items.
 * @param {string} projectPath - The path to the local project.
 * @returns An array of Azure Quick Pick items representing the logic apps in the project.
 */
const getUnitTestPicks = async (projectPath: string) => {
  const listOfLogicApps = await getWorkflowsInLocalProject(projectPath);
  const picks: IAzureQuickPickItem<string>[] = Array.from(Object.keys(listOfLogicApps)).map((workflowName) => {
    return { label: workflowName, data: path.join(projectPath, workflowName, workflowFileName) };
  });

  picks.sort((a, b) => a.label.localeCompare(b.label));
  return picks;
};
