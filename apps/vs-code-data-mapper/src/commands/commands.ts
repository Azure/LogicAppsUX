import DataMapperPanel from '../DataMapperPanel';
import { commands, window } from 'vscode';
import type { ExtensionContext } from 'vscode';

export const registerCommands = (context: ExtensionContext) => {
  context.subscriptions.push(commands.registerCommand('dataMapperExtension.start', () => startCmd(context)));
  context.subscriptions.push(commands.registerCommand('dataMapperExtension.openInDataMapper', openInDataMapperCmd));
};

const startCmd = (context: ExtensionContext) => {
  DataMapperPanel.createOrShow(context);
};

const openInDataMapperCmd = () => {
  window.showInformationMessage('Compatible file has been opened in Data Mapper'); // TESTING ITEM
};
