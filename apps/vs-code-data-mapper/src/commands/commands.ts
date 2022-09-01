import DataMapperPanel from '../DataMapperPanel';
import { dataMapDefinitionsPath, schemasPath } from '../extensionConfig';
import { promises as fs, existsSync as fileExists } from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { commands, window, workspace } from 'vscode';
import type { ExtensionContext, Uri } from 'vscode';

export const registerCommands = (context: ExtensionContext) => {
  context.subscriptions.push(commands.registerCommand('azureDataMapper.openDataMapper', () => openDataMapperCmd(context)));
  context.subscriptions.push(commands.registerCommand('azureDataMapper.createNewDataMap', createNewDataMapCmd));
  context.subscriptions.push(commands.registerCommand('azureDataMapper.loadDataMapFile', loadDataMapFileCmd));
};

const openDataMapperCmd = (context: ExtensionContext) => {
  DataMapperPanel.createOrShow(context);
};

const createNewDataMapCmd = async () => {
  const newDataMapTemplate = yaml.dump({
    srcSchemaName: '',
    dstSchemaName: '',
    mappings: {
      targetNodeKey: '',
    },
  });

  // TODO: Data map name validation
  window.showInputBox({ prompt: 'Data Map name: ' }).then((newDatamapName) => {
    if (!newDatamapName) {
      return;
    }

    commands.executeCommand('azureDataMapper.openDataMapper'); // Doing it this way so we don't have to pass context everywhere

    const filePath = path.join(workspace.workspaceFolders[0].uri.fsPath, dataMapDefinitionsPath, `${newDatamapName}.yml`);
    fs.writeFile(filePath, newDataMapTemplate, 'utf8');

    DataMapperPanel.currentPanel?.sendMsgToWebview({ command: 'loadDataMap', data: newDataMapTemplate });

    DataMapperPanel.currentDataMapName = newDatamapName;
  });
};

const loadDataMapFileCmd = async (uri: Uri) => {
  commands.executeCommand('azureDataMapper.openDataMapper');

  const dataMap = yaml.load(await fs.readFile(uri.fsPath, 'utf-8')) as { $sourceSchema: string; $targetSchema: string; [key: string]: any };

  // Attempt to load schema files if specified
  const schemasFolder = path.join(workspace.workspaceFolders[0].uri.fsPath, schemasPath);
  const srcSchemaPath = path.join(schemasFolder, dataMap.$sourceSchema);
  const dstSchemaPath = path.join(schemasFolder, dataMap.$targetSchema);

  if (fileExists(srcSchemaPath)) {
    DataMapperPanel.currentPanel?.sendMsgToWebview({
      command: 'fetchSchema',
      data: { fileName: path.basename(srcSchemaPath), type: 'input' },
    });
  }

  if (fileExists(dstSchemaPath)) {
    DataMapperPanel.currentPanel.sendMsgToWebview({
      command: 'fetchSchema',
      data: { fileName: path.basename(dstSchemaPath), type: 'output' },
    });
  }

  DataMapperPanel.currentPanel.sendMsgToWebview({ command: 'loadDataMap', data: dataMap });

  DataMapperPanel.currentDataMapName = path.basename(uri.fsPath, path.extname(uri.fsPath)); // Gets filename w/o ext
};
