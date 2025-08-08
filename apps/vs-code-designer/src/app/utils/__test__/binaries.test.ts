import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import * as fs from 'fs';
import axios from 'axios';
import * as vscode from 'vscode';
import {
  downloadAndExtractDependency,
  binariesExist,
  getLatestDotNetVersion,
  getLatestFunctionCoreToolsVersion,
  getLatestNodeJsVersion,
  getNodeJsBinariesReleaseUrl,
  getFunctionCoreToolsBinariesReleaseUrl,
  getDotNetBinariesReleaseUrl,
  getCpuArchitecture,
  getDependencyTimeout,
  installBinaries,
  useBinariesDependencies,
} from '../binaries';
import { ext } from '../../../extensionVariables';
import { DependencyVersion, Platform } from '../../../constants';
import { executeCommand } from '../funcCoreTools/cpUtils';
import { getNpmCommand } from '../nodeJs/nodeJsVersion';
import { getGlobalSetting, getWorkspaceSetting } from '../vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { isNodeJsInstalled } from '../../commands/nodeJs/validateNodeJsInstalled';

vi.mock('../funcCoreTools/cpUtils');
vi.mock('../nodeJs/nodeJsVersion');
vi.mock('../../../onboarding');
vi.mock('../vsCodeConfig/settings');
vi.mock('../../commands/nodeJs/validateNodeJsInstalled');

