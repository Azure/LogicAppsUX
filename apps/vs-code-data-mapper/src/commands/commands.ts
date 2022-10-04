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

const createNewDataMapCmd = async (context: ExtensionContext) => {
  const newDataMapTemplate = yaml.dump({
    $sourceSchema: '',
    $targetSchema: '',
    mappings: {
      targetNodeKey: '',
    },
  });

  // TODO: Data map name validation
  window.showInputBox({ prompt: 'Data Map name: ' }).then((newDatamapName) => {
    if (!newDatamapName) {
      return;
    }

    DataMapperExt.currentDataMapName = newDatamapName;

    openDataMapperCmd(context).then(() => {
      DataMapperExt.currentPanel?.sendMsgToWebview({ command: 'loadNewDataMap', data: newDataMapTemplate });
    });
  });
};

const loadDataMapFileCmd = async (uri: Uri, context: ExtensionContext) => {
  const dataMap = yaml.load(await fs.readFile(uri.fsPath, 'utf-8')) as { $sourceSchema: string; $targetSchema: string; [key: string]: any };

  // Attempt to load schema files if specified
  const schemasFolder = path.join(workspace.workspaceFolders[0].uri.fsPath, schemasPath);
  const srcSchemaPath = path.join(schemasFolder, dataMap.$sourceSchema);
  const tgtSchemaPath = path.join(schemasFolder, dataMap.$targetSchema);

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
      dataMap: dataMap,
      sourceSchemaFileName: path.basename(srcSchemaPath),
      targetSchemaFileName: path.basename(tgtSchemaPath),
    },
  });
};
