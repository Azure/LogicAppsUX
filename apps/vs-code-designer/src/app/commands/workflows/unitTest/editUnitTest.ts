/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getUnitTestName } from '../../../utils/unitTests';
import { getWorkflowNode } from '../../../utils/workspace';
import { type IAzureConnectorsContext } from '../azureConnectorWizard';
import OpenDesignerForLocalProject from '../openDesigner/openDesignerForLocalProject';
import type * as vscode from 'vscode';

export async function editUnitTest(context: IAzureConnectorsContext, node: vscode.Uri): Promise<void> {
  const unitTestName = getUnitTestName(node.fsPath);
  const workflowNode = getWorkflowNode(node) as vscode.Uri;
  const openDesignerObj = new OpenDesignerForLocalProject(context, workflowNode, unitTestName);
  await openDesignerObj?.createPanel();
}
