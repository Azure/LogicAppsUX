/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { workflowFileName } from '../../../../constants';
import { getLogicAppProjectRoot } from '../../../utils/codeless/connection';
import { getUnitTestName } from '../../../utils/unitTests';
import { getWorkflowNode } from '../../../utils/workspace';
import { type IAzureConnectorsContext } from '../azureConnectorWizard';
import OpenDesignerForLocalProject from '../openDesigner/openDesignerForLocalProject';
import { readFileSync } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export async function editUnitTest(context: IAzureConnectorsContext, node: vscode.Uri): Promise<void> {
  const unitTestName = getUnitTestName(node.fsPath);
  const unitTestNode = getWorkflowNode(node) as vscode.Uri;

  const workflowName = path.basename(path.dirname(node.fsPath));
  const workflowPath = path.join(await getLogicAppProjectRoot(context, unitTestNode.fsPath), workflowName, workflowFileName);
  const workflowNode = vscode.Uri.file(workflowPath);
  const unitTestDefinition = JSON.parse(readFileSync(unitTestNode.fsPath, 'utf8'));

  const openDesignerObj = new OpenDesignerForLocalProject(context, workflowNode, unitTestName, unitTestDefinition);
  await openDesignerObj?.createPanel();
}
