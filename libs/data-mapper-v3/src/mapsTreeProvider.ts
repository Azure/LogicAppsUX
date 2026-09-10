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
        if (element) { return []; }

        // Find all .btm files in workspace
        const btmFiles = await vscode.workspace.findFiles('**/*.btm', '**/node_modules/**', 100);
        
        if (btmFiles.length === 0) {
            return [];
        }

        return btmFiles.map(uri => {
            const fileName = path.basename(uri.fsPath, '.btm');
            const relativePath = vscode.workspace.asRelativePath(uri);
            const item = new MapTreeItem(
                fileName,
                relativePath,
                uri,
                vscode.TreeItemCollapsibleState.None
            );
            return item;
        }).sort((a, b) => a.label!.toString().localeCompare(b.label!.toString()));
    }
}

class MapTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly relativePath: string,
        public readonly resourceUri: vscode.Uri,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = relativePath;
        this.description = path.dirname(relativePath);
        this.iconPath = new vscode.ThemeIcon('file');
        this.command = {
            command: 'vscode.openWith',
            title: 'Open Map',
            arguments: [resourceUri, 'biztalkDataMapper.mapEditor']
        };
        this.contextValue = 'btmFile';
    }
}
