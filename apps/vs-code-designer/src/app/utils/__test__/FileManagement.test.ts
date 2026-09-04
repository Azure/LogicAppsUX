import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { localize } from '../../../localize';
import { ext } from '../../../extensionVariables';
import { FileManagement } from '../fileManagement';

/**
 * Helper to create a mock workspace folder.
 * @param fsPath The folder path.
 * @returns A mock WorkspaceFolder.
 */
function mockWorkspaceFolder(fsPath: string): vscode.WorkspaceFolder {
  return {
    uri: vscode.Uri.file(fsPath),
    name: 'Test Folder',
    index: 0,
  } as vscode.WorkspaceFolder;
}

describe('FileManagement', () => {
  let updateWorkspaceFoldersSpy: ReturnType<typeof vi.spyOn>;
  let appendLogSpy: ReturnType<typeof vi.spyOn>;

  const folderPathExisting = '/existing/folder';
  const folderPathNew = '/new/folder';

  beforeEach(() => {
    // Ensure that ext.outputChannel is defined before spying on it.
    ext.outputChannel = {
      name: 'OutputChannel',
      appendLog: vi.fn(),
      append: vi.fn(),
      appendLine: vi.fn(),
      replace: vi.fn(),
      clear: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    };

    // Spy on the VS Code and extension logging methods.
    updateWorkspaceFoldersSpy = vi.spyOn(vscode.workspace, 'updateWorkspaceFolders') as any;
    appendLogSpy = vi.spyOn(ext.outputChannel, 'appendLog');

    // Ensure a clean workspaceFolders state.
    (vscode.workspace as any).workspaceFolders = [];
  });

  afterEach(() => {
    // Reset any modifications to the workspace folders.
    (vscode.workspace as any).workspaceFolders = undefined;
    vi.restoreAllMocks();
  });

  describe('ensureWorkspaceFolder', () => {
    it('does not add a folder that is already in the workspace', () => {
      (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder(folderPathExisting)];
      const addFolderToWorkspaceSpy = vi.spyOn(FileManagement, 'addFolderToWorkspace');

      FileManagement.ensureWorkspaceFolder(folderPathExisting);

      expect(addFolderToWorkspaceSpy).not.toHaveBeenCalled();
      expect(appendLogSpy).not.toHaveBeenCalled();
    });

    it('logs and adds a folder that is not in the workspace', () => {
      const addFolderToWorkspaceSpy = vi.spyOn(FileManagement, 'addFolderToWorkspace').mockImplementation(() => {});

      FileManagement.ensureWorkspaceFolder(folderPathNew);

      expect(appendLogSpy).toHaveBeenCalledWith(localize('addingWorkspaceFolder', 'Adding workspace folder: {0}', folderPathNew));
      expect(addFolderToWorkspaceSpy).toHaveBeenCalledWith(folderPathNew);
    });
  });

  describe('addFolderToWorkspace', () => {
    it('logs and does not add the folder if it is already in the workspace', () => {
      (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder(folderPathExisting)];

      FileManagement.addFolderToWorkspace(folderPathExisting);

      expect(appendLogSpy).toHaveBeenCalledWith(localize('addingFolderToWorkspace', `Adding folder to workspace: ${folderPathExisting}`));
      expect(appendLogSpy).toHaveBeenCalledWith(
        localize('folderAlreadyInWorkspace', `Folder is already in the workspace: ${folderPathExisting}`)
      );
      expect(updateWorkspaceFoldersSpy).not.toHaveBeenCalled();
    });

    it('adds a new folder at the end of the workspace folder list', () => {
      (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder(folderPathExisting)];
      updateWorkspaceFoldersSpy.mockReturnValue(true);

      FileManagement.addFolderToWorkspace(folderPathNew);

      expect(updateWorkspaceFoldersSpy).toHaveBeenCalledOnce();
      const [insertIndex, deleteCount, addedFolder] = updateWorkspaceFoldersSpy.mock.calls[0] as [number, number, { uri: vscode.Uri }];
      expect(insertIndex).toBe(1);
      expect(deleteCount).toBe(0);
      expect(addedFolder.uri.fsPath).toBe(folderPathNew);
      expect(appendLogSpy).toHaveBeenCalledWith(localize('folderAddedSuccessfully', `Folder added successfully: ${folderPathNew}`));
    });

    it('logs when VS Code refuses to add a new folder', () => {
      updateWorkspaceFoldersSpy.mockReturnValue(false);

      FileManagement.addFolderToWorkspace(folderPathNew);

      expect(updateWorkspaceFoldersSpy).toHaveBeenCalledOnce();
      const [insertIndex, deleteCount, addedFolder] = updateWorkspaceFoldersSpy.mock.calls[0] as [number, number, { uri: vscode.Uri }];
      expect(insertIndex).toBe(0);
      expect(deleteCount).toBe(0);
      expect(addedFolder.uri.fsPath).toBe(folderPathNew);
      expect(appendLogSpy).toHaveBeenCalledWith(
        localize('failedToAddFolder', `Failed to add folder to workspace (updateWorkspaceFolders returned false): ${folderPathNew}`)
      );
    });
  });
});
