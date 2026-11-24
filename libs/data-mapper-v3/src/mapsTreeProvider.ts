/**
 * BizTalk Data Mapper - Maps Tree View Provider
 * Shows all .btm files in the workspace in the sidebar
 */

import * as vscode from 'vscode';
import * as path from 'path';

export class MapsTreeProvider implements vscode.TreeDataProvider<MapTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<MapTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: MapTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: MapTreeItem): Promise<MapTreeItem[]> {
    if (element) {
      return [];
    }

    const mapFiles = await vscode.workspace.findFiles('**/*.{btm,lml}', '**/{node_modules,workflow-designtime}/**', 100);

    if (mapFiles.length === 0) {
      return [];
    }

    return mapFiles
      .map((uri) => {
        const fileName = path.basename(uri.fsPath, path.extname(uri.fsPath));
        const item = new MapTreeItem(fileName, uri, vscode.TreeItemCollapsibleState.None);
        return item;
      })
      .sort((a, b) => a.label!.toString().localeCompare(b.label!.toString()));
  }
}

class MapTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly resourceUri: vscode.Uri,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    const isLml = resourceUri.path.toLowerCase().endsWith('.lml');
    this.iconPath = new vscode.ThemeIcon('file');
    this.description = isLml ? 'LML' : undefined;
    this.command = {
      command: 'vscode.openWith',
      title: 'Open Map',
      arguments: [resourceUri, isLml ? 'biztalkDataMapper.lmlEditor' : 'biztalkDataMapper.mapEditor'],
    };
    this.contextValue = isLml ? 'lmlFile' : 'btmFile';
  }
}
