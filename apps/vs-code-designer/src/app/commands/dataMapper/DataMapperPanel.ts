import { dataMapperVersionSetting, defaultDataMapperVersion, extensionCommand, Platform, vscodeFolderName } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getWebViewHTML } from '../../utils/codeless/getWebViewHTML';
import {
  dataMapDefinitionsPath,
  dataMapsPath,
  draftMapDefinitionSuffix,
  mapDefinitionExtension,
  mapXsltExtension,
  schemasPath,
  customXsltPath,
  supportedSchemaFileExts,
  supportedCustomXsltFileExts,
} from './extensionConfig';
import { LogEntryLevel } from '@microsoft/logic-apps-shared';
import type { SchemaType, MapMetadata, IFileSysTreeItem } from '@microsoft/logic-apps-shared';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandlingSync } from '@microsoft/vscode-azext-utils';
import type { MapDefinitionData, MessageToVsix, MessageToWebview } from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import {
  copyFileSync,
  existsSync as fileExistsSync,
  promises as fs,
  unlinkSync as removeFileSync,
  statSync,
  readdirSync,
  readFileSync,
} from 'fs';
import * as path from 'path';
import type { WebviewPanel } from 'vscode';
import { RelativePattern, window, workspace } from 'vscode';
import * as vscode from 'vscode';
import { copyOverImportedSchemas } from './DataMapperPanelUtils';

export default class DataMapperPanel {
  public panel: WebviewPanel;

  public dataMapVersion: number;
  public dataMapName: string;
  public dataMapStateIsDirty: boolean;
  public mapDefinitionData: MapDefinitionData | undefined;
  private telemetryPrefix = 'data-mapper-vscode-extension';

  constructor(panel: WebviewPanel, dataMapName: string) {
    this.panel = panel;
    this.dataMapVersion = this.getDataMapperVersion();
    this.dataMapName = dataMapName;
    this.dataMapStateIsDirty = false;
    this.handleReadSchemaFileOptions = this.handleReadSchemaFileOptions.bind(this); // Bind these as they're used as callbacks
    this._handleWebviewMsg = this._handleWebviewMsg.bind(this);

    vscode.commands.executeCommand('workbench.action.toggleSidebarVisibility');
    vscode.commands.executeCommand('workbench.action.togglePanel');

    ext.context.subscriptions.push(panel);

    this._setWebviewHtml();

    // watch folder for file changes
    const schemaFolderWatcher = this.watchFolderForChanges(schemasPath, supportedSchemaFileExts, this.handleReadSchemaFileOptions);
    const customXsltFolderWatcher = this.watchFolderForChanges(
      customXsltPath,
      supportedCustomXsltFileExts,
      this.handleReadAvailableCustomXsltPaths
    );

    // Handle messages from the webview (Data Mapper component)
    this.panel.webview.onDidReceiveMessage(this._handleWebviewMsg, undefined, ext.context.subscriptions);

    this.panel.onDidDispose(
      () => {
        delete ext.dataMapPanelManagers[this.dataMapName];
        if (schemaFolderWatcher) {
          schemaFolderWatcher.dispose();
        }
        if (customXsltFolderWatcher) {
          customXsltFolderWatcher.dispose();
        }
      },
      null,
      ext.context.subscriptions
    );

    this.isTestDisabledForOS();
  }

  private watchFolderForChanges(folderPath: string, fileExtensions: string[], fn: () => void) {
    // Watch folder for changes to update available file list within Data Mapper
    const absoluteFolderPath = path.join(ext.logicAppWorkspace, folderPath);
    if (fileExistsSync(absoluteFolderPath)) {
      const folderWatcher = workspace.createFileSystemWatcher(new RelativePattern(absoluteFolderPath, `**/*.{${fileExtensions.join()}}`));
      folderWatcher.onDidCreate(fn);
      folderWatcher.onDidDelete(fn);
      return folderWatcher;
    }
    return;
  }

  private async _setWebviewHtml() {
    this.panel.webview.html = await getWebViewHTML('vs-code-react', this.panel);
  }

  public sendMsgToWebview(msg: MessageToWebview) {
    this.panel.webview.postMessage(msg);
  }

