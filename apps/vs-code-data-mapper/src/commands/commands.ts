import DataMapperPanel from '../DataMapperPanel';
import { promises as fs } from 'fs';
import { commands, window } from 'vscode';
import type { ExtensionContext, Uri } from 'vscode';

export const registerCommands = (context: ExtensionContext) => {
  context.subscriptions.push(commands.registerCommand('dataMapperExtension.start', () => startCmd(context)));
  context.subscriptions.push(commands.registerCommand('dataMapperExtension.loadInputSchemaFile', loadInputSchemaFileCmd));
  context.subscriptions.push(commands.registerCommand('dataMapperExtension.loadOutputSchemaFile', loadOutputSchemaFileCmd));
  context.subscriptions.push(commands.registerCommand('dataMapperExtension.loadDataMapFile', loadDataMapFileCmd));
};

const startCmd = async (context: ExtensionContext) => {
  DataMapperPanel.createOrShow(context);
};

const loadInputSchemaFileCmd = async (uri: Uri) => {
  const inputSchemaJson = JSON.parse(await fs.readFile(uri.fsPath, 'utf-8'));
  DataMapperPanel.currentPanel.sendMsgToWebview({ command: 'loadInputSchema', data: inputSchemaJson });
};

const loadOutputSchemaFileCmd = async (uri: Uri) => {
  const outputSchemaJson = JSON.parse(await fs.readFile(uri.fsPath, 'utf-8'));
  DataMapperPanel.currentPanel.sendMsgToWebview({ command: 'loadOutputSchema', data: outputSchemaJson });
};

const loadDataMapFileCmd = async (uri: Uri) => {
  const dataMapJson = JSON.parse(await fs.readFile(uri.fsPath, 'utf-8'));
  window.showInformationMessage(JSON.stringify(dataMapJson));
  // DataMapperPanel.currentPanel.sendMsgToWebview({ command: 'loadDataMap', data: TODO - datamap })

  window.showInformationMessage("Hey, you can't do that yet! (loading data maps)"); // TESTING ITEM
};
