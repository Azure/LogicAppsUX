import {
  dataMapDefinitionsPath,
  dataMapsPath,
  defaultDatamapFilename,
  mapDefinitionExtension,
  mapXsltExtension,
  schemasPath,
  webviewTitle,
  webviewType,
} from './extensionConfig';
import { callWithTelemetryAndErrorHandlingSync } from '@microsoft/vscode-azext-utils';
import type { IActionContext, IAzExtOutputChannel } from '@microsoft/vscode-azext-utils';
import type { ChildProcess } from 'child_process';
import { promises as fs, existsSync as fileExists } from 'fs';
import * as path from 'path';
import { Uri, ViewColumn, window, workspace } from 'vscode';
import type { WebviewPanel, ExtensionContext } from 'vscode';

type SchemaType = 'source' | 'target';
type MapDefinitionEntry = { [key: string]: MapDefinitionEntry | string };
type FetchSchemaData = { fileName: string; type: SchemaType };
type MapDefinitionData = { mapDefinition: MapDefinitionEntry; sourceSchemaFileName: string; targetSchemaFileName: string };

type SendingMessageTypes =
  | { command: 'fetchSchema'; data: FetchSchemaData }
  | { command: 'loadDataMap'; data: MapDefinitionData }
  | { command: 'showAvailableSchemas'; data: string[] }
  | { command: 'setXsltFilename'; data: string }
  | { command: 'setRuntimePort'; data: string };
type ReceivingMessageTypes =
  | {
      command: 'addSchemaFromFile' | 'readLocalFileOptions';
      data: { path: string; type: SchemaType };
    }
  | {
      command: 'saveDataMapDefinition';
      data: string;
    }
  | {
      command: 'saveDataMapXslt';
      data: string;
    }
  | {
      command: 'webviewLoaded';
    };

export default class DataMapperExt {
  public static currentPanel: DataMapperExt | undefined;
  public static outputChannel: IAzExtOutputChannel;
  public static context: ExtensionContext;
  public static backendRuntimePort: number;
  public static backendRuntimeChildProcess: ChildProcess | undefined;

  public static currentDataMapName: string;
  public static loadMapDefinitionData: MapDefinitionData | undefined;

  private readonly _panel: WebviewPanel;
  private readonly _extensionPath: string;

  public static createOrShow() {
    // If a panel has already been created, re-show it
    if (DataMapperExt.currentPanel) {
      // NOTE: Shouldn't need to re-send runtime port if webview has already been loaded/set up

      // IF loading a data map, handle that + xslt filename
      DataMapperExt.handleLoadMapDefinitionIfAny();

      DataMapperExt.currentPanel._panel.reveal(ViewColumn.Active);
      return;
    }

    const panel = window.createWebviewPanel(
      webviewType, // Key used to reference the panel
      webviewTitle, // Title display in the tab
      ViewColumn.Active, // Editor column to show the new webview panel in
      {
        enableScripts: true,
        // NOTE: Keeps webview content state even when placed in background (same as browsers)
        // - not as performant as vscode's get/setState, but likely not a concern at all for MVP
        retainContextWhenHidden: true,
      }
    );

    this.currentPanel = new DataMapperExt(panel, DataMapperExt.context.extensionPath);

    // From here, VSIX will handle any other initial-load-time events once receive webviewLoaded msg
  }

  public sendMsgToWebview(msg: SendingMessageTypes) {
    this._panel.webview.postMessage(msg);
  }

