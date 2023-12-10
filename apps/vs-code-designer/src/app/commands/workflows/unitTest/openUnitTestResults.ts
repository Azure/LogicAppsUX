/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { type IAzureConnectorsContext } from '../azureConnectorWizard';
import * as path from 'path';
import type * as vscode from 'vscode';

// TODO: MAKE SURE THIS IS CORRECT
function getUnitTestName(filePath: string) {
  const unitTestFileName = path.basename(filePath);
  const fileNameItems = unitTestFileName.split('.');
  return fileNameItems[0];
}

export async function openUnitTestResults(_context: IAzureConnectorsContext, node: vscode.Uri): Promise<void> {
  const unitTestName = getUnitTestName(node.fsPath);
  console.log(`openUnitTestResults: ${unitTestName}`);
  // const openDesignerObj = new OpenDesignerForUnitTestResults(context, node, unitTestName);
  // // tslint:disable-next-line: no-unnecessary-type-assertion
  // await openDesignerObj!.createPanel();
}
