import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import type { WorkspaceFolder } from 'vscode';
import * as workspaceUtils from '../workspace';
import * as fse from 'fs-extra';
import * as path from 'path';
import { getWorkspaceFolderLogicApps } from '../workspace';
import { hostFileName, workflowFileName } from '../../../constants';
import * as verifyIsProject from '../verifyIsProject';

describe('getLogicAppProjectRoot', () => {
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
    vi.spyOn(fse, 'pathExists').mockResolvedValue(true);
    vi.spyOn(fse, 'readdir').mockResolvedValue([]);
    vi.spyOn(verifyIsProject, 'isLogicAppProject').mockResolvedValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    (vscode.workspace as any).workspaceFolders = [];
  });

  it('returns undefined when no Logic App projects exist', async () => {
    await expect(workspaceUtils.getLogicAppProjectRoot(mockContext)).resolves.toBeUndefined();

    expect(mockContext.ui.showQuickPick).not.toHaveBeenCalled();
  });

  it('returns the only Logic App project without prompting', async () => {
    const projectPath = path.join(workspacePath, 'LogicApp1');
    vi.mocked(fse.readdir).mockResolvedValue(['LogicApp1']);
    vi.mocked(verifyIsProject.isLogicAppProject).mockImplementation(async (candidatePath) => candidatePath === projectPath);

    await expect(workspaceUtils.getLogicAppProjectRoot(mockContext)).resolves.toBe(projectPath);

    expect(mockContext.ui.showQuickPick).not.toHaveBeenCalled();
  });

  it('prompts for multiple Logic App projects and returns the selection', async () => {
    const projectPath1 = path.join(workspacePath, 'LogicApp1');
    const projectPath2 = path.join(workspacePath, 'LogicApp2');
    vi.mocked(fse.readdir).mockResolvedValue(['LogicApp1', 'LogicApp2']);
    vi.mocked(verifyIsProject.isLogicAppProject).mockImplementation(
      async (candidatePath) => candidatePath === projectPath1 || candidatePath === projectPath2
    );
    mockContext.ui.showQuickPick.mockResolvedValue({ data: projectPath2 });

    await expect(workspaceUtils.getLogicAppProjectRoot(mockContext)).resolves.toBe(projectPath2);

    expect(mockContext.ui.showQuickPick).toHaveBeenCalledWith(
      [
        { label: 'LogicApp1', description: projectPath1, data: projectPath1 },
        { label: 'LogicApp2', description: projectPath2, data: projectPath2 },
      ],
      { placeHolder: 'Select the folder containing your logic app project' }
    );
  });

  it('returns the first project without prompting when suppressPrompt is true', async () => {
    const projectPath1 = path.join(workspacePath, 'LogicApp1');
    const projectPath2 = path.join(workspacePath, 'LogicApp2');
    vi.mocked(fse.readdir).mockResolvedValue(['LogicApp1', 'LogicApp2']);
    vi.mocked(verifyIsProject.isLogicAppProject).mockImplementation(
      async (candidatePath) => candidatePath === projectPath1 || candidatePath === projectPath2
    );

    await expect(workspaceUtils.getLogicAppProjectRoot(mockContext, true)).resolves.toBe(projectPath1);

    expect(mockContext.ui.showQuickPick).not.toHaveBeenCalled();
  });
});

describe('getParentLogicAppRoot', () => {
  const workspacePath = path.join('test', 'workspace');
  const projectPath = path.join(workspacePath, 'projects', 'LogicApp1');

  beforeEach(() => {
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
    const workflowFilePath = path.join(projectPath, 'workflows', 'workflow1', workflowFileName);
    vi.spyOn(verifyIsProject, 'isLogicAppProject').mockImplementation(async (candidatePath) => candidatePath === projectPath);

    await expect(workspaceUtils.getParentLogicAppRoot(workflowFilePath)).resolves.toBe(projectPath);
  });

  it('returns undefined for a path outside the workspace', async () => {
    const isLogicAppProject = vi.spyOn(verifyIsProject, 'isLogicAppProject');

    await expect(workspaceUtils.getParentLogicAppRoot(path.join('outside', 'workflow.json'))).resolves.toBeUndefined();

    expect(isLogicAppProject).not.toHaveBeenCalled();
  });

  it('returns undefined when no ancestor is a Logic App project', async () => {
    vi.spyOn(verifyIsProject, 'isLogicAppProject').mockResolvedValue(false);

    await expect(
      workspaceUtils.getParentLogicAppRoot(path.join(workspacePath, 'projects', 'not-a-logic-app', 'workflow.json'))
    ).resolves.toBeUndefined();
  });
});

describe('getWorkspaceLogicAppRoots', () => {
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
    const tryGetWorkspaceFolderLogicAppsSpy = vi.fn(async (folder: vscode.WorkspaceFolder) => {
      if (folder.uri.fsPath === testLogicAppProjectPath1) {
        return [folder.uri.fsPath];
      } else if (folder.uri.fsPath === testLogicAppProjectPath2) {
        return ['root2a', 'root2b'];
      }
      return [];
    });

    const result = await workspaceUtils.getWorkspaceLogicAppRoots();

    expect(tryGetWorkspaceFolderLogicAppsSpy).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('should collect logic app roots from each workspace folder', async () => {
    vi.spyOn(fse, 'pathExists').mockResolvedValue(true);
    vi.spyOn(verifyIsProject, 'isLogicAppProject').mockImplementation(async (projectPath: string) => {
      return projectPath === testLogicAppProjectPath1 || projectPath === testLogicAppProjectPath2;
    });
    vi.spyOn(fse, 'readdir').mockResolvedValue([]);

    const result = await workspaceUtils.getWorkspaceLogicAppRoots();

    expect(result).toEqual([testLogicAppProjectPath1, testLogicAppProjectPath2]);
  });

  it('should return an empty array if none of the workspace folders contain a logic app project', async () => {
    vi.spyOn(fse, 'pathExists').mockResolvedValue(true);
    vi.spyOn(verifyIsProject, 'isLogicAppProject').mockResolvedValue(false);
    vi.spyOn(fse, 'readdir').mockResolvedValue([]);

    const result = await workspaceUtils.getWorkspaceLogicAppRoots();

    expect(result).toEqual([]);
  });
});

