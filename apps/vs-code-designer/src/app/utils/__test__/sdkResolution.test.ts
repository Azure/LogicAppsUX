import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveSdkFromProject } from '../sdkResolution';
import path from 'path';

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
const csprojFilePath = path.join(projectPath, csprojFileName);
const sdkVersion = '1.0.0-preview.2';
const nugetCacheRoot = 'C:\\Users\\user\\.nuget\\packages';
const expectedNupkgPath = path.join(
  nugetCacheRoot,
  'microsoft.azure.workflows.sdk',
  sdkVersion,
  `microsoft.azure.workflows.sdk.${sdkVersion}.nupkg`
);

function makeCsproj(packageRefs: string): string {
  return `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    ${packageRefs}
  </ItemGroup>
</Project>`;
}

function setExistingPaths(paths: string[]): void {
  const existingPaths = new Set(paths);
  mocks.pathExists.mockImplementation(async (p: string) => existingPaths.has(p));
}

describe('resolveSdkFromProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDotNetCommand.mockReturnValue('dotnet');
    mocks.readdir.mockResolvedValue([csprojFileName]);
    mocks.readFile.mockResolvedValue(
      makeCsproj(`<PackageReference Include="Microsoft.Azure.Workflows.Sdk" Version="${sdkVersion}" />`)
    );
    mocks.executeCommand.mockResolvedValue(`global-packages: ${nugetCacheRoot}\n`);
    setExistingPaths([expectedNupkgPath, nugetCacheRoot]);
  });

  // --- Happy path ---

  it('resolves SDK from the global NuGet cache', async () => {
    const result = await resolveSdkFromProject(projectPath);

    expect(result).toEqual({ sdkNupkgPath: expectedNupkgPath, version: sdkVersion });
    expect(mocks.executeCommand).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
      'dotnet',
      'nuget',
      'locals',
      'global-packages',
      '--list'
    );
  });

  it('uses the configured dotnet binary path', async () => {
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

  // --- .csproj discovery ---

  it('returns undefined when project folder has no .csproj file', async () => {
    mocks.readdir.mockResolvedValue(['Program.cs', 'host.json']);

    const result = await resolveSdkFromProject(projectPath);

    expect(result).toBeUndefined();
    expect(mocks.appendLog).toHaveBeenCalledWith(expect.stringContaining('No .csproj file found'));
  });

  it('returns undefined when readdir throws (missing folder)', async () => {
    mocks.readdir.mockRejectedValue(new Error('ENOENT'));

    const result = await resolveSdkFromProject(projectPath);

    expect(result).toBeUndefined();
  });

  it('picks the first .csproj when multiple exist', async () => {
    const otherVersion = '1.0.0-preview.1';
    const otherNupkgPath = path.join(
      nugetCacheRoot,
      'microsoft.azure.workflows.sdk',
      otherVersion,
      `microsoft.azure.workflows.sdk.${otherVersion}.nupkg`
    );
    mocks.readdir.mockResolvedValue(['Other.csproj', 'MyLogicApp.csproj']);
    mocks.readFile.mockImplementation(async (filePath: string) => {
      if (filePath === path.join(projectPath, 'Other.csproj')) {
        return makeCsproj(`<PackageReference Include="Microsoft.Azure.Workflows.Sdk" Version="${otherVersion}" />`);
      }
      return makeCsproj(`<PackageReference Include="Microsoft.Azure.Workflows.Sdk" Version="${sdkVersion}" />`);
    });
    setExistingPaths([nugetCacheRoot, otherNupkgPath]);

    const result = await resolveSdkFromProject(projectPath);

    // Should use the first .csproj found (Other.csproj)
    expect(result?.version).toBe(otherVersion);
  });

  // --- .csproj parsing ---

  it('returns undefined when .csproj has no SDK PackageReference', async () => {
    mocks.readFile.mockResolvedValue(
      makeCsproj(`<PackageReference Include="Newtonsoft.Json" Version="13.0.3" />`)
    );

    const result = await resolveSdkFromProject(projectPath);

    expect(result).toBeUndefined();
    expect(mocks.appendLog).toHaveBeenCalledWith(expect.stringContaining('No Microsoft.Azure.Workflows.Sdk PackageReference'));
  });

  it('matches SDK PackageReference case-insensitively', async () => {
    mocks.readFile.mockResolvedValue(
      makeCsproj(`<PackageReference Include="microsoft.azure.workflows.sdk" Version="${sdkVersion}" />`)
    );

    const result = await resolveSdkFromProject(projectPath);

    expect(result).toEqual({ sdkNupkgPath: expectedNupkgPath, version: sdkVersion });
  });

  it('returns undefined when version is an MSBuild variable', async () => {
    mocks.readFile.mockResolvedValue(
      makeCsproj(`<PackageReference Include="Microsoft.Azure.Workflows.Sdk" Version="$(SdkVersion)" />`)
    );

    const result = await resolveSdkFromProject(projectPath);

    expect(result).toBeUndefined();
    expect(mocks.appendLog).toHaveBeenCalledWith(expect.stringContaining('MSBuild variable'));
  });

  it('returns undefined when version is an MSBuild item reference', async () => {
    mocks.readFile.mockResolvedValue(
      makeCsproj(`<PackageReference Include="Microsoft.Azure.Workflows.Sdk" Version="@(SdkVersion)" />`)
    );

    const result = await resolveSdkFromProject(projectPath);

    expect(result).toBeUndefined();
  });

  it('returns undefined when Version attribute is empty', async () => {
    mocks.readFile.mockResolvedValue(
      makeCsproj(`<PackageReference Include="Microsoft.Azure.Workflows.Sdk" Version="" />`)
    );

    const result = await resolveSdkFromProject(projectPath);

    expect(result).toBeUndefined();
  });

  it('returns undefined for malformed XML', async () => {
    mocks.readFile.mockResolvedValue('<Project><ItemGroup><PackageReference');

    const result = await resolveSdkFromProject(projectPath);

    expect(result).toBeUndefined();
  });

  it('handles .csproj with multiple ItemGroups', async () => {
    mocks.readFile.mockResolvedValue(`<Project Sdk="Microsoft.NET.Sdk">
  <ItemGroup>
    <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
  </ItemGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.Azure.Workflows.Sdk" Version="${sdkVersion}" />
  </ItemGroup>
</Project>`);

    const result = await resolveSdkFromProject(projectPath);

    expect(result?.version).toBe(sdkVersion);
  });

  it('trims whitespace from version strings', async () => {
    mocks.readFile.mockResolvedValue(
      makeCsproj(`<PackageReference Include="Microsoft.Azure.Workflows.Sdk" Version="  ${sdkVersion}  " />`)
    );

    const result = await resolveSdkFromProject(projectPath);

    expect(result?.version).toBe(sdkVersion);
  });

  it('returns undefined when readFile throws', async () => {
    mocks.readFile.mockRejectedValue(new Error('EACCES'));

    const result = await resolveSdkFromProject(projectPath);

    expect(result).toBeUndefined();
  });

  // --- NuGet cache resolution ---

  it('parses dotnet nuget locals output with trailing whitespace', async () => {
    mocks.executeCommand.mockResolvedValue(`global-packages: ${nugetCacheRoot}  \r\n`);

    const result = await resolveSdkFromProject(projectPath);

    expect(result).toEqual({ sdkNupkgPath: expectedNupkgPath, version: sdkVersion });
  });

  it('returns undefined when dotnet nuget locals returns empty output', async () => {
    mocks.executeCommand.mockResolvedValue('');

    const result = await resolveSdkFromProject(projectPath);

    expect(result).toBeUndefined();
  });

  it('returns undefined when dotnet nuget locals returns unexpected format', async () => {
    mocks.executeCommand.mockResolvedValue('some unexpected output\n');

    const result = await resolveSdkFromProject(projectPath);

    expect(result).toBeUndefined();
    expect(mocks.appendLog).toHaveBeenCalledWith(expect.stringContaining('Unexpected dotnet nuget locals output'));
  });

  it('returns undefined when cache path does not exist on disk', async () => {
    setExistingPaths([]); // nothing exists

    const result = await resolveSdkFromProject(projectPath);

    expect(result).toBeUndefined();
  });

  // --- Fallback: project-local cache ---

  it('falls back to project-local .nuget/packages when global cache has no nupkg', async () => {
    const localNupkgPath = path.join(
      projectPath,
      '.nuget',
      'packages',
      'microsoft.azure.workflows.sdk',
      sdkVersion,
      `microsoft.azure.workflows.sdk.${sdkVersion}.nupkg`
    );
    setExistingPaths([nugetCacheRoot, localNupkgPath]);

    const result = await resolveSdkFromProject(projectPath);

    expect(result).toEqual({ sdkNupkgPath: localNupkgPath, version: sdkVersion });
  });

  it('returns undefined when nupkg is in neither global nor project-local cache', async () => {
    setExistingPaths([nugetCacheRoot]); // cache exists but nupkg doesn't

    const result = await resolveSdkFromProject(projectPath);

    expect(result).toBeUndefined();
    expect(mocks.appendLog).toHaveBeenCalledWith(expect.stringContaining("Ensure 'dotnet restore' has been run"));
  });

  // --- Fallback: dotnet CLI failure ---

  it('falls back to NUGET_PACKAGES env var when dotnet command throws', async () => {
    const envCachePath = 'D:\\custom-nuget-cache';
    const envNupkgPath = path.join(
      envCachePath,
      'microsoft.azure.workflows.sdk',
      sdkVersion,
      `microsoft.azure.workflows.sdk.${sdkVersion}.nupkg`
    );
    process.env.NUGET_PACKAGES = envCachePath;
    mocks.executeCommand.mockRejectedValue(new Error('dotnet not found'));
    setExistingPaths([envCachePath, envNupkgPath]);

    const result = await resolveSdkFromProject(projectPath);

    expect(result).toEqual({ sdkNupkgPath: envNupkgPath, version: sdkVersion });
    delete process.env.NUGET_PACKAGES;
  });

  it('falls back to default home .nuget/packages when dotnet CLI and NUGET_PACKAGES both fail', async () => {
    const home = process.env.USERPROFILE || process.env.HOME;
    if (!home) {
      // Skip this test if no home directory is available
      return;
    }
    const defaultCachePath = path.join(home, '.nuget', 'packages');
    const defaultNupkgPath = path.join(
      defaultCachePath,
      'microsoft.azure.workflows.sdk',
      sdkVersion,
      `microsoft.azure.workflows.sdk.${sdkVersion}.nupkg`
    );
    delete process.env.NUGET_PACKAGES;
    mocks.executeCommand.mockRejectedValue(new Error('dotnet not found'));
    setExistingPaths([defaultCachePath, defaultNupkgPath]);

    const result = await resolveSdkFromProject(projectPath);

    expect(result).toEqual({ sdkNupkgPath: defaultNupkgPath, version: sdkVersion });
  });

  it('returns undefined when all fallbacks fail', async () => {
    delete process.env.NUGET_PACKAGES;
    mocks.executeCommand.mockRejectedValue(new Error('dotnet not found'));
    setExistingPaths([]); // nothing exists

    const result = await resolveSdkFromProject(projectPath);

    expect(result).toBeUndefined();
  });
});
