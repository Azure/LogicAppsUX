import { extensionCommand, logicAppsStandardExtensionId } from '../../../constants';
import * as vscode from 'vscode';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getExtensionVersion,
  initializeCustomExtensionContext,
  updateLogicAppsContext,
} from '../extension';
import { getWorkspaceFolderWithoutPrompting } from '../workspace';
import { isLogicAppProjectInRoot } from '../verifyIsProject';

vi.mock('../workspace', () => ({
  getWorkspaceFolderWithoutPrompting: vi.fn(),
}));

vi.mock('../verifyIsProject', () => ({
  isLogicAppProjectInRoot: vi.fn(),
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
      extensionCommand.dataMapSetSupportedDataMapDefinitionFileExts,
      expect.any(Array)
    );
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'setContext',
      extensionCommand.dataMapSetSupportedFileExts,
      expect.any(Array)
    );
  });

  it('updates project context when a Logic Apps project is present', async () => {
    const workspaceFolder = { uri: { fsPath: 'D:\\workspace' } };
    (vscode.workspace as any).workspaceFolders = [workspaceFolder];
    (getWorkspaceFolderWithoutPrompting as any).mockResolvedValue(workspaceFolder);
    (isLogicAppProjectInRoot as any).mockResolvedValue(true);

    await updateLogicAppsContext();

    expect(isLogicAppProjectInRoot).toHaveBeenCalledWith(workspaceFolder);
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', 'logicApps.hasProject', true);
  });
});