describe('getWorkspaceFolderLogicApps', () => {
  const testWorkspaceFolderPath = path.join('test', 'workspace', 'LogicApp1');
  const testWorkspaceFolder = {
    uri: { fsPath: testWorkspaceFolderPath },
    name: path.basename(testWorkspaceFolderPath),
    index: 0,
  } as WorkspaceFolder;

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return an empty array if workspaceFolder is undefined', async () => {
    const result = await getWorkspaceFolderLogicApps(undefined);
    expect(result).toEqual([]);
  });

  it('should return an empty array if folderPath does not exist', async () => {
    vi.spyOn(fse, 'pathExists').mockResolvedValue(false);
    const result = await getWorkspaceFolderLogicApps(testWorkspaceFolder);
    expect(result).toEqual([]);
  });

  it('should return the folderPath if it is a logic app project', async () => {
    vi.spyOn(fse, 'pathExists').mockResolvedValue(true);
    vi.spyOn(fse, 'readdir').mockImplementation(async (filePath: fse.PathLike) => {
      if (filePath === testWorkspaceFolderPath) return [hostFileName, 'workflow1'];
      if (filePath === path.join(testWorkspaceFolderPath, 'workflow1')) return [workflowFileName];
      return [];
    });
    vi.spyOn(fse, 'readFile').mockImplementation(async (filePath: fse.PathLike) => {
      if (filePath === path.join(testWorkspaceFolderPath, hostFileName)) {
        return JSON.stringify({ version: '2.0', extensionBundle: { id: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows' } });
      }
      if (filePath === path.join(testWorkspaceFolderPath, 'workflow1', workflowFileName)) {
        return JSON.stringify({
          definition: {
            $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          },
        });
      }
      return '';
    });

    const result = await getWorkspaceFolderLogicApps(testWorkspaceFolder);
    expect(result).toEqual([testWorkspaceFolderPath]);
  });

  it('should return matching subpaths that are logic app projects', async () => {
    const testLogicAppProjectPath1 = path.join(testWorkspaceFolderPath, 'LogicApp1');
    const testLogicAppProjectPath2 = path.join(testWorkspaceFolderPath, 'LogicApp2');

    vi.spyOn(fse, 'pathExists').mockResolvedValue(true);
    vi.spyOn(fse, 'readdir').mockImplementation(async (filePath: fse.PathLike) => {
      if (filePath === testWorkspaceFolderPath) return ['LogicApp1', 'LogicApp2'];
      if (filePath === testLogicAppProjectPath1) return [hostFileName, 'workflow1'];
      if (filePath === testLogicAppProjectPath2) return [hostFileName, 'workflow1'];
      if (filePath === path.join(testLogicAppProjectPath1, 'workflow1')) return [workflowFileName];
      if (filePath === path.join(testLogicAppProjectPath2, 'workflow1')) return [workflowFileName];
      return [];
    });
    vi.spyOn(fse, 'readFile').mockImplementation(async (filePath: fse.PathLike) => {
      if (filePath === path.join(testLogicAppProjectPath1, hostFileName)) {
        return JSON.stringify({ version: '2.0', extensionBundle: { id: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows' } });
      }
      if (filePath === path.join(testLogicAppProjectPath2, hostFileName)) {
        return JSON.stringify({ version: '2.0', extensionBundle: { id: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows' } });
      }
      if (filePath === path.join(testLogicAppProjectPath1, 'workflow1', workflowFileName)) {
        return JSON.stringify({
          definition: {
            $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          },
        });
      }
      if (filePath === path.join(testLogicAppProjectPath2, 'workflow1', workflowFileName)) {
        return JSON.stringify({
          definition: {
            $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          },
        });
      }
      return '';
    });

    const result = await getWorkspaceFolderLogicApps(testWorkspaceFolder);
    expect(result).toEqual([testLogicAppProjectPath1, testLogicAppProjectPath2]);
  });

  it('should return an empty array if no logic app project is found in root or subfolders', async () => {
    vi.spyOn(fse, 'pathExists').mockResolvedValue(true);
    vi.spyOn(fse, 'readdir').mockImplementation(async (filePath: fse.PathLike) => {
      if (filePath === testWorkspaceFolderPath) return ['sub1', 'sub2'];
      if (filePath === path.join(testWorkspaceFolderPath, 'sub1')) return [workflowFileName];
      return [];
    });
    vi.spyOn(fse, 'readFile').mockImplementation(async (filePath: fse.PathLike) => {
      // A workflow.json that is not a Microsoft.Logic workflow definition is not a Logic Apps signal.
      if (filePath === path.join(testWorkspaceFolderPath, 'sub1', workflowFileName)) {
        return JSON.stringify({ definition: { $schema: 'https://example.com/not-a-logic-workflow.json#' } });
      }
      return '';
    });

    const result = await getWorkspaceFolderLogicApps(testWorkspaceFolder);
    expect(result).toEqual([]);
  });
});
