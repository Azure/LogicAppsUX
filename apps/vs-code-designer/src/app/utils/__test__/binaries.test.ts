import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import {
  downloadAndExtractDependency,
  downloadFileWithVerification,
  DownloadIntegrityError,
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
  removeWithLockWait,
  mkdirWithLockWait,
} from '../binaries';
import { ext } from '../../../extensionVariables';
import {
  DependencyVersion,
  dotnetDependencyName,
  funcCoreToolsBinaryPathSettingKey,
  funcDependencyName,
  nodeJsBinaryPathSettingKey,
  nodeJsDependencyName,
} from '../../../constants';
import { validateAndInstallBinaries } from '../../commands/binaries/validateAndInstallBinaries';
import { executeCommand } from '../funcCoreTools/cpUtils';
import { getNpmCommand } from '../nodeJs/nodeJsVersion';
import { validateTasksJson } from '../vsCodeConfig/tasks';
import { getGlobalSetting, getWorkspaceSetting, updateGlobalSetting } from '../vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { isNodeJsInstalled } from '../../commands/nodeJs/validateNodeJsInstalled';
import { Platform } from '@microsoft/vscode-extension-logic-apps';

vi.mock('../funcCoreTools/cpUtils');
vi.mock('../nodeJs/nodeJsVersion');
vi.mock('../../../onboarding');
vi.mock('../../commands/binaries/validateAndInstallBinaries');
vi.mock('../vsCodeConfig/settings');
vi.mock('../vsCodeConfig/tasks');
vi.mock('../../commands/nodeJs/validateNodeJsInstalled');
vi.mock('../devContainerUtils');
vi.mock('../telemetry', () => ({
  runWithDurationTelemetry: vi.fn(async (_ctx, _cmd, callback) => await callback()),
}));

