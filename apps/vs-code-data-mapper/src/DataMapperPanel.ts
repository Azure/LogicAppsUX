import { promises as fs } from 'fs';
import { join } from 'path';
import { Uri, ViewColumn, window } from 'vscode';
import type { WebviewPanel, Disposable, ExtensionContext } from 'vscode';

type MessageType = { command: any; data: any };

export default class DataMapperPanel {
  public static currentPanel: DataMapperPanel | undefined;
  public static readonly viewType = 'dataMapperWebview';
  public static contextSubscriptionsRef: Disposable[] | undefined;

  private readonly _panel: WebviewPanel;
  private readonly _extensionPath: string;

  public static createOrShow(context: ExtensionContext) {
    DataMapperPanel.contextSubscriptionsRef = context.subscriptions;

    // If a panel has already been created, re-show it
    if (DataMapperPanel.currentPanel) {
      DataMapperPanel.currentPanel._panel.reveal(ViewColumn.Active);
      return;
    }

    const panel = window.createWebviewPanel(
      DataMapperPanel.viewType, // Key used to reference the panel
      'LA Data Mapper', // Title display in the tab
      ViewColumn.Active, // Editor column to show the new webview panel in
      { enableScripts: true }
    );

    this.currentPanel = new DataMapperPanel(panel, context.extensionPath);
  }

  public sendMsgToWebview(msg: MessageEvent<MessageType>) {
    this._panel.webview.postMessage(msg);
  }

  // TODO: revive()

  private constructor(panel: WebviewPanel, extPath: string) {
    this._panel = panel;
    DataMapperPanel.contextSubscriptionsRef.push(panel);

    this._setWebviewHtml(extPath);

    this._panel.onDidDispose(
      () => {
        DataMapperPanel.currentPanel = undefined;
      },
      null,
      DataMapperPanel.contextSubscriptionsRef
    );

    // Handle messages from the webview (Data Mapper component)
    this._panel.webview.onDidReceiveMessage(this._handleWebviewMsg, undefined, DataMapperPanel.contextSubscriptionsRef);
  }

  private async _setWebviewHtml(extensionPath: string) {
    // Get webview content, converting links to VS Code URIs
    const indexPath = join(extensionPath, 'webview/index.html');
    const html = await fs.readFile(indexPath, 'utf-8');
    // 1. Get all links prefixed by href or src
    const matchLinks = /(href|src)="([^"]*)"/g;
    // 2. Transform the result of the regex into a vscode's URI format
    const toUri = (_, prefix: 'href' | 'src', link: string) => {
      // For HTML elements
      if (link === '#') {
        return `${prefix}="${link}"`;
      }
      // For scripts & links
      const path = join(extensionPath, 'webview', link);
      const uri = Uri.file(path);
      return `${prefix}="${this._panel.webview.asWebviewUri(uri)}"`;
    };
    this._panel.webview.html = html.replace(matchLinks, toUri);
  }

  // TODO: figure out what messages we expect to receive from DM app
  private _handleWebviewMsg(msg: MessageEvent<MessageType>) {
    console.log(msg);
  }
}