describe('binaries', () => {
  describe('downloadAndExtractDependency', () => {
    let context: IActionContext;

    beforeEach(() => {
      context = {
        telemetry: {
          properties: {},
        },
      } as IActionContext;
    });

    it('should download and extract dependency', async () => {
      const downloadUrl = 'https://example.com/dependency.zip';
      const targetFolder = 'targetFolder';
      const dependencyName = 'dependency';
      const folderName = 'folderName';
      const dotNetVersion = '6.0';

      const writer = {
        on: vi.fn(),
      } as any;

      (axios.get as Mock).mockResolvedValue({
        data: {
          pipe: vi.fn().mockImplementation((writer) => {
            writer.on('finish');
          }),
        },
      });

      (fs.createWriteStream as Mock).mockReturnValue(writer);

      await downloadAndExtractDependency(context, downloadUrl, targetFolder, dependencyName, folderName, dotNetVersion);

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
      expect(fs.chmodSync).toHaveBeenCalledWith(expect.any(String), 0o777);
      expect(executeCommand).toHaveBeenCalledWith(ext.outputChannel, undefined, 'echo', `Downloading dependency from: ${downloadUrl}`);
    });

    it('should throw error when the compression file extension is not supported', async () => {
      const downloadUrl = 'https://example.com/dependency.zip222';
      const targetFolder = 'targetFolder';
      const dependencyName = 'dependency';
      const folderName = 'folderName';
      const dotNetVersion = '6.0';

      await expect(
        downloadAndExtractDependency(context, downloadUrl, targetFolder, dependencyName, folderName, dotNetVersion)
      ).rejects.toThrowError();
    });
  });

  describe('binariesExist', () => {
    beforeEach(() => {
      (getGlobalSetting as Mock).mockReturnValue('binariesLocation');
    });
    it('should return true if binaries exist', () => {
      (fs.existsSync as Mock).mockReturnValue(true);

      const result = binariesExist('dependencyName');

      expect(result).toBe(true);
    });

    it('should return false if binaries do not exist', () => {
      (fs.existsSync as Mock).mockReturnValue(false);

      const result = binariesExist('dependencyName');

      expect(result).toBe(false);
    });

    it('should return false if useBinariesDependencies returns false', () => {
      (fs.existsSync as Mock).mockReturnValue(false);
      (getGlobalSetting as Mock).mockReturnValue(false);
      const result = binariesExist('dependencyName');

      expect(result).toBe(false);
    });
  });

  describe('getLatestDotNetVersion', () => {
    let context: IActionContext;
    let majorVersion: string;

    beforeEach(() => {
      context = {
        telemetry: {
          properties: {},
        },
      } as IActionContext;
      majorVersion = '6';
    });

    it('should return the latest .NET version', async () => {
      const response = [{ tag_name: 'v6.0.0' }];

      (axios.get as Mock).mockResolvedValue({ data: response, status: 200 });

      const result = await getLatestDotNetVersion(context, majorVersion);

      expect(result).toBe('6.0.0');
    });

    it('should throw error when api call to get dotnet version fails and return fallback version', async () => {
      const showErrorMessage = vi.fn();
      (axios.get as Mock).mockResolvedValue({ data: [], status: 500 });

      vscode.window.showErrorMessage = showErrorMessage;

      const result = await getLatestDotNetVersion(context, majorVersion);
      expect(result).toBe(DependencyVersion.dotnet6);
      expect(showErrorMessage).toHaveBeenCalled();
    });

    it('should return fallback dotnet version when no major version is sent', async () => {
      const result = await getLatestDotNetVersion(context);

      expect(result).toBe(DependencyVersion.dotnet6);
    });
  });

  describe('getLatestFunctionCoreToolsVersion', () => {
    let context: IActionContext;
    let majorVersion: string;

    beforeEach(() => {
      context = {
        telemetry: {
          properties: {},
        },
      } as IActionContext;
      majorVersion = '3';
    });

    it('should return the latest Function Core Tools version from npm', async () => {
      const npmVersion = '3.0.0';
      (isNodeJsInstalled as Mock).mockResolvedValue(true);
      (getNpmCommand as Mock).mockReturnValue('npm');
      (executeCommand as Mock).mockResolvedValue(npmVersion);

      const result = await getLatestFunctionCoreToolsVersion(context, majorVersion);

      expect(result).toBe(npmVersion);
      expect(context.telemetry.properties.latestVersionSource).toBe('node');
    });

    it('should return the latest Function Core Tools version from GitHub', async () => {
      const githubVersion = '3.0.0';
      (isNodeJsInstalled as Mock).mockResolvedValue(false);
      (axios.get as Mock).mockResolvedValue({ data: { tag_name: `v${githubVersion}` }, status: 200 });

      const result = await getLatestFunctionCoreToolsVersion(context, majorVersion);

      expect(result).toBe(githubVersion);
      expect(context.telemetry.properties.latestVersionSource).toBe('github');
    });

    it('should return the fallback Function Core Tools version', async () => {
      const showErrorMessage = vi.fn();
      (isNodeJsInstalled as Mock).mockResolvedValue(false);
      (axios.get as Mock).mockResolvedValue({ data: [], status: 500 });

      vscode.window.showErrorMessage = showErrorMessage;

      const result = await getLatestFunctionCoreToolsVersion(context, majorVersion);

      expect(result).toBe(DependencyVersion.funcCoreTools);
      expect(showErrorMessage).toHaveBeenCalled();
      expect(context.telemetry.properties.latestVersionSource).toBe('fallback');
    });

    it('should return the fallback Function Core Tools version when no major version is sent', async () => {
      (isNodeJsInstalled as Mock).mockResolvedValue(false);
      const result = await getLatestFunctionCoreToolsVersion(context);

      expect(result).toBe(DependencyVersion.funcCoreTools);
      expect(context.telemetry.properties.latestVersionSource).toBe('fallback');
    });
  });

  describe('getLatestNodeJsVersion', () => {
    let context: IActionContext;
    let majorVersion: string;

    beforeEach(() => {
      context = {
        telemetry: {
          properties: {},
        },
      } as IActionContext;
      majorVersion = '14';
    });

    it('should return the latest Node.js version', async () => {
      const response = [{ tag_name: 'v14.0.0' }];
      (axios.get as any).mockResolvedValue({ data: response, status: 200 });
      const result = await getLatestNodeJsVersion(context, majorVersion);

      expect(result).toBe('14.0.0');
    });

    it('should throw error when api call to get dotnet version fails', async () => {
      const showErrorMessage = vi.fn();
      (axios.get as Mock).mockResolvedValue({ data: [], status: 500 });

      vscode.window.showErrorMessage = showErrorMessage;

      const result = await getLatestNodeJsVersion(context, majorVersion);
      expect(result).toBe(DependencyVersion.nodeJs);
      expect(showErrorMessage).toHaveBeenCalled();
    });

    it('should return fallback nodejs version when no major version is sent', async () => {
      const result = await getLatestNodeJsVersion(context);
      expect(result).toBe(DependencyVersion.nodeJs);
    });
  });

  describe('getNodeJsBinariesReleaseUrl', () => {
    const version = '14.0.0';
    const arch = 'x64';

    it('should return the correct Node.js binaries release URL for windows', () => {
      const osPlatform = 'win';

      const result = getNodeJsBinariesReleaseUrl(version, osPlatform, arch);
      console.log(result);

      expect(result).toStrictEqual('https://nodejs.org/dist/v14.0.0/node-v14.0.0-win-x64.zip');
    });
    it('should return the correct Node.js binaries release URL for non windows', () => {
      const osPlatform = 'darwin';
      const result = getNodeJsBinariesReleaseUrl(version, osPlatform, arch);

      expect(result).toStrictEqual('https://nodejs.org/dist/v14.0.0/node-v14.0.0-darwin-x64.tar.gz');
    });
  });

  describe('getFunctionCoreToolsBinariesReleaseUrl', () => {
    it('should return the correct Function Core Tools binaries release URL', () => {
      const version = '3.0.0';
      const osPlatform = 'win-x64';
      const arch = 'x64';
      const result = getFunctionCoreToolsBinariesReleaseUrl(version, osPlatform, arch);

      expect(result).toStrictEqual(
        `https://github.com/Azure/azure-functions-core-tools/releases/download/${version}/Azure.Functions.Cli.${osPlatform}-${arch}.${version}.zip`
      );
    });
  });

  describe('getDotNetBinariesReleaseUrl', () => {
    const originalPlatform = process.platform;

    afterEach(() => {
      vi.restoreAllMocks();
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
      });
    });

    it('should return the correct .NET binaries release URL for windows', () => {
      vi.stubGlobal('process', {
        ...process,
        platform: Platform.windows,
      });
      const result = getDotNetBinariesReleaseUrl();

      expect(result).toBe('https://dot.net/v1/dotnet-install.ps1');
    });

    it('should return the correct .NET binaries release URL for non windows', () => {
      vi.stubGlobal('process', {
        ...process,
        platform: Platform.mac,
      });
      const result = getDotNetBinariesReleaseUrl();

      expect(result).toBe('https://dot.net/v1/dotnet-install.sh');
    });
  });

  describe('getCpuArchitecture', () => {
    const originalArch = process.arch;

    afterEach(() => {
      vi.restoreAllMocks();
      Object.defineProperty(process, 'arch', {
        value: originalArch,
      });
    });

    it('should return the correct CPU architecture', () => {
      vi.stubGlobal('process', {
        ...process,
        arch: 'x64',
      });
      const result = getCpuArchitecture();

      expect(result).toBe('x64');
    });

    it('should throw an error for unsupported CPU architecture', () => {
      (process as any).arch = vi.stubGlobal('process', {
        ...process,
        arch: 'unsupported',
      });
      expect(() => getCpuArchitecture()).toThrowError('Unsupported CPU architecture: unsupported');
    });
  });

  describe('getDependencyTimeout', () => {
    it('should return the dependency timeout value', () => {
      (getWorkspaceSetting as Mock).mockReturnValue(60);

      const result = getDependencyTimeout();

      expect(result).toBe(60);
    });

    it('should throw an error for invalid timeout value', () => {
      (getWorkspaceSetting as Mock).mockReturnValue('invalid');

      expect(() => getDependencyTimeout()).toThrowError('The setting "invalid" must be a number, but instead found "invalid".');
    });
  });

  describe('installBinaries', () => {
    let context: IActionContext;

    beforeEach(() => {
      context = {
        telemetry: {
          properties: {},
        },
      } as IActionContext;
    });
    it('should install binaries', async () => {
      (getGlobalSetting as Mock).mockReturnValue(true);

      await installBinaries(context);

      expect(context.telemetry.properties.autoRuntimeDependenciesValidationAndInstallationSetting).toBe('true');
    });

    it('should not install binaries', async () => {
      (getGlobalSetting as Mock).mockReturnValue(false);

      await installBinaries(context);

      expect(context.telemetry.properties.autoRuntimeDependenciesValidationAndInstallationSetting).toBe('false');
    });
  });

  describe('useBinariesDependencies', () => {
    it('should return true if binaries dependencies are used', () => {
      (getGlobalSetting as Mock).mockReturnValue(true);

      const result = useBinariesDependencies();

      expect(result).toBe(true);
    });

    it('should return false if binaries dependencies are not used', () => {
      (getGlobalSetting as Mock).mockReturnValue(false);

      const result = useBinariesDependencies();

      expect(result).toBe(false);
    });
  });
});