  private _handleWebviewMsg(msg: MessageToVsix) {
    switch (msg.command) {
      case ExtensionCommand.initialize: {
        this.sendMsgToWebview({
          command: ExtensionCommand.initialize_frame,
          data: {
            project: ProjectName.dataMapper,
          },
        });
        break;
      }
      case ExtensionCommand.webviewLoaded: {
        // Send runtime port to webview
        this.sendMsgToWebview({
          command: ExtensionCommand.setRuntimePort,
          data: `${ext.designTimePort}`,
        });

        // If loading a data map, handle that + xslt filename
        this.handleLoadMapDefinitionIfAny();

        break;
      }
      case ExtensionCommand.webviewRscLoadError: {
        // Handle DM top-level errors (such as loading schemas added from file, or general function manifest fetching issues)
        ext.showError(localize('WebviewRscLoadError', `Error loading Data Mapper resource: "{0}"`, msg.data));
        break;
      }
      case ExtensionCommand.addSchemaFromFile: {
        this.addSchemaFromFile(msg.data);
        break;
      }
      case ExtensionCommand.readLocalSchemaFileOptions: {
        this.handleReadSchemaFileOptions();
        break;
      }
      case ExtensionCommand.readLocalCustomXsltFileOptions: {
        this.handleReadAvailableCustomXsltPaths();
        break;
      }
      case ExtensionCommand.saveDataMapDefinition: {
        this.saveMapDefinition(msg.data);
        break;
      }
      case ExtensionCommand.saveDataMapMetadata: {
        this.saveMapMetadata(msg.data);
        break;
      }
      case ExtensionCommand.saveDataMapXslt: {
        this.saveMapXslt(msg.data);
        break;
      }
      case ExtensionCommand.saveDraftDataMapDefinition: {
        if (this.dataMapStateIsDirty) {
          this.saveDraftDataMapDefinition(msg.data);
        }
        break;
      }
      case ExtensionCommand.setIsMapStateDirty: {
        this.handleUpdateMapDirtyState(msg.data);
        break;
      }
      case ExtensionCommand.getFunctionDisplayExpanded: {
        this.getConfigurationSetting('useExpandedFunctionCards');
        break;
      }

      case ExtensionCommand.getDataMapperVersion: {
        this.handleGetDataMapperVersion();
        break;
      }
      case ExtensionCommand.logTelemetry: {
        const eventName = `${this.telemetryPrefix}/${msg.data.name ?? msg.data.area}`;
        ext.telemetryReporter.sendTelemetryEvent(eventName, { ...msg.data });
        break;
      }
      case ExtensionCommand.sendNotification: {
        this.sendNotification(msg.data.title, msg.data.text, msg.data.level);
        break;
      }
    }
  }

