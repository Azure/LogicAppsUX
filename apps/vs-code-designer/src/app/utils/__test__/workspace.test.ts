import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import * as vscode from 'vscode';
import * as workspaceUtils from '../workspace';
import { promptOpenProject, tryGetLogicAppProjectRoot } from '../verifyIsProject';

vi.mock('../verifyIsProject');

describe('workspaceUtils.getWorkspaceFolder', () => {
  const originalWorkspace = { ...vscode.workspace };

  const mockContext: any = {
    telemetry: { properties: {}, measurements: {} },
    errorHandling: { issueProperties: {} },
    ui: {
      showQuickPick: vi.fn(),
      showOpenDialog: vi.fn(),
      onDidFinishPrompt: vi.fn(),
      showInputBox: vi.fn(),
      showWarningMessage: vi.fn(),
    },
  };

  const mockFolder = (fsPath: string): vscode.WorkspaceFolder => ({ uri: { fsPath } }) as vscode.WorkspaceFolder;

  beforeEach(() => {
    // Reset workspace state and mocks before each test
    vi.restoreAllMocks();
    (vscode.workspace as any).workspaceFolders = undefined;
    (vscode.workspace as any).workspaceFile = undefined;
  });

  afterEach(() => {
    // Restore original workspace
    Object.assign(vscode, { workspace: originalWorkspace });
  });

  it('should prompt to open project if no workspace folders are open', async () => {
    const folder1 = mockFolder('/path/one');
    (vscode.workspace as any).workspaceFolders = [];

    const promptOpenProjectSpy = vi.fn(() => {
      (vscode.workspace as any).workspaceFolders = [folder1];
    });

    (promptOpenProject as Mock).mockImplementation(promptOpenProjectSpy);

    await workspaceUtils.getWorkspaceFolder(mockContext);
    expect(promptOpenProjectSpy).toHaveBeenCalled();
  });

  it('should prompt to open project if workspace folders are undefined', async () => {
    const folder1 = mockFolder('/path/one');
    (vscode.workspace as any).workspaceFolders = undefined;

    const promptOpenProjectSpy = vi.fn(() => {
      (vscode.workspace as any).workspaceFolders = [folder1];
    });

    (promptOpenProject as Mock).mockImplementation(promptOpenProjectSpy);

    await workspaceUtils.getWorkspaceFolder(mockContext);
    expect(promptOpenProjectSpy).toHaveBeenCalled();
  });

  it('should return the only workspace folder if there is only one', async () => {
    const folder1 = mockFolder('/path/one');
    (vscode.workspace as any).workspaceFolders = [folder1];

    const promptOpenProjectSpy = vi.fn(() => {
      (vscode.workspace as any).workspaceFolders = [folder1];
    });

    (promptOpenProject as Mock).mockImplementation(promptOpenProjectSpy);

    const result = await workspaceUtils.getWorkspaceFolder(mockContext);
    expect(result).toEqual(folder1);
    expect(promptOpenProjectSpy).not.toHaveBeenCalled();
  });

  it('should return the only workspace folder if there is only one after prompting', async () => {
    const folder1 = mockFolder('/path/one');
    (vscode.workspace as any).workspaceFolders = undefined;

    const promptOpenProjectSpy = vi.fn(() => {
      (vscode.workspace as any).workspaceFolders = [folder1];
    });

    (promptOpenProject as Mock).mockImplementation(promptOpenProjectSpy);

    const result = await workspaceUtils.getWorkspaceFolder(mockContext);
    expect(result).toEqual(folder1);
  });

  it('should return undefined if no logic app project is found among multiple folders', async () => {
    const folder1 = mockFolder('/path/one');
    const folder2 = mockFolder('/path/two');
    (vscode.workspace as any).workspaceFolders = [folder1, folder2];

    const tryGetLogicAppProjectRootSpy = vi.fn(() => {
      return undefined;
    });
    (tryGetLogicAppProjectRoot as Mock).mockImplementation(tryGetLogicAppProjectRootSpy);

    const result = await workspaceUtils.getWorkspaceFolder(mockContext);
    expect(tryGetLogicAppProjectRootSpy).toHaveBeenCalledTimes(2);
    expect(result).toBeUndefined();
  });

  it('should return the only logic app project if there is only one', async () => {
    const folder1 = mockFolder('/logic/path');
    const folder2 = mockFolder('/nonlogic/path');
    (vscode.workspace as any).workspaceFolders = [folder1, folder2];

    // For folder1 return a valid project root, for folder2 return undefined.
    const tryGetLogicAppProjectRootSpy = vi.fn(async (_context, folder) => {
      return folder.uri.fsPath === '/logic/path' ? folder.uri.fsPath : undefined;
    });
    (tryGetLogicAppProjectRoot as Mock).mockImplementation(tryGetLogicAppProjectRootSpy);

    const result = await workspaceUtils.getWorkspaceFolder(mockContext);

    expect(result).toBe('/logic/path');
    expect(tryGetLogicAppProjectRootSpy).toHaveBeenCalledTimes(2);
  });

  it('should return the first logic app project if skipPromptOnMultipleFolders is true', async () => {
    const folder1 = mockFolder('/logic/path1');
    const folder2 = mockFolder('/logic/path2');
    (vscode.workspace as any).workspaceFolders = [folder1, folder2];

    // Both folders return a valid project root.
    const tryGetLogicAppProjectRootSpy = vi.fn(async (_context, folder) => {
      return folder.uri.fsPath;
    });
    (tryGetLogicAppProjectRoot as Mock).mockImplementation(tryGetLogicAppProjectRootSpy);

    const result = await workspaceUtils.getWorkspaceFolder(mockContext, undefined, true);
    // Expect the first folder (or its project root) to be returned.
    expect(result).toBe('/logic/path1');
    expect(tryGetLogicAppProjectRootSpy).toHaveBeenCalledTimes(2);
  });

  it('should prompt the user to select a logic app project if there are multiple', async () => {
    const folder1 = mockFolder('/logic/path1');
    const folder2 = mockFolder('/logic/path2');
    (vscode.workspace as any).workspaceFolders = [folder1, folder2];
    // Both folders are logic app projects.
    const tryGetLogicAppProjectRootSpy = vi.fn(async (_context, folder) => {
      return folder.uri.fsPath;
    });
    (tryGetLogicAppProjectRoot as Mock).mockImplementation(tryGetLogicAppProjectRootSpy);

    const quickPickSpy = vi.spyOn(mockContext.ui, 'showQuickPick').mockResolvedValue({ data: folder2 });

    const result = await workspaceUtils.getWorkspaceFolder(mockContext);
    expect(quickPickSpy).toHaveBeenCalled();
    expect(result).toBe(folder2);
  });

  it('should throw UserCancelledError if user cancels the prompt', async () => {
    const folder1 = mockFolder('/logic/path1');
    const folder2 = mockFolder('/logic/path2');
    (vscode.workspace as any).workspaceFolders = [folder1, folder2];

    const tryGetLogicAppProjectRootSpy = vi.fn(async (_context, folder) => {
      return folder.uri.fsPath;
    });
    (tryGetLogicAppProjectRoot as Mock).mockImplementation(tryGetLogicAppProjectRootSpy);
    vi.spyOn(mockContext.ui, 'showQuickPick').mockResolvedValue(undefined);

    await expect(workspaceUtils.getWorkspaceFolder(mockContext)).rejects.toThrowError();
  });
});
