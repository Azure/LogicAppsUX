/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { developmentDirectoryName, testsDirectoryName } from '../../../../constants';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { cacheWebviewPanel, removeWebviewPanelFromCache, tryGetWebviewPanel } from '../../../utils/codeless/common';
import { getWebViewHTML } from '../../../utils/codeless/getWebViewHTML';
import { getUnitTestName, pickUnitTest } from '../../../utils/unitTests';
import { tryGetLogicAppProjectRoot } from '../../../utils/verifyIsProject';
import { getWorkflowNode, getWorkspaceFolder } from '../../../utils/workspace';
import { type IAzureConnectorsContext } from '../azureConnectorWizard';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension';
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
} from 'vscode';

/**
 * Opens the unit test results for a given context and node.
 * If a specific node is provided, it opens the unit test results for that node.
 * If no node is provided, it prompts the user to select a unit test and opens the results for that test.
 * @param {IAzureConnectorsContext} context - The Azure Connectors context.
 * @param {Uri | TestItem} node - The Uri or TestItem representing the node for which to open the unit test results.
 * @returns A Promise that resolves when the unit test results are opened.
 */
export async function openUnitTestResults(context: IAzureConnectorsContext, node: Uri | TestItem): Promise<void> {
  let unitTestNode: Uri;
  const workspaceFolder = await getWorkspaceFolder(context);
  const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);

  if (node && node instanceof Uri) {
    unitTestNode = getWorkflowNode(node) as Uri;
  } else if (node && !(node instanceof Uri) && node.uri instanceof Uri) {
    unitTestNode = node.uri;
  } else {
    const unitTest = await pickUnitTest(context, path.join(projectPath, developmentDirectoryName, testsDirectoryName));
    unitTestNode = Uri.file(unitTest.data) as Uri;
  }
  const unitTestName = getUnitTestName(unitTestNode.fsPath);

  if (ext.testRuns.has(unitTestNode.fsPath)) {
    const workflowName = path.basename(path.dirname(unitTestNode.fsPath));
    // const workflowPath = path.join(projectPath, workflowName, workflowFileName);
    // const workflowNode = Uri.file(workflowPath);
    // const unitTestDefinition = JSON.parse(readFileSync(unitTestNode.fsPath, 'utf8'));
    await openResultsWebview(workflowName);
  } else {
    window.showInformationMessage(
      localize('noRunForUnitTest', 'There is no run for the selected unit test. Make sure to run the unit test for "{0}"', unitTestName)
    );
  }
}

/**
 * Opens the unit test results in a webview panel.
 * @param {string} workflowName - The name of the workflow.
 * @returns A promise that resolves when the unit test results are opened.
 */
export async function openResultsWebview(workflowName: string): Promise<void> {
  const panelName = `${workflowName} - ${localize('unitTestResult', 'unit test results')}`;
  const panelGroupKey = ext.webViewKey.unitTest;
  const existingPanel: WebviewPanel | undefined = tryGetWebviewPanel(panelGroupKey, panelName);

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
  panel.webview.html = await getWebViewHTML('vs-code-react', panel);

  let interval;

  await window.withProgress(progressOptions, async () => {
    try {
      panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
          case ExtensionCommand.initialize: {
            panel.webview.postMessage({
              command: ExtensionCommand.initialize_frame,
              data: {
                project: ProjectName.unitTest,
                hostVersion: ext.extensionVersion,
              },
            });
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
      clearInterval(interval);
    },
    null,
    ext.context.subscriptions
  );
  cacheWebviewPanel(panelGroupKey, panelName, panel);
}
