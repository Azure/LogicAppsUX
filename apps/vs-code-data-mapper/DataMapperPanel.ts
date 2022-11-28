import DataMapperExt from './src/DataMapperExt';
import { schemasPath, supportedSchemaFileExts } from './src/extensionConfig';
import type { MessageToVsix, MessageToWebview } from '@microsoft/logic-apps-data-mapper';
import { promises as fs } from 'fs';
import * as path from 'path';
import { RelativePattern, Uri, workspace } from 'vscode';
import type { WebviewPanel } from 'vscode';

export default class DataMapperPanel {
  public panel: WebviewPanel;
  private readonly _extensionPath: string;

  constructor(panel: WebviewPanel, extPath: string) {
    this.panel = panel;
    this._extensionPath = extPath;
    DataMapperExt.context?.subscriptions.push(panel);

    this._setWebviewHtml();

    // Watch Schemas folder for changes to update availabe schemas list within Data Mapper
    const schemaFolderPath = path.join(DataMapperExt.getWorkspaceFolderFsPath(), schemasPath);
    const schemaFolderWatcher = workspace.createFileSystemWatcher(
      new RelativePattern(schemaFolderPath, `**/*${supportedSchemaFileExts[0]}`)
    );
    schemaFolderWatcher.onDidCreate(DataMapperExt.handleReadSchemaFileOptions);
    schemaFolderWatcher.onDidDelete(DataMapperExt.handleReadSchemaFileOptions);

    // Handle messages from the webview (Data Mapper component)
    this.panel.webview.onDidReceiveMessage(this._handleWebviewMsg, undefined, DataMapperExt.context?.subscriptions);

    this.panel.onDidDispose(
      () => {
        DataMapperExt.currentPanel = undefined;
        schemaFolderWatcher.dispose();
      },
      null,
      DataMapperExt.context?.subscriptions
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
      return `${prefix}="${this.panel.webview.asWebviewUri(uri)}"`;
    };

    this.panel.webview.html = html.replace(matchLinks, toUri);
  }

  private _handleWebviewMsg(msg: MessageToVsix) {
    switch (msg.command) {
      case 'webviewLoaded':
        // Send runtime port to webview
        DataMapperExt.currentPanel?.sendMsgToWebview({ command: 'setRuntimePort', data: `${DataMapperExt.backendRuntimePort}` });

        // IF loading a data map, handle that + xslt filename
        DataMapperExt.handleLoadMapDefinitionIfAny();

        break;
      case 'webviewRscLoadError':
        // Handle DM top-level errors (such as loading schemas added from file, or general function manifest fetching issues)
        DataMapperExt.showError(`Error loading Data Mapper resource: ${msg.data}`);
        break;
      case 'addSchemaFromFile': {
        DataMapperExt.addSchemaFromFile(msg.data.path, msg.data.type);
        break;
      }
      case 'readLocalFileOptions': {
        DataMapperExt.handleReadSchemaFileOptions();
        break;
      }
      case 'saveDataMapDefinition': {
        DataMapperExt.saveDataMap(true, msg.data);
        break;
      }
      case 'saveDataMapXslt': {
        DataMapperExt.saveDataMap(false, msg.data);
        break;
      }
      case 'saveDraftDataMapDefinition': {
        if (DataMapperExt.currentDataMapStateIsDirty) {
          DataMapperExt.saveDraftDataMapDefinition(msg.data);
        }
        break;
      }
      case 'setIsMapStateDirty': {
        DataMapperExt.handleUpdateMapDirtyState(msg.data);
        break;
      }
    }
  }

  public sendMsgToWebview(msg: MessageToWebview) {
    this.panel.webview.postMessage(msg);
  }
}
