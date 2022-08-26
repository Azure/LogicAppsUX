import DataMapperPanel from '../DataMapperPanel';
import { promises as fs } from 'fs';
import { commands, workspace } from 'vscode';
import type { ExtensionContext, Uri } from 'vscode';

import path = require('path');
import yaml = require('js-yaml');

export const registerCommands = (context: ExtensionContext) => {
  context.subscriptions.push(commands.registerCommand('dataMapperExtension.start', () => startCmd(context)));
  context.subscriptions.push(commands.registerCommand('dataMapperExtension.createDataMapFile', createDataMapFileCmd));
  context.subscriptions.push(commands.registerCommand('dataMapperExtension.loadInputSchemaFile', loadInputSchemaFileCmd));
  context.subscriptions.push(commands.registerCommand('dataMapperExtension.loadOutputSchemaFile', loadOutputSchemaFileCmd));
  context.subscriptions.push(commands.registerCommand('dataMapperExtension.loadDataMapFile', loadDataMapFileCmd));
};

const startCmd = async (context: ExtensionContext) => {
  DataMapperPanel.createOrShow(context);
};

const createDataMapFileCmd = async () => {
  const newDataMapTemplate = yaml.dump({
    srcSchemaName: 'sourceSchemaName',
    dstSchemaName: 'destinationSchemaName',
    mappings: {
      targetNodeKey: 'targetNodeKey',
    },
  });

  const filePath = path.join(workspace.workspaceFolders[0].uri.fsPath, 'maps', 'NewDataMap.yml');
  fs.writeFile(filePath, newDataMapTemplate, 'utf8');

  DataMapperPanel.currentPanel.sendMsgToWebview({ command: 'loadDataMap', data: newDataMapTemplate });
};

const loadInputSchemaFileCmd = async (uri: Uri) => {
  const inputSchema = JSON.parse(await fs.readFile(uri.fsPath, 'utf-8'));
  DataMapperPanel.currentPanel.sendMsgToWebview({ command: 'loadInputSchema', data: inputSchema });
};

const loadOutputSchemaFileCmd = async (uri: Uri) => {
  const outputSchema = JSON.parse(await fs.readFile(uri.fsPath, 'utf-8'));
  DataMapperPanel.currentPanel.sendMsgToWebview({ command: 'loadOutputSchema', data: outputSchema });
};

// TODO: Likely automatically search for and load schema files if already specified in data map
const loadDataMapFileCmd = async (uri: Uri) => {
  const dataMap = JSON.parse(await fs.readFile(uri.fsPath, 'utf-8'));
  DataMapperPanel.currentPanel.sendMsgToWebview({ command: 'loadDataMap', data: dataMap });
};
