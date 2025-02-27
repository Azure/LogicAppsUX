import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { FileManagement } from '../iacGestureHelperFunctions';
import { localize } from '../../../../localize';
import { ext } from '../../../../extensionVariables';

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

describe('FileManagement.addFolderToWorkspace', () => {
  let updateWorkspaceFoldersSpy: ReturnType<typeof vi.spyOn>;
  let appendLogSpy: ReturnType<typeof vi.spyOn>;
  let showErrorMessageSpy: ReturnType<typeof vi.spyOn>;

  const folderPathExisting = '/existing/folder';
  const folderPathNew = '/new/folder';
  const folderPathError = '/error/folder';

  beforeEach(() => {
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
    showErrorMessageSpy = vi.spyOn(vscode.window, 'showErrorMessage') as any;

    // Ensure a clean workspaceFolders state.
    (vscode.workspace as any).workspaceFolders = [];
  });

  afterEach(() => {
    // Reset any modifications to the workspace folders.
    (vscode.workspace as any).workspaceFolders = undefined;
    vi.restoreAllMocks();
  });

  it('should log and not add the folder if it is already in the workspace', () => {
    // Arrange: Create a workspace that already contains the folder.
    const existingFolder = mockWorkspaceFolder(folderPathExisting);
    (vscode.workspace as any).workspaceFolders = [existingFolder];

    // Act
    FileManagement.addFolderToWorkspace(folderPathExisting);

    // Assert
    // First, we log that we are attempting to add the folder.
    expect(appendLogSpy).toHaveBeenCalledWith(localize('addingFolderToWorkspace', `Adding folder to workspace: ${folderPathExisting}`));
    // Then, we log that the folder already exists.
    expect(appendLogSpy).toHaveBeenCalledWith(
      localize('folderAlreadyInWorkspace', `Folder is already in the workspace: ${folderPathExisting}`)
    );
    // And updateWorkspaceFolders should not have been called.
    expect(updateWorkspaceFoldersSpy).not.toHaveBeenCalled();
  });

  it('should catch and handle errors thrown during folder addition', () => {
    // Arrange: Set up an empty workspace.
    (vscode.workspace as any).workspaceFolders = [];
    const testError = new Error('Test error');
    // Stub updateWorkspaceFolders to throw an error.
    updateWorkspaceFoldersSpy.mockImplementation(() => {
      throw testError;
    });
    const showErrorSpy = vi.spyOn(vscode.window, 'showErrorMessage').mockImplementation(async () => undefined);

    // Act
    FileManagement.addFolderToWorkspace(folderPathError);

    // Assert
    // Verify that the error is logged.
    expect(appendLogSpy).toHaveBeenCalledWith(localize('errorAddingFolder', `Error in addFolderToWorkspace: ${testError}`));
    // And an error message is shown to the user.
    expect(showErrorSpy).toHaveBeenCalledWith(
      localize('errorMessageAddingFolder', 'Failed to add folder to workspace: ') + testError.message
    );
  });
});
