import * as fse from 'fs-extra';
import * as path from 'path';
import * as verifyProjectUtils from '../verifyIsProject';
import * as workspaceUtils from '../workspace';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CustomCodeFunctionsProjectMetadata,
  getCustomCodeFunctionsProjectMetadata,
  getCustomCodeFunctionsProjects,
  isCustomCodeFunctionsProject,
  isCustomCodeFunctionsProjectInRoot,
  tryGetCustomCodeFunctionsProjects,
  tryGetLogicAppCustomCodeFunctionsProjects,
} from '../customCodeUtils';
import { TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import { ext } from '../../../extensionVariables';

vi.mock('fs-extra', () => ({
  statSync: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
  pathExists: vi.fn(),
}));

vi.mock('verifyProjectUtils', () => ({
  isLogicAppProject: vi.fn(),
}));

vi.mock('workspaceUtils', () => ({
  getWorkspaceRoot: vi.fn(),
}));

vi.mock('../../../extensionVariables', () => ({
  ext: {
    outputChannel: {
      appendLog: vi.fn(),
    },
  },
}));

describe('customCodeUtils', () => {
  const validNet8CsprojContent = `
        <Project Sdk="Microsoft.NET.Sdk">
            <PropertyGroup>
                <IsPackable>false</IsPackable>
                <TargetFramework>net8</TargetFramework>
                <AzureFunctionsVersion>v4</AzureFunctionsVersion>
                <OutputType>Library</OutputType>
                <PlatformTarget>AnyCPU</PlatformTarget>
                <LogicAppFolderToPublish>$(MSBuildProjectDirectory)\\..\\LogicApp</LogicAppFolderToPublish>
                <CopyToOutputDirectory>Always</CopyToOutputDirectory>
                <SelfContained>false</SelfContained>
            </PropertyGroup>
            
            <ItemGroup>
                <PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Abstractions" Version="1.3.0" />
                <PackageReference Include="Microsoft.Azure.Functions.Worker.Sdk" Version="1.15.1" />
                <PackageReference Include="Microsoft.Azure.Workflows.Webjobs.Sdk" Version="1.2.0" />
                <PackageReference Include="Microsoft.Extensions.Logging.Abstractions" Version="6.0.0" />
                <PackageReference Include="Microsoft.Extensions.Logging" Version="6.0.0" />
            </ItemGroup>
            
            <Target Name="TriggerPublishOnBuild" AfterTargets="Build">
                <CallTarget Targets="Publish" />
            </Target>
        </Project>
    `;

  const validNetFxCsprojContent = `
        <Project Sdk="Microsoft.NET.Sdk">
            <PropertyGroup>
                <IsPackable>false</IsPackable>
                <TargetFramework>net472</TargetFramework>
                <AzureFunctionsVersion>v4</AzureFunctionsVersion>
                <OutputType>Library</OutputType>
                <PlatformTarget>x64</PlatformTarget>
                <LogicAppFolder>LogicApp</LogicAppFolder>
                <CopyToOutputDirectory>Always</CopyToOutputDirectory>
            </PropertyGroup>

            <ItemGroup>
                <PackageReference Include="Microsoft.Azure.WebJobs.Core" Version="3.0.39" />
                <PackageReference Include="Microsoft.Azure.Workflows.WebJobs.Sdk" Version="1.1.0" />
                <PackageReference Include="Microsoft.NET.Sdk.Functions" Version="4.2.0" />
                <PackageReference Include="Microsoft.Extensions.Logging.Abstractions" Version="2.1.1" />
                <PackageReference Include="Microsoft.Extensions.Logging" Version="2.1.1" />
            </ItemGroup>

            <Target Name="Task" AfterTargets="Compile">
                <ItemGroup>
                    <DirsToClean2 Include="..\\$(LogicAppFolder)\\lib\\custom" />
                </ItemGroup>
                <RemoveDir Directories="@(DirsToClean2)" />
            </Target>
            
            <Target Name="CopyExtensionFiles" AfterTargets="ParameterizedFunctionJsonGenerator">
                <ItemGroup>
                    <CopyFiles Include="$(MSBuildProjectDirectory)\\bin\\$(Configuration)\\net472\\**\\*.*" CopyToOutputDirectory="PreserveNewest" Exclude="$(MSBuildProjectDirectory)\\bin\\$(Configuration)\\net472\\*.*" />
                <CopyFiles2 Include="$(MSBuildProjectDirectory)\\bin\\$(Configuration)\\net472\\*.*" />
                </ItemGroup>
                <Copy SourceFiles="@(CopyFiles)" DestinationFolder="..\\$(LogicAppFolder)\\lib\\custom\\%(RecursiveDir)" SkipUnchangedFiles="true" />
                <Copy SourceFiles="@(CopyFiles2)" DestinationFolder="..\\$(LogicAppFolder)\\lib\\custom\\net472\\" SkipUnchangedFiles="true" />
                <ItemGroup>
                    <MoveFiles Include="..\\$(LogicAppFolder)\\lib\\custom\\bin\\*.*" />
                </ItemGroup>

            <Move SourceFiles="@(MoveFiles)" DestinationFolder="..\\$(LogicAppFolder)\\lib\\custom\\net472" />
                <ItemGroup>
                <DirsToClean Include="..\\$(LogicAppFolder)\\lib\\custom\\bin" />
                </ItemGroup>
                <RemoveDir Directories="@(DirsToClean)" />
            </Target>
            
            <ItemGroup>
                <Reference Include="Microsoft.CSharp" />
            </ItemGroup>
            <ItemGroup>
                <Folder Include="bin\\$(Configuration)\\net472\\" />
            </ItemGroup>
        </Project>
    `;

  const invalidCsprojContent = `
        <Project>
            <TargetFramework>net8</TargetFramework>
            <SomeOtherTag>data</SomeOtherTag>
        </Project>
    `;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCustomCodeFunctionsProjects', () => {
    const testContext: any = {};
    const testWorkspaceRoot = path.join('test', 'workspace');

    beforeEach(() => {
      vi.restoreAllMocks();
      vi.spyOn(workspaceUtils, 'getWorkspaceRoot').mockResolvedValue(testWorkspaceRoot);
    });

    it('should return an empty array if workspace root is undefined', async () => {
      vi.spyOn(workspaceUtils, 'getWorkspaceRoot').mockResolvedValue(undefined);
      const result = await getCustomCodeFunctionsProjects(testContext);
      expect(result).toEqual([]);
    });

    it('should return custom code project paths for valid projects', async () => {
      const subpaths = ['proj1', 'proj2', 'nonProject'];
      const proj1Path = path.join(testWorkspaceRoot, 'proj1');
      const proj2Path = path.join(testWorkspaceRoot, 'proj2');
      const nonProjectPath = path.join(testWorkspaceRoot, 'nonProject');
      const proj1Csproj = 'proj1.csproj';
      const proj2Csproj = 'proj2.csproj';
      const nonProjectFile = 'nonProject.txt';

      vi.spyOn(fse, 'statSync').mockReturnValue({ isDirectory: () => true } as any);
      vi.spyOn(fse, 'readdir').mockImplementation(async (p: string) => {
        if (p === testWorkspaceRoot) return subpaths;
        if (p === proj1Path) return [proj1Csproj];
        if (p === proj2Path) return [proj2Csproj];
        if (p === nonProjectPath) return [nonProjectFile];
        return [];
      });
      vi.spyOn(fse, 'readFile').mockImplementation(async (p: string) => {
        if (p === path.join(proj1Path, proj1Csproj)) return validNet8CsprojContent;
        if (p === path.join(proj2Path, proj2Csproj)) return validNetFxCsprojContent;
        return '';
      });

      const result = await getCustomCodeFunctionsProjects(testContext);
      expect(result).toEqual([path.join(testWorkspaceRoot, 'proj1'), path.join(testWorkspaceRoot, 'proj2')]);
    });

    it('should return an empty array if no valid projects are found', async () => {
      const subpaths = ['nonProject1', 'nonProject2'];
      const nonProject1Path = path.join(testWorkspaceRoot, 'nonProject1');
      const nonProject2Path = path.join(testWorkspaceRoot, 'nonProject2');
      const nonProject1File = 'nonProject1.txt';
      const nonProject2File = 'nonProject2.csproj';

      vi.spyOn(fse, 'statSync').mockReturnValue({ isDirectory: () => true } as any);
      vi.spyOn(fse, 'readdir').mockImplementation(async (p: string) => {
        if (p === testWorkspaceRoot) return subpaths;
        if (p === nonProject1Path) return [nonProject1File];
        if (p === nonProject2Path) return [nonProject2File];
        return [];
      });
      vi.spyOn(fse, 'readFile').mockImplementation(async (p: string) => {
        if (p === path.join(nonProject1Path, nonProject1File)) return 'invalid content';
        if (p === path.join(nonProject2Path, nonProject2File)) return '<Project></Project>';
        return '';
      });

      const result = await getCustomCodeFunctionsProjects(testContext);
      expect(result).toEqual([]);
    });
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
        if (p === path.join(testWorkspacePath, testLAProject)) return ['host.json', 'local.settings.json'];
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
        if (p === path.join(testWorkspacePath, testLAProject)) return ['host.json'];
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
        if (p === path.join(testWorkspacePath, testLAProject)) return ['host.json'];
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
        if (p === path.join(testWorkspacePath, testLAProject)) return ['host.json'];
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

    it('should return an empty array if no sibling projects are found', async () => {
      vi.spyOn(verifyProjectUtils, 'isLogicAppProject').mockResolvedValue(true);
      vi.spyOn(fse, 'readdir').mockResolvedValue([]);
      const result = await tryGetLogicAppCustomCodeFunctionsProjects(testLogicAppFolder);
      expect(result).toEqual([]);
    });

    it('should return an array of paths for a valid logic app with sibling custom code project folders', async () => {
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
