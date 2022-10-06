import { ext } from '../../../../extensionVariables';
import { cacheWebviewPanel, removeWebviewPanelFromCache, tryGetWebviewPanel } from '../../../utils/codeless/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { join } from 'path';
import { Uri, ViewColumn, window } from 'vscode';
import type { WebviewPanel, ExtensionContext } from 'vscode';

export default class OpenDesignerForLocalProject {
  private panelGroupKey: string;
  private panelName: string;
  private readonly _panel: WebviewPanel;

  constructor(_context: ExtensionContext, node: Uri) {
    this.panelGroupKey = ext.webViewKey.designerLocal;
    this.panelName = path.basename(path.dirname(node.fsPath));
  }

  public async createPanel(context: ExtensionContext): Promise<void> {
    const existingPanel: WebviewPanel | undefined = this.getExistingPanel();

    if (existingPanel) {
      if (!existingPanel.active) {
        existingPanel.reveal(ViewColumn.Active);
        return;
      }
      return;
    }

    const panel = window.createWebviewPanel(
      this.panelGroupKey, // Key used to reference the panel
      this.panelName, // Title display in the tab
      ViewColumn.Active, // Editor column to show the new webview panel in.
      { enableScripts: true }
    );

    // Get webview content, converting links to VS Code URIs
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

    // Handle messages from the webview (Data Mapper component)
    panel.webview.onDidReceiveMessage(this._handleWebviewMsg, undefined, ext.context.subscriptions);

    panel.onDidDispose(
      () => {
        removeWebviewPanelFromCache(this.panelGroupKey, this.panelName);
      },
      null,
      ext.context.subscriptions
    );

    cacheWebviewPanel(this.panelGroupKey, this.panelName, panel);
    context.subscriptions.push(panel);
  }

  public sendMsgToWebview(msg: any) {
    this._panel.webview.postMessage(msg);
  }

  private _handleWebviewMsg(msg: any) {
    switch (msg.command) {
      default:
        break;
    }
  }

  protected getExistingPanel(): WebviewPanel | undefined {
    return tryGetWebviewPanel(this.panelGroupKey, this.panelName);
  }
}
