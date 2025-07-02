import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { promptOpenProjectOrWorkspace, tryGetLogicAppProjectRoot, tryGetAllLogicAppProjectRoots } from '../verifyIsProject';
import * as vscode from 'vscode';
import * as workspaceUtils from '../workspace';
import * as fse from 'fs-extra';
import * as path from 'path';

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

  const mockWorkspaceFolder = (fsPath: string): vscode.WorkspaceFolder => ({ uri: { fsPath } }) as vscode.WorkspaceFolder;

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
    const workspaceFolder = mockWorkspaceFolder(path.join('path', 'one'));
    (vscode.workspace as any).workspaceFolders = [];

    const promptOpenProjectOrWorkspaceSpy = vi.fn(() => {
      (vscode.workspace as any).workspaceFolders = [workspaceFolder];
    });

    (fse.readdir as unknown as Mock).mockReturnValue([
      { name: 'dir1', isDirectory: () => true },
      { name: 'dir2', isDirectory: () => true },
    ]);

    (promptOpenProjectOrWorkspace as Mock).mockImplementation(promptOpenProjectOrWorkspaceSpy);

    await workspaceUtils.getWorkspaceFolder(mockContext);

    expect(promptOpenProjectOrWorkspaceSpy).toHaveBeenCalled();
  });

  it('should prompt to open project if workspace folders are undefined', async () => {
    const workspaceFolder = mockWorkspaceFolder(path.join('path', 'one'));
    (vscode.workspace as any).workspaceFolders = undefined;

    const promptOpenProjectOrWorkspaceSpy = vi.fn(() => {
      (vscode.workspace as any).workspaceFolders = [workspaceFolder];
    });

    (fse.readdir as unknown as Mock).mockReturnValue([
      { name: 'dir1', isDirectory: () => true },
      { name: 'dir2', isDirectory: () => true },
    ]);

    (promptOpenProjectOrWorkspace as Mock).mockImplementation(promptOpenProjectOrWorkspaceSpy);

    await workspaceUtils.getWorkspaceFolder(mockContext);

    expect(promptOpenProjectOrWorkspaceSpy).toHaveBeenCalled();
  });

  it('should return the only workspace folder if there is only one (nested project folder)', async () => {
    const workspaceFolder = mockWorkspaceFolder(path.join('path', 'one'));
    const childLogicAppFolder = path.join(workspaceFolder.uri.fsPath, 'LogicApp1');

    (vscode.workspace as any).workspaceFolders = [workspaceFolder];
    const promptOpenProjectOrWorkspaceSpy = vi.fn(() => {});
    const tryGetLogicAppProjectRootSpy = vi.fn(() => childLogicAppFolder);

    (promptOpenProjectOrWorkspace as Mock).mockImplementation(promptOpenProjectOrWorkspaceSpy);
    (fse.readdir as unknown as Mock).mockReturnValue([{ name: 'LogicApp1', isDirectory: () => true }]);
    (tryGetLogicAppProjectRoot as Mock).mockImplementation(tryGetLogicAppProjectRootSpy);

    const result = await workspaceUtils.getWorkspaceFolder(mockContext);

    expect(promptOpenProjectOrWorkspaceSpy).not.toHaveBeenCalled();
    expect(result).toEqual(workspaceFolder);
  });

  it('should return the only workspace folder if there is only one after prompting (nested project folder)', async () => {
    const workspaceFolder = mockWorkspaceFolder(path.join('path', 'one'));
    const childLogicAppFolder = path.join(workspaceFolder.uri.fsPath, 'LogicApp1');

    (vscode.workspace as any).workspaceFolders = undefined;
    const promptOpenProjectOrWorkspaceSpy = vi.fn(() => {
      (vscode.workspace as any).workspaceFolders = [workspaceFolder];
    });
    const tryGetLogicAppProjectRootSpy = vi.fn(() => childLogicAppFolder);

    (promptOpenProjectOrWorkspace as Mock).mockImplementation(promptOpenProjectOrWorkspaceSpy);
    (fse.readdir as unknown as Mock).mockResolvedValue([{ name: 'LogicApp1', isDirectory: () => true }]);
    (tryGetLogicAppProjectRoot as Mock).mockImplementation(tryGetLogicAppProjectRootSpy);

    const result = await workspaceUtils.getWorkspaceFolder(mockContext);

    expect(promptOpenProjectOrWorkspaceSpy).toHaveBeenCalled();
    expect(result).toEqual(workspaceFolder);
  });

  it('should return undefined if no logic app project is found among multiple folders', async () => {
    const workspaceFolderNonlogic1 = mockWorkspaceFolder(path.join('path', 'one'));
    const workspaceFolderNonlogic2 = mockWorkspaceFolder(path.join('path', 'two'));

    (vscode.workspace as any).workspaceFolders = [workspaceFolderNonlogic1, workspaceFolderNonlogic2];
    const tryGetLogicAppProjectRootSpy = vi.fn(() => undefined);
    (tryGetLogicAppProjectRoot as Mock).mockImplementation(tryGetLogicAppProjectRootSpy);

    const result = await workspaceUtils.getWorkspaceFolder(mockContext);

    expect(tryGetLogicAppProjectRootSpy).toHaveBeenCalledTimes(2);
    expect(result).toBeUndefined();
  });

  it('should return the only logic app project if there is only one', async () => {
    const workspaceFolderLogicPath = path.join('logic', 'path');
    const workspaceFolderNonlogicPath = path.join('nonlogic', 'path');
    const workspaceFolderLogic = mockWorkspaceFolder(workspaceFolderLogicPath);
    const workspaceFolderNonlogic = mockWorkspaceFolder(workspaceFolderNonlogicPath);

    (vscode.workspace as any).workspaceFolders = [workspaceFolderLogic, workspaceFolderNonlogic];
    const tryGetLogicAppProjectRootSpy = vi.fn(async (_context, folder) => {
      return folder.uri.fsPath === workspaceFolderLogicPath ? folder.uri.fsPath : undefined;
    });
    (tryGetLogicAppProjectRoot as Mock).mockImplementation(tryGetLogicAppProjectRootSpy);

    const result = await workspaceUtils.getWorkspaceFolder(mockContext);

    expect(result).toBe(workspaceFolderLogic);
    expect(tryGetLogicAppProjectRootSpy).toHaveBeenCalledTimes(2);
  });

  it('should return the first logic app project if skipPromptOnMultipleFolders is true', async () => {
    const workspaceFolderLogicPath1 = path.join('logic', 'path1');
    const workspaceFolderLogicPath2 = path.join('logic', 'path2');
    const workspaceFolderLogic1 = mockWorkspaceFolder(workspaceFolderLogicPath1);
    const workspaceFolderLogic2 = mockWorkspaceFolder(workspaceFolderLogicPath2);

    (vscode.workspace as any).workspaceFolders = [workspaceFolderLogic1, workspaceFolderLogic2];
    const tryGetLogicAppProjectRootSpy = vi.fn(async (_context, folder) => folder.uri.fsPath);
    (tryGetLogicAppProjectRoot as Mock).mockImplementation(tryGetLogicAppProjectRootSpy);

    const result = await workspaceUtils.getWorkspaceFolder(mockContext, undefined, true);

    expect(result).toBe(workspaceFolderLogic1);
    expect(tryGetLogicAppProjectRootSpy).toHaveBeenCalledTimes(2);
  });

  it('should prompt the user to select a logic app project if there are multiple', async () => {
    const workspaceFolderLogicPath1 = path.join('logic', 'path1');
    const workspaceFolderLogicPath2 = path.join('logic', 'path2');
    const workspaceFolderLogic1 = mockWorkspaceFolder(workspaceFolderLogicPath1);
    const workspaceFolderLogic2 = mockWorkspaceFolder(workspaceFolderLogicPath2);

    (vscode.workspace as any).workspaceFolders = [workspaceFolderLogic1, workspaceFolderLogic2];
    const tryGetLogicAppProjectRootSpy = vi.fn(async (_context, folder) => folder.uri.fsPath);
    (tryGetLogicAppProjectRoot as Mock).mockImplementation(tryGetLogicAppProjectRootSpy);
    const quickPickSpy = vi.spyOn(mockContext.ui, 'showQuickPick').mockResolvedValue({ data: workspaceFolderLogic2 });

    const result = await workspaceUtils.getWorkspaceFolder(mockContext);

    expect(quickPickSpy).toHaveBeenCalled();
    expect(result).toBe(workspaceFolderLogic2);
  });

  it('should throw UserCancelledError if user cancels the prompt', async () => {
    const folder1 = mockWorkspaceFolder(path.join('logic', 'path1'));
    const folder2 = mockWorkspaceFolder(path.join('logic', 'path2'));

    (vscode.workspace as any).workspaceFolders = [folder1, folder2];
    const tryGetLogicAppProjectRootSpy = vi.fn(async (_context, folder) => folder.uri.fsPath);
    (tryGetLogicAppProjectRoot as Mock).mockImplementation(tryGetLogicAppProjectRootSpy);
    vi.spyOn(mockContext.ui, 'showQuickPick').mockResolvedValue(undefined);

    await expect(workspaceUtils.getWorkspaceFolder(mockContext)).rejects.toThrowError();
  });
});

