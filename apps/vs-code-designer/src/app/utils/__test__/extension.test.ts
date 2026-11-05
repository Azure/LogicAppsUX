import { extensionContext, logicAppsStandardExtensionId } from '../../../constants';
import * as vscode from 'vscode';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getExtensionVersion, initializeCustomExtensionContext, updateLogicAppsContext } from '../extension';
import { getWorkspaceLogicAppRoots, getWorkspaceCustomCodeFunctionsProjectRoots } from '../workspace';
import { getEligibleLogicAppFoldersForCustomCode } from '../customCodeUtils';

vi.mock('../workspace', () => ({
  getWorkspaceLogicAppRoots: vi.fn().mockResolvedValue([]),
  getWorkspaceCustomCodeFunctionsProjectRoots: vi.fn().mockResolvedValue([]),
}));

vi.mock('../customCodeUtils', () => ({
  getEligibleLogicAppFoldersForCustomCode: vi.fn().mockResolvedValue([]),
}));

describe('extension utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vscode as any).extensions = {
      getExtension: vi.fn(),
    };
    (vscode.workspace as any).workspaceFolders = [];
    (vscode.workspace as any).findFiles = vi.fn().mockResolvedValue([]);
    (vscode.workspace as any).openTextDocument = vi.fn();
  });

  it('returns the installed extension version when package metadata is available', () => {
    (vscode.extensions.getExtension as any).mockImplementation((id: string) =>
      id === logicAppsStandardExtensionId ? { packageJSON: { version: '5.110.0' } } : undefined
    );

    expect(getExtensionVersion()).toBe('5.110.0');
  });

  it('initializes data mapper context values', () => {
    initializeCustomExtensionContext();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'setContext',
      extensionContext.dataMapSupportedDataMapDefinitionFileExts,
      expect.any(Array)
    );
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', extensionContext.dataMapSupportedFileExts, expect.any(Array));
  });

  it('updates project context when a Logic Apps project is present', async () => {
    const workspaceFolder = { uri: { fsPath: 'D:\\workspace' } };
    (vscode.workspace as any).workspaceFolders = [workspaceFolder];
    vi.mocked(getWorkspaceLogicAppRoots).mockResolvedValue(['D:\\workspace']);

    await updateLogicAppsContext();

    expect(getWorkspaceLogicAppRoots).toHaveBeenCalled();
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', 'azureLogicAppsStandard.hasProject', true);
  });

  it('refreshes project contexts when workflow and project markers change', async () => {
    const watcher = {
      onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      dispose: vi.fn(),
    };
    (vscode.workspace as any).createFileSystemWatcher = vi.fn().mockReturnValue(watcher);
    const context = { subscriptions: [] } as unknown as vscode.ExtensionContext;
    initializeCustomExtensionContext(context);
    expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalledWith('**/{workflow.json,*.csproj}');
    expect(context.subscriptions).toHaveLength(4);
    for (const event of [watcher.onDidCreate, watcher.onDidChange, watcher.onDidDelete]) {
      await event.mock.calls[0][0]();
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', extensionContext.logicAppProjectFolders, []);
    }
  });

  it('scopes commands to all Logic App project paths independently of workspace order', async () => {
    (vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file('D:\\maps') }, { uri: vscode.Uri.file('D:\\apps') }];
    vi.mocked(getWorkspaceLogicAppRoots).mockResolvedValue(['D:\\apps\\Orders', 'D:\\other\\Orders']);
    await updateLogicAppsContext();
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', extensionContext.logicAppProjectFolders, [
      vscode.Uri.file('D:\\apps\\Orders').fsPath,
      vscode.Uri.file('D:\\other\\Orders').fsPath,
    ]);
  });

  it('clears every project context when the last workspace folder closes', async () => {
    await updateLogicAppsContext();
    for (const key of [
      extensionContext.logicAppProjectFolders,
      extensionContext.customCodeFunctionsFolders,
      extensionContext.customCodeEligibleLogicAppFolders,
    ]) {
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', key, []);
    }
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', extensionContext.hasProject, false);
  });

  it('does not restore stale project paths after a newer refresh completes', async () => {
    (vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file('D:\\apps') }];
    let resolveRoots: (roots: string[]) => void;
    vi.mocked(getWorkspaceLogicAppRoots).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRoots = resolve;
        })
    );
    vi.mocked(getWorkspaceCustomCodeFunctionsProjectRoots).mockResolvedValue([]);
    vi.mocked(getEligibleLogicAppFoldersForCustomCode).mockResolvedValue([]);
    const pending = updateLogicAppsContext();
    (vscode.workspace as any).workspaceFolders = [];
    await updateLogicAppsContext();
    resolveRoots(['D:\\apps']);
    await pending;
    expect(vscode.commands.executeCommand).not.toHaveBeenCalledWith('setContext', extensionContext.hasProject, true);
  });
});
