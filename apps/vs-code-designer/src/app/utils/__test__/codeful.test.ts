import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lspDirectory } from '../../../constants';
import { invalidateCodefulSdkCacheIfNeeded, parseCsprojCopyToCodefulInfo } from '../codeful';

const mocks = vi.hoisted(() => ({
  ensureDir: vi.fn(),
  getGlobalSetting: vi.fn(),
  pathExists: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
  remove: vi.fn(),
  statSync: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('fs-extra', () => ({
  ensureDir: mocks.ensureDir,
  pathExists: mocks.pathExists,
  readdir: mocks.readdir,
  readFile: mocks.readFile,
  remove: mocks.remove,
  statSync: mocks.statSync,
  writeFile: mocks.writeFile,
}));

vi.mock('../vsCodeConfig/settings', () => ({
  getGlobalSetting: mocks.getGlobalSetting,
}));

vi.mock('../../../extensionVariables', () => ({
  ext: {
    outputChannel: {
      appendLog: vi.fn(),
    },
  },
}));

describe('invalidateCodefulSdkCacheIfNeeded', () => {
  const projectPath = 'D:\\workspace\\CodefulLogicApp';
  const runtimeDependenciesPath = 'D:\\runtime-dependencies';
  const lspDirectoryPath = path.join(runtimeDependenciesPath, lspDirectory);
  const csprojPath = path.join(projectPath, 'CodefulLogicApp.csproj');
  const nugetConfigPath = path.join(projectPath, 'nuget.config');
  const installedSdkHashMarkerPath = path.join(runtimeDependenciesPath, '.lspsdk-hash');
  const projectSdkHashMarkerPath = path.join(projectPath, '.nuget', '.logicapps-lspsdk-hash');
  const projectSdkPackagePath = path.join(projectPath, '.nuget', 'packages', 'microsoft.azure.workflows.sdk', '1.0.0-preview.1');
  const projectAssetsPath = path.join(projectPath, 'obj', 'project.assets.json');
  const projectNugetCachePath = path.join(projectPath, 'obj', 'project.nuget.cache');
  const currentSdkHash = 'current-sdk-hash';
  const csprojContent = `
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.Azure.Workflows.Sdk" Version="1.0.0-preview.1" />
  </ItemGroup>
</Project>`;
  const codefulNugetConfig = `
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <config>
    <add key="globalPackagesFolder" value=".nuget\\packages" />
  </config>
  <packageSources>
    <add key="current" value="${lspDirectoryPath}" />
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
  </packageSources>
</configuration>`;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getGlobalSetting.mockReturnValue(runtimeDependenciesPath);
    mocks.ensureDir.mockResolvedValue(undefined);
    mocks.remove.mockResolvedValue(undefined);
    mocks.writeFile.mockResolvedValue(undefined);
    mocks.readdir.mockResolvedValue(['CodefulLogicApp.csproj']);
    mocks.statSync.mockReturnValue({ isDirectory: () => true });
    setExistingPaths([
      csprojPath,
      nugetConfigPath,
      installedSdkHashMarkerPath,
      projectSdkPackagePath,
      projectAssetsPath,
      projectNugetCachePath,
    ]);
    mocks.readFile.mockImplementation(async (filePath: string) => {
      if (filePath === csprojPath) {
        return csprojContent;
      }
      if (filePath === nugetConfigPath) {
        return codefulNugetConfig;
      }
      if (filePath === installedSdkHashMarkerPath) {
        return currentSdkHash;
      }
      return '';
    });
  });

  function setExistingPaths(paths: string[]): void {
    const existingPaths = new Set(paths);
    mocks.pathExists.mockImplementation(async (filePath: string) => existingPaths.has(filePath));
  }

  it('removes only the stale project-local SDK package when the installed VSIX SDK hash changes', async () => {
    const invalidated = await invalidateCodefulSdkCacheIfNeeded(projectPath);

    expect(invalidated).toBe(true);
    expect(mocks.remove).toHaveBeenCalledWith(projectSdkPackagePath);
    expect(mocks.remove).toHaveBeenCalledWith(projectAssetsPath);
    expect(mocks.remove).toHaveBeenCalledWith(projectNugetCachePath);
    expect(mocks.ensureDir).toHaveBeenCalledWith(path.join(projectPath, '.nuget'));
    expect(mocks.writeFile).toHaveBeenCalledWith(projectSdkHashMarkerPath, currentSdkHash);
  });

  it('keeps the project cache when its marker already matches the installed SDK hash', async () => {
    setExistingPaths([csprojPath, nugetConfigPath, installedSdkHashMarkerPath, projectSdkHashMarkerPath, projectSdkPackagePath]);
    mocks.readFile.mockImplementation(async (filePath: string) => {
      if (filePath === csprojPath) {
        return csprojContent;
      }
      if (filePath === nugetConfigPath) {
        return codefulNugetConfig;
      }
      if (filePath === installedSdkHashMarkerPath || filePath === projectSdkHashMarkerPath) {
        return currentSdkHash;
      }
      return '';
    });

    const invalidated = await invalidateCodefulSdkCacheIfNeeded(projectPath);

    expect(invalidated).toBe(false);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.writeFile).not.toHaveBeenCalled();
  });

  it('does not touch caches for projects that do not use the extension local SDK source and project-local packages folder', async () => {
    mocks.readFile.mockImplementation(async (filePath: string) => {
      if (filePath === csprojPath) {
        return csprojContent;
      }
      if (filePath === nugetConfigPath) {
        return codefulNugetConfig.replace(lspDirectoryPath, 'https://api.nuget.org/v3/index.json');
      }
      if (filePath === installedSdkHashMarkerPath) {
        return currentSdkHash;
      }
      return '';
    });

    const invalidated = await invalidateCodefulSdkCacheIfNeeded(projectPath);

    expect(invalidated).toBe(false);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.writeFile).not.toHaveBeenCalled();
  });
});

