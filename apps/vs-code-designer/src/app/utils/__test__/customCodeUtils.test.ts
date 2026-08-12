import * as fse from 'fs-extra';
import * as path from 'path';
import * as verifyProjectUtils from '../verifyIsProject';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import {
  CustomCodeFunctionsProjectMetadata,
  getCustomCodeFunctionsProjectMetadata,
  getEligibleLogicAppFoldersForCustomCode,
  isCustomCodeFunctionsProject,
  isCustomCodeFunctionsProjectInRoot,
  tryGetCustomCodeFunctionsProjects,
  tryGetLogicAppCustomCodeFunctionsProjects,
} from '../customCodeUtils';
import { TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import { ext } from '../../../extensionVariables';
import { assetsFolderName, hostFileName, localSettingsFileName } from '../../../constants';

vi.mock('fs-extra', () => ({
  statSync: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
  pathExists: vi.fn(),
}));

vi.mock('verifyProjectUtils', () => ({
  isLogicAppProject: vi.fn(),
}));

vi.mock('../../../extensionVariables', () => ({
  ext: {
    outputChannel: {
      appendLog: vi.fn(),
    },
  },
}));

describe('customCodeUtils', () => {
  let validNet8CsprojContent: string;
  let validNet10CsprojContent: string;
  let validNetFxCsprojContent: string;
  let invalidCsprojContent: string;

  beforeAll(async () => {
    const realFs = await vi.importActual<typeof import('fs-extra')>('fs-extra');
    const assetsFolderPath = path.join(__dirname, '..', '..', '..', assetsFolderName);
    const net10CsprojTemplatePath = path.join(assetsFolderPath, 'FunctionProjectTemplate', 'FunctionsProjNet10');
    const net8CsprojTemplatePath = path.join(assetsFolderPath, 'FunctionProjectTemplate', 'FunctionsProjNet8');
    const netFxCsprojTemplatePath = path.join(assetsFolderPath, 'FunctionProjectTemplate', 'FunctionsProjNetFx');

    validNet10CsprojContent = await realFs.readFile(net10CsprojTemplatePath, 'utf8');
    validNet8CsprojContent = await realFs.readFile(net8CsprojTemplatePath, 'utf8');
    validNetFxCsprojContent = await realFs.readFile(netFxCsprojTemplatePath, 'utf8');
    invalidCsprojContent = `
      <Project>
        <TargetFramework>net8</TargetFramework>
        <SomeOtherTag>data</SomeOtherTag>
      </Project>
    `;
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('isCustomCodeFunctionsProject', () => {
    const testFolderPath = path.join('test', 'folder', 'path');
    const testCsprojFile = 'Function.csproj';

    it('should return false if the folder is not a directory', async () => {
      vi.spyOn(fse, 'statSync').mockReturnValue({ isDirectory: () => false } as any);
      const result = await isCustomCodeFunctionsProject(testFolderPath);
      expect(result).toBe(false);
    });

    it('should return false if no .csproj file exists', async () => {
      vi.spyOn(fse, 'statSync').mockReturnValue({ isDirectory: () => true } as any);
      vi.spyOn(fse, 'readdir').mockResolvedValue(['file.txt', 'app.js']);
      const result = await isCustomCodeFunctionsProject(testFolderPath);
      expect(result).toBe(false);
    });

    it('should return true for a valid net8 csproj file', async () => {
      vi.spyOn(fse, 'statSync').mockReturnValue({ isDirectory: () => true } as any);
      vi.spyOn(fse, 'readdir').mockResolvedValue([testCsprojFile]);
      vi.spyOn(fse, 'readFile').mockResolvedValue(validNet8CsprojContent);
      const result = await isCustomCodeFunctionsProject(testFolderPath);
      expect(result).toBe(true);
    });

    it('should return true for a valid net10 csproj file', async () => {
      vi.spyOn(fse, 'statSync').mockReturnValue({ isDirectory: () => true } as any);
      vi.spyOn(fse, 'readdir').mockResolvedValue([testCsprojFile]);
      vi.spyOn(fse, 'readFile').mockResolvedValue(validNet10CsprojContent);
      const result = await isCustomCodeFunctionsProject(testFolderPath);
      expect(result).toBe(true);
    });

    it('should return true for a valid netfx csproj file', async () => {
      vi.spyOn(fse, 'statSync').mockReturnValue({ isDirectory: () => true } as any);
      vi.spyOn(fse, 'readdir').mockResolvedValue([testCsprojFile]);

      vi.spyOn(fse, 'readFile').mockResolvedValue(validNetFxCsprojContent);
      const result = await isCustomCodeFunctionsProject(testFolderPath);
      expect(result).toBe(true);
    });

    it('should return false if the csproj file does not meet criteria', async () => {
      vi.spyOn(fse, 'statSync').mockReturnValue({ isDirectory: () => true } as any);
      vi.spyOn(fse, 'readdir').mockResolvedValue([testCsprojFile]);
      vi.spyOn(fse, 'readFile').mockResolvedValue(invalidCsprojContent);
      const result = await isCustomCodeFunctionsProject(testFolderPath);
      expect(result).toBe(false);
    });
  });

  describe('getCustomCodeFunctionsProjectMetadata', () => {
    const testFunctionName = 'Func';
    const testNamespace = 'MyNS';
    const testFolderPath = path.join('test', 'folder', testFunctionName);
    const testCsprojFile = `${testFunctionName}.csproj`;
    const testCsFile = `${testFunctionName}.cs`;

    beforeEach(() => {
      vi.restoreAllMocks();
      vi.spyOn(fse, 'pathExists').mockResolvedValue(true);
      vi.spyOn(fse, 'statSync').mockReturnValue({ isDirectory: () => true } as any);
      vi.spyOn(ext.outputChannel, 'appendLog').mockImplementation(() => {});
    });

    it('should return undefined if the folder does not exist', async () => {
      vi.spyOn(fse, 'pathExists').mockResolvedValue(false);
      const result = await getCustomCodeFunctionsProjectMetadata(testFolderPath);
      expect(result).toBeUndefined();
    });

    it('should return undefined if the folder is not a directory', async () => {
      vi.spyOn(fse, 'statSync').mockReturnValue({ isDirectory: () => false } as any);
      const result = await getCustomCodeFunctionsProjectMetadata(testFolderPath);
      expect(result).toBeUndefined();
    });

    it('should return undefined if no .cs file exists', async () => {
      vi.spyOn(fse, 'readdir').mockResolvedValue(['file.txt', 'app.js']);
      const result = await getCustomCodeFunctionsProjectMetadata(testFolderPath);
      expect(result).toBeUndefined();
    });

    it('should return undefined if the .cs file does not contain a valid namespace', async () => {
      vi.spyOn(fse, 'readdir').mockResolvedValue([testCsFile]);
      vi.spyOn(fse, 'readFile').mockResolvedValue('invalid content');
      const result = await getCustomCodeFunctionsProjectMetadata(testFolderPath);
      expect(result).toBeUndefined();
    });

    it('should return undefined if no .csproj file exists', async () => {
      vi.spyOn(fse, 'readdir').mockResolvedValue([testCsFile]);
      vi.spyOn(fse, 'readFile').mockResolvedValue(`namespace ${testNamespace} {}`);
      const result = await getCustomCodeFunctionsProjectMetadata(testFolderPath);
      expect(result).toBeUndefined();
    });

    it('should return undefined if the .csproj is not a valid custom code project file', async () => {
      vi.spyOn(fse, 'readdir').mockResolvedValue([testCsFile, testCsprojFile]);
      vi.spyOn(fse, 'readFile').mockImplementation(async (p: string) => {
        if (p.endsWith('.csproj')) {
          return '<Project></Project>';
        }
        return `namespace ${testNamespace} {}`;
      });
      const result = await getCustomCodeFunctionsProjectMetadata(testFolderPath);
      expect(result).toBeUndefined();
    });

    it('should return metadata for a valid net8 csproj file', async () => {
      vi.spyOn(fse, 'readdir').mockResolvedValue([testCsFile, testCsprojFile]);
      vi.spyOn(fse, 'readFile').mockImplementation(async (p: string) => {
        if (p.endsWith('.csproj')) {
          return validNet8CsprojContent;
        }
        return `namespace ${testNamespace} {}`;
      });

      const result = await getCustomCodeFunctionsProjectMetadata(testFolderPath);
      expect(result).toEqual({
        projectPath: testFolderPath,
        functionAppName: testFunctionName,
        logicAppName: 'LogicApp',
        targetFramework: TargetFramework.Net8,
        namespace: testNamespace,
      } as CustomCodeFunctionsProjectMetadata);
    });

    it('should return metadata for a valid net10 csproj file', async () => {
      vi.spyOn(fse, 'readdir').mockResolvedValue([testCsFile, testCsprojFile]);
      vi.spyOn(fse, 'readFile').mockImplementation(async (p: string) => {
        if (p.endsWith('.csproj')) {
          return validNet10CsprojContent;
        }
        return `namespace ${testNamespace} {}`;
      });

      const result = await getCustomCodeFunctionsProjectMetadata(testFolderPath);
      expect(result).toEqual({
        projectPath: testFolderPath,
        functionAppName: testFunctionName,
        logicAppName: 'LogicApp',
        targetFramework: TargetFramework.Net10,
        namespace: testNamespace,
      } as CustomCodeFunctionsProjectMetadata);
    });

    it('should return metadata for a valid netfx csproj file', async () => {
      vi.spyOn(fse, 'readdir').mockResolvedValue([testCsFile, testCsprojFile]);
      vi.spyOn(fse, 'readFile').mockImplementation(async (p: string) => {
        if (p.endsWith('.csproj')) {
          return validNetFxCsprojContent;
        }
        return `namespace ${testNamespace} {}`;
      });

      const result = await getCustomCodeFunctionsProjectMetadata(testFolderPath);
      expect(result).toEqual({
        projectPath: testFolderPath,
        functionAppName: testFunctionName,
        logicAppName: 'LogicApp',
        targetFramework: TargetFramework.NetFx,
        namespace: testNamespace,
      } as CustomCodeFunctionsProjectMetadata);
    });
  });

  describe('isCustomCodeFunctionsProjectInRoot', () => {
    const testWorkspacePath = path.join('test', 'workspace', 'path');

    it('should return undefined if workspaceFolder is undefined', async () => {
      const result = await isCustomCodeFunctionsProjectInRoot(undefined);
      expect(result).toBeUndefined();
    });

    it('should return undefined if the folder does not exist', async () => {
      vi.spyOn(fse, 'pathExists').mockResolvedValue(false);
      const result = await isCustomCodeFunctionsProjectInRoot(testWorkspacePath);
      expect(result).toBeUndefined();
    });

    it('should return true if at least one custom code project is found', async () => {
      const testFuncProject = 'Func1';
      const testFuncProjectCsproj = 'Func1.csproj';
      const testLAProject = 'la1';
      const testWorkspaceSubDirs = [testFuncProject, testLAProject];

      vi.spyOn(fse, 'pathExists').mockResolvedValue(true);
      vi.spyOn(fse, 'readdir').mockImplementation(async (p: string) => {
        if (p === testWorkspacePath) return testWorkspaceSubDirs;
        if (p === path.join(testWorkspacePath, testFuncProject)) return [testFuncProjectCsproj];
        if (p === path.join(testWorkspacePath, testLAProject)) return [hostFileName, localSettingsFileName];
        return [];
      });
      vi.spyOn(fse, 'statSync').mockImplementation((p: string) => {
        if (p === path.join(testWorkspacePath, testFuncProject)) return { isDirectory: () => true };
        if (p === path.join(testWorkspacePath, testLAProject)) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });

      vi.spyOn(fse, 'readFile').mockImplementation(async (p: string) => {
        if (p === path.join(testWorkspacePath, testFuncProject, testFuncProjectCsproj)) return validNet8CsprojContent;
        return '';
      });
      const result = await isCustomCodeFunctionsProjectInRoot(testWorkspacePath);
      expect(result).toBe(true);
    });

    it('should return false if no custom code projects are found', async () => {
      const testLAProject = 'la1';
      const testWorkspaceSubDirs = [testLAProject];

      vi.spyOn(fse, 'pathExists').mockResolvedValue(true);
      vi.spyOn(fse, 'readdir').mockImplementation(async (p: string) => {
        if (p === testWorkspacePath) return testWorkspaceSubDirs;
        if (p === path.join(testWorkspacePath, testLAProject)) return [hostFileName];
        return [];
      });
      vi.spyOn(fse, 'statSync').mockImplementation((p: string) => {
        if (p === path.join(testWorkspacePath, testLAProject)) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });
      const result = await isCustomCodeFunctionsProjectInRoot(testWorkspacePath);
      expect(result).toBe(false);
    });
  });

  describe('tryGetCustomCodeFunctionsProjects', () => {
    const testWorkspacePath = path.join('test', 'workspace', 'path');

    it('should return undefined if workspaceFolder is undefined', async () => {
      const result = await tryGetCustomCodeFunctionsProjects(undefined);
      expect(result).toBeUndefined();
    });

    it('should return undefined if the folder does not exist', async () => {
      vi.spyOn(fse, 'pathExists').mockResolvedValue(false);
      const result = await tryGetCustomCodeFunctionsProjects(testWorkspacePath);
      expect(result).toBeUndefined();
    });

    it('should return an array of valid custom code project paths', async () => {
      const testFuncProject = 'Func1';
      const testFuncProjectCsproj = 'Func1.csproj';
      const testLAProject = 'la1';
      const testWorkspaceSubDirs = [testFuncProject, testLAProject];

      vi.spyOn(fse, 'pathExists').mockResolvedValue(true);
      vi.spyOn(fse, 'readdir').mockImplementation(async (p: string) => {
        if (p === testWorkspacePath) return testWorkspaceSubDirs;
        if (p === path.join(testWorkspacePath, testFuncProject)) return [testFuncProjectCsproj];
        if (p === path.join(testWorkspacePath, testLAProject)) return [hostFileName];
        return [];
      });
      vi.spyOn(fse, 'statSync').mockImplementation((p: string) => {
        if (p === path.join(testWorkspacePath, testFuncProject)) return { isDirectory: () => true };
        if (p === path.join(testWorkspacePath, testLAProject)) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });
      vi.spyOn(fse, 'readFile').mockImplementation(async (p: string) => {
        if (p === path.join(testWorkspacePath, testFuncProject, testFuncProjectCsproj)) return validNet8CsprojContent;
        return '';
      });

      const result = await tryGetCustomCodeFunctionsProjects(testWorkspacePath);
      expect(result).toEqual([path.join(testWorkspacePath, testFuncProject)]);
    });

    it('should return an empty array if no projects are found', async () => {
      const testLAProject = 'la1';
      const testWorkspaceSubDirs = [testLAProject];

      vi.spyOn(fse, 'pathExists').mockResolvedValue(true);
      vi.spyOn(fse, 'readdir').mockImplementation(async (p: string) => {
        if (p === testWorkspacePath) return testWorkspaceSubDirs;
        if (p === path.join(testWorkspacePath, testLAProject)) return [hostFileName];
        return [];
      });
      vi.spyOn(fse, 'statSync').mockImplementation((p: string) => {
        if (p === path.join(testWorkspacePath, testLAProject)) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });

      const result = await tryGetCustomCodeFunctionsProjects(testWorkspacePath);
      expect(result).toEqual([]);
    });
  });

  describe('tryGetLogicAppCustomCodeFunctionsProjects', () => {
    const testLogicAppFolder = path.join('test', 'LogicApp');
    const testBaseFolder = path.dirname(testLogicAppFolder);
    const testPeerProject = 'PeerProject';
    const testPeerProjectCsproj = 'PeerProject.csproj';

    it('should return undefined if target folder is undefined', async () => {
      const result = await tryGetLogicAppCustomCodeFunctionsProjects(undefined);
      expect(result).toBeUndefined();
    });

    it('should return undefined if target folder is not a valid logic app project', async () => {
      const result = await tryGetLogicAppCustomCodeFunctionsProjects(testLogicAppFolder);
      expect(result).toBeUndefined();
    });

    it('should return an empty array if no custom code projects are found', async () => {
      vi.spyOn(verifyProjectUtils, 'isLogicAppProject').mockResolvedValue(true);
      vi.spyOn(fse, 'readdir').mockResolvedValue([]);
      const result = await tryGetLogicAppCustomCodeFunctionsProjects(testLogicAppFolder);
      expect(result).toEqual([]);
    });

    it('should return an array of paths for a valid logic app with custom code project folders', async () => {
      vi.spyOn(verifyProjectUtils, 'isLogicAppProject').mockResolvedValue(true);
      vi.spyOn(fse, 'readdir').mockResolvedValue([testPeerProject]);
      vi.spyOn(fse, 'readdir').mockImplementation(async (p: string) => {
        if (p === path.dirname(testLogicAppFolder)) return [testPeerProject];
        if (p === path.join(testBaseFolder, testPeerProject)) return [testPeerProjectCsproj];
        return [];
      });
      vi.spyOn(fse, 'statSync').mockImplementation((p: string) => {
        if (p === path.join(testBaseFolder, testPeerProject)) return { isDirectory: () => true };
        return { isDirectory: () => false };
      });
      vi.spyOn(fse, 'readFile').mockImplementation(async (p: string) => {
        if (p === path.join(testBaseFolder, testPeerProject, testPeerProjectCsproj)) return validNet8CsprojContent;
        return '';
      });

      const result = await tryGetLogicAppCustomCodeFunctionsProjects(testLogicAppFolder);
      expect(result).toEqual([path.join(testBaseFolder, testPeerProject)]);
    });
  });
});
