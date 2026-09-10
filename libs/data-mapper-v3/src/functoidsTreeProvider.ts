/**
 * BizTalk Data Mapper - Functoids Tree View Provider
 * Shows available functoids grouped by category in the sidebar
 */

import * as vscode from 'vscode';
import { FunctoidRegistry, FunctoidDefinition } from './functoids';
import { FunctoidCategory } from './model';

export class FunctoidsTreeProvider implements vscode.TreeDataProvider<FunctoidTreeItem> {
    private registry: FunctoidRegistry;

    constructor() {
        this.registry = FunctoidRegistry.getInstance();
    }

    getTreeItem(element: FunctoidTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FunctoidTreeItem): FunctoidTreeItem[] {
        if (!element) {
            // Return categories
            const categories = Object.values(FunctoidCategory);
            return categories
                .filter(cat => this.registry.getFunctoidsByCategory(cat).length > 0)
                .map(cat => new FunctoidTreeItem(
                    cat,
                    '',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'category'
                ));
        }

        if (element.contextValue === 'category') {
            // Return functoids in this category
            const functoids = this.registry.getFunctoidsByCategory(element.label as FunctoidCategory);
            return functoids.map(f => new FunctoidTreeItem(
                f.name,
                f.description,
                vscode.TreeItemCollapsibleState.None,
                'functoid',
                f
            ));
        }

        return [];
    }
}

class FunctoidTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly functoid?: FunctoidDefinition
    ) {
        super(label, collapsibleState);
        this.tooltip = description || label;

        if (contextValue === 'category') {
            this.iconPath = new vscode.ThemeIcon('symbol-folder');
        } else {
            this.iconPath = new vscode.ThemeIcon('symbol-function');
        }
    }
}
