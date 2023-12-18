/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { getLogicAppProjectRoot } from '../../../utils/codeless/connection';
import { type IAzureConnectorsContext } from '../azureConnectorWizard';
import * as child from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';

export async function runUnitTest(context: IAzureConnectorsContext, node: vscode.Uri): Promise<void> {
  const options: vscode.ProgressOptions = {
    location: vscode.ProgressLocation.Notification,
    title: localize('azureFunctions.runUnitTest', 'Running Unit Test...'),
  };

  await vscode.window.withProgress(options, async () => {
    const pathToUnitTest = node.fsPath;
    const projectPath: string | undefined = await getLogicAppProjectRoot(this.context, pathToUnitTest);
    const workflowName = path.basename(path.dirname(pathToUnitTest));

    // TODO(ccastrotrejo): Need to confirm with BE and Nidhi on how we are going to execute the unit tests.
    const UNIT_TEST_EXE_NAME = 'LogicAppsTest.exe';
    const pathToExe = path.join(projectPath, UNIT_TEST_EXE_NAME);

    try {
      const res = child.spawn(pathToExe, ['-PathToRoot', projectPath, '-workflowName', workflowName, '-pathToUnitTest', pathToUnitTest]);

      for await (const chunk of res.stdout) {
        vscode.window.showInformationMessage(`${chunk}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`${localize('runFailure', 'Error Running Unit Test.')} ${error.message}`, localize('OK', 'OK'));
      context.telemetry.properties.errorMessage = error.message;
      throw error;
    }
  });
}