describe('workspaceUtils.getWorkspaceLogicAppFolders', () => {
  const testLogicAppProjectPath1 = path.join('test', 'project', 'LogicApp1');
  const testLogicAppProjectPath2 = path.join('test', 'project', 'LogicApp2');
  const testWorkspaceFolders = [
    { name: 'LogicApp1', uri: { fsPath: testLogicAppProjectPath1 }, index: 0 },
    { name: 'LogicApp2', uri: { fsPath: testLogicAppProjectPath2 }, index: 1 },
  ];

  beforeEach(() => {
    (vscode.workspace as any).workspaceFolders = testWorkspaceFolders;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return an empty array if no workspace folders are open', async () => {
    (vscode.workspace as any).workspaceFolders = [];
    const tryGetAllLogicAppProjectRootsSpy = vi.fn(async (folder: vscode.WorkspaceFolder) => {
      if (folder.uri.fsPath === testLogicAppProjectPath1) {
        return [folder];
      } else if (folder.uri.fsPath === testLogicAppProjectPath2) {
        return ['root2a', 'root2b'];
      }
      return [];
    });

    const result = await workspaceUtils.getWorkspaceLogicAppFolders();

    expect(tryGetAllLogicAppProjectRootsSpy).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('should collect logic app roots from each workspace folder', async () => {
    const tryGetAllLogicAppProjectRootsSpy = vi.fn(async (folder: vscode.WorkspaceFolder) => {
      if (folder.uri.fsPath === testLogicAppProjectPath1) {
        return [folder];
      } else if (folder.uri.fsPath === testLogicAppProjectPath2) {
        return ['root2a', 'root2b'];
      }
      return [];
    });
    (tryGetAllLogicAppProjectRoots as Mock).mockImplementation(tryGetAllLogicAppProjectRootsSpy);

    const result = await workspaceUtils.getWorkspaceLogicAppFolders();

    expect(tryGetAllLogicAppProjectRootsSpy).toHaveBeenCalledTimes(2);
    expect(result).toEqual([testLogicAppProjectPath1, 'root2a', 'root2b']);
  });

  it('should return an empty array if none of the workspace folders contain a logic app project', async () => {
    const tryGetAllLogicAppProjectRootsSpy = vi.fn(async () => {
      return [];
    });
    (tryGetAllLogicAppProjectRoots as Mock).mockImplementation(tryGetAllLogicAppProjectRootsSpy);

    const result = await workspaceUtils.getWorkspaceLogicAppFolders();

    expect(tryGetAllLogicAppProjectRootsSpy).toHaveBeenCalledTimes(2);
    expect(result).toEqual([]);
  });
});
