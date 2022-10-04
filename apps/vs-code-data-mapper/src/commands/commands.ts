import DataMapperExt from '../DataMapperExt';
import { startBackendRuntime } from '../FxWorkflowRuntime';
import { schemasPath } from '../extensionConfig';
import { promises as fs, existsSync as fileExists } from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { commands, window, workspace } from 'vscode';
import type { ExtensionContext, Uri } from 'vscode';

export const registerCommands = (context: ExtensionContext) => {
  context.subscriptions.push(commands.registerCommand('azureDataMapper.openDataMapper', () => openDataMapperCmd(context)));
  context.subscriptions.push(commands.registerCommand('azureDataMapper.createNewDataMap', () => createNewDataMapCmd(context)));
  context.subscriptions.push(commands.registerCommand('azureDataMapper.loadDataMapFile', (uri: Uri) => loadDataMapFileCmd(uri, context)));
};

const openDataMapperCmd = async (context: ExtensionContext) => {
  // TODO (WI #15558678): If necessary, better handle creation/updating/placement of host.json/local.settings.json files
  await startBackendRuntime(DataMapperExt.getWorkspaceFolderFsPath());

  DataMapperExt.createOrShow(context);
};

const createNewDataMapCmd = (context: ExtensionContext) => {
  // TODO: Data map name validation
  window.showInputBox({ prompt: 'Data Map name: ' }).then(async (newDatamapName) => {
    if (!newDatamapName) {
      return;
    }

    DataMapperExt.currentDataMapName = newDatamapName;

    await openDataMapperCmd(context);

    DataMapperExt.currentPanel.sendMsgToWebview({ command: 'loadNewDataMap', data: {} });

    DataMapperExt.currentPanel.sendMsgToWebview({
      command: 'setXsltFilename',
      data: DataMapperExt.currentDataMapName,
    });
  });
};

const loadDataMapFileCmd = async (uri: Uri, context: ExtensionContext) => {
  const mapDefinition = yaml.load(await fs.readFile(uri.fsPath, 'utf-8')) as {
    $sourceSchema: string;
    $targetSchema: string;
    [key: string]: any;
  };

  // Attempt to load schema files if specified
  const schemasFolder = path.join(workspace.workspaceFolders[0].uri.fsPath, schemasPath);
  const srcSchemaPath = path.join(schemasFolder, mapDefinition.$sourceSchema);
  const tgtSchemaPath = path.join(schemasFolder, mapDefinition.$targetSchema);

  if (!fileExists(srcSchemaPath)) {
    DataMapperExt.showError('Loading data map definition failed: the defined source schema file was not found in the Schemas folder!');
    return;
  }

  if (!fileExists(tgtSchemaPath)) {
    DataMapperExt.showError('Loading data map definition failed: the defined target schema file was not found in the Schemas folder!');
    return;
  }

  DataMapperExt.currentDataMapName = path.basename(uri.fsPath, path.extname(uri.fsPath)); // Gets filename w/o ext

  await openDataMapperCmd(context);

  DataMapperExt.currentPanel.sendMsgToWebview({
    command: 'loadDataMap',
    data: {
      mapDefinition: mapDefinition,
      sourceSchemaFileName: path.basename(srcSchemaPath),
      targetSchemaFileName: path.basename(tgtSchemaPath),
    },
  });

  DataMapperExt.currentPanel.sendMsgToWebview({
    command: 'setXsltFilename',
    data: DataMapperExt.currentDataMapName,
  });
};
