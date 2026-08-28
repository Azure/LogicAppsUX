import { extensionContext, logicAppsStandardExtensionId } from '../../../constants';
import * as vscode from 'vscode';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getExtensionVersion, initializeCustomExtensionContext, updateLogicAppsContext } from '../extension';
import { getWorkspaceLogicAppRoots } from '../workspace';

vi.mock('../workspace', () => ({
  getWorkspaceCustomCodeProjectRoots: vi.fn().mockResolvedValue([]),
  getWorkspaceLogicAppRoots: vi.fn().mockResolvedValue([]),
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
    const projectPaths = ['D:\\workspace\\LogicApp1', 'D:\\workspace\\nested\\LogicApp2'];
    const workspaceFolder = { uri: { fsPath: 'D:\\workspace' } };
    (vscode.workspace as any).workspaceFolders = [workspaceFolder];
    vi.mocked(getWorkspaceLogicAppRoots).mockResolvedValue(projectPaths);

    await updateLogicAppsContext();

    expect(getWorkspaceLogicAppRoots).toHaveBeenCalledOnce();
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', extensionContext.hasProject, true);
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', extensionContext.logicAppProjectPaths, projectPaths);
  });

  it('sets an empty project path context when an open workspace has no Logic App projects', async () => {
    (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: 'D:\\workspace' } }];
    vi.mocked(getWorkspaceLogicAppRoots).mockResolvedValue([]);

    await updateLogicAppsContext();

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', extensionContext.hasProject, false);
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', extensionContext.logicAppProjectPaths, []);
  });

  it('clears project-related contexts when no workspace is open', async () => {
    (vscode.workspace as any).workspaceFolders = [];

    await updateLogicAppsContext();

    expect(getWorkspaceLogicAppRoots).not.toHaveBeenCalled();
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', extensionContext.hasProject, false);
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', extensionContext.logicAppProjectPaths, []);
  });
});
