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
  context.subscriptions.push(commands.registerCommand('azureDataMapper.loadInputSchemaFile', loadInputSchemaFileCmd));
  context.subscriptions.push(commands.registerCommand('azureDataMapper.loadOutputSchemaFile', loadOutputSchemaFileCmd));
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
  window.showInputBox({ prompt: 'Data Map name: ', title: 'Data Map name' }).then((newDatamapName) => {
    if (!newDatamapName) {
      return;
    }

    commands.executeCommand('azureDataMapper.openDataMapper'); // Doing it this way so we don't have to pass context everywhere

    const filePath = path.join(workspace.workspaceFolders[0].uri.fsPath, dataMapDefinitionsPath, `${newDatamapName}.yml`);
    fs.writeFile(filePath, newDataMapTemplate, 'utf8');

    DataMapperPanel.currentPanel.sendMsgToWebview({ command: 'loadDataMap', data: newDataMapTemplate });

    DataMapperPanel.currentDataMapName = newDatamapName;
  });
};

const loadInputSchemaFileCmd = async (uri: Uri) => {
  commands.executeCommand('azureDataMapper.openDataMapper');

  const inputSchema = JSON.parse(await fs.readFile(uri.fsPath, 'utf-8'));
  DataMapperPanel.currentPanel.sendMsgToWebview({ command: 'loadInputSchema', data: inputSchema });
};

const loadOutputSchemaFileCmd = async (uri: Uri) => {
  commands.executeCommand('azureDataMapper.openDataMapper');

  const outputSchema = JSON.parse(await fs.readFile(uri.fsPath, 'utf-8'));
  DataMapperPanel.currentPanel.sendMsgToWebview({ command: 'loadOutputSchema', data: outputSchema });
};

const loadDataMapFileCmd = async (uri: Uri) => {
  commands.executeCommand('azureDataMapper.openDataMapper');

  const dataMap = yaml.load(await fs.readFile(uri.fsPath, 'utf-8')) as { srcSchemaName: string; dstSchemaName: string; mappings: any };
  DataMapperPanel.currentPanel.sendMsgToWebview({ command: 'loadDataMap', data: dataMap });

  // Attempt to load schema files if specified
  const schemasFolder = path.join(workspace.workspaceFolders[0].uri.fsPath, schemasPath);
  const srcSchemaPath = path.join(schemasFolder, dataMap.srcSchemaName);
  const dstSchemaPath = path.join(schemasFolder, dataMap.dstSchemaName);

  if (dataMap.srcSchemaName && fileExists(srcSchemaPath)) {
    DataMapperPanel.currentPanel.sendMsgToWebview({
      command: 'loadInputSchema',
      data: JSON.parse(await fs.readFile(srcSchemaPath, 'utf-8')),
    });
  }

  if (dataMap.dstSchemaName && fileExists(dstSchemaPath)) {
    DataMapperPanel.currentPanel.sendMsgToWebview({
      command: 'loadOutputSchema',
      data: JSON.parse(await fs.readFile(dstSchemaPath, 'utf-8')),
    });
  }

  // Fun way to get filename - very heavily assumes file is only .yml
  DataMapperPanel.currentDataMapName = uri.fsPath.split('\\').pop().split('/').pop().replace('.yml', '');
};
