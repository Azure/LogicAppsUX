/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as path from 'path';
import type { ExtensionContext } from 'vscode';
import { window, ViewColumn, Uri } from 'vscode';

export async function openDesigner(context: ExtensionContext, node: Uri | undefined): Promise<void> {
  const logicAppNode = node[0];
  const workflowName: string = path.basename(path.dirname(logicAppNode.fsPath));

  const panel = window.createWebviewPanel(
    'designerLocal', // Key used to reference the panel
    workflowName, // Title display in the tab
    ViewColumn.Active, // Editor column to show the new webview panel in.
    { enableScripts: true }
  );

  const indexPath = join(ext.context.extensionPath, 'webview/index.html');
  const html = await fs.readFile(indexPath, 'utf-8');
  // 1. Get all link prefixed by href or src
  const matchLinks = /(href|src)="([^"]*)"/g;
  // 2. Transform the result of the regex into a vscode's URI format
  const toUri = (_, prefix: 'href' | 'src', link: string) => {
    // For
    if (link === '#') {
      return `${prefix}="${link}"`;
    }
    // For scripts & links
    const path = join(ext.context.extensionPath, 'webview', link);
    const uri = Uri.file(path);
    return `${prefix}="${panel.webview.asWebviewUri(uri)}"`;
  };
  panel.webview.html = html.replace(matchLinks, toUri);

  context.subscriptions.push(panel);
}
