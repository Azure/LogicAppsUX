import { AzExtFsExtra } from '@microsoft/vscode-azext-utils';
import { FuncVersion, Platform, ProjectLanguage } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs';
import * as semver from 'semver';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DotnetVersion } from '../../../../constants';
import { executeCommand } from '../../funcCoreTools/cpUtils';
import { getGlobalSetting, updateGlobalSetting, updateWorkspaceSetting } from '../../vsCodeConfig/settings';
import { findFiles, getWorkspaceLogicAppFolders } from '../../workspace';
import {
  getDotnetDebugSubpath,
  getLocalDotNetVersionFromBinaries,
  getProjFiles,
  getTemplateKeyFromFeedEntry,
  getTemplateKeyFromProjFile,
  ProjectFile,
  setDotNetCommand,
  tryGetFuncVersion,
} from '../dotnet';

vi.mock('@microsoft/vscode-azext-utils', () => ({
  AzExtFsExtra: {
    pathExists: vi.fn(),
    readFile: vi.fn(),
  },
}));

vi.mock('../../../../extensionVariables', () => ({
  ext: {
    outputChannel: { appendLog: vi.fn(), appendLine: vi.fn() },
    dotNetCliPath: 'dotnet',
  },
}));

vi.mock('../../../../localize', () => ({
  localize: (_key: string, message: string) => message,
}));

vi.mock('../../telemetry', () => ({
  runWithDurationTelemetry: (_context: unknown, _name: string, callback: () => unknown) => callback(),
}));

vi.mock('../../workspace', () => ({
  findFiles: vi.fn(),
  getWorkspaceLogicAppFolders: vi.fn(),
}));

vi.mock('../../funcCoreTools/cpUtils', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../../vsCodeConfig/settings', () => ({
  getGlobalSetting: vi.fn(),
  updateGlobalSetting: vi.fn(),
  updateWorkspaceSetting: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  chmodSync: vi.fn(),
}));

vi.mock('semver', () => ({
  clean: vi.fn(),
  maxSatisfying: vi.fn(),
}));

