import DataMapperPanel from '../DataMapperPanel';
import { commands, window } from 'vscode';
import type { ExtensionContext } from 'vscode';

export const registerCommands = (context: ExtensionContext) => {
  context.subscriptions.push(commands.registerCommand('dataMapperExtension.start', () => startCmd(context)));
  context.subscriptions.push(commands.registerCommand('dataMapperExtension.loadInputSchemaFile', loadInputSchemaFileCmd));
  context.subscriptions.push(commands.registerCommand('dataMapperExtension.loadInputSchemaFile', loadOutputSchemaFileCmd));
  context.subscriptions.push(commands.registerCommand('dataMapperExtension.loadInputSchemaFile', loadDataMapFileCmd));
};

const startCmd = (context: ExtensionContext) => {
  DataMapperPanel.createOrShow(context);
};

const loadInputSchemaFileCmd = () => {
  window.showInformationMessage('Input schema has been loaded!'); // TESTING ITEM
};

const loadOutputSchemaFileCmd = () => {
  window.showInformationMessage('Output schema has been loaded!'); // TESTING ITEM
};

const loadDataMapFileCmd = () => {
  window.showInformationMessage("Hey, you can't do that yet! (loading data maps)"); // TESTING ITEM
};
