/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { type IAzureConnectorsContext } from '../azureConnectorWizard';
import * as child from 'child_process';
import * as vscode from 'vscode';

function getPathToRoot(dirItems: string[]) {
  const DIRS_TO_ROOT = 4;
  let path = dirItems[0];
  for (let i = 1; i < dirItems.length - DIRS_TO_ROOT; i++) {
    path = path.concat(`\\${dirItems[i]}`);
  }
  return path;
}

function getWorkflowName(dirItems: string[]) {
  const DIRS_TO_WORKFLOWNAME = 1;
  return dirItems[dirItems.length - DIRS_TO_WORKFLOWNAME - 1];
}

function getPathToExe(dirItems: string[]) {
  const DIRS_TO_TESTS_FOLDER = 2;
  let path = dirItems[0];
  for (let i = 1; i < dirItems.length - DIRS_TO_TESTS_FOLDER; i++) {
    path = path.concat(`\\${dirItems[i]}`);
  }
  const UNIT_TEST_EXE_NAME = 'LogicAppsTest.exe';
  return `${path}\\${UNIT_TEST_EXE_NAME}`;
}

export async function runUnitTest(_context: IAzureConnectorsContext, node: vscode.Uri): Promise<void> {
  const options: vscode.ProgressOptions = {
    location: vscode.ProgressLocation.Notification,
    title: localize('azureFunctions.runUnitTest', 'Running Unit Test...'),
  };

  await vscode.window.withProgress(options, async () => {
    const pathToUnitTest = node.fsPath;
    const dirItems = pathToUnitTest.split('\\');

    try {
      const res = child.spawn(getPathToExe(dirItems), [
        '-PathToRoot',
        getPathToRoot(dirItems),
        '-workflowName',
        getWorkflowName(dirItems),
        '-pathToUnitTest',
        pathToUnitTest,
      ]);
      for await (const chunk of res.stdout) {
        vscode.window.showInformationMessage(`${chunk}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`${localize('runFailure', 'Error Running Unit Test.')} ${error.message}`, localize('OK', 'OK'));
      throw error;
    }
  });
}
