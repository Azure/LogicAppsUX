import DataMapperPanel from './DataMapperPanel';
import { startBackendRuntime } from './FxWorkflowRuntime';
import { webviewType } from './extensionConfig';
import type { MapDefinitionData } from '@microsoft/logic-apps-data-mapper';
import type { IAzExtOutputChannel } from '@microsoft/vscode-azext-utils';
import type { ChildProcess } from 'child_process';
import * as path from 'path';
import { Uri, ViewColumn, window, workspace } from 'vscode';
import type { ExtensionContext } from 'vscode';

export default class DataMapperExt {
  public static context: ExtensionContext;
  public static extensionPath: string;
  public static outputChannel: IAzExtOutputChannel;
  public static backendRuntimePort: number;
  public static backendRuntimeChildProcess: ChildProcess | undefined;

  public static currentPanel: DataMapperPanel | undefined;

  public static async openDataMapperPanel(dataMapName: string, loadMapDefinitionData?: MapDefinitionData) {
    const workflowFolder = DataMapperExt.getWorkspaceFolderFsPath();

    if (workflowFolder) {
      await startBackendRuntime(workflowFolder);

      DataMapperExt.createOrShow(dataMapName, loadMapDefinitionData);
    }
  }

  public static createOrShow(dataMapName: string, loadMapDefinitionData?: MapDefinitionData) {
    // If a panel has already been created, re-show it
    if (DataMapperExt.currentPanel) {
      // NOTE: Shouldn't need to re-send runtime port if webview has already been loaded/set up

      // If loading a data map, handle that + xslt filename
      DataMapperExt.currentPanel.dataMapName = dataMapName;
      DataMapperExt.currentPanel.loadMapDefinitionData = loadMapDefinitionData;
      DataMapperExt.currentPanel.handleLoadMapDefinitionIfAny();
      DataMapperExt.currentPanel.updateWebviewPanelTitle();

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

    DataMapperExt.currentPanel = new DataMapperPanel(panel, dataMapName);
    DataMapperExt.currentPanel.panel.iconPath = {
      light: Uri.file(path.join(DataMapperExt.context.extensionPath, 'assets', 'wand-light.png')),
      dark: Uri.file(path.join(DataMapperExt.context.extensionPath, 'assets', 'wand-dark.png')),
    };
    DataMapperExt.currentPanel.updateWebviewPanelTitle();
    DataMapperExt.currentPanel.loadMapDefinitionData = loadMapDefinitionData;

    // From here, VSIX will handle any other initial-load-time events once receive webviewLoaded msg
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
}
