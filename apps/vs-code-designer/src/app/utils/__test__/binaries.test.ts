import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import {
  downloadAndExtractDependency,
  downloadFileWithTransportVerification,
  DownloadIntegrityError,
  binariesExist,
  binariesExistSync,
  getLatestDotNetVersion,
  getLatestFunctionCoreToolsVersion,
  getLatestNodeJsVersion,
  getNodeJsBinariesReleaseUrl,
  getFunctionCoreToolsBinariesReleaseUrl,
  getDotNetBinariesReleaseUrl,
  getCpuArchitecture,
  getDependencyTimeout,
  getNodeJsSha256,
  getFuncCoreToolsSha256,
  computeFileSha256,
  verifyDependencyIntegrity,
  writeDependencyIntegrityManifest,
  installBinaries,
  useBinariesDependencies,
  removeWithLockWait,
  mkdirWithLockWait,
} from '../binaries';
import { ext } from '../../../extensionVariables';
import {
  DependencyVersion,
  autoRuntimeDependenciesValidationAndInstallationSetting,
  dotnetDependencyName,
  funcCoreToolsBinaryPathSettingKey,
  funcDependencyName,
  nodeJsBinaryPathSettingKey,
  dotNetBinaryPathSettingKey,
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

  describe('downloadFileWithTransportVerification', () => {
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

      const result = await downloadFileWithTransportVerification(context, url, destPath, dependencyName);

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

      const result = await downloadFileWithTransportVerification(context, url, destPath, dependencyName);

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

      await expect(downloadFileWithTransportVerification(context, url, destPath, dependencyName, 3)).rejects.toBeInstanceOf(
        DownloadIntegrityError
      );
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

      const result = await downloadFileWithTransportVerification(context, url, destPath, dependencyName, 3);

      expect(result.actualSize).toBe(11);
      expect(axios.get).toHaveBeenCalledTimes(2);
      expect(context.telemetry.properties[`${dependencyName}DownloadAttempts`]).toBe('2');
    }, 10000);

    it('does not retry on 4xx HTTP errors', async () => {
      const err = Object.assign(new Error('Not Found'), { response: { status: 404 } });
      (axios.get as Mock).mockRejectedValueOnce(err);

      await expect(downloadFileWithTransportVerification(context, url, destPath, dependencyName, 3)).rejects.toBe(err);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('retries on 5xx HTTP errors', async () => {
      const err5xx = Object.assign(new Error('Server Error'), { response: { status: 503 } });
      (axios.get as Mock).mockRejectedValueOnce(err5xx);
      mockWriter();
      mockAxiosStream(['ok'], { 'content-length': '2' });

      const result = await downloadFileWithTransportVerification(context, url, destPath, dependencyName, 3);
      expect(result.actualSize).toBe(2);
      expect(axios.get).toHaveBeenCalledTimes(2);
    }, 10000);

    it('requests identity encoding so Content-Length matches the bytes piped to disk', async () => {
      mockWriter();
      mockAxiosStream(['hello world'], { 'content-length': '11' });

      await downloadFileWithTransportVerification(context, url, destPath, dependencyName);

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

      const result = await downloadFileWithTransportVerification(context, url, destPath, dependencyName);

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

      await expect(downloadFileWithTransportVerification(context, url, destPath, dependencyName, 3)).rejects.toBeInstanceOf(
        DownloadIntegrityError
      );
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
      expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(`FuncCoreTools binary is missing: ${funcBinary}`);
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
      expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(`${nodeJsDependencyName} binary path updated: ${nodeExeBinary}`);
      expect(ext.outputChannel.appendLog).not.toHaveBeenCalledWith(`NodeJs binary is missing: ${staleNodeBinary}`);
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
      expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(`NodeJs binary is missing: ${staleNodeBinary}`);
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

    describe('Windows .exe fallback', () => {
      const originalPlatform = process.platform;

      afterEach(() => {
        Object.defineProperty(process, 'platform', { value: originalPlatform });
        vi.unstubAllGlobals();
      });

      it('should return true and update setting when .exe variant exists on Windows for NodeJs', async () => {
        vi.stubGlobal('process', { ...process, platform: 'win32' });
        const nodeFolder = path.join('binariesLocation', nodeJsDependencyName);
        const nodeBinaryNoExe = path.join(nodeFolder, 'node');
        const nodeBinaryExe = path.join(nodeFolder, 'node.exe');

        (fs.existsSync as Mock).mockImplementation((filePath: string) => {
          if (filePath === nodeFolder) {
            return true;
          }
          if (filePath === nodeBinaryExe) {
            return true;
          }
          return false;
        });
        const devContainerModule = await import('../devContainerUtils');
        vi.mocked(devContainerModule.isDevContainerWorkspace).mockResolvedValue(false);
        (getGlobalSetting as Mock).mockImplementation((settingName?: string) =>
          settingName === nodeJsBinaryPathSettingKey ? nodeBinaryNoExe : 'binariesLocation'
        );

        const result = await binariesExist(nodeJsDependencyName);

        expect(result).toBe(true);
        expect(updateGlobalSetting).toHaveBeenCalledWith(nodeJsBinaryPathSettingKey, nodeBinaryExe);
      });

      it('should return true and update setting when .exe variant exists on Windows for FuncCoreTools', async () => {
        vi.stubGlobal('process', { ...process, platform: 'win32' });
        const funcFolder = path.join('binariesLocation', funcDependencyName);
        const funcBinaryNoExe = path.join(funcFolder, 'func');
        const funcBinaryExe = path.join(funcFolder, 'func.exe');

        (fs.existsSync as Mock).mockImplementation((filePath: string) => {
          if (filePath === funcFolder) {
            return true;
          }
          if (filePath === funcBinaryExe) {
            return true;
          }
          return false;
        });
        const devContainerModule = await import('../devContainerUtils');
        vi.mocked(devContainerModule.isDevContainerWorkspace).mockResolvedValue(false);
        (getGlobalSetting as Mock).mockImplementation((settingName?: string) =>
          settingName === funcCoreToolsBinaryPathSettingKey ? funcBinaryNoExe : 'binariesLocation'
        );

        const result = await binariesExist(funcDependencyName);

        expect(result).toBe(true);
        expect(updateGlobalSetting).toHaveBeenCalledWith(funcCoreToolsBinaryPathSettingKey, funcBinaryExe);
      });

      it('should return true and update setting when .exe variant exists on Windows for DotNetSDK', async () => {
        vi.stubGlobal('process', { ...process, platform: 'win32' });
        const dotnetFolder = path.join('binariesLocation', dotnetDependencyName);
        const dotnetBinaryNoExe = path.join(dotnetFolder, 'dotnet');
        const dotnetBinaryExe = path.join(dotnetFolder, 'dotnet.exe');

        (fs.existsSync as Mock).mockImplementation((filePath: string) => {
          if (filePath === dotnetFolder) {
            return true;
          }
          if (filePath === dotnetBinaryExe) {
            return true;
          }
          return false;
        });
        const devContainerModule = await import('../devContainerUtils');
        vi.mocked(devContainerModule.isDevContainerWorkspace).mockResolvedValue(false);
        (getGlobalSetting as Mock).mockImplementation((settingName?: string) =>
          settingName === dotNetBinaryPathSettingKey ? dotnetBinaryNoExe : 'binariesLocation'
        );

        const result = await binariesExist(dotnetDependencyName);

        expect(result).toBe(true);
        expect(updateGlobalSetting).toHaveBeenCalledWith(dotNetBinaryPathSettingKey, dotnetBinaryExe);
      });

      it('should still return false on Windows when neither base nor .exe variant exists', async () => {
        vi.stubGlobal('process', { ...process, platform: 'win32' });
        const funcFolder = path.join('binariesLocation', funcDependencyName);
        const funcBinaryNoExe = path.join(funcFolder, 'func');

        (fs.existsSync as Mock).mockImplementation((filePath: string) => filePath === funcFolder);
        const devContainerModule = await import('../devContainerUtils');
        vi.mocked(devContainerModule.isDevContainerWorkspace).mockResolvedValue(false);
        (getGlobalSetting as Mock).mockImplementation((settingName?: string) =>
          settingName === funcCoreToolsBinaryPathSettingKey ? funcBinaryNoExe : 'binariesLocation'
        );

        const result = await binariesExist(funcDependencyName);

        expect(result).toBe(false);
        expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(`FuncCoreTools binary is missing: ${funcBinaryNoExe}`);
      });

      it('should not try .exe fallback when path already ends with .exe', async () => {
        vi.stubGlobal('process', { ...process, platform: 'win32' });
        const funcFolder = path.join('binariesLocation', funcDependencyName);
        const funcBinaryExe = path.join(funcFolder, 'func.exe');

        (fs.existsSync as Mock).mockImplementation((filePath: string) => filePath === funcFolder);
        const devContainerModule = await import('../devContainerUtils');
        vi.mocked(devContainerModule.isDevContainerWorkspace).mockResolvedValue(false);
        (getGlobalSetting as Mock).mockImplementation((settingName?: string) =>
          settingName === funcCoreToolsBinaryPathSettingKey ? funcBinaryExe : 'binariesLocation'
        );

        const result = await binariesExist(funcDependencyName);

        expect(result).toBe(false);
        expect(updateGlobalSetting).not.toHaveBeenCalled();
      });

      it('should not try .exe fallback on non-Windows platforms', async () => {
        vi.stubGlobal('process', { ...process, platform: 'linux' });
        const nodeFolder = path.join('binariesLocation', nodeJsDependencyName);
        const nodeBinaryNoExe = path.join(nodeFolder, 'node');

        (fs.existsSync as Mock).mockImplementation((filePath: string) => filePath === nodeFolder);
        const devContainerModule = await import('../devContainerUtils');
        vi.mocked(devContainerModule.isDevContainerWorkspace).mockResolvedValue(false);
        (getGlobalSetting as Mock).mockImplementation((settingName?: string) =>
          settingName === nodeJsBinaryPathSettingKey ? nodeBinaryNoExe : 'binariesLocation'
        );

        const result = await binariesExist(nodeJsDependencyName);

        expect(result).toBe(false);
        expect(updateGlobalSetting).not.toHaveBeenCalled();
      });
    });
  });

  describe('binariesExistSync', () => {
    it('should return false when automatic runtime dependencies are disabled', async () => {
      const devContainerModule = await import('../devContainerUtils');
      vi.mocked(devContainerModule.isDevContainerWorkspaceSync).mockReturnValue(false);
      (getGlobalSetting as Mock).mockImplementation((settingName?: string) =>
        settingName === autoRuntimeDependenciesValidationAndInstallationSetting ? false : 'binariesLocation'
      );

      const result = binariesExistSync(funcDependencyName);

      expect(result).toBe(false);
      expect(fs.existsSync).not.toHaveBeenCalled();
    });

    it('should return false for devContainer workspace regardless of automatic runtime dependency setting', async () => {
      const devContainerModule = await import('../devContainerUtils');
      vi.mocked(devContainerModule.isDevContainerWorkspaceSync).mockReturnValue(true);
      (getGlobalSetting as Mock).mockReturnValue(true);

      const result = binariesExistSync(funcDependencyName);

      expect(result).toBe(false);
      expect(fs.existsSync).not.toHaveBeenCalled();
    });

    it('should return true when the configured binary exists', async () => {
      const devContainerModule = await import('../devContainerUtils');
      vi.mocked(devContainerModule.isDevContainerWorkspaceSync).mockReturnValue(false);
      const funcFolder = path.join('binariesLocation', funcDependencyName);
      const funcBinary = path.join(funcFolder, 'func.exe');
      (getGlobalSetting as Mock).mockImplementation((settingName?: string) => {
        if (settingName === autoRuntimeDependenciesValidationAndInstallationSetting) {
          return true;
        }
        if (settingName === funcCoreToolsBinaryPathSettingKey) {
          return funcBinary;
        }
        return 'binariesLocation';
      });
      (fs.existsSync as Mock).mockImplementation((filePath: string) => filePath === funcFolder || filePath === funcBinary);

      const result = binariesExistSync(funcDependencyName);

      expect(result).toBe(true);
    });

    it('should return false when the dependency folder exists but the configured binary is missing', async () => {
      const devContainerModule = await import('../devContainerUtils');
      vi.mocked(devContainerModule.isDevContainerWorkspaceSync).mockReturnValue(false);
      const funcFolder = path.join('binariesLocation', funcDependencyName);
      const funcBinary = path.join(funcFolder, 'func.exe');
      (getGlobalSetting as Mock).mockImplementation((settingName?: string) => {
        if (settingName === autoRuntimeDependenciesValidationAndInstallationSetting) {
          return true;
        }
        if (settingName === funcCoreToolsBinaryPathSettingKey) {
          return funcBinary;
        }
        return 'binariesLocation';
      });
      (fs.existsSync as Mock).mockImplementation((filePath: string) => filePath === funcFolder);

      const result = binariesExistSync(funcDependencyName);

      expect(result).toBe(false);
      expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(`FuncCoreTools binary is missing: ${funcBinary}`);
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

    it('should return fallback .NET version without showing an error when GitHub latest-version lookup fails', async () => {
      const showErrorMessage = vi.fn();
      (axios.get as Mock).mockRejectedValue(new Error('Request failed with status code 403'));

      vscode.window.showErrorMessage = showErrorMessage;

      const result = await getLatestDotNetVersion(context, majorVersion);
      expect(result).toBe(DependencyVersion.dotnet8);
      expect(showErrorMessage).not.toHaveBeenCalled();
      expect(context.telemetry.properties.latestVersionSource).toBe('fallback');
      expect(context.telemetry.properties.errorNewestDotNetVersion).toContain('Request failed with status code 403');
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

    it('should return the fallback Function Core Tools version without showing an error when GitHub lookup fails', async () => {
      const showErrorMessage = vi.fn();
      (isNodeJsInstalled as Mock).mockResolvedValue(false);
      (axios.get as Mock).mockRejectedValue(new Error('Request failed with status code 403'));

      vscode.window.showErrorMessage = showErrorMessage;

      const result = await getLatestFunctionCoreToolsVersion(context, majorVersion);

      expect(result).toBe(DependencyVersion.funcCoreTools);
      expect(showErrorMessage).not.toHaveBeenCalled();
      expect(context.telemetry.properties.latestVersionSource).toBe('fallback');
      expect(context.telemetry.properties.errorLatestFunctionCoretoolsVersion).toContain('Request failed with status code 403');
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
      const response = [{ tag_name: 'v14.1.0' }, { tag_name: 'v14.0.0' }];
      (axios.get as any).mockResolvedValue({ data: response, status: 200 });
      const result = await getLatestNodeJsVersion(context, majorVersion);

      expect(result).toBe('14.1.0');
      expect(context.telemetry.properties.latestVersionSource).toBe('github');
      expect(context.telemetry.properties.latestNodeJSVersion).toBe('14.1.0');
    });

    it('should return the latest Node.js version when requested version includes minor and patch', async () => {
      const response = [{ tag_name: 'v20.0.0' }, { tag_name: 'v18.20.8' }, { tag_name: 'v18.0.0' }];
      (axios.get as any).mockResolvedValue({ data: response, status: 200 });

      const result = await getLatestNodeJsVersion(context, '18.0.0');

      expect(result).toBe('18.20.8');
    });

    it('should return fallback Node.js version without showing an error when latest-version lookups fail', async () => {
      const showErrorMessage = vi.fn();
      (axios.get as Mock).mockRejectedValue(new Error('Request failed with status code 403'));

      vscode.window.showErrorMessage = showErrorMessage;

      const result = await getLatestNodeJsVersion(context, majorVersion);
      expect(result).toBe(DependencyVersion.nodeJs);
      expect(showErrorMessage).not.toHaveBeenCalled();
      expect(context.telemetry.properties.latestNodeJSVersion).toBe('fallback');
      expect(context.telemetry.properties.latestVersionSource).toBe('fallback');
      expect(context.telemetry.properties.errorLatestNodeJsVersion).toContain('Request failed with status code 403');
    });

    it('should return fallback nodejs version when requested version is not found in the list', async () => {
      const response = [{ tag_name: 'v20.0.0' }, { tag_name: 'v18.0.0' }, { tag_name: 'v16.0.0' }];
      (axios.get as any).mockResolvedValue({ data: response, status: 200 });

      const result = await getLatestNodeJsVersion(context, '99');

      expect(result).toBe(DependencyVersion.nodeJs);
      expect(context.telemetry.properties.latestNodeJSVersion).toBe('fallback-no-match');
      expect(context.telemetry.properties.latestVersionSource).toBe('fallback');
      expect(context.telemetry.properties.errorLatestNodeJsVersion).toBe('No matching Node JS version found.');
    });

    it('should return fallback nodejs version when no major version is sent', async () => {
      const result = await getLatestNodeJsVersion(context);
      expect(result).toBe(DependencyVersion.nodeJs);
      expect(context.telemetry.properties.latestVersionSource).toBe('fallback');
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

  describe('getNodeJsSha256', () => {
    let context: IActionContext;

    beforeEach(() => {
      context = { telemetry: { properties: {} } } as IActionContext;
    });

    it('returns the checksum for the matching artifact file name', async () => {
      const artifactFileName = 'node-v20.19.4-win-x64.zip';
      const downloadUrl = `https://nodejs.org/dist/v20.19.4/${artifactFileName}`;
      const expectedHash = '1bf83e5958157d13673507349238236aec4f6efc95cf426cbe126a999a3e4c0b';
      (axios.get as Mock).mockResolvedValue({
        data: `deadbeef${'0'.repeat(56)}  node-v20.19.4-linux-x64.tar.gz\n${expectedHash}  ${artifactFileName}\n`,
      });

      const result = await getNodeJsSha256(context, downloadUrl);

      expect(result).toBe(expectedHash);
      expect(context.telemetry.properties.nodeJsChecksumResolved).toBe('true');
      expect(axios.get).toHaveBeenCalledWith('https://nodejs.org/dist/v20.19.4/SHASUMS256.txt', expect.any(Object));
    });

    it('returns undefined when the artifact is not listed', async () => {
      (axios.get as Mock).mockResolvedValue({ data: `${'a'.repeat(64)}  node-v20.19.4-linux-x64.tar.gz\n` });

      const result = await getNodeJsSha256(context, 'https://nodejs.org/dist/v20.19.4/node-v20.19.4-win-x64.zip');

      expect(result).toBeUndefined();
      expect(context.telemetry.properties.nodeJsChecksumResolved).toBe('false');
    });

    it('returns undefined when the checksum source is unreachable', async () => {
      (axios.get as Mock).mockRejectedValue(new Error('network down'));

      const result = await getNodeJsSha256(context, 'https://nodejs.org/dist/v20.19.4/node-v20.19.4-win-x64.zip');

      expect(result).toBeUndefined();
      expect(context.telemetry.properties.nodeJsChecksumResolved).toBe('false');
      expect(context.telemetry.properties.nodeJsChecksumError).toContain('network down');
    });
  });

  describe('getFuncCoreToolsSha256', () => {
    let context: IActionContext;

    beforeEach(() => {
      context = { telemetry: { properties: {} } } as IActionContext;
    });

    it('returns the checksum from the .sha2 sidecar', async () => {
      const downloadUrl =
        'https://github.com/Azure/azure-functions-core-tools/releases/download/4.12.1/Azure.Functions.Cli.win-x64.4.12.1.zip';
      const expectedHash = 'dcad8149f8a7ab6020d47476d23e61e56550a3a2aef3c5ca1c37743e2fad446b';
      (axios.get as Mock).mockResolvedValue({ data: `${expectedHash}\n` });

      const result = await getFuncCoreToolsSha256(context, downloadUrl);

      expect(result).toBe(expectedHash);
      expect(context.telemetry.properties.funcChecksumResolved).toBe('true');
      expect(axios.get).toHaveBeenCalledWith(`${downloadUrl}.sha2`, expect.any(Object));
    });

    it('returns undefined when the sidecar has no checksum', async () => {
      (axios.get as Mock).mockResolvedValue({ data: 'not-a-hash' });

      const result = await getFuncCoreToolsSha256(context, 'https://example.com/func.zip');

      expect(result).toBeUndefined();
      expect(context.telemetry.properties.funcChecksumResolved).toBe('false');
    });

    it('returns undefined when the sidecar request fails', async () => {
      (axios.get as Mock).mockRejectedValue(new Error('404 not found'));

      const result = await getFuncCoreToolsSha256(context, 'https://example.com/func.zip');

      expect(result).toBeUndefined();
      expect(context.telemetry.properties.funcChecksumResolved).toBe('false');
      expect(context.telemetry.properties.funcChecksumError).toContain('404');
    });
  });

  describe('computeFileSha256', () => {
    it('computes the streamed SHA256 hex digest of a file', async () => {
      const readable = new EventEmitter();
      (fs.createReadStream as Mock).mockReturnValue(readable);

      const promise = computeFileSha256('/tmp/file.zip');
      readable.emit('data', Buffer.from('hello world'));
      readable.emit('end');

      // SHA256 of "hello world"
      await expect(promise).resolves.toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
    });
  });

  describe('verifyDependencyIntegrity', () => {
    let context: IActionContext;

    beforeEach(() => {
      context = { telemetry: { properties: {} } } as IActionContext;
      (getGlobalSetting as Mock).mockReturnValue('binariesLocation');
    });

    it('returns true when every manifest file exists with the recorded size', async () => {
      const manifest = {
        dependencyName: funcDependencyName,
        createdAt: '2024-01-01T00:00:00.000Z',
        fileCount: 2,
        files: [
          { path: 'func.exe', size: 100 },
          { path: 'in-proc8/func.dll', size: 200 },
        ],
      };
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify(manifest));
      (fs.promises.stat as Mock).mockImplementation(async (filePath: string) => ({
        size: filePath.endsWith('func.exe') ? 100 : 200,
        isFile: () => true,
      }));

      const result = await verifyDependencyIntegrity(context, funcDependencyName);

      expect(result).toBe(true);
      expect(context.telemetry.properties.FuncCoreToolsIntegrityResult).toBe('passed');
    });

    it('returns false and schedules reinstall when the manifest is missing', async () => {
      (fs.existsSync as Mock).mockReturnValue(false);

      const result = await verifyDependencyIntegrity(context, funcDependencyName);

      expect(result).toBe(false);
      expect(context.telemetry.properties.FuncCoreToolsIntegrityResult).toBe('manifest-missing');
    });

    it('returns false when a recorded file is missing on disk', async () => {
      const manifest = {
        dependencyName: funcDependencyName,
        createdAt: '2024-01-01T00:00:00.000Z',
        fileCount: 1,
        files: [{ path: 'in-proc8/func.dll', size: 200 }],
      };
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify(manifest));
      (fs.promises.stat as Mock).mockRejectedValue(new Error('ENOENT'));

      const result = await verifyDependencyIntegrity(context, funcDependencyName);

      expect(result).toBe(false);
      expect(context.telemetry.properties.FuncCoreToolsIntegrityResult).toBe('file-missing');
      expect(context.telemetry.properties.FuncCoreToolsIntegrityMissingFile).toBe('in-proc8/func.dll');
    });

    it('returns false when a recorded file has a different size', async () => {
      const manifest = {
        dependencyName: funcDependencyName,
        createdAt: '2024-01-01T00:00:00.000Z',
        fileCount: 1,
        files: [{ path: 'func.exe', size: 100 }],
      };
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify(manifest));
      (fs.promises.stat as Mock).mockResolvedValue({ size: 999, isFile: () => true });

      const result = await verifyDependencyIntegrity(context, funcDependencyName);

      expect(result).toBe(false);
      expect(context.telemetry.properties.FuncCoreToolsIntegrityResult).toBe('size-mismatch');
    });

    it('returns false when a recorded file is no longer a regular file', async () => {
      const manifest = {
        dependencyName: funcDependencyName,
        createdAt: '2024-01-01T00:00:00.000Z',
        fileCount: 1,
        files: [{ path: 'func.exe', size: 100 }],
      };
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify(manifest));
      (fs.promises.stat as Mock).mockResolvedValue({ size: 100, isFile: () => false });

      const result = await verifyDependencyIntegrity(context, funcDependencyName);

      expect(result).toBe(false);
      expect(context.telemetry.properties.FuncCoreToolsIntegrityResult).toBe('not-a-file');
      expect(context.telemetry.properties.FuncCoreToolsIntegrityMismatchFile).toBe('func.exe');
    });

    it('returns false when the manifest is not valid JSON', async () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue('not-json');

      const result = await verifyDependencyIntegrity(context, funcDependencyName);

      expect(result).toBe(false);
      expect(context.telemetry.properties.FuncCoreToolsIntegrityResult).toBe('error');
    });

    it('returns false when the manifest files property is not an array', async () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue(
        JSON.stringify({ dependencyName: funcDependencyName, createdAt: '2024-01-01T00:00:00.000Z', fileCount: 0, files: 'nope' })
      );

      const result = await verifyDependencyIntegrity(context, funcDependencyName);

      expect(result).toBe(false);
      expect(context.telemetry.properties.FuncCoreToolsIntegrityResult).toBe('manifest-invalid');
    });

    it('returns false when the binaries location setting is not configured', async () => {
      (getGlobalSetting as Mock).mockReturnValue(undefined);

      const result = await verifyDependencyIntegrity(context, funcDependencyName);

      expect(result).toBe(false);
      expect(fs.existsSync).not.toHaveBeenCalled();
    });

    it('verifies a NodeJs install against its manifest', async () => {
      const manifest = {
        dependencyName: nodeJsDependencyName,
        createdAt: '2024-01-01T00:00:00.000Z',
        fileCount: 2,
        files: [
          { path: 'node.exe', size: 300 },
          { path: 'node_modules/npm/bin/npm', size: 50 },
        ],
      };
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify(manifest));
      (fs.promises.stat as Mock).mockImplementation(async (filePath: string) => ({
        size: filePath.endsWith('node.exe') ? 300 : 50,
        isFile: () => true,
      }));

      const result = await verifyDependencyIntegrity(context, nodeJsDependencyName);

      expect(result).toBe(true);
      expect(context.telemetry.properties.NodeJsIntegrityResult).toBe('passed');
    });

    it('verifies a large manifest spanning multiple stat batches', async () => {
      const files = Array.from({ length: 200 }, (_, i) => ({ path: `lib/file-${i}.dll`, size: i + 1 }));
      const manifest = {
        dependencyName: funcDependencyName,
        createdAt: '2024-01-01T00:00:00.000Z',
        fileCount: files.length,
        files,
      };
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify(manifest));
      (fs.promises.stat as Mock).mockImplementation(async (filePath: string) => {
        const index = Number((filePath.match(/file-(\d+)\.dll$/) as RegExpMatchArray)[1]);
        return { size: index + 1, isFile: () => true };
      });

      const result = await verifyDependencyIntegrity(context, funcDependencyName);

      expect(result).toBe(true);
      expect(context.telemetry.properties.FuncCoreToolsIntegrityResult).toBe('passed');
      // Every recorded file must be stat'd, proving the batched loop covers the whole manifest.
      expect((fs.promises.stat as Mock).mock.calls).toHaveLength(files.length);
    });

    it('returns false when a file in a later batch has a size mismatch', async () => {
      const files = Array.from({ length: 130 }, (_, i) => ({ path: `lib/file-${i}.dll`, size: 10 }));
      const manifest = {
        dependencyName: funcDependencyName,
        createdAt: '2024-01-01T00:00:00.000Z',
        fileCount: files.length,
        files,
      };
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue(JSON.stringify(manifest));
      // File index 100 lives in the third 64-file batch; give it the wrong size on disk.
      (fs.promises.stat as Mock).mockImplementation(async (filePath: string) => {
        const index = Number((filePath.match(/file-(\d+)\.dll$/) as RegExpMatchArray)[1]);
        return { size: index === 100 ? 999 : 10, isFile: () => true };
      });

      const result = await verifyDependencyIntegrity(context, funcDependencyName);

      expect(result).toBe(false);
      expect(context.telemetry.properties.FuncCoreToolsIntegrityResult).toBe('size-mismatch');
      expect(context.telemetry.properties.FuncCoreToolsIntegrityMismatchFile).toBe('lib/file-100.dll');
    });
  });

  describe('writeDependencyIntegrityManifest', () => {
    let context: IActionContext;

    beforeEach(() => {
      context = { telemetry: { properties: {} } } as IActionContext;
    });

    it('writes a manifest with path + size for every file', () => {
      const targetFolder = path.join('binariesLocation', funcDependencyName);
      (fs.readdirSync as Mock).mockImplementation((dir: string) => {
        if (dir === targetFolder) {
          return [
            { name: 'func.exe', isDirectory: () => false, isFile: () => true },
            { name: 'README.md', isDirectory: () => false, isFile: () => true },
            { name: 'in-proc8', isDirectory: () => true, isFile: () => false },
          ];
        }
        return [{ name: 'func.dll', isDirectory: () => false, isFile: () => true }];
      });
      (fs.statSync as Mock).mockImplementation((filePath: string) => ({
        size: filePath.endsWith('func.exe') ? 100 : 200,
      }));

      writeDependencyIntegrityManifest(context, targetFolder, funcDependencyName);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join(targetFolder, '.logicapps-integrity.json'),
        expect.stringContaining('func.exe')
      );
      const written = JSON.parse((fs.writeFileSync as Mock).mock.calls[0][1]);
      expect(written.fileCount).toBe(3);
      const funcExe = written.files.find((f: { path: string }) => f.path === 'func.exe');
      const funcDll = written.files.find((f: { path: string }) => f.path === 'in-proc8/func.dll');
      const readme = written.files.find((f: { path: string }) => f.path === 'README.md');
      expect(funcExe).toEqual({ path: 'func.exe', size: 100 });
      expect(funcDll).toEqual({ path: 'in-proc8/func.dll', size: 200 });
      expect(readme).toEqual({ path: 'README.md', size: 200 });
      expect(written.files.some((f: { sha256?: string }) => f.sha256 !== undefined)).toBe(false);
      expect(context.telemetry.properties.FuncCoreToolsIntegrityManifestWritten).toBe('true');
    });

    it('records size-only entries for NodeJs files', () => {
      const targetFolder = path.join('binariesLocation', nodeJsDependencyName);
      (fs.readdirSync as Mock).mockImplementation((dir: string) => {
        if (dir === targetFolder) {
          return [
            { name: 'node.exe', isDirectory: () => false, isFile: () => true },
            { name: 'npm.cmd', isDirectory: () => false, isFile: () => true },
          ];
        }
        return [];
      });
      (fs.statSync as Mock).mockReturnValue({ size: 42 });

      writeDependencyIntegrityManifest(context, targetFolder, nodeJsDependencyName);

      const written = JSON.parse((fs.writeFileSync as Mock).mock.calls[0][1]);
      const nodeExe = written.files.find((f: { path: string }) => f.path === 'node.exe');
      const npmCmd = written.files.find((f: { path: string }) => f.path === 'npm.cmd');
      expect(nodeExe).toEqual({ path: 'node.exe', size: 42 });
      expect(npmCmd).toEqual({ path: 'npm.cmd', size: 42 });
    });

    it('records telemetry but does not throw when writing the manifest fails', () => {
      const targetFolder = path.join('binariesLocation', funcDependencyName);
      (fs.readdirSync as Mock).mockReturnValue([]);
      (fs.writeFileSync as Mock).mockImplementation(() => {
        throw new Error('disk full');
      });

      expect(() => writeDependencyIntegrityManifest(context, targetFolder, funcDependencyName)).not.toThrow();
      expect(context.telemetry.properties.FuncCoreToolsIntegrityManifestWritten).toBe('false');
      expect(context.telemetry.properties.FuncCoreToolsIntegrityManifestError).toContain('disk full');
    });

    it('excludes the integrity manifest itself from the recorded file list', () => {
      const targetFolder = path.join('binariesLocation', funcDependencyName);
      (fs.readdirSync as Mock).mockImplementation((dir: string) => {
        if (dir === targetFolder) {
          return [
            { name: 'func.exe', isDirectory: () => false, isFile: () => true },
            { name: '.logicapps-integrity.json', isDirectory: () => false, isFile: () => true },
          ];
        }
        return [];
      });
      (fs.statSync as Mock).mockReturnValue({ size: 100 });

      writeDependencyIntegrityManifest(context, targetFolder, funcDependencyName);

      const written = JSON.parse((fs.writeFileSync as Mock).mock.calls[0][1]);
      expect(written.fileCount).toBe(1);
      expect(written.files.map((f: { path: string }) => f.path)).toEqual(['func.exe']);
      expect(written.files).not.toContainEqual(expect.objectContaining({ path: '.logicapps-integrity.json' }));
    });
  });
});
