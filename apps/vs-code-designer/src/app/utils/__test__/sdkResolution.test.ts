import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CodefulSdk } from '../../../constants';
import { resolveSdkFromProject, restoreSdkForProject } from '../sdkResolution';

const mocks = vi.hoisted(() => ({
  appendLog: vi.fn(),
  executeCommand: vi.fn(),
  getDotNetCommand: vi.fn(),
  pathExists: vi.fn(),
  readJson: vi.fn(),
  readdir: vi.fn(),
  wrapArgInQuotes: vi.fn(),
}));

vi.mock('fs-extra', () => ({
  pathExists: mocks.pathExists,
  readJson: mocks.readJson,
  readdir: mocks.readdir,
}));

vi.mock('../dotnet/dotnet', () => ({
  getDotNetCommand: mocks.getDotNetCommand,
}));

vi.mock('../funcCoreTools/cpUtils', () => ({
  executeCommand: mocks.executeCommand,
  wrapArgInQuotes: mocks.wrapArgInQuotes,
}));

vi.mock('../../../extensionVariables', () => ({
  ext: {
    outputChannel: { appendLog: mocks.appendLog },
  },
}));

const projectPath = path.resolve('workspace with spaces', 'My Logic App');
const csprojPath = path.join(projectPath, 'MyLogicApp.csproj');
const assetsFilePath = path.join(projectPath, 'artifacts', 'obj', 'project.assets.json');
const packageFolder = path.resolve('shared packages');
const dotnetCommand = path.resolve('dotnet sdk', process.platform === 'win32' ? 'dotnet.exe' : 'dotnet');
const sdkVersion = '1.0.0-preview.3';
const sdkPackageIdLower = CodefulSdk.WorkflowsSDK.toLowerCase();
const sdkNupkgPath = path.join(packageFolder, sdkPackageIdLower, sdkVersion, `${sdkPackageIdLower}.${sdkVersion}.nupkg`);
const quote = (value: string): string => `${process.platform === 'win32' ? '"' : "'"}${value}${process.platform === 'win32' ? '"' : "'"}`;
const quotedCsprojPath = quote(csprojPath);
const quotedDotnetCommand = quote(dotnetCommand);

function packageListReport(versions: string[] = [sdkVersion]): string {
  return JSON.stringify({
    version: 1,
    projects: [
      {
        path: csprojPath,
        frameworks: versions.map((version, index) => ({
          framework: index === 0 ? 'net8.0' : 'net10.0',
          topLevelPackages: [
            {
              id: CodefulSdk.WorkflowsSDK,
              requestedVersion: index === 0 ? `[${version}]` : '*',
              resolvedVersion: version,
            },
          ],
        })),
      },
    ],
  });
}

function setExistingPaths(paths: string[]): void {
  const existingPaths = new Set(paths);
  mocks.pathExists.mockImplementation(async (filePath: string) => existingPaths.has(filePath));
}

