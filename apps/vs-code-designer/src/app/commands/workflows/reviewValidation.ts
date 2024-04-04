/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext, ExtensionCommand } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { cacheWebviewPanel, removeWebviewPanelFromCache, tryGetWebviewPanel } from '../../utils/codeless/common';
import { getWebViewHTML } from '../../utils/codeless/getWebViewHTML';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ProjectName } from '@microsoft/vscode-extension-logic-apps';
import { readFileSync } from 'fs';
import * as vscode from 'vscode';

export async function reviewValidation(_context: IActionContext, node: vscode.Uri): Promise<void> {
  const panelName: string = localize('validation', 'Validation');
  const panelGroupKey = ext.webViewKey.export;
  const existingPanel: vscode.WebviewPanel | undefined = tryGetWebviewPanel(panelGroupKey, panelName);

  if (existingPanel) {
    if (!existingPanel.active) {
      existingPanel.reveal(vscode.ViewColumn.Active);
    }

    return;
  }

  const webviewOptions: vscode.WebviewOptions & vscode.WebviewPanelOptions = {
    enableScripts: true,
    retainContextWhenHidden: true,
  };

  const progressOptions: vscode.ProgressOptions = {
    location: vscode.ProgressLocation.Notification,
    title: localize('opening review', 'Opening review'),
  };

  const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
    'Validation',
    `${panelName}`,
    vscode.ViewColumn.Active,
    webviewOptions
  );
  panel.webview.html = await getWebViewHTML('vs-code-react', panel);

  let interval;

  await vscode.window.withProgress(progressOptions, async () => {
    try {
      const reviewFilePath = node.fsPath;
      const reviewContent = JSON.parse(readFileSync(reviewFilePath, 'utf8'));

      panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
          case ExtensionCommand.initialize: {
            panel.webview.postMessage({
              command: ExtensionCommand.initialize_frame,
              data: {
                project: ProjectName.review,
                reviewContent,
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
      vscode.window.showErrorMessage(`${localize('review failure', 'Error opening review')} ${error.message}`, localize('OK', 'OK'));
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
