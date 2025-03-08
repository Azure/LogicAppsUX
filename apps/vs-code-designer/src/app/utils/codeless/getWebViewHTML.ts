/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { promises as fs } from 'fs';
import { join } from 'path';
import type { WebviewPanel } from 'vscode';
import { Uri } from 'vscode';

/**
 * Gets webview content, converting links to VS Code URIs
 * @param {string} webviewFolder - React project folder name.
 * @param {WebviewPanel} panel - Webview panel.
 * @returns {Promise<string>} Webview html.
 */
export async function getWebViewHTML(webviewFolder: string, panel: WebviewPanel): Promise<string> {
  const indexPath = join(ext.context.extensionPath, webviewFolder, 'index.html');
  const html = (await fs.readFile(indexPath, 'utf-8')) as string;

  // 1. Get all link prefixed by href or src
  const matchLinks = /(href|src)="([^"]*)"/g;
  // 2. Transform the result of the regex into a vscode's URI format
  const toUri = (_, prefix: 'href' | 'src', link: string) => {
    // For
    if (link === '#') {
      return `${prefix}="${link}"`;
    }
    // For scripts & links
    const path = join(ext.context.extensionPath, webviewFolder, link);
    const uri = Uri.file(path);
    return `${prefix}="${panel.webview.asWebviewUri(uri)}"`;
  };

  return html.replace(matchLinks, toUri);
}
