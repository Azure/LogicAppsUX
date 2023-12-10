/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { type IAzureConnectorsContext } from '../azureConnectorWizard';
import type * as vscode from 'vscode';

export async function createUnitTest(context: IAzureConnectorsContext, _node: vscode.Uri): Promise<void> {
  const unitTestName = await context.ui.showInputBox({
    prompt: localize('unitTestNamePrompt', 'Provide Unit Test name'),
  });
  console.log(`createUnitTest: ${unitTestName}`);
  //const openDesignerObj = new OpenDesignerForUnitTest(context, node, unitTestName);
  // tslint:disable-next-line: no-unnecessary-type-assertion
  //await openDesignerObj!.createPanel(false);
}