describe('dotnet utilities', () => {
  const context = { telemetry: { properties: {}, measurements: {} } } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AzExtFsExtra.pathExists).mockResolvedValue(false);
    vi.mocked(AzExtFsExtra.readFile).mockResolvedValue(
      '<Project><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>'
    );
    vi.mocked(findFiles).mockResolvedValue([]);
    vi.mocked(getGlobalSetting).mockReturnValue(undefined);
    vi.mocked(getWorkspaceLogicAppFolders).mockResolvedValue([]);
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.readdirSync).mockReturnValue([]);
    vi.mocked(semver.clean).mockReturnValue('8.0.100');
    vi.mocked(semver.maxSatisfying).mockReturnValue(null);
    vi.mocked(executeCommand).mockResolvedValue('8.0.100');
  });

  it('should get non-extension C# project files', async () => {
    vi.mocked(findFiles).mockResolvedValue([{ fsPath: '/project/extensions.csproj' }, { fsPath: '/project/Functions.csproj' }] as any);

    const result = await getProjFiles(context, ProjectLanguage.CSharp, '/project');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Functions.csproj');
  });

  it('should cache project file contents', async () => {
    const projectFile = new ProjectFile('Functions.csproj', 'C:\\project');

    await expect(projectFile.getContents()).resolves.toContain('TargetFramework');
    await projectFile.getContents();

    expect(AzExtFsExtra.readFile).toHaveBeenCalledTimes(1);
  });

  it('should default Functions v4 template key to .NET 8', async () => {
    await expect(getTemplateKeyFromProjFile(context, undefined, FuncVersion.v4, ProjectLanguage.CSharp)).resolves.toBe(DotnetVersion.net8);
  });

  it('should default older Functions versions to their expected frameworks', async () => {
    await expect(getTemplateKeyFromProjFile(context, undefined, FuncVersion.v3, ProjectLanguage.CSharp)).resolves.toBe(DotnetVersion.net3);
    await expect(getTemplateKeyFromProjFile(context, undefined, FuncVersion.v2, ProjectLanguage.CSharp)).resolves.toBe(DotnetVersion.net2);
    await expect(getTemplateKeyFromProjFile(context, undefined, FuncVersion.v1, ProjectLanguage.CSharp)).resolves.toBe(DotnetVersion.net48);
  });

  it('should read template key from a single project file', async () => {
    vi.mocked(AzExtFsExtra.pathExists).mockResolvedValue(true);
    vi.mocked(findFiles).mockResolvedValue([{ fsPath: 'C:\\project\\Functions.csproj' }] as any);
    vi.mocked(AzExtFsExtra.readFile).mockResolvedValue(
      '<Project><PropertyGroup><TargetFramework>net6.0</TargetFramework></PropertyGroup></Project>'
    );

    await expect(getTemplateKeyFromProjFile(context, 'C:\\project', FuncVersion.v4, ProjectLanguage.CSharp)).resolves.toBe('net6.0');
  });

  it('should append isolated suffix for isolated SDK project files and feed entries', async () => {
    vi.mocked(AzExtFsExtra.pathExists).mockResolvedValue(true);
    vi.mocked(findFiles).mockResolvedValue([{ fsPath: 'C:\\project\\Functions.csproj' }] as any);
    vi.mocked(AzExtFsExtra.readFile).mockResolvedValue(
      '<Project><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup><ItemGroup><PackageReference Include="Microsoft.Azure.Functions.Worker.Sdk" /></ItemGroup></Project>'
    );

    await expect(getTemplateKeyFromProjFile(context, 'C:\\project', FuncVersion.v4, ProjectLanguage.CSharp)).resolves.toBe(
      'net8.0-isolated'
    );
    expect(getTemplateKeyFromFeedEntry({ targetFramework: 'net8.0', sdk: { name: 'Microsoft.Azure.Functions.Worker.Sdk' } } as any)).toBe(
      'net8.0-isolated'
    );
  });

  it('should return undefined when AzureFunctionsVersion is missing', async () => {
    const projectFile = new ProjectFile('Functions.csproj', 'C:\\project');

    await expect(tryGetFuncVersion(projectFile)).resolves.toBeUndefined();
  });

  it('should build debug subpath with POSIX separators', () => {
    expect(getDotnetDebugSubpath('net8.0')).toBe('bin/Debug/net8.0');
  });

  it('should get local SDK version from dotnet command when no major version is specified', async () => {
    await expect(getLocalDotNetVersionFromBinaries()).resolves.toBe('8.0.100');
  });

  it('should get matching local SDK version from managed binaries', async () => {
    vi.mocked(getGlobalSetting).mockReturnValue('C:\\deps');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([{ isDirectory: () => true, name: '8.0.100' }] as any);
    vi.mocked(semver.maxSatisfying).mockReturnValue('8.0.100');

    await expect(getLocalDotNetVersionFromBinaries('8')).resolves.toBe('8.0.100');
  });

  it('should set global dotnet command when managed binaries are not configured', async () => {
    await setDotNetCommand();

    expect(updateGlobalSetting).toHaveBeenCalledWith('dotnetBinaryPath', 'dotnet');
    expect(updateWorkspaceSetting).not.toHaveBeenCalled();
  });

  it('should set workspace terminal and omnisharp paths when managed binaries exist', async () => {
    vi.mocked(getGlobalSetting).mockReturnValue('C:\\deps');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(getWorkspaceLogicAppFolders).mockResolvedValue(['C:\\workspace\\LogicApp']);
    const restorePlatform = mockPlatform(Platform.windows);

    await setDotNetCommand();

    expect(updateWorkspaceSetting).toHaveBeenCalledWith(
      'integrated.env.windows',
      expect.objectContaining({ PATH: expect.any(String) }),
      'C:\\workspace\\LogicApp',
      'terminal'
    );
    expect(updateWorkspaceSetting).toHaveBeenCalledWith(
      'dotNetCliPaths',
      [expect.stringContaining('DotNetSDK')],
      'C:\\workspace\\LogicApp',
      'omnisharp'
    );
    restorePlatform();
  });
});

function mockPlatform(platform: NodeJS.Platform): () => void {
  const originalPlatform = process.platform;
  Object.defineProperty(process, 'platform', { value: platform, configurable: true });
  return () => Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
}
