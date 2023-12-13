/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getUnitTestName } from '../../../utils/unitTests';
import { getWorkflowNode } from '../../../utils/workspace';
import { type IAzureConnectorsContext } from '../azureConnectorWizard';
import OpenDesignerForLocalProject from '../openDesigner/openDesignerForLocalProject';
import { readFileSync } from 'fs';
import type * as vscode from 'vscode';

export async function editUnitTest(context: IAzureConnectorsContext, node: vscode.Uri): Promise<void> {
  const unitTestName = getUnitTestName(node.fsPath);
  const unitTestNode = getWorkflowNode(node) as vscode.Uri;
  const unitTestDefinition = JSON.parse(readFileSync(unitTestNode.fsPath, 'utf8'));
  const openDesignerObj = new OpenDesignerForLocalProject(context, unitTestNode, unitTestName, unitTestDefinition);
  await openDesignerObj?.createPanel();
}
