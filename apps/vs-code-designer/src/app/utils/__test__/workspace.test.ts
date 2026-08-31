import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import type { WorkspaceFolder } from 'vscode';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as workspaceUtils from '../workspace';

const mocks = vi.hoisted(() => ({
  isCodelessLogicApp: vi.fn(),
  isCodefulLogicApp: vi.fn(),
}));

vi.mock('../codeless', () => ({
  isCodelessLogicApp: mocks.isCodelessLogicApp,
}));

vi.mock('../codeful', () => ({
  isCodefulLogicApp: mocks.isCodefulLogicApp,
}));

function mockDirectoryPaths(): void {
  vi.spyOn(fse, 'pathExists').mockResolvedValue(true);
  vi.spyOn(fse, 'statSync').mockReturnValue({ isDirectory: () => true } as fse.Stats);
  mocks.isCodelessLogicApp.mockResolvedValue(false);
  mocks.isCodefulLogicApp.mockResolvedValue(false);
}

describe('selectLogicAppRoot', () => {
  const mockContext: any = {
    telemetry: { properties: {}, measurements: {} },
    errorHandling: { issueProperties: {} },
    ui: {
      showQuickPick: vi.fn(),
    },
  };

  const workspacePath = path.join('test', 'workspace');
  const workspaceFolder = {
    uri: { fsPath: workspacePath },
    name: 'workspace',
    index: 0,
  } as WorkspaceFolder;

  beforeEach(() => {
    vi.clearAllMocks();
    (vscode.workspace as any).workspaceFolders = [workspaceFolder];
    mockDirectoryPaths();
    vi.spyOn(fse, 'readdir').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (vscode.workspace as any).workspaceFolders = [];
  });

  it('returns undefined when no Logic App projects exist', async () => {
    await expect(workspaceUtils.selectLogicAppRoot(mockContext)).resolves.toBeUndefined();

    expect(mockContext.ui.showQuickPick).not.toHaveBeenCalled();
  });

  it('returns the only Logic App project without prompting', async () => {
    const projectPath = path.join(workspacePath, 'LogicApp1');
    vi.mocked(fse.readdir).mockResolvedValue(['LogicApp1']);
    mocks.isCodelessLogicApp.mockImplementation(async (candidatePath) => candidatePath === projectPath);

    await expect(workspaceUtils.selectLogicAppRoot(mockContext)).resolves.toBe(projectPath);

    expect(mockContext.ui.showQuickPick).not.toHaveBeenCalled();
  });

  it('prompts for multiple Logic App projects and returns the selection', async () => {
    const projectPath1 = path.join(workspacePath, 'LogicApp1');
    const projectPath2 = path.join(workspacePath, 'LogicApp2');
    vi.mocked(fse.readdir).mockResolvedValue(['LogicApp1', 'LogicApp2']);
    mocks.isCodelessLogicApp.mockImplementation(async (candidatePath) => candidatePath === projectPath1 || candidatePath === projectPath2);
    mockContext.ui.showQuickPick.mockResolvedValue({ data: projectPath2 });

    await expect(workspaceUtils.selectLogicAppRoot(mockContext)).resolves.toBe(projectPath2);

    expect(mockContext.ui.showQuickPick).toHaveBeenCalledWith(
      [
        { label: 'LogicApp1', description: projectPath1, data: projectPath1 },
        { label: 'LogicApp2', description: projectPath2, data: projectPath2 },
      ],
      { placeHolder: 'Select a logic app project' }
    );
  });

  it('returns the first project without prompting when suppressPrompt is true', async () => {
    const projectPath1 = path.join(workspacePath, 'LogicApp1');
    const projectPath2 = path.join(workspacePath, 'LogicApp2');
    vi.mocked(fse.readdir).mockResolvedValue(['LogicApp1', 'LogicApp2']);
    mocks.isCodelessLogicApp.mockImplementation(async (candidatePath) => candidatePath === projectPath1 || candidatePath === projectPath2);

    await expect(workspaceUtils.selectLogicAppRoot(mockContext, true)).resolves.toBe(projectPath1);

    expect(mockContext.ui.showQuickPick).not.toHaveBeenCalled();
  });
});

describe('getParentLogicAppRoot', () => {
  const workspacePath = path.join('test', 'workspace');
  const projectPath = path.join(workspacePath, 'projects', 'LogicApp1');

  beforeEach(() => {
    vi.clearAllMocks();
    mockDirectoryPaths();
    (vscode.workspace as any).workspaceFolders = [
      {
        uri: { fsPath: workspacePath },
        name: 'workspace',
        index: 0,
      },
    ];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (vscode.workspace as any).workspaceFolders = [];
  });

  it('finds the Logic App project root from a nested workflow file path', async () => {
    const workflowFilePath = path.join(projectPath, 'workflows', 'workflow1', 'workflow.json');
    mocks.isCodelessLogicApp.mockImplementation(async (candidatePath) => candidatePath === projectPath);

    await expect(workspaceUtils.getParentLogicAppRoot(workflowFilePath)).resolves.toBe(projectPath);
  });

  it('returns undefined for a path outside the workspace', async () => {
    await expect(workspaceUtils.getParentLogicAppRoot(path.join('outside', 'workflow.json'))).resolves.toBeUndefined();

    expect(mocks.isCodelessLogicApp).not.toHaveBeenCalled();
  });

  it('returns undefined when no ancestor is a Logic App project', async () => {
    await expect(
      workspaceUtils.getParentLogicAppRoot(path.join(workspacePath, 'projects', 'not-a-logic-app', 'workflow.json'))
    ).resolves.toBeUndefined();
  });
});

