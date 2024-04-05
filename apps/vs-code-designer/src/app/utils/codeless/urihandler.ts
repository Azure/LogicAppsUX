/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { tryGetWebviewPanel } from './common';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import * as query from 'querystring';
// querystring = require('querystring');
import * as vscode from 'vscode';

export class UriHandler extends vscode.EventEmitter<vscode.Uri> implements vscode.UriHandler {
  public handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
    if (uri.path === '/authcomplete') {
      handleOAuthRedirect(uri);
    }
  }
}

function handleOAuthRedirect(uri: vscode.Uri): void {
  const queryParams = uri.query ? (query.parse(uri.query) as Record<string, string>) : {};
  const designerPanel = tryGetWebviewPanel(ext.webViewKey.designerLocal, queryParams['pid']);

  if (designerPanel) {
    const value: Record<string, string> = {
      ...queryParams,
    };

    console.log(uri);

    if (!queryParams['error']) {
      value.redirectUrl = '';
      value.code = value.code ? value.code : 'valid';
    }

    designerPanel.webview.postMessage({
      command: ExtensionCommand.completeOauthLogin,
      value,
    });
  }
}
