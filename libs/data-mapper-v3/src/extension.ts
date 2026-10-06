/**
 * BizTalk Data Mapper - VS Code Extension Entry Point
 */

import * as vscode from 'vscode';
import { MapEditorProvider } from './mapEditorProvider';
import { MapsTreeProvider } from './mapsTreeProvider';
import { disposeDataMapperLogger, getDataMapperLogger } from './logger';
import { addDataMap, addMapperProject, importExistingMap, openExistingMapper } from './projectCommands';
import { copySchemaToWorkspace, getWorkspaceRoot, schemasFolderName } from './workspaceStructure';

function resourceUri(value: vscode.Uri | { resourceUri?: vscode.Uri } | undefined): vscode.Uri | undefined {
  return value instanceof vscode.Uri ? value : value?.resourceUri;
}

async function openDataMap(uri: vscode.Uri): Promise<void> {
  await vscode.commands.executeCommand('vscode.openWith', uri, MapEditorProvider.viewType);
}

export function activate(context: vscode.ExtensionContext) {
  const logger = getDataMapperLogger();
  logger.info('Data Mapper extension activating.');
  const provider = MapEditorProvider.register(context);

  // Register the workspace maps view in the sidebar.
  const mapsTreeProvider = new MapsTreeProvider();
  const refreshMaps = () => mapsTreeProvider.refresh();

  context.subscriptions.push(vscode.window.registerTreeDataProvider('biztalkDataMapper.mapsView', mapsTreeProvider));

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('biztalkDataMapper.showLogs', () => logger.show(true)),
    vscode.commands.registerCommand('biztalkDataMapper.newMap', () => addMapperProject(refreshMaps)),

    vscode.commands.registerCommand('biztalkDataMapper.addDataMap', (value?: vscode.Uri | { resourceUri?: vscode.Uri }) =>
      addDataMap(value, refreshMaps)
    ),

    vscode.commands.registerCommand('biztalkDataMapper.importExistingMap', (value?: vscode.Uri | { resourceUri?: vscode.Uri }) =>
      importExistingMap(value, refreshMaps)
    ),

    vscode.commands.registerCommand('biztalkDataMapper.addSchemaFile', async (value?: vscode.Uri | { resourceUri?: vscode.Uri }) => {
      const selectedUri = resourceUri(value) ?? vscode.workspace.workspaceFolders?.[0]?.uri;
      if (!selectedUri) {
        vscode.window.showWarningMessage('Open a data map workspace before adding a schema.');
        return;
      }
      const selectedFiles = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: true,
        filters: { 'XSD Schema': ['xsd'] },
        openLabel: 'Add Schema',
        title: `Add schema files to ${schemasFolderName}`,
      });
      if (!selectedFiles?.length) {
        return;
      }
      const workspaceRoot = getWorkspaceRoot(selectedUri);
      const mapUri = vscode.Uri.joinPath(workspaceRoot, 'map.btm');
      for (const selectedFile of selectedFiles) {
        await copySchemaToWorkspace(selectedFile, mapUri);
      }
      vscode.window.showInformationMessage(`${selectedFiles.length} schema file(s) added to ${schemasFolderName}.`);
    }),

    vscode.commands.registerCommand('biztalkDataMapper.openDataMap', async (value?: vscode.Uri | { resourceUri?: vscode.Uri }) => {
      const uri = resourceUri(value);
      if (uri) {
        await openDataMap(uri);
      }
    }),

    vscode.commands.registerCommand('biztalkDataMapper.editDataMap', async (value?: vscode.Uri | { resourceUri?: vscode.Uri }) => {
      const uri = resourceUri(value);
      if (uri) {
        await vscode.commands.executeCommand('vscode.openWith', uri, 'default');
      }
    }),

    vscode.commands.registerCommand('biztalkDataMapper.openMap', () => openExistingMapper(refreshMaps)),

    vscode.commands.registerCommand('biztalkDataMapper.compileMap', async () => {
      logger.show(true);
      logger.info('Compile command selected.');
      if (!(await MapEditorProvider.executeActiveEditorCommand('executeCompile'))) {
        vscode.window.showWarningMessage('Open a map editor before compiling a map.');
      }
    }),

    vscode.commands.registerCommand('biztalkDataMapper.testMap', async () => {
      logger.show(true);
      logger.info('Test Map command selected.');
      if (!(await MapEditorProvider.executeActiveEditorCommand('executeTestMap'))) {
        vscode.window.showWarningMessage('Open a map editor before testing a map.');
      }
    }),

    vscode.commands.registerCommand('biztalkDataMapper.validateMap', async () => {
      vscode.window.showInformationMessage('Use the Validate button in the map editor toolbar');
    }),

    vscode.commands.registerCommand('biztalkDataMapper.refreshMaps', () => {
      mapsTreeProvider.refresh();
    })
  );

  context.subscriptions.push(provider);

  // Watch for .btm file changes to refresh the tree
  const watcher = vscode.workspace.createFileSystemWatcher('**/*.btm');
  watcher.onDidCreate(() => mapsTreeProvider.refresh());
  watcher.onDidDelete(() => mapsTreeProvider.refresh());
  context.subscriptions.push(watcher);
  context.subscriptions.push({ dispose: disposeDataMapperLogger });
  logger.info('Data Mapper extension ready.');
}

export function deactivate() {}
