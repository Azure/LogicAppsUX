import DataMapperExt from './DataMapperExt';
import {
  dataMapDefinitionsPath,
  dataMapsPath,
  draftMapDefinitionSuffix,
  mapDefinitionExtension,
  mapXsltExtension,
  schemasPath,
  supportedSchemaFileExts,
} from './extensionConfig';
import type { MapDefinitionData, MessageToVsix, MessageToWebview, SchemaType } from '@microsoft/logic-apps-data-mapper';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandlingSync } from '@microsoft/vscode-azext-utils';
import { copyFileSync, existsSync as fileExistsSync, promises as fs, unlinkSync as removeFileSync } from 'fs';
import * as path from 'path';
import type { WebviewPanel } from 'vscode';
import { RelativePattern, Uri, window, workspace } from 'vscode';

export default class DataMapperPanel {
  public panel: WebviewPanel;

  public dataMapName: string;
  public dataMapStateIsDirty: boolean;
  public mapDefinitionData: MapDefinitionData | undefined;

  constructor(panel: WebviewPanel, dataMapName: string) {
    this.panel = panel;
    this.dataMapName = dataMapName;
    this.dataMapStateIsDirty = false;
    this.handleReadSchemaFileOptions = this.handleReadSchemaFileOptions.bind(this); // Bind these as they're used as callbacks
    this._handleWebviewMsg = this._handleWebviewMsg.bind(this);

    DataMapperExt.context.subscriptions.push(panel);

    this._setWebviewHtml();

    // Watch Schemas folder for changes to update available schemas list within Data Mapper
    const schemaFolderPath = path.join(DataMapperExt.getWorkspaceFolderFsPath(), schemasPath);
    const schemaFolderWatcher = workspace.createFileSystemWatcher(
      new RelativePattern(schemaFolderPath, `**/*.{${supportedSchemaFileExts.join()}}`)
    );
    schemaFolderWatcher.onDidCreate(this.handleReadSchemaFileOptions);
    schemaFolderWatcher.onDidDelete(this.handleReadSchemaFileOptions);

    // Handle messages from the webview (Data Mapper component)
    this.panel.webview.onDidReceiveMessage(this._handleWebviewMsg, undefined, DataMapperExt.context.subscriptions);

    this.panel.onDidDispose(
      () => {
        delete DataMapperExt.panelManagers[this.dataMapName];
        schemaFolderWatcher.dispose();
      },
      null,
      DataMapperExt.context.subscriptions
    );
  }

  private async _setWebviewHtml() {
    // Get webview content, converting links to VS Code URIs
    const indexPath = path.join(DataMapperExt.extensionPath, '/webview/index.html');
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
      const pth = path.join(DataMapperExt.extensionPath, '/webview/', link);
      const uri = Uri.file(pth);
      return `${prefix}="${this.panel.webview.asWebviewUri(uri)}"`;
    };