  public isTestDisabledForOS() {
    this.sendMsgToWebview({
      command: ExtensionCommand.isTestDisabledForOS,
      data: process.platform === Platform.mac,
    });
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
      const mapMetadata = this.readMapMetadataFile();
      this.sendMsgToWebview({
        command: ExtensionCommand.loadDataMap,
        data: { ...this.mapDefinitionData, metadata: mapMetadata },
      });

      this.checkAndSetXslt();

      this.mapDefinitionData = undefined;
    }
  }

  public getNestedFilePaths(fileName: string, parentPath: string, relativePath: string, filesToDisplay: string[], filetypes: string[]) {
    const rootPath = path.join(ext.logicAppWorkspace, relativePath);
    const absolutePath = path.join(rootPath, parentPath, fileName);
    if (statSync(absolutePath).isDirectory()) {
      readdirSync(absolutePath).forEach((childFileName) => {
        const combinedRelativePath = path.join(parentPath, fileName);
        this.getNestedFilePaths(childFileName, combinedRelativePath, relativePath, filesToDisplay, filetypes);
      });
    } else {
      const fileExt = path.extname(fileName).toLowerCase();
      if (filetypes.includes(fileExt)) {
        const relativePath = path.join(parentPath, fileName);
        filesToDisplay.push(relativePath);
      }
    }
  }

  public getNestedFileTreePaths(
    fileName: string,
    parentPath: string,
    relativePath: string,
    filesToDisplay: IFileSysTreeItem[],
    filetypes: string[]
  ) {
    const rootPath = path.join(ext.logicAppWorkspace, relativePath);
    const absolutePath = path.join(rootPath, parentPath, fileName);
    if (statSync(absolutePath).isDirectory()) {
      const childrenFilesToDisplay: IFileSysTreeItem[] = [];
      const combinedRelativePath = path.join(parentPath, fileName);
      readdirSync(absolutePath).forEach((childFileName) => {
        this.getNestedFileTreePaths(childFileName, combinedRelativePath, relativePath, childrenFilesToDisplay, filetypes);
      });
      if (childrenFilesToDisplay?.length > 0) {
        filesToDisplay.push({
          name: fileName,
          type: 'directory',
          children: childrenFilesToDisplay,
        });
      }
    } else {
      const fileExt = path.extname(fileName).toLowerCase();
      if (filetypes.includes(fileExt)) {
        const relativePath = path.join(parentPath, fileName);
        filesToDisplay.push({
          name: fileName,
          type: 'file',
          fullPath: relativePath,
        });
      }
    }
  }

  public handleReadSchemaFileOptions() {
    if (this.dataMapVersion === 2) {
      return this.getFilesTreeForPath(schemasPath, supportedSchemaFileExts, ExtensionCommand.showAvailableSchemasV2);
    }
    return this.getFilesForPath(schemasPath, ExtensionCommand.showAvailableSchemas, supportedSchemaFileExts);
  }

  public handleReadAvailableCustomXsltPaths() {
    if (this.dataMapVersion === 2) {
      return this.getFilesTreeForPath(customXsltPath, supportedCustomXsltFileExts, ExtensionCommand.getAvailableCustomXsltPathsV2);
    }
    const absoluteFolderPath = path.join(ext.logicAppWorkspace, customXsltPath);
    if (fileExistsSync(absoluteFolderPath)) {
      return this.getFilesForPath(customXsltPath, ExtensionCommand.getAvailableCustomXsltPaths, supportedCustomXsltFileExts);
    }
  }

  public sendNotification(title: string, text: string, level: number) {
    const msg = localize(title, text);
    switch (level) {
      case LogEntryLevel.Error: {
        ext.showError(msg);
        break;
      }
      case LogEntryLevel.Warning: {
        ext.showWarning(msg);
        break;
      }
      case LogEntryLevel.Verbose: {
        ext.showInformation(msg);
        break;
      }
      default: {
        ext.log(msg);
        break;
      }
    }
  }

  private getFilesForPath(
    folderPath: string,
    command: typeof ExtensionCommand.showAvailableSchemas | typeof ExtensionCommand.getAvailableCustomXsltPaths,
    fileTypes: string[]
  ) {
    fs.readdir(path.join(ext.logicAppWorkspace, folderPath)).then((result) => {
      const filesToDisplay: string[] = [];
      result.forEach((file) => {
        this.getNestedFilePaths(file, '', folderPath, filesToDisplay, fileTypes);
      });
      this.sendMsgToWebview({
        command,
        data: filesToDisplay,
      });
    });
  }

  private getFilesTreeForPath(
    folderPath: string,
    fileTypes: string[],
    command: typeof ExtensionCommand.showAvailableSchemasV2 | typeof ExtensionCommand.getAvailableCustomXsltPathsV2
  ) {
    fs.readdir(path.join(ext.logicAppWorkspace, folderPath)).then((result) => {
      const filesToDisplay: IFileSysTreeItem[] = [];
      result.forEach((file) => {
        this.getNestedFileTreePaths(file, '', folderPath, filesToDisplay, fileTypes);
      });
      this.sendMsgToWebview({
        command: command,
        data: filesToDisplay,
      });
    });
  }

  public addSchemaFromFile(schemaType: SchemaType) {
    callWithTelemetryAndErrorHandlingSync(extensionCommand.dataMapAddSchemaFromFile, (_context: IActionContext) => {
      const fileSelectOptions: vscode.OpenDialogOptions = {
        filters: { Schemas: ['xsd', 'json'] },
        canSelectMany: false,
      };
      window.showOpenDialog(fileSelectOptions).then((files) => {
        if (!files[0]) {
          return;
        }
        const selectedFile = files[0];

        const pathToWorkspaceSchemaFolder = path.join(ext.logicAppWorkspace, schemasPath);
        const primarySchemaFullPath = selectedFile.fsPath;
        const pathToContainingFolder = path.dirname(primarySchemaFullPath);
        const primarySchemaFileName = path.basename(primarySchemaFullPath);

        workspace.fs.readFile(selectedFile).then((fileContents) => {
          const text = Buffer.from(fileContents).toString('utf-8');

          copyOverImportedSchemas(text, primarySchemaFileName, pathToContainingFolder, pathToWorkspaceSchemaFolder, ext);

          const newPath = path.join(pathToWorkspaceSchemaFolder, primarySchemaFileName);
          if (!fileExistsSync(newPath)) {
            copyFileSync(primarySchemaFullPath, newPath);
          }

          this.sendMsgToWebview({
            command: ExtensionCommand.fetchSchema,
            data: {
              fileName: primarySchemaFileName,
              type: schemaType as SchemaType,
            },
          });
        });
      });
    });
  }

  public saveMapDefinition(mapDefinition: string) {
    callWithTelemetryAndErrorHandlingSync(extensionCommand.dataMapSaveMapDefinition, (_context: IActionContext) => {
      // Delete *draft* map definition as it's no longer needed
      this.deleteDraftDataMapDefinition();

      const fileName = `${this.dataMapName}${mapDefinitionExtension}`;
      const dataMapFolderPath = path.join(ext.logicAppWorkspace, dataMapDefinitionsPath);
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
        .catch(ext.showError);
    });
  }

  public saveMapMetadata(mapMetadata: string) {
    const vscodeFolderPath = this.getMapMetadataPath();

    fs.writeFile(vscodeFolderPath, mapMetadata, 'utf8').catch(ext.showError);
  }

  public saveMapXslt(mapXslt: string) {
    callWithTelemetryAndErrorHandlingSync(extensionCommand.dataMapSaveMapXslt, (_context: IActionContext) => {
      const fileName = `${this.dataMapName}${mapXsltExtension}`;
      const dataMapFolderPath = path.join(ext.logicAppWorkspace, dataMapsPath);
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
        .catch(ext.showError);
    });
  }

  public saveDraftDataMapDefinition(mapDefFileContents: string) {
    const mapDefileName = `${this.dataMapName}${draftMapDefinitionSuffix}${mapDefinitionExtension}`;
    const dataMapDefFolderPath = path.join(ext.logicAppWorkspace, dataMapDefinitionsPath);
    const filePath = path.join(dataMapDefFolderPath, mapDefileName);

    // Mkdir as extra insurance that directory exists so file can be written
    // Harmless if directory already exists
    fs.mkdir(dataMapDefFolderPath, { recursive: true })
      .then(() => {
        fs.writeFile(filePath, mapDefFileContents, 'utf8');
      })
      .catch(ext.showError);
  }

  private readMapMetadataFile(): MapMetadata | undefined {
    const vscodeFolderPath = this.getMapMetadataPath();
    if (fileExistsSync(vscodeFolderPath)) {
      try {
        const fileBuffer = readFileSync(vscodeFolderPath);
        const metadataJson = JSON.parse(fileBuffer.toString()) as MapMetadata;
        return metadataJson;
      } catch {
        ext.showError(
          localize(
            'MetadataInvalidJSON',
            `Data map metadata file found at "{0}" contains invalid JSON. Data map will load without metadata file.`,
            vscodeFolderPath
          )
        );
        return undefined;
      }
    } else {
      ext.showWarning(
        localize(
          'MetadataNotFound',
          `Data map metadata not found at path "{0}". This file configures your function positioning and other info. Please save your map to regenerate the file.`,
          vscodeFolderPath
        )
      );
      return undefined;
    }
  }

  public deleteDraftDataMapDefinition() {
    const draftMapDefinitionPath = path.join(
      ext.logicAppWorkspace,
      dataMapDefinitionsPath,
      `${this.dataMapName}${draftMapDefinitionSuffix}${mapDefinitionExtension}`
    );
    if (fileExistsSync(draftMapDefinitionPath)) {
      removeFileSync(draftMapDefinitionPath);
    }
  }

  public checkAndSetXslt() {
    const expectedXsltPath = path.join(ext.logicAppWorkspace, dataMapsPath, `${this.dataMapName}${mapXsltExtension}`);

    if (fileExistsSync(expectedXsltPath)) {
      fs.readFile(expectedXsltPath, 'utf-8').then((fileContents) => {
        this.sendMsgToWebview({
          command: ExtensionCommand.setXsltData,
          data: {
            filename: this.dataMapName,
            fileContents,
          },
        });
      });
    } else {
      ext.showWarning(localize('XSLTFileNotDetected', `XSLT file not detected for "{0}"`, this.dataMapName));
    }
  }

  public getConfigurationSetting(configSetting: string) {
    const azureDataMapperConfig = workspace.getConfiguration(ext.prefix);
    const configValue = azureDataMapperConfig.get<boolean>(configSetting) ?? true;
    this.sendMsgToWebview({
      command: ExtensionCommand.getConfigurationSetting,
      data: configValue,
    });
  }

  public handleGetDataMapperVersion() {
    this.sendMsgToWebview({
      command: ExtensionCommand.getDataMapperVersion,
      data: this.dataMapVersion,
    });
  }

  public getDataMapperVersion() {
    const azureDataMapperConfig = workspace.getConfiguration(ext.prefix);
    const configValue = azureDataMapperConfig.get<number>(dataMapperVersionSetting) ?? defaultDataMapperVersion;
    return configValue;
  }

  private getMapMetadataPath() {
    const projectPath = ext.logicAppWorkspace;
    let vscodeFolderPath = '';
    if (this.dataMapVersion === 2) {
      vscodeFolderPath = path.join(projectPath, vscodeFolderName, `${this.dataMapName}DataMapMetadata-v2.json`);
    } else {
      vscodeFolderPath = path.join(projectPath, vscodeFolderName, `${this.dataMapName}DataMapMetadata.json`);
    }
    return vscodeFolderPath;
  }
}
