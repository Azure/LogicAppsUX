/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { runUnitTestEvent } from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { type IActionContext, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';

export interface UnitTestResult {
  isSuccessful: boolean;
  assertions: any[];
  duration?: number;
}

export async function runUnitTest(context: IActionContext, node: vscode.Uri | vscode.TestItem): Promise<UnitTestResult> {
  return await callWithTelemetryAndErrorHandling(runUnitTestEvent, async () => {
    const options: vscode.ProgressOptions = {
      location: vscode.ProgressLocation.Notification,
      title: localize('azureFunctions.runUnitTest', 'Running Unit Test...'),
    };

    return await vscode.window.withProgress(options, async () => {
      // This is where we are going to run the unit test from extension bundle
      // Just put a random decision here in the meantime
      try {
        const runId = node instanceof vscode.Uri ? node.fsPath : node.uri.fsPath;
        const start = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));
        const duration = Date.now() - start;

        const testResult = {
          isSuccessful: start % 2 === 0,
          assertions: [],
          duration,
        };

        ext.testRuns.set(runId, {
          runId,
          results: testResult,
        });

        return testResult;
      } catch (error) {
        vscode.window.showErrorMessage(`${localize('runFailure', 'Error Running Unit Test.')} ${error.message}`, localize('OK', 'OK'));
        context.telemetry.properties.errorMessage = error.message;
        throw error;
      }

      // const pathToUnitTest = node.fsPath;
      // const projectPath: string | undefined = await getLogicAppProjectRoot(this.context, pathToUnitTest);
      // const workflowName = path.basename(path.dirname(pathToUnitTest));

      // const UNIT_TEST_EXE_NAME = 'LogicAppsTest.exe';
      // const pathToExe = path.join(projectPath, UNIT_TEST_EXE_NAME);

      // try {
      //   const res = child.spawn(pathToExe, ['-PathToRoot', projectPath, '-workflowName', workflowName, '-pathToUnitTest', pathToUnitTest]);

      //   for await (const chunk of res.stdout) {
      //     vscode.window.showInformationMessage(`${chunk}`);
      //   }
      // } catch (error) {
      //   vscode.window.showErrorMessage(`${localize('runFailure', 'Error Running Unit Test.')} ${error.message}`, localize('OK', 'OK'));
      //   context.telemetry.properties.errorMessage = error.message;
      //   throw error;
      // }
    });
  });
}
