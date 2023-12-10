/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { getWorkflowNode } from '../../../utils/workspace';
import { type IAzureConnectorsContext } from '../azureConnectorWizard';
import OpenDesignerForLocalProject from '../openDesigner/openDesignerForLocalProject';
import type * as vscode from 'vscode';

export async function createUnitTest(context: IAzureConnectorsContext, node: vscode.Uri): Promise<void> {
  const unitTestName = await context.ui.showInputBox({
    prompt: localize('unitTestNamePrompt', 'Provide Unit Test name'),
  });
  const workflowNode = getWorkflowNode(node) as vscode.Uri;

  const openDesignerObj = new OpenDesignerForLocalProject(context, workflowNode, unitTestName);
  await openDesignerObj?.createPanel();
}
