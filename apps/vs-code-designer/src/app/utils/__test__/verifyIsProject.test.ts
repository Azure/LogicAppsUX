import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { WorkspaceFolder } from 'vscode';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as verifyIsProject from '../verifyIsProject';
import { codefulWorkflowFileName, hostFileName, localSettingsFileName, workflowFileName } from '../../../constants';

describe('tryGetAllLogicAppProjectRoots', () => {
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
    const result = await verifyIsProject.tryGetAllLogicAppProjectRoots(undefined);
    expect(result).toEqual([]);
  });

  it('should return an empty array if folderPath does not exist', async () => {
    vi.spyOn(fse, 'pathExists').mockResolvedValue(false);
    const result = await verifyIsProject.tryGetAllLogicAppProjectRoots(testWorkspaceFolder);
    expect(result).toEqual([]);
  });

  it('should return the folderPath if it is a logic app project', async () => {
    vi.spyOn(fse, 'pathExists').mockImplementation(async (filePath: fse.PathLike) => !String(filePath).endsWith(codefulWorkflowFileName));
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

    const result = await verifyIsProject.tryGetAllLogicAppProjectRoots(testWorkspaceFolder);
    expect(result).toEqual([testWorkspaceFolderPath]);
  });

  it('should return matching subpaths that are logic app projects', async () => {
    const testLogicAppProjectPath1 = path.join(testWorkspaceFolderPath, 'LogicApp1');
    const testLogicAppProjectPath2 = path.join(testWorkspaceFolderPath, 'LogicApp2');

    vi.spyOn(fse, 'pathExists').mockImplementation(async (filePath: fse.PathLike) => !String(filePath).endsWith(codefulWorkflowFileName));
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

    const result = await verifyIsProject.tryGetAllLogicAppProjectRoots(testWorkspaceFolder);
    expect(result).toEqual([testLogicAppProjectPath1, testLogicAppProjectPath2]);
  });

  it('should return an empty array if no logic app project is found in root or subfolders', async () => {
    vi.spyOn(fse, 'pathExists').mockImplementation(async (filePath: fse.PathLike) => !String(filePath).endsWith(codefulWorkflowFileName));
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

    const result = await verifyIsProject.tryGetAllLogicAppProjectRoots(testWorkspaceFolder);
    expect(result).toEqual([]);
  });
});

describe('isLogicAppProject', () => {
  const projectPath = path.join('test', 'LogicApp');

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when the folder does not exist', async () => {
    vi.spyOn(fse, 'pathExists').mockResolvedValue(false);
    expect(await verifyIsProject.isLogicAppProject(projectPath)).toBe(false);
  });

  it('detects a codeless project via workflow.json even when host.json is missing', async () => {
    const workflowJsonPath = path.join(projectPath, 'stateful1', workflowFileName);
    // No host.json, no local.settings.json, no workflow.cs on disk — only the workflow folder exists.
    vi.spyOn(fse, 'pathExists').mockImplementation(async (p: fse.PathLike) => {
      const s = String(p);
      return s === projectPath || s === workflowJsonPath;
    });
    vi.spyOn(fse, 'readdir').mockImplementation(async (p: fse.PathLike) => (String(p) === projectPath ? ['stateful1'] : []));
    vi.spyOn(fse, 'readFile').mockImplementation(async (p: fse.PathLike) => {
      if (String(p) === workflowJsonPath) {
        return JSON.stringify({
          definition: {
            $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          },
        });
      }
      return '';
    });

    expect(await verifyIsProject.isLogicAppProject(projectPath)).toBe(true);
  });

  it('detects a codeless project even when a present host.json is corrupted', async () => {
    const workflowJsonPath = path.join(projectPath, 'stateful1', workflowFileName);
    vi.spyOn(fse, 'pathExists').mockImplementation(async (p: fse.PathLike) => {
      const s = String(p);
      return s === projectPath || s === path.join(projectPath, hostFileName) || s === workflowJsonPath;
    });
    vi.spyOn(fse, 'readdir').mockImplementation(async (p: fse.PathLike) => (String(p) === projectPath ? [hostFileName, 'stateful1'] : []));
    vi.spyOn(fse, 'readFile').mockImplementation(async (p: fse.PathLike) => {
      if (String(p) === path.join(projectPath, hostFileName)) {
        return 'this is not valid json {';
      }
      if (String(p) === workflowJsonPath) {
        return JSON.stringify({
          definition: {
            $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          },
        });
      }
      return '';
    });

    expect(await verifyIsProject.isLogicAppProject(projectPath)).toBe(true);
  });

  it('detects a codeful project via workflow.cs at the project root', async () => {
    const workflowCsPath = path.join(projectPath, codefulWorkflowFileName);
    vi.spyOn(fse, 'pathExists').mockImplementation(async (p: fse.PathLike) => {
      const s = String(p);
      return s === projectPath || s === workflowCsPath;
    });
    vi.spyOn(fse, 'readdir').mockImplementation(async (p: fse.PathLike) =>
      String(p) === projectPath ? [codefulWorkflowFileName, 'Program.cs'] : []
    );
    vi.spyOn(fse, 'readFile').mockResolvedValue('');

    expect(await verifyIsProject.isLogicAppProject(projectPath)).toBe(true);
  });

  it('does not tag a plain Functions project (host.json present, no workflow signal)', async () => {
    const localSettingsPath = path.join(projectPath, localSettingsFileName);
    vi.spyOn(fse, 'pathExists').mockImplementation(async (p: fse.PathLike) => {
      const s = String(p);
      return s === projectPath || s === path.join(projectPath, hostFileName) || s === localSettingsPath;
    });
    vi.spyOn(fse, 'readdir').mockImplementation(async (p: fse.PathLike) =>
      String(p) === projectPath ? [hostFileName, localSettingsFileName, 'MyHttpFunction'] : []
    );
    vi.spyOn(fse, 'readFile').mockImplementation(async (p: fse.PathLike) => {
      if (String(p) === localSettingsPath) {
        return JSON.stringify({ Values: { FUNCTIONS_WORKER_RUNTIME: 'dotnet' } });
      }
      return '';
    });

    expect(await verifyIsProject.isLogicAppProject(projectPath)).toBe(false);
  });

  it('does not tag a folder whose workflow.json is not a Microsoft.Logic workflow', async () => {
    const workflowJsonPath = path.join(projectPath, 'wf', workflowFileName);
    vi.spyOn(fse, 'pathExists').mockImplementation(async (p: fse.PathLike) => {
      const s = String(p);
      return s === projectPath || s === workflowJsonPath;
    });
    vi.spyOn(fse, 'readdir').mockImplementation(async (p: fse.PathLike) => (String(p) === projectPath ? ['wf'] : []));
    vi.spyOn(fse, 'readFile').mockImplementation(async (p: fse.PathLike) =>
      String(p) === workflowJsonPath ? JSON.stringify({ definition: { $schema: 'https://example.com/not-logic.json#' } }) : ''
    );

    expect(await verifyIsProject.isLogicAppProject(projectPath)).toBe(false);
  });
});
