/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext, ExtensionCommand } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { cacheWebviewPanel, removeWebviewPanelFromCache, tryGetWebviewPanel } from '../../../utils/codeless/common';
import { getWebViewHTML } from '../../../utils/codeless/getWebViewHTML';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ProjectName, RouteName } from '@microsoft/vscode-extension-logic-apps';
import * as vscode from 'vscode';

export async function openLanguageServerConnectionView(_context: IActionContext, _node: vscode.Uri): Promise<void> {
  const panelName: string = localize('connectionView', 'Connection view');
  const panelGroupKey = ext.webViewKey.languageServer;
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

  const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
    'ConnectionView',
    `${panelName}`,
    vscode.ViewColumn.Active,
    webviewOptions
  );
  panel.webview.html = await getWebViewHTML('vs-code-react', panel);

  try {
    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case ExtensionCommand.initialize: {
          panel.webview.postMessage({
            command: ExtensionCommand.initialize_frame,
            data: {
              project: ProjectName.languageServer,
              route: RouteName.connectionView,
            },
          });
          break;
        }
        default:
          break;
      }
    }, ext.context.subscriptions);
  } catch (error) {
    vscode.window.showErrorMessage(`${localize('review failure', 'Error opening connection view')} ${error.message}`, localize('OK', 'OK'));
    throw error;
  }

  panel.onDidDispose(
    () => {
      removeWebviewPanelFromCache(panelGroupKey, panelName);
    },
    null,
    ext.context.subscriptions
  );
  cacheWebviewPanel(panelGroupKey, panelName, panel);
  ext.context.subscriptions.push(panel);
}
