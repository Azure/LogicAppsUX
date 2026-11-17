import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CodefulSdk } from '../../../constants';
import { resolveSdkFromProject } from '../sdkResolution';

const mocks = vi.hoisted(() => ({
  appendLog: vi.fn(),
  executeCommand: vi.fn(),
  getDotNetCommand: vi.fn(),
  pathExists: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock('fs-extra', () => ({
  pathExists: mocks.pathExists,
  readdir: mocks.readdir,
  readFile: mocks.readFile,
}));

vi.mock('../dotnet/dotnet', () => ({
  getDotNetCommand: mocks.getDotNetCommand,
}));

vi.mock('../funcCoreTools/cpUtils', () => ({
  executeCommand: mocks.executeCommand,
}));

vi.mock('../../../extensionVariables', () => ({
  ext: {
    outputChannel: { appendLog: mocks.appendLog },
  },
}));

const projectPath = 'D:\\workspace\\MyLogicApp';
const csprojFileName = 'MyLogicApp.csproj';
const sdkVersion = '1.0.0-preview.3';
const nugetCacheRoot = 'C:\\Users\\user\\.nuget\\packages';
const sdkPackageIdLower = CodefulSdk.WorkflowsSDK.toLowerCase();
const globalNupkgPath = path.join(nugetCacheRoot, sdkPackageIdLower, sdkVersion, `${sdkPackageIdLower}.${sdkVersion}.nupkg`);

function makeCsproj(packageReference: string, properties = ''): string {
  return `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    ${properties}
  </PropertyGroup>
  <ItemGroup>
    ${packageReference}
  </ItemGroup>
</Project>`;
}

function setExistingPaths(paths: string[]): void {
  const existingPaths = new Set(paths);
  mocks.pathExists.mockImplementation(async (filePath: string) => existingPaths.has(filePath));
}

describe('resolveSdkFromProject', () => {
  const originalNugetPackages = process.env.NUGET_PACKAGES;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDotNetCommand.mockReturnValue('dotnet');
    mocks.readdir.mockResolvedValue([csprojFileName]);
    mocks.readFile.mockResolvedValue(
      makeCsproj(`<PackageReference Include="${CodefulSdk.WorkflowsSDK}" Version="${sdkVersion}" />`)
    );
    mocks.executeCommand.mockResolvedValue(`global-packages: ${nugetCacheRoot}\n`);
    setExistingPaths([nugetCacheRoot, globalNupkgPath]);
  });

  afterEach(() => {
    if (originalNugetPackages === undefined) {
      delete process.env.NUGET_PACKAGES;
    } else {
      process.env.NUGET_PACKAGES = originalNugetPackages;
    }
  });

  it('resolves the referenced SDK from the global NuGet cache', async () => {
    await expect(resolveSdkFromProject(projectPath)).resolves.toEqual({
      sdkNupkgPath: globalNupkgPath,
      version: sdkVersion,
    });
  });

  it('uses the configured dotnet binary to query the package cache', async () => {
    mocks.getDotNetCommand.mockReturnValue('D:\\dependencies\\DotNetSDK\\dotnet.exe');

    await resolveSdkFromProject(projectPath);

    expect(mocks.executeCommand).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
      'D:\\dependencies\\DotNetSDK\\dotnet.exe',
      'nuget',
      'locals',
      'global-packages',
      '--list'
    );
  });

  it('matches the SDK package ID case-insensitively', async () => {
    mocks.readFile.mockResolvedValue(
      makeCsproj(`<PackageReference Include="${CodefulSdk.WorkflowsSDK.toLowerCase()}" Version="${sdkVersion}" />`)
    );

    await expect(resolveSdkFromProject(projectPath)).resolves.toEqual({
      sdkNupkgPath: globalNupkgPath,
      version: sdkVersion,
    });
  });

  it('reads the version from a child element', async () => {
    mocks.readFile.mockResolvedValue(
      makeCsproj(`<PackageReference Include="${CodefulSdk.WorkflowsSDK}"><Version>${sdkVersion}</Version></PackageReference>`)
    );

    await expect(resolveSdkFromProject(projectPath)).resolves.toEqual({
      sdkNupkgPath: globalNupkgPath,
      version: sdkVersion,
    });
  });

  it('prefers VersionOverride when present', async () => {
    mocks.readFile.mockResolvedValue(
      makeCsproj(
        `<PackageReference Include="${CodefulSdk.WorkflowsSDK}" Version="1.0.0-preview.1" VersionOverride="${sdkVersion}" />`
      )
    );

    await expect(resolveSdkFromProject(projectPath)).resolves.toEqual({
      sdkNupkgPath: globalNupkgPath,
      version: sdkVersion,
    });
  });

  it('resolves a version backed by a project property', async () => {
    mocks.readFile.mockResolvedValue(
      makeCsproj(
        `<PackageReference Include="${CodefulSdk.WorkflowsSDK}" Version="$(LogicAppsSdkVersion)" />`,
        `<LogicAppsSdkVersion>${sdkVersion}</LogicAppsSdkVersion>`
      )
    );

    await expect(resolveSdkFromProject(projectPath)).resolves.toEqual({
      sdkNupkgPath: globalNupkgPath,
      version: sdkVersion,
    });
  });

  it('returns undefined when a version property cannot be resolved', async () => {
    mocks.readFile.mockResolvedValue(
      makeCsproj(`<PackageReference Include="${CodefulSdk.WorkflowsSDK}" Version="$(LogicAppsSdkVersion)" />`)
    );

    await expect(resolveSdkFromProject(projectPath)).resolves.toBeUndefined();
    expect(mocks.appendLog).toHaveBeenCalledWith(expect.stringContaining('could not be resolved'));
  });

  it('returns undefined when the project has no SDK reference', async () => {
    mocks.readFile.mockResolvedValue(makeCsproj('<PackageReference Include="Newtonsoft.Json" Version="13.0.3" />'));

    await expect(resolveSdkFromProject(projectPath)).resolves.toBeUndefined();
    expect(mocks.appendLog).toHaveBeenCalledWith(expect.stringContaining('No resolvable'));
  });

  it('returns undefined for an MSBuild item version reference', async () => {
    mocks.readFile.mockResolvedValue(
      makeCsproj(`<PackageReference Include="${CodefulSdk.WorkflowsSDK}" Version="@(LogicAppsSdkVersion)" />`)
    );

    await expect(resolveSdkFromProject(projectPath)).resolves.toBeUndefined();
  });

  it('falls back to the project-local NuGet cache', async () => {
    const localNupkgPath = path.join(
      projectPath,
      '.nuget',
      'packages',
      sdkPackageIdLower,
      sdkVersion,
      `${sdkPackageIdLower}.${sdkVersion}.nupkg`
    );
    setExistingPaths([nugetCacheRoot, localNupkgPath]);

    await expect(resolveSdkFromProject(projectPath)).resolves.toEqual({
      sdkNupkgPath: localNupkgPath,
      version: sdkVersion,
    });
  });

  it('falls back to NUGET_PACKAGES when the dotnet query fails', async () => {
    const fallbackRoot = 'D:\\custom-nuget-cache';
    const fallbackNupkgPath = path.join(fallbackRoot, sdkPackageIdLower, sdkVersion, `${sdkPackageIdLower}.${sdkVersion}.nupkg`);
    process.env.NUGET_PACKAGES = fallbackRoot;
    mocks.executeCommand.mockRejectedValue(new Error('dotnet unavailable'));
    setExistingPaths([fallbackRoot, fallbackNupkgPath]);

    await expect(resolveSdkFromProject(projectPath)).resolves.toEqual({
      sdkNupkgPath: fallbackNupkgPath,
      version: sdkVersion,
    });
  });

  it('returns undefined when the referenced package has not been restored', async () => {
    setExistingPaths([nugetCacheRoot]);

    await expect(resolveSdkFromProject(projectPath)).resolves.toBeUndefined();
    expect(mocks.appendLog).toHaveBeenCalledWith(expect.stringContaining('dotnet restore'));
  });
});
