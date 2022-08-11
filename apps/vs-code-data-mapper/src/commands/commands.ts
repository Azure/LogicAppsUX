import { promises as fs } from 'fs';
import { join } from 'path';
import { commands, window, ViewColumn, Uri } from 'vscode';
import type { ExtensionContext } from 'vscode';

export const registerCommands = (context: ExtensionContext) => {
  commands.registerCommand('dataMapperExtension.start', async () => startCmd(context));
  commands.registerCommand('dataMapperExtension.openInDataMapper', openInDataMapperCmd);
};

const startCmd = async (context: ExtensionContext) => {
  const panel = window.createWebviewPanel(
    'webview', // Key used to reference the panel
    'Data Mapper (TESTING: - webview)', // Title display in the tab
    ViewColumn.Active, // Editor column to show the new webview panel in.
    { enableScripts: true }
  );

  const indexPath = join(context.extensionPath, 'webview/index.html');
  const html = await fs.readFile(indexPath, 'utf-8');
  // 1. Get all link prefixed by href or src
  const matchLinks = /(href|src)="([^"]*)"/g;
  // 2. Transform the result of the regex into a vscode's URI format
  const toUri = (_, prefix: 'href' | 'src', link: string) => {
    // TODO: For ???
    if (link === '#') {
      return `${prefix}="${link}"`;
    }
    // For scripts & links
    const path = join(context.extensionPath, 'webview', link);
    const uri = Uri.file(path);
    return `${prefix}="${panel.webview.asWebviewUri(uri)}"`;
  };
  panel.webview.html = html.replace(matchLinks, toUri);

  context.subscriptions.push(panel);
};

const openInDataMapperCmd = () => {
  window.showInformationMessage('Compatible file has been opened in Data Mapper'); // TESTING ITEM
};