describe('getLogicAppRoots', () => {
  const testLogicAppProjectPath1 = path.join('test', 'project', 'LogicApp1');
  const testLogicAppProjectPath2 = path.join('test', 'project', 'LogicApp2');
  const testWorkspaceFolders = [
    { name: 'LogicApp1', uri: { fsPath: testLogicAppProjectPath1 }, index: 0 },
    { name: 'LogicApp2', uri: { fsPath: testLogicAppProjectPath2 }, index: 1 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockDirectoryPaths();
    vi.spyOn(fse, 'readdir').mockResolvedValue([]);
    (vscode.workspace as any).workspaceFolders = testWorkspaceFolders;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (vscode.workspace as any).workspaceFolders = [];
  });

  it('returns an empty array if no workspace folders are open', async () => {
    (vscode.workspace as any).workspaceFolders = [];

    await expect(workspaceUtils.getLogicAppRoots()).resolves.toEqual([]);
    expect(mocks.isCodelessLogicApp).not.toHaveBeenCalled();
  });

  it('collects logic app roots from each workspace folder', async () => {
    mocks.isCodelessLogicApp.mockImplementation(
      async (projectPath) => projectPath === testLogicAppProjectPath1 || projectPath === testLogicAppProjectPath2
    );

    await expect(workspaceUtils.getLogicAppRoots()).resolves.toEqual([testLogicAppProjectPath1, testLogicAppProjectPath2]);
  });

  it('returns an empty array if none of the workspace folders contain a logic app project', async () => {
    await expect(workspaceUtils.getLogicAppRoots()).resolves.toEqual([]);
  });
});

describe('getWorkspaceFolderLogicAppRoots', () => {
  const testWorkspaceFolderPath = path.join('test', 'workspace', 'LogicApp1');
  const testWorkspaceFolder = {
    uri: { fsPath: testWorkspaceFolderPath },
    name: path.basename(testWorkspaceFolderPath),
    index: 0,
  } as WorkspaceFolder;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDirectoryPaths();
    vi.spyOn(fse, 'readdir').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an empty array if workspaceFolder is undefined', async () => {
    await expect(workspaceUtils.getWorkspaceFolderLogicAppRoots(undefined)).resolves.toEqual([]);
  });

  it('returns an empty array if the folder does not exist', async () => {
    vi.mocked(fse.pathExists).mockResolvedValue(false);

    await expect(workspaceUtils.getWorkspaceFolderLogicAppRoots(testWorkspaceFolder)).resolves.toEqual([]);
  });

  it('returns the folder path if it is a Logic App project', async () => {
    mocks.isCodelessLogicApp.mockImplementation(async (candidatePath) => candidatePath === testWorkspaceFolderPath);

    await expect(workspaceUtils.getWorkspaceFolderLogicAppRoots(testWorkspaceFolder)).resolves.toEqual([testWorkspaceFolderPath]);
  });

  it('returns matching subpaths that are Logic App projects', async () => {
    const testLogicAppProjectPath1 = path.join(testWorkspaceFolderPath, 'LogicApp1');
    const testLogicAppProjectPath2 = path.join(testWorkspaceFolderPath, 'LogicApp2');
    vi.mocked(fse.readdir).mockResolvedValue(['LogicApp1', 'LogicApp2']);
    mocks.isCodelessLogicApp.mockImplementation(
      async (candidatePath) => candidatePath === testLogicAppProjectPath1 || candidatePath === testLogicAppProjectPath2
    );

    await expect(workspaceUtils.getWorkspaceFolderLogicAppRoots(testWorkspaceFolder)).resolves.toEqual([
      testLogicAppProjectPath1,
      testLogicAppProjectPath2,
    ]);
  });

  it('returns an empty array if no Logic App project is found in the root or subfolders', async () => {
    vi.mocked(fse.readdir).mockResolvedValue(['sub1', 'sub2']);

    await expect(workspaceUtils.getWorkspaceFolderLogicAppRoots(testWorkspaceFolder)).resolves.toEqual([]);
  });
});

describe('isLogicApp', () => {
  const projectPath = path.join('test', 'LogicApp');

  beforeEach(() => {
    vi.clearAllMocks();
    mockDirectoryPaths();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when the folder does not exist', async () => {
    vi.mocked(fse.pathExists).mockResolvedValue(false);

    await expect(workspaceUtils.isLogicApp(projectPath)).resolves.toBe(false);
  });

  it('returns false when the path is not a directory', async () => {
    vi.mocked(fse.statSync).mockReturnValue({ isDirectory: () => false } as fse.Stats);

    await expect(workspaceUtils.isLogicApp(projectPath)).resolves.toBe(false);
  });

  it('returns true when the codeless project detector matches', async () => {
    mocks.isCodelessLogicApp.mockResolvedValue(true);

    await expect(workspaceUtils.isLogicApp(projectPath)).resolves.toBe(true);
    expect(mocks.isCodefulLogicApp).not.toHaveBeenCalled();
  });

  it('returns true when the codeful project detector matches', async () => {
    mocks.isCodefulLogicApp.mockResolvedValue(true);

    await expect(workspaceUtils.isLogicApp(projectPath)).resolves.toBe(true);
    expect(mocks.isCodefulLogicApp).toHaveBeenCalledWith(projectPath);
  });

  it('returns false when neither project detector matches', async () => {
    await expect(workspaceUtils.isLogicApp(projectPath)).resolves.toBe(false);
  });
});
