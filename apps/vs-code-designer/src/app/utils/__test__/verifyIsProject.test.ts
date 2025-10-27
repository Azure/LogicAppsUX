import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { WorkspaceFolder } from 'vscode';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as verifyIsProject from '../verifyIsProject';
import { hostFileName, workflowFileName } from '../../../constants';

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

    const result = await verifyIsProject.tryGetAllLogicAppProjectRoots(testWorkspaceFolder);
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

    const result = await verifyIsProject.tryGetAllLogicAppProjectRoots(testWorkspaceFolder);
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
      if (filePath === path.join(testWorkspaceFolderPath, 'sub1', workflowFileName)) {
        return JSON.stringify({
          definition: {
            $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
          },
        });
      }
      return '';
    });

    const result = await verifyIsProject.tryGetAllLogicAppProjectRoots(testWorkspaceFolder);
    expect(result).toEqual([]);
  });
});
