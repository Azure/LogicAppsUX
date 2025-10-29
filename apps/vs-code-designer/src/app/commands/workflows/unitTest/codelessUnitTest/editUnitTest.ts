/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { testsDirectoryName, workflowFileName } from '../../../../../constants';
import { localize } from '../../../../../localize';
import { getWorkflowNode, isMultiRootWorkspace } from '../../../../utils/workspace';
import OpenDesignerForLocalProject from '../../openDesigner/openDesignerForLocalProject';
import { readFileSync } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getUnitTestName, pickUnitTestNode } from '../../../../utils/unitTest/codelessUnitTest';

/**
 * Edits a unit test for a Logic App workflow.
 * TODO(aeldridge): Unused
 * @param {IActionContext} context - The action context.
 * @param {vscode.Uri} node - The URI of the unit test file to edit. If not provided, the user will be prompted to select a unit test file.
 * @returns A Promise that resolves when the unit test has been edited.
 */
export async function editUnitTest(context: IActionContext, node: vscode.Uri | vscode.TestItem): Promise<void> {
  if (isMultiRootWorkspace()) {
    let unitTestNode: vscode.Uri;
    const workspacePath = path.dirname(vscode.workspace.workspaceFolders[0].uri.fsPath);
    const testsDirectory = path.join(workspacePath, testsDirectoryName);

    if (node && node instanceof vscode.Uri) {
      unitTestNode = getWorkflowNode(node) as vscode.Uri;
    } else if (node && !(node instanceof vscode.Uri) && node.uri instanceof vscode.Uri) {
      unitTestNode = node.uri;
    } else {
      unitTestNode = await pickUnitTestNode(context, testsDirectory);
    }

    const projectName = path.relative(testsDirectory, path.dirname(unitTestNode.fsPath));
    const workflowPath = path.join(workspacePath, projectName, workflowFileName);
    const workflowNode = vscode.Uri.file(workflowPath);
    const unitTestDefinition = JSON.parse(readFileSync(unitTestNode.fsPath, 'utf8'));
    const unitTestName = getUnitTestName(unitTestNode.fsPath);

    const openDesignerObj = new OpenDesignerForLocalProject(context, workflowNode, unitTestName, unitTestDefinition);
    await openDesignerObj?.createPanel();
  } else {
    vscode.window.showInformationMessage(localize('expectedWorkspace', 'In order to create unit tests, you must have a workspace open.'));
  }
}