describe('parseCsprojCopyToCodefulInfo', () => {
  it('detects modern codeful targets that run on Build and Publish', () => {
    const info = parseCsprojCopyToCodefulInfo(`
<Project Sdk="Microsoft.NET.Sdk">
  <Target Name="CopyToCodefulFolder" AfterTargets="Build;Publish" />
  <Target Name="ReplaceLanguageNetCore" AfterTargets="Build;Publish" />
</Project>`);

    expect(info).toEqual({
      copyAfterTargets: 'Build;Publish',
      replaceLangAfterTargets: 'Build;Publish',
      runsOnBuild: true,
    });
  });

  it('keeps legacy Publish-only targets from being treated as Build hooks', () => {
    const info = parseCsprojCopyToCodefulInfo(`
<Project Sdk="Microsoft.NET.Sdk">
  <Target Name="CopyToCodefulFolder" AfterTargets="Publish" />
  <Target Name="ReplaceLanguageNetCore" AfterTargets="Publish" />
</Project>`);

    expect(info).toEqual({
      copyAfterTargets: 'Publish',
      replaceLangAfterTargets: 'Publish',
      runsOnBuild: false,
    });
  });

  it('ignores commented-out targets when reading project files', () => {
    const info = parseCsprojCopyToCodefulInfo(`
<Project Sdk="Microsoft.NET.Sdk">
  <!-- <Target Name="CopyToCodefulFolder" AfterTargets="Build;Publish" /> -->
  <Target Name="CopyToCodefulFolder" AfterTargets="Publish" />
  <Target Name="ReplaceLanguageNetCore" AfterTargets="Build;Publish" />
</Project>`);

    expect(info).toEqual({
      copyAfterTargets: 'Publish',
      replaceLangAfterTargets: 'Build;Publish',
      runsOnBuild: false,
    });
  });
});
