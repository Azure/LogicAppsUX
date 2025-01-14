import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
import * as vscode from 'vscode';
import * as semver from 'semver';
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
import { DependencyVersion, Platform, dotnetDependencyName, funcPackageName } from '../../../constants';
import { executeCommand } from '../funcCoreTools/cpUtils';
import { getNpmCommand } from '../nodeJs/nodeJsVersion';
import { getGlobalSetting, getWorkspaceSetting, updateGlobalSetting } from '../vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

// vi.mock('fs');
// vi.mock('path');
// vi.mock('os');
// vi.mock('axios');
// vi.mock('vscode');
// vi.mock('semver');
// vi.mock('../../../extensionVariables');
// vi.mock('../funcCoreTools/cpUtils');
// vi.mock('../nodeJs/nodeJsVersion');
vi.mock('../../../onboarding');
vi.mock('../vsCodeConfig/settings');

describe('binaries', () => {
  //   describe('downloadAndExtractDependency', () => {
  //     it('should download and extract dependency', async () => {
  //       const context = {} as IActionContext;
  //       const downloadUrl = 'https://example.com/dependency.zip';
  //       const targetFolder = 'targetFolder';
  //       const dependencyName = 'dependency';
  //       const folderName = 'folderName';
  //       const dotNetVersion = '6.0';

  //       (axios as any).mockResolvedValue({
  //         data: {
  //           pipe: vi.fn().mockImplementation((writer) => {
  //             writer.emit('finish');
  //           }),
  //         },
  //       });

  //       await downloadAndExtractDependency(context, downloadUrl, targetFolder, dependencyName, folderName, dotNetVersion);

  //       expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
  //       expect(fs.chmodSync).toHaveBeenCalledWith(expect.any(String), 0o777);
  //       expect(executeCommand).toHaveBeenCalledWith(ext.outputChannel, undefined, 'echo', `Downloading dependency from: ${downloadUrl}`);
  //     });
  //   });

  //   describe('binariesExist', () => {
  //     it('should return true if binaries exist', () => {
  //       (fs.existsSync as any).mockReturnValue(true);
  //       (getGlobalSetting as any).mockReturnValue('binariesLocation');

  //       const result = binariesExist('dependencyName');

  //       expect(result).toBe(true);
  //     });

  //     it('should return false if binaries do not exist', () => {
  //       (fs.existsSync as any).mockReturnValue(false);
  //       (getGlobalSetting as any).mockReturnValue('binariesLocation');

  //       const result = binariesExist('dependencyName');

  //       expect(result).toBe(false);
  //     });
  //   });

  //   describe('getLatestDotNetVersion', () => {
  //     it('should return the latest .NET version', async () => {
  //       const context = {} as IActionContext;
  //       const majorVersion = '6';
  //       const response = [{ tag_name: 'v6.0.0' }];

  //       (axios.get as any).mockResolvedValue({ data: response });

  //       const result = await getLatestDotNetVersion(context, majorVersion);

  //       expect(result).toBe('6.0.0');
  //     });
  //   });

  //   describe('getLatestFunctionCoreToolsVersion', () => {
  //     it('should return the latest Function Core Tools version', async () => {
  //       const context = {} as IActionContext;
  //       const majorVersion = '3';
  //       const response = { tag_name: 'v3.0.0' };

  //       (axios.get as any).mockResolvedValue({ data: response });

  //       const result = await getLatestFunctionCoreToolsVersion(context, majorVersion);

  //       expect(result).toBe('3.0.0');
  //     });
  //   });

  //   describe('getLatestNodeJsVersion', () => {
  //     it('should return the latest Node.js version', async () => {
  //       const context = {} as IActionContext;
  //       const majorVersion = '14';
  //       const response = [{ tag_name: 'v14.0.0' }];

  //       (axios.get as any).mockResolvedValue({ data: response });

  //       const result = await getLatestNodeJsVersion(context, majorVersion);

  //       expect(result).toBe('14.0.0');
  //     });
  //   });

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
      (getWorkspaceSetting as any).mockReturnValue(60);

      const result = getDependencyTimeout();

      expect(result).toBe(60);
    });

    it('should throw an error for invalid timeout value', () => {
      (getWorkspaceSetting as any).mockReturnValue('invalid');

      expect(() => getDependencyTimeout()).toThrowError('The setting "invalid" must be a number, but instead found "invalid".');
    });
  });

  describe('installBinaries', () => {
    const context = {
      telemetry: {
        properties: {},
      },
    } as IActionContext;
    it('should install binaries', async () => {
      (getGlobalSetting as any).mockReturnValue(true);

      await installBinaries(context);

      expect(context.telemetry.properties.autoRuntimeDependenciesValidationAndInstallationSetting).toBe('true');
    });

    it('should not install binaries', async () => {
      (getGlobalSetting as any).mockReturnValue(false);

      await installBinaries(context);

      expect(context.telemetry.properties.autoRuntimeDependenciesValidationAndInstallationSetting).toBe('false');
    });
  });

  describe('useBinariesDependencies', () => {
    it('should return true if binaries dependencies are used', () => {
      (getGlobalSetting as any).mockReturnValue(true);

      const result = useBinariesDependencies();

      expect(result).toBe(true);
    });

    it('should return false if binaries dependencies are not used', () => {
      (getGlobalSetting as any).mockReturnValue(false);

      const result = useBinariesDependencies();

      expect(result).toBe(false);
    });
  });
});
