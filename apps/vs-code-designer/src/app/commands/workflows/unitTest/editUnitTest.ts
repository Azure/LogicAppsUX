/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { developmentDirectoryName, testsDirectoryName, workflowFileName } from '../../../../constants';
import { localize } from '../../../../localize';
import { getUnitTestInLocalProject, getUnitTestName } from '../../../utils/unitTests';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { getWorkflowNode, getWorkspaceFolder } from '../../../utils/workspace';
import { type IAzureConnectorsContext } from '../azureConnectorWizard';
import OpenDesignerForLocalProject from '../openDesigner/openDesignerForLocalProject';
import { type IAzureQuickPickItem, type IActionContext } from '@microsoft/vscode-azext-utils';
import { readFileSync } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Edits a unit test for a Logic App workflow.
 * @param {IAzureConnectorsContext} context - The Azure Connectors context.
 * @param {vscode.Uri} node - The URI of the unit test file to edit. If not provided, the user will be prompted to select a unit test file.
 * @returns A Promise that resolves when the unit test has been edited.
 */
export async function editUnitTest(context: IAzureConnectorsContext, node: vscode.Uri): Promise<void> {
  let unitTestNode: vscode.Uri;
  const workspaceFolder = await getWorkspaceFolder(context);
  const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);

  if (node) {
    unitTestNode = getWorkflowNode(node) as vscode.Uri;
  } else {
    const unitTest = await pickUnitTest(context, path.join(projectPath, developmentDirectoryName, testsDirectoryName));
    unitTestNode = vscode.Uri.file(unitTest.data) as vscode.Uri;
  }

  const workflowName = path.basename(path.dirname(unitTestNode.fsPath));
  const workflowPath = path.join(projectPath, workflowName, workflowFileName);
  const workflowNode = vscode.Uri.file(workflowPath);
  const unitTestDefinition = JSON.parse(readFileSync(unitTestNode.fsPath, 'utf8'));
  const unitTestName = getUnitTestName(unitTestNode.fsPath);

  const openDesignerObj = new OpenDesignerForLocalProject(context, workflowNode, unitTestName, unitTestDefinition);
  await openDesignerObj?.createPanel();
}

/**
 * Prompts the user to select a unit test to edit.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The path of the project.
 * @returns A promise that resolves to the selected unit test.
 */
const pickUnitTest = async (context: IActionContext, projectPath: string) => {
  const placeHolder: string = localize('selectUnitTest', 'Select unit test to edit');
  return await context.ui.showQuickPick(getUnitTestPick(projectPath), { placeHolder });
};

/**
 * Retrieves a list of unit tests in the local project.
 * @param {string} projectPath - The path to the project.
 * @returns A promise that resolves to an array of unit test picks.
 */
const getUnitTestPick = async (projectPath: string) => {
  const listOfUnitTest = await getUnitTestInLocalProject(projectPath);
  const picks: IAzureQuickPickItem<string>[] = Array.from(Object.keys(listOfUnitTest)).map((unitTestName) => {
    return { label: unitTestName, data: listOfUnitTest[unitTestName] };
  });

  picks.sort((a, b) => a.label.localeCompare(b.label));
  return picks;
};
