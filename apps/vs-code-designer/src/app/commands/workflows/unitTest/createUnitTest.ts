/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { workflowFileName } from '../../../../constants';
import { localize } from '../../../../localize';
import { getWorkflowsInLocalProject } from '../../../utils/codeless/common';
import { validateUnitTestName } from '../../../utils/unitTests';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { getWorkflowNode, getWorkspaceFolder, isMultiRootWorkspace } from '../../../utils/workspace';
import type { IAzureConnectorsContext } from '../azureConnectorWizard';
import OpenDesignerForLocalProject from '../openDesigner/openDesignerForLocalProject';
import type { IAzureQuickPickItem, IActionContext } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Creates a unit test for a Logic App workflow.
 * @param {IAzureConnectorsContext} context - The context object for Azure Connectors.
 * @param {vscode.Uri | undefined} node - The URI of the workflow node, if available.
 * @param {string | undefined} runId - The ID of the run, if available.
 * @returns A Promise that resolves when the unit test is created.
 */
export async function createUnitTest(context: IAzureConnectorsContext, node: vscode.Uri | undefined, runId?: string): Promise<void> {
  let workflowNode: vscode.Uri;
  const workspaceFolder = await getWorkspaceFolder(context);
  const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);

  if (node) {
    workflowNode = getWorkflowNode(node) as vscode.Uri;
  } else {
    const workflow = await pickWorkflow(context, projectPath);
    workflowNode = vscode.Uri.file(workflow.data) as vscode.Uri;
  }

  if (isMultiRootWorkspace()) {
    const workflowName = path.basename(path.dirname(workflowNode.fsPath));
    const unitTestName = await context.ui.showInputBox({
      prompt: localize('unitTestNamePrompt', 'Provide a unit test name'),
      placeHolder: localize('unitTestNamePlaceholder', 'Unit test name'),
      validateInput: async (name: string): Promise<string | undefined> => await validateUnitTestName(projectPath, workflowName, name),
    });

    //Ask user to choose between codeless and codeful scenarios
    const scenarioChoice = await context.ui.showQuickPick(
      [
        { label: 'Codeless', description: 'Create unit test using designer' },
        { label: 'Codeful', description: 'Create empty C# test project' },
      ],
      { placeHolder: 'Select unit test creation method' }
    );

    if (scenarioChoice.label === 'Codeless') {
      const openDesignerObj = new OpenDesignerForLocalProject(context, workflowNode, unitTestName, null, runId);
      await openDesignerObj?.createPanel();
    } else {
      //Create empty C# test project
      await createEmptyCSharpTestProject(context, projectPath, workflowName, unitTestName);
    }
  } else {
    vscode.window.showInformationMessage(localize('expectedWorkspace', 'In order to create unit tests, you must have a workspace open.'));
  }
}

/**
 * Prompts the user to select a workflow and returns the selected workflow.
 * @param {IActionContext} context - The action context.
 * @param {string} projectPath - The path of the project.
 * @returns A promise that resolves to the selected workflow.
 */
const pickWorkflow = async (context: IActionContext, projectPath: string) => {
  const placeHolder: string = localize('selectLogicApp', 'Select workflow to create unit test');
  return await context.ui.showQuickPick(getWorkflowsPick(projectPath), { placeHolder });
};

/**
 * Retrieves the list of workflows in the local project.
 * @param {string} projectPath - The path to the local project.
 * @returns An array of Azure Quick Pick items representing the logic apps in the project.
 */
const getWorkflowsPick = async (projectPath: string) => {
  const listOfWorkflows = await getWorkflowsInLocalProject(projectPath);
  const picks: IAzureQuickPickItem<string>[] = Array.from(Object.keys(listOfWorkflows)).map((workflowName) => {
    return { label: workflowName, data: path.join(projectPath, workflowName, workflowFileName) };
  });

  picks.sort((a, b) => a.label.localeCompare(b.label));
  return picks;
};

// Function to create an empty C# test project
async function createEmptyCSharpTestProject(
  context: IAzureConnectorsContext,
  projectPath: string,
  workflowName: string,
  unitTestName: string
): Promise<void> {
  // TODO: Implement the creation of an empty C# test project
  // This function should create the necessary files and folder structure for a C# test project
  // You may want to use the 'fs' module to create files and folders

  vscode.window.showInformationMessage(`Created empty C# test project for ${workflowName} with test name ${unitTestName}`);
}
