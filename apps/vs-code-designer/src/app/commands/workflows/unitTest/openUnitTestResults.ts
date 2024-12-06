/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { UnitTestResult } from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import { testsDirectoryName, testResultsDirectoryName, workflowFileName } from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { cacheWebviewPanel, removeWebviewPanelFromCache, tryGetWebviewPanel } from '../../../utils/codeless/common';
import { getWebViewHTML } from '../../../utils/codeless/getWebViewHTML';
import { getUnitTestName, pickUnitTest, pickUnitTestResult } from '../../../utils/unitTests';
import { getWorkflowNode, isMultiRootWorkspace } from '../../../utils/workspace';
import type { IAzureConnectorsContext } from '../azureConnectorWizard';
import * as path from 'path';
import {
  type TestItem,
  Uri,
  window,
  type WebviewPanel,
  ViewColumn,
  type WebviewOptions,
  type WebviewPanelOptions,
  type ProgressOptions,
  ProgressLocation,
  workspace,
} from 'vscode';
import * as fse from 'fs-extra';

/**
 * Opens the unit test results for a given context and node.
 * If a specific node is provided, it opens the unit test results for that node.
 * If no node is provided, it prompts the user to select a unit test and opens the results for that test.
 * @param {IAzureConnectorsContext} context - The Azure Connectors context.
 * @param {Uri | TestItem} node - The Uri or TestItem representing the node for which to open the unit test results.
 * @returns A Promise that resolves when the unit test results are opened.
 */
export async function openUnitTestResults(context: IAzureConnectorsContext, node: Uri | TestItem): Promise<void> {
  if (isMultiRootWorkspace()) {
    let unitTestNode: Uri;
    const workspacePath = path.dirname(workspace.workspaceFolders[0].uri.fsPath);
    const testsDirectory = path.join(workspacePath, testsDirectoryName);

    if (node && node instanceof Uri) {
      unitTestNode = getWorkflowNode(node) as Uri;
    } else if (node && !(node instanceof Uri) && node.uri instanceof Uri) {
      unitTestNode = node.uri;
    } else {
      const unitTest = await pickUnitTest(context, testsDirectory);
      unitTestNode = Uri.file(unitTest.data) as Uri;
    }

    const unitTestName = getUnitTestName(unitTestNode.fsPath);
    const workflowName = path.basename(path.dirname(unitTestNode.fsPath));
    const projectName = path.relative(testsDirectory, path.dirname(unitTestNode.fsPath));
    const testResultsDirectory = path.join(testsDirectory, testResultsDirectoryName, projectName, `${unitTestName}.unit-test`);
    const hasTestResults = await fse.pathExists(testResultsDirectory);

    if (hasTestResults) {
      const testResult: UnitTestResult = (await pickUnitTestResult(context, testResultsDirectory)).data;
      await openResultsWebview(workflowName, unitTestName, path.join(workspacePath, projectName, workflowFileName), testResult);
    } else {
      window.showInformationMessage(
        localize('noRunForUnitTest', 'There are no runs for the selected unit test. Make sure to run the unit test for "{0}"', unitTestName)
      );
    }
  } else {
    window.showInformationMessage(localize('expectedWorkspace', 'In order to create unit tests, you must have a workspace open.'));
  }
}

/**
 * Opens the unit test results in a webview.
 * @param {string} workflowName - The name of the workflow.
 * @param {string} unitTestName - The name of the unit test.
 * @param {string} workflowPath - The path to the workflow.
 * @param {UnitTestResult} testResult - The unit test result.
 * @returns A Promise that resolves when the webview is opened.
 */
export async function openResultsWebview(
  workflowName: string,
  unitTestName: string,
  workflowPath: string,
  testResult: UnitTestResult
): Promise<void> {
  const panelName = `${workflowName} - ${unitTestName} - ${localize('unitTestResult', 'Unit test results')}`;
  const panelGroupKey = ext.webViewKey.unitTest;
  const existingPanel: WebviewPanel | undefined = tryGetWebviewPanel(panelGroupKey, panelName);
  const workflowNode = Uri.file(workflowPath);

  if (existingPanel) {
    if (!existingPanel.active) {
      existingPanel.reveal(ViewColumn.Active);
    }

    return;
  }

  const webviewOptions: WebviewOptions & WebviewPanelOptions = {
    enableScripts: true,
    retainContextWhenHidden: true,
  };

  const progressOptions: ProgressOptions = {
    location: ProgressLocation.Notification,
    title: localize('openingUnitTestResults', 'Opening unit test results...'),
  };

  const panel: WebviewPanel = window.createWebviewPanel('UnitTestsResults', panelName, ViewColumn.Active, webviewOptions);
  panel.iconPath = {
    light: Uri.file(path.join(ext.context.extensionPath, 'assets', 'light', 'Codeless.svg')),
    dark: Uri.file(path.join(ext.context.extensionPath, 'assets', 'dark', 'Codeless.svg')),
  };
  panel.webview.html = await getWebViewHTML('vs-code-react', panel);

  await window.withProgress(progressOptions, async () => {
    try {
      panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
          case ExtensionCommand.initialize: {
            panel.webview.postMessage({
              command: ExtensionCommand.initialize_frame,
              data: {
                project: ProjectName.unitTest,
                unitTestName,
                testResult,
                hostVersion: ext.extensionVersion,
              },
            });
            break;
          }
          case ExtensionCommand.viewWorkflow: {
            window.showTextDocument(await workspace.openTextDocument(workflowNode));
            break;
          }
          default:
            break;
        }
      }, ext.context.subscriptions);
    } catch (error) {
      window.showErrorMessage(`${localize('review failure', 'Error opening review')} ${error.message}`, localize('OK', 'OK'));
      throw error;
    }
  });

  panel.onDidDispose(
    () => {
      removeWebviewPanelFromCache(panelGroupKey, panelName);
    },
    null,
    ext.context.subscriptions
  );
  cacheWebviewPanel(panelGroupKey, panelName, panel);
}