  private constructor(panel: WebviewPanel, extPath: string) {
    this._panel = panel;
    this._extensionPath = extPath;
    DataMapperExt.context?.subscriptions.push(panel);

    this._setWebviewHtml();

    // Handle messages from the webview (Data Mapper component)
    this._panel.webview.onDidReceiveMessage(this._handleWebviewMsg, undefined, DataMapperExt.context?.subscriptions);

    this._panel.onDidDispose(
      () => {
        DataMapperExt.currentPanel = undefined;
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
      return `${prefix}="${this._panel.webview.asWebviewUri(uri)}"`;
    };

    this._panel.webview.html = html.replace(matchLinks, toUri);
  }

  private _handleWebviewMsg(msg: ReceivingMessageTypes) {
    switch (msg.command) {
      case 'webviewLoaded':
        // Send runtime port to webview
        DataMapperExt.currentPanel?.sendMsgToWebview({ command: 'setRuntimePort', data: `${DataMapperExt.backendRuntimePort}` });

        // IF loading a data map, handle that + xslt filename
        DataMapperExt.handleLoadMapDefinitionIfAny();

        break;
      case 'addSchemaFromFile': {
        DataMapperExt.addSchemaFromFile(msg.data.path, msg.data.type);
        break;
      }
      case 'readLocalFileOptions': {
        const workflowFolderPath = DataMapperExt.getWorkspaceFolderFsPath();
        if (workflowFolderPath) {
          fs.readdir(path.join(workflowFolderPath, schemasPath)).then((result) => {
            DataMapperExt.currentPanel?.sendMsgToWebview({
              command: 'showAvailableSchemas',
              data: result.filter((file) => path.extname(file).toLowerCase() === '.xsd'),
            });
          });
        }
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
    }
  }

  public static handleLoadMapDefinitionIfAny() {
    if (DataMapperExt.loadMapDefinitionData) {
      DataMapperExt.currentPanel?.sendMsgToWebview({
        command: 'loadDataMap',
        data: DataMapperExt.loadMapDefinitionData,
      });

      DataMapperExt.checkForAndSetXsltFilename();

      DataMapperExt.loadMapDefinitionData = undefined;
    }
  }

  public static addSchemaFromFile(filePath: string, schemaType: 'source' | 'target') {
    callWithTelemetryAndErrorHandlingSync('azureDataMapper.addSchemaFromFile', (_context: IActionContext) => {
      // NOTE: .xsd files are utf-16 encoded
      fs.readFile(filePath, 'utf16le').then((text: string) => {
        // Check if in workspace/Artifacts/Schemas, and if not, create it and send it to DM for API call
        const folderPath = DataMapperExt.getWorkspaceFolderFsPath();
        if (folderPath) {
          const schemaFileName = path.basename(filePath); // Ex: inpSchema.xsd
          const expectedSchemaPath = path.join(folderPath, schemasPath, schemaFileName);

          if (!fileExists(expectedSchemaPath)) {
            fs.writeFile(expectedSchemaPath, text, 'utf16le').then(() => {
              DataMapperExt.currentPanel?.sendMsgToWebview({
                command: 'fetchSchema',
                data: { fileName: schemaFileName, type: schemaType },
              });
            });
          } else {
            DataMapperExt.currentPanel?.sendMsgToWebview({ command: 'fetchSchema', data: { fileName: schemaFileName, type: schemaType } });
          }
        }
      });
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

  public static saveDataMap(isDefinition: boolean, fileContents: string) {
    callWithTelemetryAndErrorHandlingSync('azureDataMapper.saveDataMap', (_context: IActionContext) => {
      if (!DataMapperExt.currentDataMapName) {
        DataMapperExt.currentDataMapName = defaultDatamapFilename;
      }

      const fileName = `${DataMapperExt.currentDataMapName}${isDefinition ? mapDefinitionExtension : mapXsltExtension}`;
      const workflowFolderPath = DataMapperExt.getWorkspaceFolderFsPath();
      if (workflowFolderPath) {
        const dataMapFolderPath = path.join(workflowFolderPath, isDefinition ? dataMapDefinitionsPath : dataMapsPath);
        const filePath = path.join(dataMapFolderPath, fileName);

        // Mkdir as extra insurance that directory exists so file can be written
        // - harmless if directory already exists
        fs.mkdir(dataMapFolderPath, { recursive: true })
          .then(() => {
            fs.writeFile(filePath, fileContents, 'utf8').then(() => {
              if (!isDefinition) {
                // If XSLT, show notification and re-check/set xslt filename
                const openMapBtnText = `Open ${fileName}`;
                window.showInformationMessage('Map saved and .XSLT file generated.', openMapBtnText).then((clickedButton?: string) => {
                  if (clickedButton && clickedButton === openMapBtnText) {
                    workspace.openTextDocument(filePath).then(window.showTextDocument);
                  }
                });

                DataMapperExt.checkForAndSetXsltFilename();
              }
            });
          })
          .catch(DataMapperExt.showError);
      }
    });
  }

  public static checkForAndSetXsltFilename() {
    const workflowFolderPath = DataMapperExt.getWorkspaceFolderFsPath();

    if (workflowFolderPath) {
      const expectedXsltPath = path.join(workflowFolderPath, dataMapsPath, `${DataMapperExt.currentDataMapName}${mapXsltExtension}`);

      if (fileExists(expectedXsltPath)) {
        DataMapperExt.currentPanel?.sendMsgToWebview({
          command: 'setXsltFilename',
          data: DataMapperExt.currentDataMapName,
        });
      } else {
        DataMapperExt.showError(
          `XSLT data map file not detected for ${DataMapperExt.currentDataMapName} - save your data map to generate it`
        );
      }
    }
  }
}
