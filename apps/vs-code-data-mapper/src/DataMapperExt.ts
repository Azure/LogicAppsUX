import DataMapperPanel from './DataMapperPanel';
import {
  dataMapDefinitionsPath,
  dataMapsPath,
  defaultDatamapFilename,
  draftMapDefinitionSuffix,
  mapDefinitionExtension,
  mapXsltExtension,
  schemasPath,
  webviewType,
} from './extensionConfig';
import type { MapDefinitionData, SchemaType } from '@microsoft/logic-apps-data-mapper';
import { callWithTelemetryAndErrorHandlingSync } from '@microsoft/vscode-azext-utils';
import type { IActionContext, IAzExtOutputChannel } from '@microsoft/vscode-azext-utils';
import type { ChildProcess } from 'child_process';
import { promises as fs, existsSync as fileExistsSync, copyFileSync, unlinkSync as removeFileSync } from 'fs';
import * as path from 'path';
import { Uri, ViewColumn, window, workspace } from 'vscode';
import type { ExtensionContext } from 'vscode';

export default class DataMapperExt {
  public static currentPanel: DataMapperPanel | undefined;
  public static outputChannel: IAzExtOutputChannel;
  public static context: ExtensionContext;
  public static backendRuntimePort: number;
  public static backendRuntimeChildProcess: ChildProcess | undefined;

  public static currentDataMapName: string;
  public static currentDataMapStateIsDirty: boolean;
  public static loadMapDefinitionData: MapDefinitionData | undefined;

  public static createOrShow() {
    // If a panel has already been created, re-show it
    if (DataMapperExt.currentPanel) {
      // NOTE: Shouldn't need to re-send runtime port if webview has already been loaded/set up

      // IF loading a data map, handle that + xslt filename
      DataMapperExt.handleLoadMapDefinitionIfAny();
      DataMapperExt.updateWebviewPanelTitle();

      DataMapperExt.currentPanel.panel.reveal(ViewColumn.Active);
      return;
    }

    const panel = window.createWebviewPanel(
      webviewType, // Key used to reference the panel
      'Data Mapper', // Title display in the tab
      ViewColumn.Active, // Editor column to show the new webview panel in
      {
        enableScripts: true,
        // NOTE: Keeps webview content state even when placed in background (same as browsers)
        // - not as performant as vscode's get/setState, but likely not a concern at all for MVP
        retainContextWhenHidden: true,
      }
    );

    this.currentPanel = new DataMapperPanel(panel, DataMapperExt.context.extensionPath);
    this.currentPanel.panel.iconPath = {
      light: Uri.file(path.join(this.context.extensionPath, 'assets', 'wand-light.png')),
      dark: Uri.file(path.join(this.context.extensionPath, 'assets', 'wand-dark.png')),
    };
    DataMapperExt.updateWebviewPanelTitle();

    // From here, VSIX will handle any other initial-load-time events once receive webviewLoaded msg
  }

  public static updateWebviewPanelTitle() {
    if (DataMapperExt.currentPanel) {
      DataMapperExt.currentPanel.panel.title = `${DataMapperExt.currentDataMapName ?? 'Untitled'} ${
        DataMapperExt.currentDataMapStateIsDirty ? '●' : ''
      }`;
    }
  }

  public static handleUpdateMapDirtyState(isMapStateDirty: boolean) {
    DataMapperExt.currentDataMapStateIsDirty = isMapStateDirty;
    DataMapperExt.updateWebviewPanelTitle();

    // If map updates to not be dirty (Discard/undo/etc), we can safely remove the draft file
    if (!isMapStateDirty) {
      DataMapperExt.deleteDraftDataMapDefinition();
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

  public static handleReadSchemaFileOptions() {
    fs.readdir(path.join(DataMapperExt.getWorkspaceFolderFsPath(), schemasPath)).then((result) => {
      DataMapperExt.currentPanel?.sendMsgToWebview({
        command: 'showAvailableSchemas',
        data: result.filter((file) => path.extname(file).toLowerCase() === '.xsd'),
      });
    });
  }

  public static addSchemaFromFile(filePath: string, schemaType: SchemaType) {
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

        DataMapperExt.currentPanel?.sendMsgToWebview({
          command: 'fetchSchema',
          data: { fileName: primarySchemaFileName, type: schemaType as SchemaType },
        });
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
      return '';
    }
  }

  public static saveDataMap(isDefinition: boolean, fileContents: string) {
    callWithTelemetryAndErrorHandlingSync('azureDataMapper.saveDataMap', (_context: IActionContext) => {
      if (!DataMapperExt.currentDataMapName) {
        DataMapperExt.currentDataMapName = defaultDatamapFilename;
      }

      // If mapDef, check for and delete *draft* map definition as it's no longer needed
      if (isDefinition) {
        DataMapperExt.deleteDraftDataMapDefinition();
      }

      const fileName = `${DataMapperExt.currentDataMapName}${isDefinition ? mapDefinitionExtension : mapXsltExtension}`;
      const dataMapFolderPath = path.join(DataMapperExt.getWorkspaceFolderFsPath(), isDefinition ? dataMapDefinitionsPath : dataMapsPath);
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
    });
  }

  public static saveDraftDataMapDefinition(mapDefFileContents: string) {
    if (!DataMapperExt.currentDataMapName) {
      DataMapperExt.currentDataMapName = defaultDatamapFilename;
    }

    const mapDefileName = `${DataMapperExt.currentDataMapName}${draftMapDefinitionSuffix}${mapDefinitionExtension}`;
    const dataMapDefFolderPath = path.join(DataMapperExt.getWorkspaceFolderFsPath(), dataMapDefinitionsPath);
    const filePath = path.join(dataMapDefFolderPath, mapDefileName);

    // Mkdir as extra insurance that directory exists so file can be written
    // - harmless if directory already exists
    fs.mkdir(dataMapDefFolderPath, { recursive: true })
      .then(() => {
        fs.writeFile(filePath, mapDefFileContents, 'utf8');
      })
      .catch(DataMapperExt.showError);
  }

  public static deleteDraftDataMapDefinition() {
    const draftMapDefinitionPath = path.join(
      DataMapperExt.getWorkspaceFolderFsPath(),
      dataMapDefinitionsPath,
      `${DataMapperExt.currentDataMapName}${draftMapDefinitionSuffix}${mapDefinitionExtension}`
    );
    if (fileExistsSync(draftMapDefinitionPath)) {
      removeFileSync(draftMapDefinitionPath);
    }
  }

  public static checkForAndSetXsltFilename() {
    const expectedXsltPath = path.join(
      DataMapperExt.getWorkspaceFolderFsPath(),
      dataMapsPath,
      `${DataMapperExt.currentDataMapName}${mapXsltExtension}`
    );

    if (fileExistsSync(expectedXsltPath)) {
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