describe('resolveSdkFromProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDotNetCommand.mockReturnValue(dotnetCommand);
    mocks.wrapArgInQuotes.mockImplementation(quote);
    mocks.readdir.mockResolvedValue(['MyLogicApp.csproj']);
    mocks.readJson.mockResolvedValue({ packageFolders: { [`${packageFolder}${path.sep}`]: {} } });
    mocks.executeCommand.mockImplementation(async (_output, _workingDirectory, _command, ...args: string[]) => {
      if (args[0] === 'list') {
        return packageListReport();
      }
      if (args[0] === 'msbuild') {
        return assetsFilePath;
      }
      throw new Error(`Unexpected command: ${args.join(' ')}`);
    });
    setExistingPaths([assetsFilePath, sdkNupkgPath]);
  });

  it('resolves the concrete package version and package folder from restored project data', async () => {
    await expect(resolveSdkFromProject(projectPath)).resolves.toEqual({
      sdkNupkgPath,
      version: sdkVersion,
    });
    expect(mocks.readJson).toHaveBeenCalledWith(assetsFilePath);
  });

  it('queries package list without restoring and with project context', async () => {
    await resolveSdkFromProject(projectPath);

    expect(mocks.executeCommand).toHaveBeenCalledWith(
      expect.anything(),
      projectPath,
      quotedDotnetCommand,
      'list',
      quotedCsprojPath,
      'package',
      '--format',
      'json',
      '--output-version',
      '1',
      '--no-restore'
    );
  });

  it('uses the evaluated ProjectAssetsFile path', async () => {
    await resolveSdkFromProject(projectPath);

    expect(mocks.executeCommand).toHaveBeenCalledWith(
      expect.anything(),
      projectPath,
      quotedDotnetCommand,
      'msbuild',
      quotedCsprojPath,
      '-getProperty:ProjectAssetsFile',
      '-nologo'
    );
  });

  it('supports custom NuGet package folders from project.assets.json', async () => {
    const customFolder = path.resolve('custom nuget cache');
    const customNupkgPath = path.join(customFolder, sdkPackageIdLower, sdkVersion, `${sdkPackageIdLower}.${sdkVersion}.nupkg`);
    mocks.readJson.mockResolvedValue({ packageFolders: { [`${customFolder}${path.sep}`]: {} } });
    setExistingPaths([assetsFilePath, customNupkgPath]);

    await expect(resolveSdkFromProject(projectPath)).resolves.toEqual({
      sdkNupkgPath: customNupkgPath,
      version: sdkVersion,
    });
  });

  it('uses the concrete resolved version for ranges and floating references', async () => {
    mocks.executeCommand.mockImplementation(async (_output, _workingDirectory, _command, ...args: string[]) => {
      return args[0] === 'list' ? packageListReport() : assetsFilePath;
    });

    await expect(resolveSdkFromProject(projectPath)).resolves.toEqual({
      sdkNupkgPath,
      version: sdkVersion,
    });
  });

  it('returns undefined when target frameworks resolve different SDK versions', async () => {
    mocks.executeCommand.mockImplementation(async (_output, _workingDirectory, _command, ...args: string[]) => {
      return args[0] === 'list' ? packageListReport([sdkVersion, '1.0.0-preview.4']) : assetsFilePath;
    });

    await expect(resolveSdkFromProject(projectPath)).resolves.toBeUndefined();
    expect(mocks.appendLog).toHaveBeenCalledWith(expect.stringContaining('multiple versions'));
  });

  it('returns undefined when the project has not been restored', async () => {
    mocks.executeCommand.mockRejectedValue(new Error('Assets file not found'));

    await expect(resolveSdkFromProject(projectPath)).resolves.toBeUndefined();
    expect(mocks.appendLog).toHaveBeenCalledWith(expect.stringContaining('Assets file not found'));
  });

  it('returns undefined when the evaluated assets file does not exist', async () => {
    setExistingPaths([]);

    await expect(resolveSdkFromProject(projectPath)).resolves.toBeUndefined();
    expect(mocks.appendLog).toHaveBeenCalledWith(expect.stringContaining('Project assets file was not found'));
  });

  it('returns undefined when the restored package file is missing', async () => {
    setExistingPaths([assetsFilePath]);

    await expect(resolveSdkFromProject(projectPath)).resolves.toBeUndefined();
    expect(mocks.appendLog).toHaveBeenCalledWith(expect.stringContaining('SDK package was not found'));
  });
});

describe('restoreSdkForProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDotNetCommand.mockReturnValue(dotnetCommand);
    mocks.wrapArgInQuotes.mockImplementation(quote);
    mocks.readdir.mockResolvedValue(['MyLogicApp.csproj']);
    mocks.executeCommand.mockResolvedValue('Restore succeeded');
  });

  it('restores the project interactively from its directory', async () => {
    await restoreSdkForProject(projectPath);

    expect(mocks.executeCommand).toHaveBeenCalledWith(
      expect.anything(),
      projectPath,
      quotedDotnetCommand,
      'restore',
      quotedCsprojPath,
      '--interactive'
    );
  });

  it('fails when no project file exists', async () => {
    mocks.readdir.mockResolvedValue([]);

    await expect(restoreSdkForProject(projectPath)).rejects.toThrow('No .csproj file found');
    expect(mocks.executeCommand).not.toHaveBeenCalled();
  });
});