describe('binaries', () => {
  describe('downloadAndExtractDependency', () => {
    let context: IActionContext;

    beforeEach(() => {
      context = {
        telemetry: {
          properties: {},
          measurements: {},
        },
      } as IActionContext;
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

  describe('downloadFileWithVerification', () => {
    let context: IActionContext;
    const url = 'https://cdn.example.com/Microsoft.Azure.Functions.ExtensionBundle.Workflows.1.2.3_any-any.zip';
    const destPath = '/tmp/dep.zip';
    const dependencyName = 'TestDep';

    beforeEach(() => {
      context = {
        telemetry: { properties: {}, measurements: {} },
      } as IActionContext;
      (fs.existsSync as Mock).mockReturnValue(false);
    });

    // Build a fake axios stream response. `chunks` are streamed in order;
    // `headers` lets each test choose what the CDN reports.
    function mockAxiosStream(chunks: string[], headers: Record<string, string>) {
      const data = new EventEmitter() as EventEmitter & { pipe: (w: any) => any };
      data.pipe = (writer: any) => {
        // Schedule emission on the next microtask so test code can wire listeners.
        setImmediate(() => {
          for (const chunk of chunks) {
            data.emit('data', Buffer.from(chunk));
          }
          writer.emit('finish');
        });
        return writer;
      };
      (axios.get as Mock).mockResolvedValueOnce({ headers, data });
    }

    function mockWriter() {
      const writer = new EventEmitter() as EventEmitter & { write: Mock; end: Mock };
      writer.write = vi.fn();
      writer.end = vi.fn();
      (fs.createWriteStream as Mock).mockReturnValueOnce(writer);
      return writer;
    }

    it('verifies size and md5 from response headers on success', async () => {
      mockWriter();
      // MD5 of "hello world" in base64 = XrY7u+Ae7tCTyyK7j1rNww==
      mockAxiosStream(['hello world'], {
        'content-length': '11',
        'content-md5': 'XrY7u+Ae7tCTyyK7j1rNww==',
      });

      const result = await downloadFileWithVerification(context, url, destPath, dependencyName);

      expect(result.actualSize).toBe(11);
      expect(result.expectedSize).toBe(11);
      expect(result.expectedMd5).toBe('XrY7u+Ae7tCTyyK7j1rNww==');
      expect(result.actualMd5).toBe('XrY7u+Ae7tCTyyK7j1rNww==');
      expect(context.telemetry.properties[`${dependencyName}DownloadAttempts`]).toBe('1');
      expect(context.telemetry.properties[`${dependencyName}Md5Match`]).toBe('true');
    });

    it('succeeds and reports skipped checks when headers are missing', async () => {
      mockWriter();
      mockAxiosStream(['abc'], {});

      const result = await downloadFileWithVerification(context, url, destPath, dependencyName);

      expect(result.expectedSize).toBeUndefined();
      expect(result.expectedMd5).toBeUndefined();
      expect(result.actualSize).toBe(3);
      expect(context.telemetry.properties[`${dependencyName}Md5Match`]).toBe('skipped');
      expect(context.telemetry.properties[`${dependencyName}ExpectedSize`]).toBe('unknown');
    });

    it('retries on size mismatch and ultimately fails with DownloadIntegrityError', async () => {
      mockWriter();
      mockAxiosStream(['short'], { 'content-length': '999', 'content-md5': 'XrY7u+Ae7tCTyyK7j1rNww==' });
      mockWriter();
      mockAxiosStream(['short'], { 'content-length': '999', 'content-md5': 'XrY7u+Ae7tCTyyK7j1rNww==' });
      mockWriter();
      mockAxiosStream(['short'], { 'content-length': '999', 'content-md5': 'XrY7u+Ae7tCTyyK7j1rNww==' });

      await expect(downloadFileWithVerification(context, url, destPath, dependencyName, 3)).rejects.toBeInstanceOf(DownloadIntegrityError);
      expect(axios.get).toHaveBeenCalledTimes(3);
      expect(context.telemetry.properties[`${dependencyName}DownloadAttempts`]).toBe('3');
    });

    it('retries on md5 mismatch then succeeds on a later attempt', async () => {
      // First attempt: corrupt body (md5 of 'corrupt' is not the expected one).
      mockWriter();
      mockAxiosStream(['corrupt'], { 'content-length': '11', 'content-md5': 'XrY7u+Ae7tCTyyK7j1rNww==' });
      // Second attempt: matching body.
      mockWriter();
      mockAxiosStream(['hello world'], { 'content-length': '11', 'content-md5': 'XrY7u+Ae7tCTyyK7j1rNww==' });

      const result = await downloadFileWithVerification(context, url, destPath, dependencyName, 3);

      expect(result.actualSize).toBe(11);
      expect(axios.get).toHaveBeenCalledTimes(2);
      expect(context.telemetry.properties[`${dependencyName}DownloadAttempts`]).toBe('2');
    }, 10000);

    it('does not retry on 4xx HTTP errors', async () => {
      const err = Object.assign(new Error('Not Found'), { response: { status: 404 } });
      (axios.get as Mock).mockRejectedValueOnce(err);

      await expect(downloadFileWithVerification(context, url, destPath, dependencyName, 3)).rejects.toBe(err);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('retries on 5xx HTTP errors', async () => {
      const err5xx = Object.assign(new Error('Server Error'), { response: { status: 503 } });
      (axios.get as Mock).mockRejectedValueOnce(err5xx);
      mockWriter();
      mockAxiosStream(['ok'], { 'content-length': '2' });

      const result = await downloadFileWithVerification(context, url, destPath, dependencyName, 3);
      expect(result.actualSize).toBe(2);
      expect(axios.get).toHaveBeenCalledTimes(2);
    }, 10000);

    it('requests identity encoding so Content-Length matches the bytes piped to disk', async () => {
      mockWriter();
      mockAxiosStream(['hello world'], { 'content-length': '11' });

      await downloadFileWithVerification(context, url, destPath, dependencyName);

      expect(axios.get).toHaveBeenCalledWith(
        url,
        expect.objectContaining({
          responseType: 'stream',
          headers: expect.objectContaining({ 'Accept-Encoding': 'identity' }),
          decompress: false,
        })
      );
    });

    it('tolerates Content-Encoding by skipping the size check (regression: dotnet-install.ps1 gzip)', async () => {
      mockWriter();
      // Server ignored our identity hint and gzipped anyway. Content-Length describes
      // the compressed bytes (24942) but we record the decoded bytes piped to disk
      // (76680). Previously this threw DownloadIntegrityError; now it succeeds.
      const decoded = 'a'.repeat(76680);
      mockAxiosStream([decoded], {
        'content-encoding': 'gzip',
        'content-length': '24942',
      });

      const result = await downloadFileWithVerification(context, url, destPath, dependencyName);

      expect(result.actualSize).toBe(76680);
      expect(context.telemetry.properties[`${dependencyName}DownloadAttempts`]).toBe('1');
    });

    it('still enforces size mismatches when no Content-Encoding is present', async () => {
      mockWriter();
      mockAxiosStream(['short'], { 'content-length': '999' });
      mockWriter();
      mockAxiosStream(['short'], { 'content-length': '999' });
      mockWriter();
      mockAxiosStream(['short'], { 'content-length': '999' });

      await expect(downloadFileWithVerification(context, url, destPath, dependencyName, 3)).rejects.toBeInstanceOf(DownloadIntegrityError);
      expect(axios.get).toHaveBeenCalledTimes(3);
    }, 10000);
  });

  describe('binariesExist', () => {
    beforeEach(() => {
      (getGlobalSetting as Mock).mockReturnValue('binariesLocation');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return true if binaries exist', async () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      const devContainerModule = await import('../devContainerUtils');
      vi.mocked(devContainerModule.isDevContainerWorkspace).mockResolvedValue(false);
      (getGlobalSetting as Mock).mockReturnValue('binariesLocation');

      const result = await binariesExist('dependencyName');

      expect(result).toBe(true);
    });

    it('should return false if binaries do not exist', async () => {
      (fs.existsSync as Mock).mockReturnValue(false);
      const devContainerModule = await import('../devContainerUtils');
      vi.mocked(devContainerModule.isDevContainerWorkspace).mockResolvedValue(false);
      (getGlobalSetting as Mock).mockReturnValue('binariesLocation');

      const result = await binariesExist('dependencyName');

      expect(result).toBe(false);
    });

    it('should return false if Func Core Tools folder exists but configured binary is missing', async () => {
      const funcCoreToolsFolder = path.join('binariesLocation', funcDependencyName);
      const funcBinary = path.join(funcCoreToolsFolder, 'func');
      (fs.existsSync as Mock).mockImplementation((filePath: string) => filePath === funcCoreToolsFolder);
      const devContainerModule = await import('../devContainerUtils');
      vi.mocked(devContainerModule.isDevContainerWorkspace).mockResolvedValue(false);
      (getGlobalSetting as Mock).mockImplementation((settingName?: string) =>
        settingName === funcCoreToolsBinaryPathSettingKey ? funcBinary : 'binariesLocation'
      );

      const result = await binariesExist(funcDependencyName);

      expect(result).toBe(false);
      expect(executeCommand).toHaveBeenCalledWith(ext.outputChannel, undefined, 'echo', `FuncCoreTools binary is missing: ${funcBinary}`);
    });

    it('should repair a stale Windows NodeJs binary path when node.exe exists', async () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue(Platform.windows);
      const nodeJsFolder = path.join('binariesLocation', nodeJsDependencyName);
      const staleNodeBinary = path.join(nodeJsFolder, 'node');
      const nodeExeBinary = path.join(nodeJsFolder, 'node.exe');
      (fs.existsSync as Mock).mockImplementation((filePath: string) => filePath === nodeJsFolder || filePath === nodeExeBinary);
      const devContainerModule = await import('../devContainerUtils');
      vi.mocked(devContainerModule.isDevContainerWorkspace).mockResolvedValue(false);
      (getGlobalSetting as Mock).mockImplementation((settingName?: string) =>
        settingName === nodeJsBinaryPathSettingKey ? staleNodeBinary : 'binariesLocation'
      );

      const result = await binariesExist(nodeJsDependencyName);

      expect(result).toBe(true);
      expect(updateGlobalSetting).toHaveBeenCalledWith(nodeJsBinaryPathSettingKey, nodeExeBinary);
      expect(executeCommand).toHaveBeenCalledWith(
        ext.outputChannel,
        undefined,
        'echo',
        `${nodeJsDependencyName} binary path updated: ${nodeExeBinary}`
      );
      expect(executeCommand).not.toHaveBeenCalledWith(ext.outputChannel, undefined, 'echo', `NodeJs binary is missing: ${staleNodeBinary}`);
    });

    it('should return false for a stale Windows NodeJs binary path when node.exe is also missing', async () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue(Platform.windows);
      const nodeJsFolder = path.join('binariesLocation', nodeJsDependencyName);
      const staleNodeBinary = path.join(nodeJsFolder, 'node');
      (fs.existsSync as Mock).mockImplementation((filePath: string) => filePath === nodeJsFolder);
      const devContainerModule = await import('../devContainerUtils');
      vi.mocked(devContainerModule.isDevContainerWorkspace).mockResolvedValue(false);
      (getGlobalSetting as Mock).mockImplementation((settingName?: string) =>
        settingName === nodeJsBinaryPathSettingKey ? staleNodeBinary : 'binariesLocation'
      );

      const result = await binariesExist(nodeJsDependencyName);

      expect(result).toBe(false);
      expect(updateGlobalSetting).not.toHaveBeenCalledWith(nodeJsBinaryPathSettingKey, expect.any(String));
      expect(executeCommand).toHaveBeenCalledWith(ext.outputChannel, undefined, 'echo', `NodeJs binary is missing: ${staleNodeBinary}`);
    });

    it('should return false if useBinariesDependencies returns false', async () => {
      (fs.existsSync as Mock).mockReturnValue(false);
      (getGlobalSetting as Mock).mockReturnValue(false);
      const devContainerModule = await import('../devContainerUtils');
      vi.mocked(devContainerModule.isDevContainerWorkspace).mockResolvedValue(false);

      const result = await binariesExist('dependencyName');

      expect(result).toBe(false);
    });

    it('should return false for devContainer workspace regardless of binary existence', async () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (getGlobalSetting as Mock).mockReturnValue('binariesLocation');
      const devContainerModule = await import('../devContainerUtils');
      vi.mocked(devContainerModule.isDevContainerWorkspace).mockResolvedValue(true);

      const result = await binariesExist('dependencyName');

      expect(result).toBe(false);
      expect(fs.existsSync).not.toHaveBeenCalled();
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
      expect(result).toBe(DependencyVersion.dotnet8);
      expect(showErrorMessage).toHaveBeenCalled();
    });

    it('should return fallback dotnet version when no major version is sent', async () => {
      const result = await getLatestDotNetVersion(context);

      expect(result).toBe(DependencyVersion.dotnet8);
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

    it('should return fallback nodejs version when requested version is not found in the list', async () => {
      const response = [{ tag_name: 'v20.0.0' }, { tag_name: 'v18.0.0' }, { tag_name: 'v16.0.0' }];
      (axios.get as any).mockResolvedValue({ data: response, status: 200 });

      const result = await getLatestNodeJsVersion(context, '99');

      expect(result).toBe(DependencyVersion.nodeJs);
      expect(context.telemetry.properties.latestNodeJSVersion).toBe('fallback-no-match');
      expect(context.telemetry.properties.errorLatestNodeJsVersion).toBe('No matching Node JS version found.');
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

    it('should install binaries when setting is enabled and not in devContainer', async () => {
      (getGlobalSetting as Mock).mockReturnValue(true);
      const devContainerModule = await import('../devContainerUtils');
      vi.mocked(devContainerModule.isDevContainerWorkspace).mockResolvedValue(false);
      vi.mocked(validateAndInstallBinaries).mockResolvedValue(undefined);
      vi.mocked(validateTasksJson).mockResolvedValue(undefined);

      await installBinaries(context);

      expect(validateAndInstallBinaries).toHaveBeenCalled();
      expect(context.telemetry.properties.autoRuntimeDependenciesValidationAndInstallationSetting).toBe('true');
    });

    it('should not install binaries when setting is disabled', async () => {
      (getGlobalSetting as Mock).mockReturnValue(false);
      const devContainerModule = await import('../devContainerUtils');
      vi.mocked(devContainerModule.isDevContainerWorkspace).mockResolvedValue(false);

      await installBinaries(context);

      expect(context.telemetry.properties.autoRuntimeDependenciesValidationAndInstallationSetting).toBe('false');
    });

    it('should not install binaries in devContainer workspace even when setting is enabled', async () => {
      (getGlobalSetting as Mock).mockReturnValue(true);
      const devContainerModule = await import('../devContainerUtils');
      vi.mocked(devContainerModule.isDevContainerWorkspace).mockResolvedValue(true);

      await installBinaries(context);

      expect(context.telemetry.properties.autoRuntimeDependenciesValidationAndInstallationSetting).toBe('false');
    });

    it('should set default paths when not installing binaries', async () => {
      (getGlobalSetting as Mock).mockReturnValue(false);
      const devContainerModule = await import('../devContainerUtils');
      vi.mocked(devContainerModule.isDevContainerWorkspace).mockResolvedValue(false);

      await installBinaries(context);

      expect(updateGlobalSetting).toHaveBeenCalledWith('dotnetBinaryPath', 'dotnet');
      expect(updateGlobalSetting).toHaveBeenCalledWith('nodeJsBinaryPath', 'node');
      expect(updateGlobalSetting).toHaveBeenCalledWith('funcCoreToolsBinaryPath', 'func');
    });

    it('should set default paths in devContainer workspace', async () => {
      (getGlobalSetting as Mock).mockReturnValue(true);
      const devContainerModule = await import('../devContainerUtils');
      vi.mocked(devContainerModule.isDevContainerWorkspace).mockResolvedValue(true);

      await installBinaries(context);

      expect(updateGlobalSetting).toHaveBeenCalledWith('dotnetBinaryPath', 'dotnet');
      expect(updateGlobalSetting).toHaveBeenCalledWith('nodeJsBinaryPath', 'node');
      expect(updateGlobalSetting).toHaveBeenCalledWith('funcCoreToolsBinaryPath', 'func');
    });
  });

  describe('removeWithLockWait', () => {
    beforeEach(() => {
      (fs as any).rmSync = vi.fn();
      vi.mocked(fs.existsSync).mockReset();
      vi.mocked(ext.outputChannel.appendLog).mockReset();
    });

    afterEach(() => {
      delete (fs as any).rmSync;
    });

    it('returns immediately when the path does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      await removeWithLockWait('C:/nope', 'TestDep', 1000);
      expect((fs as any).rmSync).not.toHaveBeenCalled();
    });

    it('calls rmSync once when the directory is removable on the first attempt', async () => {
      // exists -> true (so we try rmSync), then false (rmSync flushed).
      vi.mocked(fs.existsSync).mockReturnValueOnce(true).mockReturnValueOnce(false);
      (fs as any).rmSync.mockImplementation(() => undefined);
      await removeWithLockWait('C:/dep', 'TestDep', 1000);
      expect((fs as any).rmSync).toHaveBeenCalledTimes(1);
    });

    it('retries when rmSync throws EPERM and eventually succeeds', async () => {
      let calls = 0;
      vi.mocked(fs.existsSync).mockImplementation(() => calls < 3); // true for first 3 checks, then false
      (fs as any).rmSync.mockImplementation(() => {
        calls += 1;
        if (calls < 3) {
          const err = new Error('EPERM') as Error & { code: string };
          err.code = 'EPERM';
          throw err;
        }
      });
      await removeWithLockWait('C:/dep', 'TestDep', 5000);
      expect((fs as any).rmSync).toHaveBeenCalledTimes(3);
    });

    it('throws after the budget elapses when rmSync keeps failing with EPERM', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      (fs as any).rmSync.mockImplementation(() => {
        const err = new Error('EPERM') as Error & { code: string };
        err.code = 'EPERM';
        throw err;
      });
      await expect(removeWithLockWait('C:/dep', 'TestDep', 600)).rejects.toThrow(/EPERM/);
    });

    it('throws immediately on a non-transient error (e.g. EINVAL)', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      (fs as any).rmSync.mockImplementation(() => {
        const err = new Error('EINVAL') as Error & { code: string };
        err.code = 'EINVAL';
        throw err;
      });
      await expect(removeWithLockWait('C:/dep', 'TestDep', 5000)).rejects.toThrow(/EINVAL/);
      expect((fs as any).rmSync).toHaveBeenCalledTimes(1);
    });

    it('keeps waiting when rmSync silently leaves the directory in place (Windows pending-deletion)', async () => {
      let existsCalls = 0;
      // Stays true until the 5th existsSync call; rmSync always "succeeds" (returns undefined).
      vi.mocked(fs.existsSync).mockImplementation(() => {
        existsCalls += 1;
        return existsCalls < 5;
      });
      (fs as any).rmSync.mockImplementation(() => undefined);
      await removeWithLockWait('C:/dep', 'TestDep', 5000);
      // rmSync attempted multiple times because each attempt found existsSync still true post-rm.
      expect((fs as any).rmSync.mock.calls.length).toBeGreaterThan(1);
    });
  });

  describe('mkdirWithLockWait', () => {
    beforeEach(() => {
      vi.mocked(fs.mkdirSync).mockReset();
      vi.mocked(ext.outputChannel.appendLog).mockReset();
    });

    it('calls mkdirSync once on success', async () => {
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
      await mkdirWithLockWait('C:/dep', 'TestDep', 1000);
      expect(fs.mkdirSync).toHaveBeenCalledWith('C:/dep', { recursive: true });
      expect(fs.mkdirSync).toHaveBeenCalledTimes(1);
    });

    it('retries on EPERM and ultimately resolves', async () => {
      let calls = 0;
      vi.mocked(fs.mkdirSync).mockImplementation(() => {
        calls += 1;
        if (calls < 3) {
          const err = new Error('EPERM') as Error & { code: string };
          err.code = 'EPERM';
          throw err;
        }
        return undefined;
      });
      await mkdirWithLockWait('C:/dep', 'TestDep', 5000);
      expect(calls).toBe(3);
    });

    it('throws after budget elapses when mkdirSync keeps failing', async () => {
      vi.mocked(fs.mkdirSync).mockImplementation(() => {
        const err = new Error('EPERM') as Error & { code: string };
        err.code = 'EPERM';
        throw err;
      });
      await expect(mkdirWithLockWait('C:/dep', 'TestDep', 600)).rejects.toThrow(/EPERM/);
    });

    it('throws immediately on a non-transient error', async () => {
      vi.mocked(fs.mkdirSync).mockImplementation(() => {
        const err = new Error('ENOSPC') as Error & { code: string };
        err.code = 'ENOSPC';
        throw err;
      });
      await expect(mkdirWithLockWait('C:/dep', 'TestDep', 5000)).rejects.toThrow(/ENOSPC/);
      expect(fs.mkdirSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('useBinariesDependencies', () => {
    it('should return true if binaries dependencies are used', async () => {
      (getGlobalSetting as Mock).mockReturnValue(true);

      const result = await useBinariesDependencies();

      expect(result).toBe(true);
    });

    it('should return false if binaries dependencies are not used', async () => {
      (getGlobalSetting as Mock).mockReturnValue(false);

      const result = await useBinariesDependencies();

      expect(result).toBe(false);
    });

    it('should return false for devContainer workspace regardless of setting', async () => {
      (getGlobalSetting as Mock).mockReturnValue(true);

      // Mock devContainer detection
      const devContainerModule = await import('../devContainerUtils');
      vi.mocked(devContainerModule.isDevContainerWorkspace).mockResolvedValue(true);

      const result = await useBinariesDependencies();

      expect(result).toBe(false);
    });

    it('should respect setting when not in devContainer workspace', async () => {
      (getGlobalSetting as Mock).mockReturnValue(true);

      // Mock devContainer detection
      const devContainerModule = await import('../devContainerUtils');
      vi.mocked(devContainerModule.isDevContainerWorkspace).mockResolvedValue(false);

      const result = await useBinariesDependencies();

      expect(result).toBe(true);
    });
  });

  describe('verifyExtractedZip', () => {
    const realFs = require('node:fs');
    const os = require('os');
    const pathMod = require('path');
    const AdmZip = require('adm-zip');
    let workDir: string;
    let zipPath: string;
    let extractDir: string;

    beforeEach(() => {
      // The global test-setup mocks fs.existsSync and fs.statSync to return undefined,
      // which would make verifyExtractedZip see every file as missing. Re-route the
      // sync filesystem calls to the real Node fs implementation for these tests.
      (fs.existsSync as Mock).mockImplementation((p: string) => realFs.existsSync(p));
      (fs.statSync as unknown as Mock) = vi.fn();
      (fs.statSync as Mock).mockImplementation((p: string) => realFs.statSync(p));

      workDir = realFs.mkdtempSync(pathMod.join(os.tmpdir(), 'verifyextract-'));
      zipPath = pathMod.join(workDir, 'test.zip');
      extractDir = pathMod.join(workDir, 'extracted');
      realFs.mkdirSync(extractDir);

      const zip = new AdmZip();
      zip.addFile('a.txt', Buffer.from('hello'));
      zip.addFile('sub/b.txt', Buffer.from('world!'));
      zip.addFile('sub/c.bin', Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]));
      zip.writeZip(zipPath);
    });

    afterEach(() => {
      try {
        realFs.rmSync(workDir, { recursive: true, force: true });
      } catch {
        // best effort
      }
    });

    it('passes when every zip entry exists on disk with the expected size', async () => {
      const { verifyExtractedZip } = await import('../binaries');
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractDir, true, true);

      expect(() => verifyExtractedZip(zip, extractDir)).not.toThrow();
    });

    it('throws BundleExtractionError(missing) when an extracted file is deleted', async () => {
      const { verifyExtractedZip, BundleExtractionError } = await import('../binaries');
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractDir, true, true);
      realFs.rmSync(pathMod.join(extractDir, 'sub', 'b.txt'));

      let caught: unknown;
      try {
        verifyExtractedZip(zip, extractDir);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(BundleExtractionError);
      expect((caught as InstanceType<typeof BundleExtractionError>).kind).toBe('missing');
      expect((caught as InstanceType<typeof BundleExtractionError>).entryName).toContain('b.txt');
    });

    it('throws BundleExtractionError(sizeMismatch) when an extracted file is truncated', async () => {
      const { verifyExtractedZip, BundleExtractionError } = await import('../binaries');
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractDir, true, true);
      const target = pathMod.join(extractDir, 'sub', 'c.bin');
      realFs.writeFileSync(target, Buffer.from([0x00])); // truncate from 5 bytes to 1

      let caught: unknown;
      try {
        verifyExtractedZip(zip, extractDir);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(BundleExtractionError);
      expect((caught as InstanceType<typeof BundleExtractionError>).kind).toBe('sizeMismatch');
      expect((caught as InstanceType<typeof BundleExtractionError>).expectedSize).toBe(5);
      expect((caught as InstanceType<typeof BundleExtractionError>).actualSize).toBe(1);
    });

    it('throws BundleExtractionError(missing) when extractDir is empty but the zip lists files', async () => {
      const { verifyExtractedZip, BundleExtractionError } = await import('../binaries');
      const zip = new AdmZip(zipPath);
      // skip extractAllTo: simulate "extraction failed completely"

      let caught: unknown;
      try {
        verifyExtractedZip(zip, extractDir);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(BundleExtractionError);
      expect((caught as InstanceType<typeof BundleExtractionError>).kind).toBe('missing');
    });

    it('is a no-op for a zip that contains no file entries', async () => {
      const { verifyExtractedZip } = await import('../binaries');
      const emptyZipPath = pathMod.join(workDir, 'empty.zip');
      const emptyZip = new AdmZip();
      emptyZip.writeZip(emptyZipPath);
      const zip = new AdmZip(emptyZipPath);

      expect(() => verifyExtractedZip(zip, extractDir)).not.toThrow();
    });
  });
});
