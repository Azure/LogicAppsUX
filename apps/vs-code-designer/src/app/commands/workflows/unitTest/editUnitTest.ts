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

const pickUnitTest = async (context: IActionContext, projectPath: string) => {
  const placeHolder: string = localize('selectLogicApp', 'Select unit test to edit');
  return await context.ui.showQuickPick(getUnitTestPick(projectPath), { placeHolder });
};

const getUnitTestPick = async (projectPath: string) => {
  const listOfUnitTest = await getUnitTestInLocalProject(projectPath);
  const picks: IAzureQuickPickItem<string>[] = Array.from(Object.keys(listOfUnitTest)).map((unitTestName) => {
    return { label: unitTestName, data: listOfUnitTest[unitTestName] };
  });

  picks.sort((a, b) => a.label.localeCompare(b.label));
  return picks;
};
