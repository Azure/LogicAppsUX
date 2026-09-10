/**
 * BizTalk Data Mapper - VS Code Extension Entry Point
 */

import * as vscode from 'vscode';
import { MapEditorProvider } from './mapEditorProvider';
import { MapsTreeProvider } from './mapsTreeProvider';
import { FunctoidsTreeProvider } from './functoidsTreeProvider';

export function activate(context: vscode.ExtensionContext) {
    const provider = MapEditorProvider.register(context);

    // Register tree views for the sidebar
    const mapsTreeProvider = new MapsTreeProvider();
    const functoidsTreeProvider = new FunctoidsTreeProvider();

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('biztalkDataMapper.mapsView', mapsTreeProvider),
        vscode.window.registerTreeDataProvider('biztalkDataMapper.functoidView', functoidsTreeProvider)
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('biztalkDataMapper.newMap', async () => {
            const mapName = await vscode.window.showInputBox({
                prompt: 'Enter map name',
                value: 'NewMap'
            });
            if (!mapName) { return; }

            const saveUri = await vscode.window.showSaveDialog({
                filters: { 'BizTalk Map': ['btm'] },
                defaultUri: vscode.Uri.file(`${mapName}.btm`)
            });
            if (!saveUri) { return; }

            const { BtmSerializer } = await import('./schema/btmSerializer');
            const serializer = new BtmSerializer();
            const map = serializer.createNew('', '', mapName);
            const content = serializer.serialize(map);
            await vscode.workspace.fs.writeFile(saveUri, Buffer.from(content, 'utf-8'));
            await vscode.commands.executeCommand('vscode.openWith', saveUri, 'biztalkDataMapper.mapEditor');
            mapsTreeProvider.refresh();
        }),

        vscode.commands.registerCommand('biztalkDataMapper.openMap', async () => {
            const fileUri = await vscode.window.showOpenDialog({
                canSelectMany: false,
                canSelectFolders: false,
                filters: {
                    'BizTalk Map (*.btm)': ['btm'],
                    'All Files': ['*']
                },
                openLabel: 'Open Map',
                title: 'Open BizTalk Map'
            });
            if (!fileUri || fileUri.length === 0) { return; }

            try {
                await vscode.commands.executeCommand('vscode.openWith', fileUri[0], 'biztalkDataMapper.mapEditor');
            } catch (e: any) {
                // Fallback: try opening as text first, then reopen with custom editor
                vscode.window.showErrorMessage(`Error opening map: ${e.message}. Trying fallback...`);
                try {
                    const doc = await vscode.workspace.openTextDocument(fileUri[0]);
                    await vscode.window.showTextDocument(doc);
                    await vscode.commands.executeCommand('vscode.openWith', fileUri[0], 'biztalkDataMapper.mapEditor');
                } catch (e2: any) {
                    vscode.window.showErrorMessage(`Failed to open map file: ${e2.message}`);
                }
            }
        }),

        vscode.commands.registerCommand('biztalkDataMapper.compileMap', async () => {
            vscode.window.showInformationMessage('Use the Compile button in the map editor toolbar');
        }),

        vscode.commands.registerCommand('biztalkDataMapper.testMap', async () => {
            const inputFile = await vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: { 'XML Files': ['xml'] },
                title: 'Select Test Input XML'
            });
            if (!inputFile || inputFile.length === 0) { return; }
            vscode.window.showInformationMessage(`Test map with input: ${inputFile[0].fsPath}`);
        }),

        vscode.commands.registerCommand('biztalkDataMapper.validateMap', async () => {
            vscode.window.showInformationMessage('Use the Validate button in the map editor toolbar');
        }),

        vscode.commands.registerCommand('biztalkDataMapper.refreshMaps', () => {
            mapsTreeProvider.refresh();
        })
    );

    context.subscriptions.push(provider);

    // Watch for .btm file changes to refresh the tree
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.btm');
    watcher.onDidCreate(() => mapsTreeProvider.refresh());
    watcher.onDidDelete(() => mapsTreeProvider.refresh());
    context.subscriptions.push(watcher);
}

export function deactivate() {}
