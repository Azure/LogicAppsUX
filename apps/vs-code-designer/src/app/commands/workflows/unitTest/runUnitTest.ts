/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { runUnitTestEvent } from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import type { UnitTestResult } from '../../../utils/unitTests';
import { type IActionContext, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { getExtensionBundleFolder } from '../getDebugSymbolDll';
import { getLogicAppProjectRoot } from '../../../utils/codeless/connection';

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

        const projectPath: string | undefined = await getLogicAppProjectRoot(this.context, unitTestPath);
        const workflowName = path.basename(path.dirname(unitTestPath));

        const bundleFolderRoot = await getExtensionBundleFolder();
        const bundleFolder = path.join(bundleFolderRoot, 'Microsoft.Azure.Functions.ExtensionBundle.Workflows');
        const pathToExe = path.join(bundleFolder, '1.69.0.5', 'UnitTestExecutor', 'Microsoft.Azure.Workflows.UnitTestExecutor.exe');
        const res = cp.spawn(pathToExe, [
          '-PathToRootFolder',
          projectPath,
          '-logicAppName',
          workflowName,
          '-workflowName',
          workflowName,
          '-unitTestName',
          unitTestPath,
        ]);

        for await (const chunk of res.stdout) {
          console.log('charles', chunk);
          vscode.window.showInformationMessage(`${chunk}`);
        }

        res.stdout.on('data', (data: string | Buffer) => {
          data = data.toString();
          console.log('charles', data);
          vscode.window.showInformationMessage(`${data}`);
        });

        res.stderr.on('data', (data: string | Buffer) => {
          data = data.toString();
          console.log('charles', data);
          vscode.window.showInformationMessage(`${data}`);
        });

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
