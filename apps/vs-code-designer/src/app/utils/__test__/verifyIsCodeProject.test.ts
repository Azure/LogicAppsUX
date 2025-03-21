import * as fse from 'fs-extra';
import * as path from 'path';
import * as verifyProjectUtils from '../verifyIsProject';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isCustomCodeFunctionsProject,
  isCustomCodeFunctionsProjectInRoot,
  tryGetCustomCodeFunctionsProjects,
  tryGetPeerCustomCodeFunctionsProjects,
} from '../verifyIsCodeProject';

vi.mock('fs-extra', () => ({
  statSync: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
  pathExists: vi.fn(),
}));

vi.mock('verifyProjectUtils', () => ({
  isLogicAppProject: vi.fn(),
}));

describe('verifyIsCodeProject', () => {
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

  describe('tryGetPeerCustomCodeFunctionsProjects', () => {
    const testLogicAppFolder = path.join('test', 'LogicApp');
    const testBaseFolder = path.dirname(testLogicAppFolder);
    const testPeerProject = 'PeerProject';
    const testPeerProjectCsproj = 'PeerProject.csproj';

    it('should return undefined if target folder is undefined', async () => {
      const result = await tryGetPeerCustomCodeFunctionsProjects(undefined);
      expect(result).toBeUndefined();
    });

    it('should return undefined if target folder is not a valid logic app project', async () => {
      const result = await tryGetPeerCustomCodeFunctionsProjects(testLogicAppFolder);
      expect(result).toBeUndefined();
    });

    it('should return an empty array if no sibling projects are found', async () => {
      vi.spyOn(verifyProjectUtils, 'isLogicAppProject').mockResolvedValue(true);
      vi.spyOn(fse, 'readdir').mockResolvedValue([]);
      const result = await tryGetPeerCustomCodeFunctionsProjects(testLogicAppFolder);
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

      const result = await tryGetPeerCustomCodeFunctionsProjects(testLogicAppFolder);
      expect(result).toEqual([path.join(testBaseFolder, testPeerProject)]);
    });
  });
});
