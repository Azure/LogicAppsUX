/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { dataMapperVersionSetting, defaultDataMapperVersion, extensionCommand, vscodeFolderName } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getWebViewHTML } from '../../utils/codeless/getWebViewHTML';
import {
  dataMapDefinitionsPath,
  dataMapsPath,
  draftMapDefinitionSuffix,
  draftXsltExtension,
  mapDefinitionExtension,
  mapXsltExtension,
  schemasPath,
  customXsltPath,
  supportedSchemaFileExts,
  supportedCustomXsltFileExts,
  customFunctionsPath,
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
  mkdirSync,
  writeFileSync,
} from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import type { WebviewPanel } from 'vscode';
import { RelativePattern, window, workspace } from 'vscode';
import * as vscode from 'vscode';
import { copyOverImportedSchemas } from './DataMapperPanelUtils';
import { switchToDataMapperV2 } from '../setDataMapperVersion';
import SaxonJS from 'saxon-js';

/**
 * Finds the xslt3 CLI path by checking multiple possible locations.
 * The xslt3 package might be installed in the extension's node_modules,
 * or hoisted to a parent node_modules directory.
 *
 * @param extensionPath - The extension's root path
 * @returns The path to xslt3.js, or null if not found
 */
const findXslt3Path = (extensionPath: string): string | null => {
  const xslt3File = 'xslt3.js';

  // Possible locations to check in order of preference
  const possiblePaths = [
    // Direct dependency in extension's node_modules
    path.join(extensionPath, 'node_modules', 'xslt3', xslt3File),
    // Hoisted to workspace root node_modules (for development)
    path.join(extensionPath, '..', '..', 'node_modules', 'xslt3', xslt3File),
    // Try using require.resolve as fallback (handles various node_modules structures)
  ];

  for (const possiblePath of possiblePaths) {
    if (fileExistsSync(possiblePath)) {
      return possiblePath;
    }
  }

  // Try require.resolve as a final fallback
  try {
    // require.resolve finds the module regardless of hoisting
    const xslt3MainPath = require.resolve('xslt3');
    const xslt3Dir = path.dirname(xslt3MainPath);
    const xslt3JsPath = path.join(xslt3Dir, xslt3File);
    if (fileExistsSync(xslt3JsPath)) {
      return xslt3JsPath;
    }
    // Also check if the main IS xslt3.js
    if (xslt3MainPath.endsWith(xslt3File)) {
      return xslt3MainPath;
    }
  } catch {
    // require.resolve failed, xslt3 not found
  }

  return null;
};

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

    this.setCustomFolders();

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
    const absoluteFolderPath = path.join(ext.defaultLogicAppPath, folderPath);
    if (fileExistsSync(absoluteFolderPath)) {
      const folderWatcher = workspace.createFileSystemWatcher(new RelativePattern(absoluteFolderPath, `**/*.{${fileExtensions.join()}}`));
      folderWatcher.onDidCreate(fn);
      folderWatcher.onDidDelete(fn);
      return folderWatcher;
    }
    return;
  }

  private setCustomFolders() {
    const customXsltFullPath = path.join(ext.defaultLogicAppPath, customXsltPath);
    mkdirSync(customXsltFullPath, { recursive: true });

    const customFunctionsFullPath = path.join(ext.defaultLogicAppPath, customFunctionsPath);
    mkdirSync(customFunctionsFullPath, { recursive: true });
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
          data: `${ext.designTimeInstances.get(ext.defaultLogicAppPath)?.port}`,
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
      case ExtensionCommand.switchToDataMapperV2: {
        // Execute the switchToDataMapperV2 VS Code command with telemetry
        this.callWithTelemetryAndErrorHandlingSyncForDM(extensionCommand.switchToDataMapperV2, () => {
          return switchToDataMapperV2();
        });
        break;
      }
      case ExtensionCommand.testXsltTransform: {
        this.handleTestXsltTransform(msg.data.xsltContent, msg.data.inputXml);
        break;
      }
    }
  }

  public isTestDisabledForOS() {
    // Local XSLT transformation is now available on all platforms via SaxonJS
    // So we no longer need to disable testing on macOS
    this.sendMsgToWebview({
      command: ExtensionCommand.isTestDisabledForOS,
      data: false,
    });
  }

  /**
   * Handles XSLT 3.0 transformation locally using SaxonJS with xslt3 CLI compilation.
   * This allows testing data maps on all platforms without requiring a .NET backend.
   *
   * The approach:
   * 1. Write XSLT to a temp file
   * 2. Use xslt3 CLI to compile XSLT to SEF (Stylesheet Export Format)
   * 3. Parse SEF and use with SaxonJS.transform()
   * 4. Return result and clean up temp files
   */
  public async handleTestXsltTransform(xsltContent: string, inputXml: string) {
    // Validate XSLT size before processing to prevent memory issues
    const MAX_XSLT_SIZE = 5 * 1024 * 1024; // 5MB limit
    const xsltSize = Buffer.byteLength(xsltContent, 'utf8');
    console.log('[DataMapper Test] XSLT size:', xsltSize, 'bytes');

    if (xsltSize > MAX_XSLT_SIZE) {
      const sizeMB = (xsltSize / (1024 * 1024)).toFixed(2);
      const limitMB = (MAX_XSLT_SIZE / (1024 * 1024)).toFixed(0);
      throw new Error(`XSLT content is too large (${sizeMB}MB). Maximum size is ${limitMB}MB.`);
    }

    const tempDir = os.tmpdir();
    const uniqueId = Date.now().toString();
    const xsltPath = path.join(tempDir, `datamap-${uniqueId}.xslt`);
    const sefPath = path.join(tempDir, `datamap-${uniqueId}.sef.json`);

    console.log('[DataMapper Test] Starting XSLT transformation test');
    console.log('[DataMapper Test] Extension path:', ext.context.extensionPath);

    try {
      // Step 1: Write XSLT to temp file
      console.log('[DataMapper Test] Writing XSLT to:', xsltPath);
      writeFileSync(xsltPath, xsltContent, 'utf8');

      // Step 2: Find xslt3 CLI path - use the .js file directly for cross-platform compatibility
      const xslt3Path = findXslt3Path(ext.context.extensionPath);
      console.log('[DataMapper Test] xslt3 path:', xslt3Path);

      if (!xslt3Path) {
        throw new Error(
          'xslt3 CLI not found. Please ensure the xslt3 package is installed. ' +
            'Checked locations: extension node_modules, workspace node_modules, and require.resolve paths.'
        );
      }

      // Step 3: Compile XSLT to SEF using xslt3 CLI via node
      const compileCmd = `node "${xslt3Path}" -xsl:"${xsltPath}" -export:"${sefPath}" -nogo`;
      console.log('[DataMapper Test] Compile command:', compileCmd);

      try {
        const compileResult = execSync(compileCmd, {
          encoding: 'utf8',
          timeout: 30000, // 30 second timeout
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        });
        console.log('[DataMapper Test] Compile output:', compileResult || '(empty)');
      } catch (execError: unknown) {
        const err = execError as { stderr?: string; stdout?: string; message?: string };
        console.error('[DataMapper Test] Compile failed:', err.stderr || err.message);
        throw new Error(`XSLT compilation failed: ${err.stderr || err.message}`);
      }

      // Step 4: Check if SEF was created
      console.log('[DataMapper Test] Checking SEF at:', sefPath);
      console.log('[DataMapper Test] SEF exists:', fileExistsSync(sefPath));

      if (!fileExistsSync(sefPath)) {
        throw new Error('Failed to compile XSLT: SEF file was not created');
      }

      // Step 5: Read and parse SEF
      const sefContent = readFileSync(sefPath, 'utf8');
      console.log('[DataMapper Test] SEF size:', sefContent.length, 'bytes');
      const sef = JSON.parse(sefContent);

      // Step 6: Execute transformation using SaxonJS
      console.log('[DataMapper Test] Starting SaxonJS transform');
      const result = await SaxonJS.transform(
        {
          stylesheetInternal: sef,
          sourceText: inputXml,
          destination: 'serialized',
        },
        'async'
      );
      console.log('[DataMapper Test] Transform complete, result length:', result.principalResult?.length ?? 0);

      // Send successful result back to webview
      console.log('[DataMapper Test] Sending success result to webview');
      this.sendMsgToWebview({
        command: ExtensionCommand.testXsltTransformResult,
        data: {
          success: true,
          outputXml: result.principalResult ?? '',
          statusCode: 200,
          statusText: 'OK',
        },
      });
    } catch (error) {
      // Send error result back to webview
      console.error('[DataMapper Test] Error:', error);
      let errorMessage = 'Unknown error during XSLT transformation';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const execError = error as { stderr?: string; message?: string };
        errorMessage = execError.stderr || execError.message || errorMessage;
      }

      console.log('[DataMapper Test] Sending error result to webview:', errorMessage);
      this.sendMsgToWebview({
        command: ExtensionCommand.testXsltTransformResult,
        data: {
          success: false,
          error: errorMessage,
          statusCode: 500,
          statusText: 'Transformation Error',
        },
      });
    } finally {
      // Clean up temp files
      try {
        let cleanedXslt = false;
        let cleanedSef = false;

        if (fileExistsSync(xsltPath)) {
          removeFileSync(xsltPath);
          cleanedXslt = true;
        }
        if (fileExistsSync(sefPath)) {
          removeFileSync(sefPath);
          cleanedSef = true;
        }
        console.log('[DataMapper Test] Temp file cleanup:', {
          xsltPath: cleanedXslt ? 'deleted' : 'not found',
          sefPath: cleanedSef ? 'deleted' : 'not found',
        });
      } catch (cleanupError) {
        // Log cleanup errors for debugging but don't fail the operation
        console.warn('[DataMapper Test] Temp file cleanup warning:', cleanupError);
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
      // Use embedded metadata if available, otherwise try to read from separate file (legacy)
      let mapMetadata = this.mapDefinitionData.metadata;
      if (!mapMetadata) {
        mapMetadata = this.readMapMetadataFile();
      }

      this.sendMsgToWebview({
        command: ExtensionCommand.loadDataMap,
        data: {
          ...this.mapDefinitionData,
          mapDefinitionName: this.dataMapName,
          metadata: mapMetadata,
        },
      });

      this.checkAndSetXslt();

      this.mapDefinitionData = undefined;
    }
  }

  public getNestedFilePaths(fileName: string, parentPath: string, relativePath: string, filesToDisplay: string[], filetypes: string[]) {
    const rootPath = path.join(ext.defaultLogicAppPath, relativePath);
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
    const rootPath = path.join(ext.defaultLogicAppPath, relativePath);
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
    const absoluteFolderPath = path.join(ext.defaultLogicAppPath, customXsltPath);
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
    fs.readdir(path.join(ext.defaultLogicAppPath, folderPath)).then((result) => {
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
    fs.readdir(path.join(ext.defaultLogicAppPath, folderPath)).then((result) => {
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

  private setDataMapperVersionForLogging(context: IActionContext) {
    context.telemetry.properties.dataMapperVersion = this.dataMapVersion.toString();
    context.telemetry.properties.dataMapName = this.dataMapName;
  }

  private callWithTelemetryAndErrorHandlingSyncForDM<T>(command: string, fn: (context: IActionContext) => T): T {
    const result = callWithTelemetryAndErrorHandlingSync(command, (context: IActionContext) => {
      this.setDataMapperVersionForLogging(context);
      return fn(context);
    });
    return result;
  }

  public addSchemaFromFile(schemaType: SchemaType) {
    this.callWithTelemetryAndErrorHandlingSyncForDM(extensionCommand.dataMapAddSchemaFromFile, (context: IActionContext) => {
      this.setDataMapperVersionForLogging(context);
      const fileSelectOptions: vscode.OpenDialogOptions = {
        filters: { Schemas: ['xsd', 'json'] },
        canSelectMany: false,
      };
      window.showOpenDialog(fileSelectOptions).then((files) => {
        if (!files[0]) {
          return;
        }
        const selectedFile = files[0];

        const pathToWorkspaceSchemaFolder = path.join(ext.defaultLogicAppPath, schemasPath);
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
    this.callWithTelemetryAndErrorHandlingSyncForDM(extensionCommand.dataMapSaveMapDefinition, (context: IActionContext) => {
      // Delete *draft* map definition as it's no longer needed
      this.deleteDraftDataMapDefinition();
      this.setDataMapperVersionForLogging(context);

      const fileName = `${this.dataMapName}${mapDefinitionExtension}`;
      const dataMapFolderPath = path.join(ext.defaultLogicAppPath, dataMapDefinitionsPath);
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
    this.callWithTelemetryAndErrorHandlingSyncForDM(extensionCommand.dataMapSaveMapXslt, (context: IActionContext) => {
      this.setDataMapperVersionForLogging(context);

      const fileName = `${this.dataMapName}${mapXsltExtension}`;
      const dataMapFolderPath = path.join(ext.defaultLogicAppPath, dataMapsPath);
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

  /**
   * Saves a draft XSLT file with embedded metadata.
   * The draft file is saved to the Maps folder with a .draft.xslt extension.
   */
  public saveDraftDataMapDefinition(draftXsltContent: string) {
    const draftFileName = `${this.dataMapName}${draftXsltExtension}`;
    const dataMapFolderPath = path.join(ext.defaultLogicAppPath, dataMapsPath);
    const filePath = path.join(dataMapFolderPath, draftFileName);

    // Mkdir as extra insurance that directory exists so file can be written
    // Harmless if directory already exists
    fs.mkdir(dataMapFolderPath, { recursive: true })
      .then(() => {
        fs.writeFile(filePath, draftXsltContent, 'utf8');
      })
      .catch(ext.showError);
  }

  private readMapMetadataFile(): MapMetadata | undefined {
    const result = this.callWithTelemetryAndErrorHandlingSyncForDM(ExtensionCommand.webviewLoaded, (context: IActionContext) => {
      const vscodeFolderPath = this.getMapMetadataPath();
      if (fileExistsSync(vscodeFolderPath)) {
        try {
          const fileBuffer = readFileSync(vscodeFolderPath);
          const metadataJson = JSON.parse(fileBuffer.toString()) as MapMetadata;
          context.telemetry.properties.loadMetadataStatus = 'Succeeded';
          return metadataJson;
        } catch {
          ext.showError(
            localize(
              'MetadataInvalidJSON',
              `Data map metadata file found at "{0}" contains invalid JSON. Data map will load without metadata file.`,
              vscodeFolderPath
            )
          );
          context.telemetry.properties.result = 'Failed';
          context.telemetry.properties.loadMetadataStatus = 'Failed';
          context.telemetry.properties.loadMetadataError = 'Invalid JSON in metadata file.';
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
        // not logging result as failed as there are a few reasons users may not have the file, possible user error
        context.telemetry.properties.loadMetadataStatus = 'Failed';
        context.telemetry.properties.loadMetadataError = 'Metadata file not found.';
        return undefined;
      }
    });
    return result;
  }

  public deleteDraftDataMapDefinition() {
    // Delete new format draft XSLT file
    const draftXsltPath = path.join(ext.defaultLogicAppPath, dataMapsPath, `${this.dataMapName}${draftXsltExtension}`);
    if (fileExistsSync(draftXsltPath)) {
      removeFileSync(draftXsltPath);
    }

    // Also delete legacy draft LML file if it exists
    const draftMapDefinitionPath = path.join(
      ext.defaultLogicAppPath,
      dataMapDefinitionsPath,
      `${this.dataMapName}${draftMapDefinitionSuffix}${mapDefinitionExtension}`
    );
    if (fileExistsSync(draftMapDefinitionPath)) {
      removeFileSync(draftMapDefinitionPath);
    }
  }

  public checkAndSetXslt() {
    const expectedXsltPath = path.join(ext.defaultLogicAppPath, dataMapsPath, `${this.dataMapName}${mapXsltExtension}`);

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
    const projectPath = ext.defaultLogicAppPath;
    let vscodeFolderPath = '';
    if (this.dataMapVersion === 2) {
      vscodeFolderPath = path.join(projectPath, vscodeFolderName, `${this.dataMapName}DataMapMetadata-v2.json`);
    } else {
      vscodeFolderPath = path.join(projectPath, vscodeFolderName, `${this.dataMapName}DataMapMetadata.json`);
    }
    return vscodeFolderPath;
  }
}