    this.panel.webview.html = html.replace(matchLinks, toUri);
  }

  public sendMsgToWebview(msg: MessageToWebview) {
    this.panel.webview.postMessage(msg);
  }

  private _handleWebviewMsg(msg: MessageToVsix) {
    switch (msg.command) {
      case 'webviewLoaded':
        // Send runtime port to webview
        this.sendMsgToWebview({ command: 'setRuntimePort', data: `${DataMapperExt.backendRuntimePort}` });

        // If loading a data map, handle that + xslt filename
        this.handleLoadMapDefinitionIfAny();

        break;
      case 'webviewRscLoadError':
        // Handle DM top-level errors (such as loading schemas added from file, or general function manifest fetching issues)
        DataMapperExt.showError(`Error loading Data Mapper resource: ${msg.data}`);
        break;
      case 'addSchemaFromFile': {
        this.addSchemaFromFile(msg.data.path, msg.data.type);
        break;
      }
      case 'readLocalFileOptions': {
        this.handleReadSchemaFileOptions();
        break;
      }
      case 'saveDataMapDefinition': {
        this.saveMapDefinition(msg.data);
        break;
      }
      case 'saveDataMapXslt': {
        this.saveMapXslt(msg.data);
        break;
      }
      case 'saveDraftDataMapDefinition': {
        if (this.dataMapStateIsDirty) {
          this.saveDraftDataMapDefinition(msg.data);
        }
        break;
      }
      case 'setIsMapStateDirty': {
        this.handleUpdateMapDirtyState(msg.data);
        break;
      }
      case 'getFunctionDisplayExpanded': {
        this.getConfigurationSetting('useExpandedFunctionCards');
        break;
      }
    }
  }

  public updateWebviewPanelTitle() {
    this.panel.title = `${this.dataMapName ?? 'Untitled'} ${this.dataMapStateIsDirty ? '●' : ''}`;
  }

  public handleUpdateMapDirtyState(isMapStateDirty: boolean) {
    this.dataMapStateIsDirty = isMapStateDirty;
    this.updateWebviewPanelTitle();

    // If map updates to not be dirty (Discard/undo/etc), we can safely remove the draft file
    if (!isMapStateDirty) {
      this.deleteDraftDataMapDefinition();
    }
  }

  public handleLoadMapDefinitionIfAny() {
    if (this.mapDefinitionData) {
      this.sendMsgToWebview({
        command: 'loadDataMap',
        data: this.mapDefinitionData,
      });

      this.checkAndSetXslt();

      this.mapDefinitionData = undefined;
    }
  }

  public handleReadSchemaFileOptions() {
    fs.readdir(path.join(DataMapperExt.getWorkspaceFolderFsPath(), schemasPath)).then((result) => {
      this.sendMsgToWebview({
        command: 'showAvailableSchemas',
        data: result.filter((file) => {
          const fileExt = path.extname(file).toLowerCase();
          return fileExt === '.xsd' || fileExt === '.json';
        }),
      });
    });
  }

  public addSchemaFromFile(filePath: string, schemaType: SchemaType) {
    callWithTelemetryAndErrorHandlingSync('azureDataMapper.addSchemaFromFile', (_context: IActionContext) => {
      fs.readFile(filePath, 'utf8').then((text: string) => {
        const primarySchemaFileName = path.basename(filePath); // Ex: inpSchema.xsd
        const expectedPrimarySchemaPath = path.join(DataMapperExt.getWorkspaceFolderFsPath(), schemasPath, primarySchemaFileName);

        // Examine the loaded text for the 'schemaLocation' attribute to auto-load in any dependencies too
        // NOTE: We only check in the same directory as the primary schema file (also, it doesn't attempt to deal with complicated paths/URLs, just filenames)
        const schemaFileDependencies = [...text.matchAll(/schemaLocation="[A-Za-z.]*"/g)].map((schemaFileAttributeMatch) => {
          // Trim down to just the filename
          return schemaFileAttributeMatch[0].split('"')[1];
        });

        schemaFileDependencies.forEach((schemaFile) => {
          const schemaFilePath = path.join(path.dirname(filePath), schemaFile);

          // Check that the schema file dependency exists in the same directory as the primary schema file
          if (!fileExistsSync(schemaFilePath)) {
            DataMapperExt.showError(
              `Schema loading error: couldn't find schema file dependency ${schemaFile} in the same directory as ${primarySchemaFileName}. ${primarySchemaFileName} will still be copied to the Schemas folder.`
            );
            return;
          }

          // Check that the schema file dependency doesn't already exist in the Schemas folder
          const expectedSchemaFilePath = path.join(DataMapperExt.getWorkspaceFolderFsPath(), schemasPath, schemaFile);
          if (!fileExistsSync(expectedSchemaFilePath)) {
            copyFileSync(schemaFilePath, expectedSchemaFilePath);
          }
        });

        // Check if in Artifacts/Schemas, and if not, create it and send it to DM for API call
        if (!fileExistsSync(expectedPrimarySchemaPath)) {
          copyFileSync(filePath, expectedPrimarySchemaPath);
        }

        this.sendMsgToWebview({
          command: 'fetchSchema',
          data: { fileName: primarySchemaFileName, type: schemaType as SchemaType },
        });
      });
    });
  }

  public saveMapDefinition(mapDefinition: string) {
    callWithTelemetryAndErrorHandlingSync('azureDataMapper.saveMapDefinition', (_context: IActionContext) => {
      // Delete *draft* map definition as it's no longer needed
      this.deleteDraftDataMapDefinition();

      const fileName = `${this.dataMapName}${mapDefinitionExtension}`;
      const dataMapFolderPath = path.join(DataMapperExt.getWorkspaceFolderFsPath(), dataMapDefinitionsPath);
      const filePath = path.join(dataMapFolderPath, fileName);

      // Mkdir as extra insurance that directory exists so file can be written
      // - harmless if directory already exists
      fs.mkdir(dataMapFolderPath, { recursive: true })
        .then(() => {
          fs.writeFile(filePath, mapDefinition, 'utf8').then(() => {
            // If XSLT, show notification and re-check/set xslt filename
            const openMapBtnText = `Open ${fileName}`;
            window.showInformationMessage('Map saved', openMapBtnText).then((clickedButton?: string) => {
              if (clickedButton && clickedButton === openMapBtnText) {
                workspace.openTextDocument(filePath).then(window.showTextDocument);
              }
            });
          });
        })
        .catch(DataMapperExt.showError);
    });
  }

  public saveMapXslt(mapXslt: string) {
    callWithTelemetryAndErrorHandlingSync('azureDataMapper.saveMapXslt', (_context: IActionContext) => {
      const fileName = `${this.dataMapName}${mapXsltExtension}`;
      const dataMapFolderPath = path.join(DataMapperExt.getWorkspaceFolderFsPath(), dataMapsPath);
      const filePath = path.join(dataMapFolderPath, fileName);

      // Mkdir as extra insurance that directory exists so file can be written
      // - harmless if directory already exists
      fs.mkdir(dataMapFolderPath, { recursive: true })
        .then(() => {
          fs.writeFile(filePath, mapXslt, 'utf8').then(() => {
            const openMapBtnText = `Open ${fileName}`;
            window.showInformationMessage('Map XSLT generated.', openMapBtnText).then((clickedButton?: string) => {
              if (clickedButton && clickedButton === openMapBtnText) {
                workspace.openTextDocument(filePath).then(window.showTextDocument);
              }
            });

            this.checkAndSetXslt();
          });
        })
        .catch(DataMapperExt.showError);
    });
  }

  public saveDraftDataMapDefinition(mapDefFileContents: string) {
    const mapDefileName = `${this.dataMapName}${draftMapDefinitionSuffix}${mapDefinitionExtension}`;
    const dataMapDefFolderPath = path.join(DataMapperExt.getWorkspaceFolderFsPath(), dataMapDefinitionsPath);
    const filePath = path.join(dataMapDefFolderPath, mapDefileName);

    // Mkdir as extra insurance that directory exists so file can be written
    // Harmless if directory already exists
    fs.mkdir(dataMapDefFolderPath, { recursive: true })
      .then(() => {
        fs.writeFile(filePath, mapDefFileContents, 'utf8');
      })
      .catch(DataMapperExt.showError);
  }

  public deleteDraftDataMapDefinition() {
    const draftMapDefinitionPath = path.join(
      DataMapperExt.getWorkspaceFolderFsPath(),
      dataMapDefinitionsPath,
      `${this.dataMapName}${draftMapDefinitionSuffix}${mapDefinitionExtension}`
    );
    if (fileExistsSync(draftMapDefinitionPath)) {
      removeFileSync(draftMapDefinitionPath);
    }
  }

  public checkAndSetXslt() {
    const expectedXsltPath = path.join(DataMapperExt.getWorkspaceFolderFsPath(), dataMapsPath, `${this.dataMapName}${mapXsltExtension}`);

    if (fileExistsSync(expectedXsltPath)) {
      fs.readFile(expectedXsltPath, 'utf-8').then((fileContents) => {
        this.sendMsgToWebview({
          command: 'setXsltData',
          data: {
            filename: this.dataMapName,
            fileContents,
          },
        });
      });
    } else {
      DataMapperExt.showWarning(`XSLT file not detected for ${this.dataMapName}`);
    }
  }

  public getConfigurationSetting(configSetting: string) {
    const azureDataMapperConfig = workspace.getConfiguration('azureDataMapper');
    const configValue = azureDataMapperConfig.get<boolean>(configSetting) ?? true;
    this.sendMsgToWebview({
      command: 'getConfigurationSetting',
      data: configValue,
    });
  }
}
