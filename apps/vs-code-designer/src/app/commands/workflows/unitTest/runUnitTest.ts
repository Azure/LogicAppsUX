/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { defaultExtensionBundlePathValue, runUnitTestEvent } from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { getUnitTestName, type UnitTestResult } from '../../../utils/unitTests';
import { type IActionContext, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { getWorkspacePath } from '../../../utils/workspace';
import { getLatestBundleVersion } from '../../../utils/bundleFeed';

/**
 * Runs a unit test for a given node in the Logic Apps designer.
 * @param {IActionContext} context -  The action context.
 * @param {vscode.Uri | vscode.TestItem} node - The URI or TestItem representing the node to run the unit test for.
 * @returns A Promise that resolves to the UnitTestResult object.
 */
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
        const unitTestPath = node instanceof vscode.Uri ? node.fsPath : node.uri.fsPath;
        const start = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));
        const duration = Date.now() - start;

        const testDirectory = getWorkspacePath(unitTestPath);
        const logicAppName = path.relative(testDirectory, unitTestPath).split(path.sep)[0];
        const workflowName = path.basename(path.dirname(unitTestPath));
        const unitTestName = getUnitTestName(path.basename(unitTestPath));
        const bundleVersionNumber = await getLatestBundleVersion(defaultExtensionBundlePathValue);

        const pathToExe = path.join(
          defaultExtensionBundlePathValue,
          bundleVersionNumber,
          'UnitTestExecutor',
          'Microsoft.Azure.Workflows.UnitTestExecutor.exe'
        );
        const res = cp.spawn(pathToExe, [
          '-PathToRootFolder',
          path.dirname(testDirectory),
          '-logicAppName',
          logicAppName,
          '-workflowName',
          workflowName,
          '-unitTestName',
          unitTestName,
        ]);

        for await (const chunk of res.stdout) {
          vscode.window.showInformationMessage(`${chunk}`);
        }

        const testResult = {
          isSuccessful: start % 2 === 0,
          assertions: [],
          duration,
        };

        ext.testRuns.set(unitTestPath, {
          unitTestPath,
          results: testResult,
        });

        return testResult;
      } catch (error) {
        vscode.window.showErrorMessage(`${localize('runFailure', 'Error Running Unit Test.')} ${error.message}`, localize('OK', 'OK'));
        context.telemetry.properties.errorMessage = error.message;
        throw error;
      }
    });
  });
}
