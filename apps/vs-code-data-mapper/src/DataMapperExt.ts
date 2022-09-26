import { dataMapDefinitionsPath, schemasPath, webviewTitle } from './extensionConfig';
import type { ChildProcess } from 'child_process';
import { promises as fs, existsSync as fileExists } from 'fs';
import * as path from 'path';
import { Uri, ViewColumn, window, workspace } from 'vscode';
import type { WebviewPanel, ExtensionContext, OutputChannel } from 'vscode';

type SchemaType = 'source' | 'target';

type SendingMessageTypes =
  | { command: 'fetchSchema'; data: { fileName: string; type: SchemaType } }
  | { command: 'loadDataMap' | 'loadNewDataMap'; data: any }
  | { command: 'showAvailableSchemas'; data: string[] };
type ReceivingMessageTypes =
  | {
      command: 'addSchemaFromFile' | 'readLocalFileOptions';
      data: { path: string; type: SchemaType };
    }
  | {
      command: 'saveDataMapDefinition';
      data: string;
    };

export default class DataMapperExt {
  public static currentPanel: DataMapperExt | undefined;
  public static outputChannel: OutputChannel | undefined;
  public static readonly viewType = 'dataMapperWebview';
  public static extensionContext: ExtensionContext | undefined;
  public static currentDataMapName: string | undefined;
  public static backendRuntimeChildProcess: ChildProcess | undefined;

  private readonly _panel: WebviewPanel;
  private readonly _extensionPath: string;

  public static createOrShow(context: ExtensionContext) {
    // If a panel has already been created, re-show it
    if (DataMapperExt.currentPanel) {
      DataMapperExt.currentPanel._panel.reveal(ViewColumn.Active);
      return;
    }

    const panel = window.createWebviewPanel(
      DataMapperExt.viewType, // Key used to reference the panel
      webviewTitle, // Title display in the tab
      ViewColumn.Active, // Editor column to show the new webview panel in
      {
        enableScripts: true,
        // NOTE: Keeps webview content state even when placed in background (same as browsers)
        // - not as performant as vscode's get/setState, but likely not a concern at all for MVP
        retainContextWhenHidden: true,
      }
    );

    this.currentPanel = new DataMapperExt(panel, context.extensionPath);
  }

  public sendMsgToWebview(msg: SendingMessageTypes) {
    this._panel.webview.postMessage(msg);
  }

  private constructor(panel: WebviewPanel, extPath: string) {
    this._panel = panel;
    this._extensionPath = extPath;
    DataMapperExt.extensionContext?.subscriptions.push(panel);

    this._setWebviewHtml();

    // Handle messages from the webview (Data Mapper component)
    this._panel.webview.onDidReceiveMessage(this._handleWebviewMsg, undefined, DataMapperExt.extensionContext?.subscriptions);

    this._panel.onDidDispose(
      () => {
        DataMapperExt.currentPanel = undefined;
      },
      null,
      DataMapperExt.extensionContext?.subscriptions
    );
  }

  private async _setWebviewHtml() {
    // Get webview content, converting links to VS Code URIs
    const indexPath = path.join(this._extensionPath, '/webview/index.html');
    const html = await fs.readFile(indexPath, 'utf-8');
    // 1. Get all links prefixed by href or src
    const matchLinks = /(href|src)="([^"]*)"/g;
    // 2. Transform the result of the regex into a vscode's URI format
    const toUri = (_: unknown, prefix: 'href' | 'src', link: string) => {
      // For HTML elements
      if (link === '#') {
        return `${prefix}="${link}"`;
      }
      // For scripts & links
      const pth = path.join(this._extensionPath, '/webview/', link);
      const uri = Uri.file(pth);
      return `${prefix}="${this._panel.webview.asWebviewUri(uri)}"`;
    };

    this._panel.webview.html = html.replace(matchLinks, toUri);
  }

  private _handleWebviewMsg(msg: ReceivingMessageTypes) {
    switch (msg.command) {
      case 'addSchemaFromFile': {
        DataMapperExt.currentPanel.addSchemaFromFile(msg.data.path, msg.data.type);
        break;
      }
      case 'readLocalFileOptions': {
        const folderPath = DataMapperExt.getWorkspaceFolderFsPath();
        fs.readdir(path.join(folderPath, schemasPath)).then((result) => {
          DataMapperExt.currentPanel?.sendMsgToWebview({
            command: 'showAvailableSchemas',
            data: result.filter((file) => path.extname(file).toLowerCase() === '.xsd'),
          });
        });
        break;
      }
      case 'saveDataMapDefinition': {
        if (!DataMapperExt.currentDataMapName) {
          DataMapperExt.currentDataMapName = 'default';
        }

        const fileName = `${DataMapperExt.currentDataMapName}.yml`;
        const filePath = path.join(DataMapperExt.getWorkspaceFolderFsPath(), dataMapDefinitionsPath, fileName);
        fs.writeFile(filePath, msg.data, 'utf8');
      }
    }
  }

  public addSchemaFromFile(filePath: string, schemaType: 'source' | 'target') {
    // NOTE: .xsd files are utf-16 encoded
    fs.readFile(filePath, 'utf16le').then((text: string) => {
      // Check if in workspace/Artifacts/Schemas, and if not, create it and send it to DM for API call
      const schemaFileName = path.basename(filePath); // Ex: inpSchema.xsd
      const expectedSchemaPath = path.join(DataMapperExt.getWorkspaceFolderFsPath(), schemasPath, schemaFileName);

      if (!fileExists(expectedSchemaPath)) {
        fs.writeFile(expectedSchemaPath, text, 'utf16le').then(() => {
          DataMapperExt.currentPanel?.sendMsgToWebview({ command: 'fetchSchema', data: { fileName: schemaFileName, type: schemaType } });
        });
      } else {
        DataMapperExt.currentPanel?.sendMsgToWebview({ command: 'fetchSchema', data: { fileName: schemaFileName, type: schemaType } });
      }
    });
  }

  public static log(text: string) {
    DataMapperExt.outputChannel.appendLine(text);
    DataMapperExt.outputChannel.show();
  }

  public static showError(errMsg: string) {
    DataMapperExt.log(errMsg);
    window.showErrorMessage(errMsg);
  }

  public static getWorkspaceFolderFsPath() {
    if (workspace.workspaceFolders) {
      return workspace.workspaceFolders[0].uri.fsPath;
    } else {
      DataMapperExt.showError('No VS Code folder/workspace found...');
      return undefined;
    }
  }
}
