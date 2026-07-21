import {
  getBundleVersionNumber,
  getDependenciesVersion,
  getExtensionBundleFolder,
  getLatestVersionRange,
  addDefaultBundle,
  downloadExtensionBundle,
  resetCachedBundleVersion,
  isExtensionBundleDownloadInFlight,
  waitForExtensionBundleReady,
  getLastBundleInstallResult,
  assertExtensionBundleOnDiskHealthy,
  ensureExtensionBundleHealthy,
  invalidateBundleHealthCache,
  awaitBackgroundBundleDeepVerification,
} from '../bundleFeed';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as cp from 'child_process';
import { Readable } from 'stream';
import { createHash } from 'crypto';
import { extensionBundleId, defaultVersionRange, defaultExtensionBundlePathValue, lastBundleDeepVerificationKey } from '../../../constants';
import type { IHostJsonV2 } from '@microsoft/vscode-extension-logic-apps';
import * as cpUtils from '../funcCoreTools/cpUtils';
import * as feedModule from '../feed';
import * as binariesModule from '../binaries';
import { ext } from '../../../extensionVariables';

// Mock fs-extra
vi.mock('fs-extra', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    readdir: vi.fn(),
    stat: vi.fn(),
    lstat: vi.fn(),
    pathExists: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
    readFile: vi.fn(),
    createReadStream: vi.fn(),
    outputFile: vi.fn().mockResolvedValue(undefined),
    move: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(),
  exec: vi.fn(),
  spawn: vi.fn(),
}));

// Mock localize
vi.mock('../../localize', () => ({
  localize: vi.fn((key: string, defaultValue: string) => defaultValue),
}));

// Mock funcVersion
vi.mock('../funcCoreTools/funcVersion', () => ({
  getFunctionsCommand: vi.fn(() => 'func'),
}));

// Mock cpUtils
vi.mock('../funcCoreTools/cpUtils', () => ({
  executeCommand: vi.fn(),
}));

// Mock extensionVariables
vi.mock('../../../extensionVariables', () => ({
  ext: {
    outputChannel: {
      appendLog: vi.fn(),
      show: vi.fn(),
    },
    telemetryReporter: {
      sendTelemetryEvent: vi.fn(),
    },
    context: {
      globalState: {
        get: vi.fn().mockReturnValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
      },
    },
  },
}));

// Mock vscode
vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [
      {
        uri: {
          fsPath: '/mock/workspace',
        },
      },
    ],
  },
  window: {
    // Invoke the task immediately so the wrapped download still runs and
    // produces its side effects (mockedDownloadAndExtract calls, etc.).
    withProgress: vi.fn(async (_opts: unknown, task: (...args: unknown[]) => Promise<unknown>) => task()),
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
  },
  ProgressLocation: { Notification: 15, SourceControl: 1, Window: 10 },
}));

// Mock feed module
vi.mock('../feed', () => ({
  getJsonFeed: vi.fn(),
}));

// Mock binaries module
vi.mock('../binaries', () => ({
  downloadAndExtractDependency: vi.fn(),
}));

// Mock integrity helpers (used by bundleFeed for HEAD-based hash verification)
vi.mock('../integrity', () => ({
  fetchExpectedMd5: vi.fn(),
  isMissingPackageError: (error: unknown) => {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (typeof status === 'number') {
      return status >= 400 && status < 500;
    }
    const code = (error as { code?: string })?.code;
    if (typeof code === 'string') {
      return code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'EAI_AGAIN' || code === 'ECONNRESET';
    }
    return false;
  },
}));

// Mock vsCodeConfig/settings — bundleFeed reads experimental settings from here.
vi.mock('../vsCodeConfig/settings', () => ({
  getGlobalSetting: vi.fn().mockReturnValue(undefined),
}));

// Mock localSettings
vi.mock('../appSettings/localSettings', () => ({
  getLocalSettingsJson: vi.fn().mockResolvedValue({}),
}));

// Mock the design-time launcher so we can observe the deferred post-install
// restart fire AFTER `inFlightBundleWork` is cleared and the install result
// is settled.
vi.mock('../codeless/startDesignTimeApi', () => ({
  startAllDesignTimeApis: vi.fn(),
}));

const mockedFse = vi.mocked(fse);
const mockedExecSync = vi.mocked(cp.execSync);
const mockedExecuteCommand = vi.mocked(cpUtils.executeCommand);

describe('getExtensionBundleFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful path extraction', () => {
    it('should extract path from multi-line output with Windows path', async () => {
      const mockOutput =
        'local.settings.json found in root directory (c:\\Users\\test\\project).\r\n' +
        "Resolving worker runtime to 'dotnet'.\r\n" +
        'C:\\Users\\test\\.azure-functions-core-tools\\Functions\\ExtensionBundles\\Microsoft.Azure.Functions.ExtensionBundle.Workflows\\1.138.54\r\n';

      mockedExecuteCommand.mockResolvedValue(mockOutput);

      const result = await getExtensionBundleFolder();

      expect(result).toBe('C:\\Users\\test\\.azure-functions-core-tools\\Functions\\ExtensionBundles\\');
      expect(mockedExecuteCommand).toHaveBeenCalledWith(expect.anything(), '/mock/workspace', 'func', 'GetExtensionBundlePath');
    });

    it('should extract path from single line output', async () => {
      const mockOutput =
        'C:\\Users\\test\\.azure-functions-core-tools\\Functions\\ExtensionBundles\\Microsoft.Azure.Functions.ExtensionBundle\\4.17.0\r\n';

      mockedExecuteCommand.mockResolvedValue(mockOutput);

      const result = await getExtensionBundleFolder();

      expect(result).toBe('C:\\Users\\test\\.azure-functions-core-tools\\Functions\\ExtensionBundles\\');
    });

    it('should handle Unix-style paths', async () => {
      const mockOutput =
        'local.settings.json found in root directory (/home/user/project).\n' +
        "Resolving worker runtime to 'node'.\n" +
        '/home/user/.azure-functions-core-tools/Functions/ExtensionBundles/Microsoft.Azure.Functions.ExtensionBundle.Workflows/1.138.54\n';

      mockedExecuteCommand.mockResolvedValue(mockOutput);

      const result = await getExtensionBundleFolder();

      expect(result).toBe('/home/user/.azure-functions-core-tools/Functions/ExtensionBundles/');
    });

    it('should extract path with different bundle types', async () => {
      const mockOutput =
        'C:\\Users\\test\\.azure-functions-core-tools\\Functions\\ExtensionBundles\\Microsoft.Azure.Functions.ExtensionBundle\\4.17.0\r\n';

      mockedExecuteCommand.mockResolvedValue(mockOutput);

      const result = await getExtensionBundleFolder();

      expect(result).toBe('C:\\Users\\test\\.azure-functions-core-tools\\Functions\\ExtensionBundles\\');
    });

    it('should handle output with mixed line endings', async () => {
      const mockOutput =
        'Info message 1.\r\n' +
        'Info message 2.\n' +
        'C:\\Users\\test\\ExtensionBundles\\Microsoft.Azure.Functions.ExtensionBundle.Workflows\\1.0.0\r\n';

      mockedExecuteCommand.mockResolvedValue(mockOutput);

      const result = await getExtensionBundleFolder();

      expect(result).toBe('C:\\Users\\test\\ExtensionBundles\\');
    });

    it('should trim whitespace from output', async () => {
      const mockOutput =
        '  \n' +
        '  local.settings.json found.  \n' +
        '  C:\\Users\\test\\ExtensionBundles\\Microsoft.Azure.Functions.ExtensionBundle\\1.0.0  \n' +
        '  \n';

      mockedExecuteCommand.mockResolvedValue(mockOutput);

      const result = await getExtensionBundleFolder();

      expect(result).toBe('C:\\Users\\test\\ExtensionBundles\\');
    });

    it('should handle mixed forward/back slashes in Windows paths', async () => {
      // Forward slashes are valid on Windows, and the regex should match them via the [\\/] pattern
      const mockOutput =
        'C:\\Users/test/.azure-functions-core-tools/Functions/ExtensionBundles/Microsoft.Azure.Functions.ExtensionBundle.Workflows/1.138.54\n';

      mockedExecuteCommand.mockResolvedValue(mockOutput);

      const result = await getExtensionBundleFolder();

      expect(result).toBe('C:\\Users/test/.azure-functions-core-tools/Functions/ExtensionBundles/');
    });
  });

  describe('fallback path extraction', () => {
    it('should use fallback when regex does not match but path starts with drive letter', async () => {
      // Path that doesn't match the primary regex perfectly but has the bundle ID
      const mockOutput = 'C:\\Test\\ExtensionBundles\\Microsoft.Azure.Functions.ExtensionBundle\\1.0.0';

      mockedExecuteCommand.mockResolvedValue(mockOutput);

      const result = await getExtensionBundleFolder();

      expect(result).toBe('C:\\Test\\ExtensionBundles\\');
    });

    it('should use lastIndexOf for fallback to handle multiple occurrences', async () => {
      const mockOutput =
        'Found Microsoft.Azure.Functions.ExtensionBundle in config.\n' +
        'C:\\Path\\ExtensionBundles\\Microsoft.Azure.Functions.ExtensionBundle\\1.0.0';

      mockedExecuteCommand.mockResolvedValue(mockOutput);

      const result = await getExtensionBundleFolder();

      // Should use the last occurrence
      expect(result).toBe('C:\\Path\\ExtensionBundles\\');
    });

    it('should use the bundle ID fallback when ExtensionBundles is not followed by a separator', async () => {
      mockedExecuteCommand.mockResolvedValue('C:\\Path\\ExtensionBundlesMicrosoft.Azure.Functions.ExtensionBundle\\1.0.0');

      const result = await getExtensionBundleFolder();

      expect(result).toBe('C:\\Path\\ExtensionBundles');
    });
  });

  describe('error handling', () => {
    it('should throw error when no path line is found in output', async () => {
      const mockOutput =
        'local.settings.json found in root directory.\n' + "Resolving worker runtime to 'dotnet'.\n" + 'Some other message.';

      mockedExecuteCommand.mockResolvedValue(mockOutput);

      await expect(getExtensionBundleFolder()).rejects.toThrow('Could not find path to extension bundle');
    });

    it('should throw error when path line has no ExtensionBundles', async () => {
      const mockOutput = 'C:\\Users\\test\\SomeOtherFolder\\';

      mockedExecuteCommand.mockResolvedValue(mockOutput);

      await expect(getExtensionBundleFolder()).rejects.toThrow('Could not find path to extension bundle');
    });

    it('should throw error when regex and fallback both fail', async () => {
      const mockOutput = 'ExtensionBundles\\SomeFolder\\1.0.0';

      mockedExecuteCommand.mockResolvedValue(mockOutput);

      await expect(getExtensionBundleFolder()).rejects.toThrow('Could not find path to extension bundle.');
    });

    it('should throw error when a path line cannot be parsed as an extension bundle path', async () => {
      mockedExecuteCommand.mockResolvedValue('C:\\Path\\ExtensionBundles');

      await expect(getExtensionBundleFolder()).rejects.toThrow('Could not find path to extension bundle.');
    });

    it('should handle executeCommand throwing an error', async () => {
      mockedExecuteCommand.mockRejectedValue(new Error('Command failed'));

      await expect(getExtensionBundleFolder()).rejects.toThrow('Could not find path to extension bundle.');
    });

    it('should handle empty output', async () => {
      mockedExecuteCommand.mockResolvedValue('');

      await expect(getExtensionBundleFolder()).rejects.toThrow('Could not find path to extension bundle.');
    });

    it('should handle output with only whitespace', async () => {
      mockedExecuteCommand.mockResolvedValue('   \n  \r\n  \n   ');

      await expect(getExtensionBundleFolder()).rejects.toThrow('Could not find path to extension bundle.');
    });

    it('should throw a friendly dependencies-not-ready error when getFunctionsCommand throws', async () => {
      const funcVersionMod = await import('../funcCoreTools/funcVersion');
      vi.mocked(funcVersionMod.getFunctionsCommand).mockImplementationOnce(() => {
        throw new Error('Functions Core Tools Binary Path Setting is empty');
      });

      await expect(getExtensionBundleFolder()).rejects.toThrow(
        'Logic Apps Standard runtime dependencies are still installing. Please wait a moment and try again.'
      );
      expect(mockedExecuteCommand).not.toHaveBeenCalled();
    });
  });

  describe('working directory selection', () => {
    it('uses the provided workingDirectory when supplied', async () => {
      const mockOutput =
        'C:\\Users\\test\\.azure-functions-core-tools\\Functions\\ExtensionBundles\\Microsoft.Azure.Functions.ExtensionBundle.Workflows\\1.138.54\r\n';
      mockedExecuteCommand.mockResolvedValue(mockOutput);

      await getExtensionBundleFolder('/explicit/project/path');

      expect(mockedExecuteCommand).toHaveBeenCalledWith(expect.anything(), '/explicit/project/path', 'func', 'GetExtensionBundlePath');
    });

    it('falls back to the first workspace folder when no workingDirectory is provided', async () => {
      const mockOutput =
        'C:\\Users\\test\\.azure-functions-core-tools\\Functions\\ExtensionBundles\\Microsoft.Azure.Functions.ExtensionBundle.Workflows\\1.138.54\r\n';
      mockedExecuteCommand.mockResolvedValue(mockOutput);

      await getExtensionBundleFolder();

      expect(mockedExecuteCommand).toHaveBeenCalledWith(expect.anything(), '/mock/workspace', 'func', 'GetExtensionBundlePath');
    });
  });

  describe('edge cases', () => {
    it('should handle path with parentheses in directory names', async () => {
      const mockOutput =
        'local.settings.json found in root directory (C:\\Users\\test (admin)\\project).\n' +
        'C:\\Users\\test (admin)\\.azure-functions\\ExtensionBundles\\Microsoft.Azure.Functions.ExtensionBundle\\1.0.0';

      mockedExecuteCommand.mockResolvedValue(mockOutput);

      const result = await getExtensionBundleFolder();

      expect(result).toBe('C:\\Users\\test (admin)\\.azure-functions\\ExtensionBundles\\');
    });

    it('should handle path with spaces', async () => {
      const mockOutput = 'C:\\Program Files\\Azure Functions\\ExtensionBundles\\Microsoft.Azure.Functions.ExtensionBundle.Workflows\\1.0.0';

      mockedExecuteCommand.mockResolvedValue(mockOutput);

      const result = await getExtensionBundleFolder();

      expect(result).toBe('C:\\Program Files\\Azure Functions\\ExtensionBundles\\');
    });

    it('should handle very long version numbers', async () => {
      const mockOutput = 'C:\\Users\\test\\ExtensionBundles\\Microsoft.Azure.Functions.ExtensionBundle.Workflows\\1.138.54.12345.67890';

      mockedExecuteCommand.mockResolvedValue(mockOutput);

      const result = await getExtensionBundleFolder();

      expect(result).toBe('C:\\Users\\test\\ExtensionBundles\\');
    });

    it('should handle multiple ExtensionBundles mentions in info messages', async () => {
      const mockOutput =
        'Looking for ExtensionBundles in default location.\n' +
        'ExtensionBundles configuration loaded.\n' +
        'C:\\Users\\test\\.azure-functions\\ExtensionBundles\\Microsoft.Azure.Functions.ExtensionBundle\\4.17.0';

      mockedExecuteCommand.mockResolvedValue(mockOutput);

      const result = await getExtensionBundleFolder();

      // Should find the actual path, not the info messages
      expect(result).toBe('C:\\Users\\test\\.azure-functions\\ExtensionBundles\\');
    });

    it('should handle case-insensitive path matching on Windows', async () => {
      const mockOutput = 'C:\\users\\test\\ExtensionBundles\\Microsoft.Azure.Functions.ExtensionBundle\\1.0.0';

      mockedExecuteCommand.mockResolvedValue(mockOutput);

      const result = await getExtensionBundleFolder();

      expect(result).toBe('C:\\users\\test\\ExtensionBundles\\');
    });
  });
});

describe('getBundleVersionNumber', () => {
  const mockBundleFolderRoot = 'C:\\mock\\bundle\\root\\ExtensionBundles\\';
  const mockBundleFolder = path.join(mockBundleFolderRoot, extensionBundleId);

  beforeEach(() => {
    vi.clearAllMocks();
    resetCachedBundleVersion();
    // Mock getExtensionBundleFolder to return a proper Windows path
    const mockCommandOutput = `C:\\mock\\bundle\\root\\ExtensionBundles\\${extensionBundleId}\\1.0.0\n`;
    mockedExecuteCommand.mockResolvedValue(mockCommandOutput);
  });

  it('should return the highest version number from available bundle folders', async () => {
    const mockFolders = ['1.0.0', '2.1.0', '1.5.0', 'some-file.txt'];
    mockedFse.readdir.mockResolvedValue(mockFolders as any);
    mockedFse.stat.mockImplementation((filePath: any) => {
      const fileName = path.basename(filePath.toString());
      return Promise.resolve({
        isDirectory: () => fileName !== 'some-file.txt',
      } as any);
    });

    const result = await getBundleVersionNumber();

    expect(result).toBe('2.1.0');
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('Current Logic Apps extension bundle version: 2.1.0');
    expect(mockedFse.readdir).toHaveBeenCalledWith(mockBundleFolder);
  });

  it('should handle version numbers with different digit counts', async () => {
    const mockFolders = ['1.0.0', '10.2.1', '2.15.3'];
    mockedFse.readdir.mockResolvedValue(mockFolders as any);
    mockedFse.stat.mockImplementation(() => {
      return Promise.resolve({
        isDirectory: () => true,
      } as any);
    });

    const result = await getBundleVersionNumber();

    expect(result).toBe('10.2.1');
  });

  it('should return default version when only non-directory files exist', async () => {
    const mockFolders = ['file1.txt', 'file2.log'];
    mockedFse.readdir.mockResolvedValue(mockFolders as any);
    mockedFse.stat.mockImplementation(() => {
      return Promise.resolve({
        isDirectory: () => false,
      } as any);
    });

    const result = await getBundleVersionNumber();

    expect(result).toBe('0.0.0');
  });

  it('should handle single version folder', async () => {
    const mockFolders = ['1.2.3'];
    mockedFse.readdir.mockResolvedValue(mockFolders as any);
    mockedFse.stat.mockImplementation(() => {
      return Promise.resolve({
        isDirectory: () => true,
      } as any);
    });

    const result = await getBundleVersionNumber();

    expect(result).toBe('1.2.3');
  });

  it('should throw error when no bundle folders found', async () => {
    mockedFse.readdir.mockResolvedValue([] as any);

    await expect(getBundleVersionNumber()).rejects.toThrow('Extension bundle could not be found.');
  });

  it('forwards an explicit workingDirectory through to getExtensionBundleFolder', async () => {
    const mockFolders = ['1.2.3'];
    mockedFse.readdir.mockResolvedValue(mockFolders as any);
    mockedFse.stat.mockImplementation(() => {
      return Promise.resolve({ isDirectory: () => true } as any);
    });

    await getBundleVersionNumber('/explicit/project/path');

    expect(mockedExecuteCommand).toHaveBeenCalledWith(expect.anything(), '/explicit/project/path', 'func', 'GetExtensionBundlePath');
  });

  it('should handle mixed version formats correctly', async () => {
    const mockFolders = ['1.0', '1.0.0', '1.0.0.1'];
    mockedFse.readdir.mockResolvedValue(mockFolders as any);
    mockedFse.stat.mockImplementation(() => {
      return Promise.resolve({
        isDirectory: () => true,
      } as any);
    });

    const result = await getBundleVersionNumber();

    expect(result).toBe('1.0.0.1');
  });

  it('should call executeCommand to get the bundle root path', async () => {
    const mockFolders = ['1.0.0'];
    mockedFse.readdir.mockResolvedValue(mockFolders as any);
    mockedFse.stat.mockImplementation(() => {
      return Promise.resolve({
        isDirectory: () => true,
      } as any);
    });

    await getBundleVersionNumber();

    expect(mockedExecuteCommand).toHaveBeenCalledWith(expect.anything(), '/mock/workspace', 'func', 'GetExtensionBundlePath');
  });
});

describe('getLatestVersionRange', () => {
  it('should return the default version range constant', () => {
    const result = getLatestVersionRange();
    expect(result).toBe(defaultVersionRange);
  });

  it('should return a valid semver range string', () => {
    const result = getLatestVersionRange();
    expect(result).toMatch(/^\[.*\)$/);
  });
});

describe('getDependenciesVersion', () => {
  it('loads dependency feed using a local settings source URI override', async () => {
    const mockedGetLocalSettingsJson = await import('../appSettings/localSettings');
    vi.mocked(mockedGetLocalSettingsJson.getLocalSettingsJson).mockResolvedValue({
      Values: {
        FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI: 'https://bundles.example.com',
      },
    } as any);
    vi.mocked(feedModule.getJsonFeed).mockResolvedValue({ id: extensionBundleId } as any);
    const context = { telemetry: { properties: {}, measurements: {} } };

    await expect(getDependenciesVersion(context as any)).resolves.toEqual({ id: extensionBundleId });

    expect(feedModule.getJsonFeed).toHaveBeenCalledWith(
      context,
      `https://bundles.example.com/ExtensionBundles/${extensionBundleId}/dependency.json`
    );
  });
});

describe('addDefaultBundle', () => {
  it('should add extension bundle configuration to host.json', () => {
    const hostJson: IHostJsonV2 = {
      version: '2.0',
    };

    addDefaultBundle(hostJson);

    expect(hostJson.extensionBundle).toBeDefined();
    expect(hostJson.extensionBundle?.id).toBe(extensionBundleId);
    expect(hostJson.extensionBundle?.version).toBe(defaultVersionRange);
  });

  it('should overwrite existing extension bundle configuration', () => {
    const hostJson: IHostJsonV2 = {
      version: '2.0',
      extensionBundle: {
        id: 'old-bundle-id',
        version: '[1.0.0, 2.0.0)',
      },
    };

    addDefaultBundle(hostJson);

    expect(hostJson.extensionBundle?.id).toBe(extensionBundleId);
    expect(hostJson.extensionBundle?.version).toBe(defaultVersionRange);
  });

  it('should preserve other host.json properties', () => {
    const hostJson: IHostJsonV2 = {
      version: '2.0',
      logging: {
        logLevel: {
          default: 'Information',
        },
      },
    };

    addDefaultBundle(hostJson);

    expect(hostJson.version).toBe('2.0');
    expect(hostJson.logging).toBeDefined();
    expect(hostJson.extensionBundle).toBeDefined();
  });
});

describe('downloadExtensionBundle', () => {
  const mockedGetJsonFeed = vi.mocked(feedModule.getJsonFeed);
  const mockedDownloadAndExtract = vi.mocked(binariesModule.downloadAndExtractDependency);

  const createMockContext = () => ({
    telemetry: {
      properties: {} as Record<string, string>,
      measurements: {} as Record<string, number>,
    },
  });

  // Helper: configure fs-extra so that the bundle versions in `localVersions` exist on disk
  // and the sidecar contents (if provided) round-trip when readBundleSidecar reads them.
  // `sidecarByVersion` keys are version strings; values are the publisher's MD5 to embed
  // in the JSON sidecar's `sourceMd5` field. The sidecar's `contentHash` field is always
  // set to the empty-tree hash (no files inside the version folder) so verifyLocalBundle's
  // content-hash recompute returns the same value.
  const EMPTY_TREE_HASH = '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=';
  const buildSidecarJson = (sourceMd5: string, contentHash: string = EMPTY_TREE_HASH): string =>
    JSON.stringify({ version: 1, sourceMd5, contentHash });
  const setupHashableLocalDisk = (localVersion: string, fileContents = 'bundle-content') => {
    const bundleDir = path.join(defaultExtensionBundlePathValue, localVersion);
    const filePath = path.join(bundleDir, 'bin', 'bundle.dll');
    const depsPath = path.join(bundleDir, 'bin', 'function.deps.json');
    const depsContents = JSON.stringify({ targets: { bundle: { 'bundle/1.0.0': { runtime: { 'lib/netstandard2.0/bundle.dll': {} } } } } });

    mockedFse.readdirSync.mockReturnValue([localVersion] as any);
    mockedFse.statSync.mockReturnValue({ isDirectory: () => true } as any);
    mockedFse.pathExists.mockImplementation(((p: string) => {
      if (typeof p === 'string' && p.endsWith('.bundle-source-md5')) {
        return Promise.resolve(false);
      }
      return Promise.resolve(true);
    }) as any);
    mockedFse.readdir.mockImplementation(((p: string) => {
      if (p === bundleDir) {
        return Promise.resolve(['bin'] as any);
      }
      if (p === path.join(bundleDir, 'bin')) {
        return Promise.resolve(['bundle.dll', 'function.deps.json'] as any);
      }
      return Promise.resolve([] as any);
    }) as any);
    mockedFse.lstat.mockImplementation(((p: string) =>
      Promise.resolve({
        isDirectory: () => p === path.join(bundleDir, 'bin'),
        isFile: () => p === filePath || p === depsPath,
      } as any)) as any);
    mockedFse.stat.mockImplementation(((p: string) =>
      Promise.resolve({
        size: p === filePath ? Buffer.byteLength(fileContents) : p === depsPath ? Buffer.byteLength(depsContents) : 0,
        isDirectory: () => p === bundleDir || p === path.join(bundleDir, 'bin'),
        isFile: () => p === filePath || p === depsPath,
      } as any)) as any);
    mockedFse.readFile.mockImplementation(((p: string) => {
      if (p === depsPath) {
        return Promise.resolve(depsContents as any);
      }
      return Promise.resolve('' as any);
    }) as any);
    mockedFse.createReadStream.mockImplementation(((p: string) => {
      if (p === filePath) {
        return Readable.from([Buffer.from(fileContents)]) as any;
      }
      if (p === depsPath) {
        return Readable.from([Buffer.from(depsContents)]) as any;
      }
      return Readable.from([]) as any;
    }) as any);
  };
  const setupSingleFileLocalDisk = (localVersion: string, fileName = 'bundle.json') => {
    const bundleDir = path.join(defaultExtensionBundlePathValue, localVersion);
    const filePath = path.join(bundleDir, fileName);

    mockedFse.readdirSync.mockReturnValue([localVersion] as any);
    mockedFse.statSync.mockReturnValue({ isDirectory: () => true } as any);
    mockedFse.pathExists.mockImplementation(((p: string) => {
      if (typeof p === 'string' && p.endsWith('.bundle-source-md5')) {
        return Promise.resolve(false);
      }
      return Promise.resolve(p !== path.join(bundleDir, 'bin'));
    }) as any);
    mockedFse.readdir.mockImplementation(((p: string) => {
      if (p === bundleDir) {
        return Promise.resolve([fileName] as any);
      }
      return Promise.resolve([] as any);
    }) as any);
    mockedFse.lstat.mockImplementation(((p: string) =>
      Promise.resolve({
        isDirectory: () => false,
        isFile: () => p === filePath,
      } as any)) as any);
    mockedFse.stat.mockImplementation(((p: string) =>
      Promise.resolve({
        size: p === filePath ? 2 : 0,
        isDirectory: () => p === bundleDir,
        isFile: () => p === filePath,
      } as any)) as any);
    mockedFse.createReadStream.mockImplementation(((p: string) => {
      if (p === filePath) {
        return Readable.from([Buffer.from('{}')]) as any;
      }
      return Readable.from([]) as any;
    }) as any);
  };
  const setupBundleMissingRuntimeFile = (localVersion: string) => {
    const bundleDir = path.join(defaultExtensionBundlePathValue, localVersion);
    const binDir = path.join(bundleDir, 'bin');
    const filePath = path.join(binDir, 'bundle.dll');
    const depsPath = path.join(binDir, 'function.deps.json');
    const depsContents = JSON.stringify({
      targets: { bundle: { 'bundle/1.0.0': { runtime: { 'lib/netstandard2.0/bundle.dll': {}, 'lib/netstandard2.0/missing.dll': {} } } } },
    });

    mockedFse.readdirSync.mockReturnValue([localVersion] as any);
    mockedFse.statSync.mockReturnValue({ isDirectory: () => true } as any);
    mockedFse.pathExists.mockImplementation(((p: string) => {
      if (typeof p === 'string' && p.endsWith('.bundle-source-md5')) {
        return Promise.resolve(false);
      }
      return Promise.resolve(p !== path.join(binDir, 'missing.dll'));
    }) as any);
    mockedFse.readdir.mockImplementation(((p: string) => {
      if (p === bundleDir) {
        return Promise.resolve(['bin'] as any);
      }
      if (p === binDir) {
        return Promise.resolve(['bundle.dll', 'function.deps.json'] as any);
      }
      return Promise.resolve([] as any);
    }) as any);
    mockedFse.lstat.mockImplementation(((p: string) =>
      Promise.resolve({
        isDirectory: () => p === binDir,
        isFile: () => p === filePath || p === depsPath,
      } as any)) as any);
    mockedFse.stat.mockImplementation(((p: string) =>
      Promise.resolve({
        size: p === filePath ? 2 : p === depsPath ? Buffer.byteLength(depsContents) : 0,
        isDirectory: () => p === bundleDir || p === binDir,
        isFile: () => p === filePath || p === depsPath,
      } as any)) as any);
    mockedFse.readFile.mockImplementation(((p: string) => {
      if (p === depsPath) {
        return Promise.resolve(depsContents as any);
      }
      return Promise.resolve('' as any);
    }) as any);
    mockedFse.createReadStream.mockImplementation(((p: string) => {
      if (p === filePath) {
        return Readable.from([Buffer.from('{}')]) as any;
      }
      if (p === depsPath) {
        return Readable.from([Buffer.from(depsContents)]) as any;
      }
      return Readable.from([]) as any;
    }) as any);
  };
  const setupRootFileWithEmptyBinLocalDisk = (localVersion: string) => {
    const bundleDir = path.join(defaultExtensionBundlePathValue, localVersion);
    const rootFilePath = path.join(bundleDir, 'bundle.json');
    const binDir = path.join(bundleDir, 'bin');

    mockedFse.readdirSync.mockReturnValue([localVersion] as any);
    mockedFse.statSync.mockReturnValue({ isDirectory: () => true } as any);
    mockedFse.pathExists.mockImplementation(((p: string) => {
      if (typeof p === 'string' && p.endsWith('.bundle-source-md5')) {
        return Promise.resolve(false);
      }
      return Promise.resolve(true);
    }) as any);
    mockedFse.readdir.mockImplementation(((p: string) => {
      if (p === bundleDir) {
        return Promise.resolve(['bundle.json', 'bin'] as any);
      }
      if (p === binDir) {
        return Promise.resolve([] as any);
      }
      return Promise.resolve([] as any);
    }) as any);
    mockedFse.lstat.mockImplementation(((p: string) =>
      Promise.resolve({
        isDirectory: () => p === binDir,
        isFile: () => p === rootFilePath,
      } as any)) as any);
    mockedFse.stat.mockImplementation(((p: string) =>
      Promise.resolve({
        size: p === rootFilePath ? 2 : 0,
        isDirectory: () => p === bundleDir || p === binDir,
        isFile: () => p === rootFilePath,
      } as any)) as any);
    mockedFse.createReadStream.mockImplementation(((p: string) => {
      if (p === rootFilePath) {
        return Readable.from([Buffer.from('{}')]) as any;
      }
      return Readable.from([]) as any;
    }) as any);
  };
  const setupLocalDisk = (
    localVersions: string[],
    sidecarByVersion: Record<string, string> = {},
    options: { sidecarRaw?: Record<string, string>; sidecarContentHashOverride?: Record<string, string> } = {}
  ) => {
    mockedFse.readdirSync.mockReturnValue(localVersions as any);
    mockedFse.statSync.mockReturnValue({ isDirectory: () => true } as any);
    // Async readdir is used by computeBundleContentHash's walk; return [] so it treats
    // every version folder as an empty tree → content hash = EMPTY_TREE_HASH.
    mockedFse.readdir.mockResolvedValue([] as any);
    mockedFse.lstat.mockResolvedValue({ isDirectory: () => false, isFile: () => false } as any);
    mockedFse.createReadStream.mockImplementation((() => Readable.from([])) as any);
    mockedFse.pathExists.mockImplementation(((p: string) => {
      // Default: bundle root and version folders exist; sidecar exists only when registered.
      if (typeof p !== 'string') {
        return Promise.resolve(true);
      }
      if (p.endsWith('.bundle-source-md5')) {
        const inJson = Object.keys(sidecarByVersion).some((v) => p.includes(v));
        const inRaw = Object.keys(options.sidecarRaw ?? {}).some((v) => p.includes(v));
        return Promise.resolve(inJson || inRaw);
      }
      return Promise.resolve(true);
    }) as any);
    mockedFse.readFile.mockImplementation(((p: string) => {
      if (typeof p !== 'string') {
        return Promise.resolve('' as any);
      }
      const rawMatch = Object.entries(options.sidecarRaw ?? {}).find(([v]) => p.includes(v));
      if (rawMatch) {
        return Promise.resolve(rawMatch[1] as any);
      }
      const match = Object.entries(sidecarByVersion).find(([v]) => p.includes(v));
      if (!match) {
        return Promise.resolve('' as any);
      }
      const overrideHash = options.sidecarContentHashOverride?.[match[0]];
      return Promise.resolve(buildSidecarJson(match[1], overrideHash ?? EMPTY_TREE_HASH) as any);
    }) as any);
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.AzureFunctionsJobHost_extensionBundle_version;
    delete process.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI;
    // Default: experimental settings disabled
    const settingsModule = await import('../vsCodeConfig/settings');
    vi.mocked(settingsModule.getGlobalSetting).mockReturnValue(undefined);
    // Default: HEAD request returns nothing — keeps tests that don't care about sidecar simple.
    const integrityModule = await import('../integrity');
    vi.mocked(integrityModule.fetchExpectedMd5).mockResolvedValue(undefined);
    // Reset fs-extra mocks
    mockedFse.readFile.mockReset();
    mockedFse.outputFile.mockResolvedValue(undefined as any);
    mockedFse.move.mockResolvedValue(undefined as any);
    mockedFse.remove.mockResolvedValue(undefined as any);
  });

  it('should download newer version when feed has higher version than local', async () => {
    // Feed versions (simulating index.json format)
    const feedVersions = ['1.0.0', '1.1.0', '1.2.0', '1.3.0', '1.95.0'];

    setupLocalDisk(['1.75.0']);

    // Mock the feed to return the versions array
    mockedGetJsonFeed.mockResolvedValue(feedVersions as any);

    // Mock download to succeed
    mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

    const context = createMockContext();
    const result = await downloadExtensionBundle(context as any);

    // Should have downloaded
    expect(result).toBe(true);
    expect(context.telemetry.properties.didUpdateExtensionBundle).toBe('true');

    // Should download version 1.95.0 (the highest from feed)
    expect(mockedDownloadAndExtract).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('1.95.0'),
      defaultExtensionBundlePathValue,
      extensionBundleId,
      '1.95.0'
    );
  });

  it('persists a treeFingerprint in the sidecar when a newer version is downloaded', async () => {
    setupLocalDisk(['1.75.0']);
    mockedGetJsonFeed.mockResolvedValue(['1.95.0'] as any);
    mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

    let writtenPayload = '';
    mockedFse.outputFile.mockImplementation((async (_p: string, payload: string) => {
      writtenPayload = payload;
    }) as any);

    const context = createMockContext();
    await downloadExtensionBundle(context as any);

    expect(writtenPayload).not.toBe('');
    const parsed = JSON.parse(writtenPayload);
    // Empty extracted tree → fingerprint equals the empty-input sha256 digest.
    expect(parsed.treeFingerprint).toBe(EMPTY_TREE_HASH);
    // A fresh download also persists the structural fingerprint and stamps the
    // deep-verify time so the fast gate trusts it without an immediate re-hash.
    expect(parsed.structuralFingerprint).toBe(EMPTY_TREE_HASH);
    expect(typeof parsed.lastDeepVerifiedMs).toBe('number');
  });

  it('should not download when local version is higher than feed versions and the on-disk sidecar matches the published MD5', async () => {
    const feedVersions = ['1.0.0', '1.1.0', '1.2.0'];
    // Local version is already 1.75.0 with a valid sidecar.
    const matchingMd5 = 'matching-md5-base64';
    setupLocalDisk(['1.75.0'], { '1.75.0': matchingMd5 });

    mockedGetJsonFeed.mockResolvedValue(feedVersions as any);

    const integrityModule = await import('../integrity');
    vi.mocked(integrityModule.fetchExpectedMd5).mockResolvedValue(matchingMd5);

    const context = createMockContext();
    const result = await downloadExtensionBundle(context as any);

    expect(result).toBe(false);
    expect(context.telemetry.properties.didUpdateExtensionBundle).toBe('false');
    expect(context.telemetry.properties.localBundleHashCheck).toBe('passed');
    expect(context.telemetry.properties.extensionBundleVersionSource).toBe('localLatest');
    expect(mockedDownloadAndExtract).not.toHaveBeenCalled();
  });

  it('backfills sidecar metadata for a valid local bundle without re-downloading', async () => {
    const feedVersions = ['1.0.0', '1.95.0'];
    setupHashableLocalDisk('1.95.0');
    mockedGetJsonFeed.mockResolvedValue(feedVersions as any);
    const integrityModule = await import('../integrity');
    vi.mocked(integrityModule.fetchExpectedMd5).mockResolvedValue('published-md5');

    const context = createMockContext();
    const result = await downloadExtensionBundle(context as any);

    expect(result).toBe(false);
    expect(context.telemetry.properties.localBundleHashCheck).toBe('sidecarBackfilled');
    expect(mockedDownloadAndExtract).not.toHaveBeenCalled();
    expect(mockedFse.outputFile).toHaveBeenCalledWith(expect.stringContaining('.bundle-source-md5.'), expect.any(String), 'utf8');
    expect(mockedFse.move).toHaveBeenCalledWith(
      expect.stringContaining('.bundle-source-md5.'),
      expect.stringContaining('.bundle-source-md5'),
      { overwrite: true }
    );
    const payload = JSON.parse(mockedFse.outputFile.mock.calls[0]?.[1] as string);
    expect(payload.sourceMd5).toBe('published-md5');
    expect(payload.contentHash).toEqual(expect.any(String));
  });

  it('backfills content-hash-only sidecar metadata when CDN HEAD fails', async () => {
    const feedVersions = ['1.0.0', '1.95.0'];
    setupHashableLocalDisk('1.95.0');
    mockedGetJsonFeed.mockResolvedValue(feedVersions as any);
    const integrityModule = await import('../integrity');
    vi.mocked(integrityModule.fetchExpectedMd5).mockRejectedValue(new Error('network unavailable'));

    const context = createMockContext();
    const result = await downloadExtensionBundle(context as any);

    expect(result).toBe(false);
    expect(context.telemetry.properties.localBundleHashCheck).toBe('sidecarBackfilled');
    expect(mockedDownloadAndExtract).not.toHaveBeenCalled();
    const payload = JSON.parse(mockedFse.outputFile.mock.calls[0]?.[1] as string);
    expect(payload.sourceMd5).toBe('');
    expect(payload.contentHash).toEqual(expect.any(String));
  });

  it('does not redownload a bundle whose existing sidecar was backfilled without source MD5', async () => {
    const feedVersions = ['1.0.0', '1.95.0'];
    setupLocalDisk(['1.95.0'], { '1.95.0': '' });
    mockedGetJsonFeed.mockResolvedValue(feedVersions as any);
    const integrityModule = await import('../integrity');
    vi.mocked(integrityModule.fetchExpectedMd5).mockResolvedValue('published-md5');

    const context = createMockContext();
    const result = await downloadExtensionBundle(context as any);

    expect(result).toBe(false);
    expect(context.telemetry.properties.localBundleHashCheck).toBe('passed');
    expect(mockedDownloadAndExtract).not.toHaveBeenCalled();
  });

  it('should re-download when local version equals feed but the sidecar is missing and the bundle has no bin content', async () => {
    const feedVersions = ['1.0.0', '1.95.0'];
    setupSingleFileLocalDisk('1.95.0');

    mockedGetJsonFeed.mockResolvedValue(feedVersions as any);
    mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

    const context = createMockContext();
    const result = await downloadExtensionBundle(context as any);

    expect(result).toBe(true);
    expect(context.telemetry.properties.localBundleHashCheck).toBe('sidecarMissing');
    expect(mockedDownloadAndExtract).toHaveBeenCalled();
  });

  it('should re-download when the sidecar is missing and the bundle manifest references a missing runtime file', async () => {
    const feedVersions = ['1.0.0', '1.95.0'];
    setupBundleMissingRuntimeFile('1.95.0');

    mockedGetJsonFeed.mockResolvedValue(feedVersions as any);
    mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

    const context = createMockContext();
    const result = await downloadExtensionBundle(context as any);

    expect(result).toBe(true);
    expect(context.telemetry.properties.localBundleHashCheck).toBe('sidecarMissing');
    expect(mockedDownloadAndExtract).toHaveBeenCalled();
  });

  it('should re-download when a root file exists but the bundle bin folder is empty', async () => {
    const feedVersions = ['1.0.0', '1.95.0'];
    setupRootFileWithEmptyBinLocalDisk('1.95.0');

    mockedGetJsonFeed.mockResolvedValue(feedVersions as any);
    mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

    const context = createMockContext();
    const result = await downloadExtensionBundle(context as any);

    expect(result).toBe(true);
    expect(context.telemetry.properties.localBundleHashCheck).toBe('sidecarMissing');
    expect(mockedDownloadAndExtract).toHaveBeenCalled();
  });

  it('falls back to redownload when sidecar backfill cannot write metadata', async () => {
    const feedVersions = ['1.0.0', '1.95.0'];
    setupHashableLocalDisk('1.95.0');
    mockedGetJsonFeed.mockResolvedValue(feedVersions as any);
    const integrityModule = await import('../integrity');
    vi.mocked(integrityModule.fetchExpectedMd5).mockResolvedValue('published-md5');
    mockedFse.move.mockRejectedValueOnce(new Error('sidecar locked'));
    mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

    const context = createMockContext();
    const result = await downloadExtensionBundle(context as any);

    expect(result).toBe(true);
    expect(context.telemetry.properties.localBundleHashCheck).toBe('sidecarMissing');
    expect(mockedDownloadAndExtract).toHaveBeenCalled();
  });

  it('should re-download when local version equals feed but the sidecar is missing and the bundle has no content', async () => {
    const feedVersions = ['1.0.0', '1.95.0'];
    setupLocalDisk(['1.95.0']); // no sidecar registered → readBundleSidecar returns undefined

    mockedGetJsonFeed.mockResolvedValue(feedVersions as any);
    mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

    const context = createMockContext();
    const result = await downloadExtensionBundle(context as any);

    expect(result).toBe(true);
    expect(context.telemetry.properties.localBundleHashCheck).toBe('sidecarMissing');
    expect(mockedDownloadAndExtract).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('1.95.0'),
      defaultExtensionBundlePathValue,
      extensionBundleId,
      '1.95.0'
    );
  });

  it('should re-download when local version equals feed but the sidecar drifted from the published MD5', async () => {
    const feedVersions = ['1.0.0', '1.95.0'];
    setupLocalDisk(['1.95.0'], { '1.95.0': 'old-md5' });

    mockedGetJsonFeed.mockResolvedValue(feedVersions as any);
    mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

    const integrityModule = await import('../integrity');
    vi.mocked(integrityModule.fetchExpectedMd5).mockResolvedValue('new-md5');

    const context = createMockContext();
    const result = await downloadExtensionBundle(context as any);

    expect(result).toBe(true);
    expect(context.telemetry.properties.localBundleHashCheck).toBe('sidecarMismatch');
    expect(mockedDownloadAndExtract).toHaveBeenCalled();
  });

  it('should keep using local when the HEAD request fails', async () => {
    const feedVersions = ['1.0.0', '1.95.0'];
    setupLocalDisk(['1.95.0'], { '1.95.0': 'some-md5' });

    mockedGetJsonFeed.mockResolvedValue(feedVersions as any);

    const integrityModule = await import('../integrity');
    vi.mocked(integrityModule.fetchExpectedMd5).mockRejectedValue(new Error('network down'));

    const context = createMockContext();
    const result = await downloadExtensionBundle(context as any);

    expect(result).toBe(false);
    expect(context.telemetry.properties.localBundleHashCheck).toBe('headRequestFailed');
    expect(mockedDownloadAndExtract).not.toHaveBeenCalled();
  });

  it('shows a warning toast + progress notification when a corrupt local bundle is re-downloaded', async () => {
    const vscode = await import('vscode');
    const feedVersions = ['1.0.0', '1.95.0'];
    // Local 1.95.0 with a sidecar that mismatches the CDN's published MD5.
    setupLocalDisk(['1.95.0'], { '1.95.0': 'stale-on-disk-md5' });
    mockedGetJsonFeed.mockResolvedValue(feedVersions as any);
    const integrityModule = await import('../integrity');
    vi.mocked(integrityModule.fetchExpectedMd5).mockResolvedValue('fresh-cdn-md5');
    mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

    const context = createMockContext();
    const result = await downloadExtensionBundle(context as any);

    expect(result).toBe(true);
    expect(context.telemetry.properties.localBundleHashCheck).toBe('sidecarMismatch');
    expect(vi.mocked(vscode.window.showWarningMessage)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(vscode.window.showWarningMessage).mock.calls[0]?.[0]).toMatch(/incomplete|checksum/i);
    expect(vi.mocked(vscode.window.withProgress)).toHaveBeenCalled();
    const progressTitle = (vi.mocked(vscode.window.withProgress).mock.calls[0]?.[0] as any)?.title ?? '';
    expect(progressTitle).toMatch(/Re-downloading.*1\.95\.0/);
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(expect.stringMatching(/1\.95\.0.*ready/i));
  });

  it('shows a progress notification when a newer feed version is downloaded (no corruption warning)', async () => {
    const vscode = await import('vscode');
    setupLocalDisk(['1.75.0']);
    mockedGetJsonFeed.mockResolvedValue(['1.0.0', '1.95.0'] as any);
    mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

    const context = createMockContext();
    const result = await downloadExtensionBundle(context as any);

    expect(result).toBe(true);
    expect(vi.mocked(vscode.window.showWarningMessage)).not.toHaveBeenCalled();
    const progressTitle = (vi.mocked(vscode.window.withProgress).mock.calls[0]?.[0] as any)?.title ?? '';
    expect(progressTitle).toMatch(/Downloading newer.*1\.95\.0/);
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(expect.stringMatching(/1\.95\.0.*ready/i));
  });

  // --- Phase 8: content-hash recompute ---

  it('legacy bare-MD5 sidecar is treated as sidecarMissing (silent migration, no warning toast)', async () => {
    const vscode = await import('vscode');
    setupLocalDisk(['1.95.0'], {}, { sidecarRaw: { '1.95.0': 'legacy-bare-md5-string' } });
    mockedGetJsonFeed.mockResolvedValue(['1.0.0', '1.95.0'] as any);
    mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

    const context = createMockContext();
    const result = await downloadExtensionBundle(context as any);

    expect(result).toBe(true);
    expect(context.telemetry.properties.localBundleHashCheck).toBe('sidecarMissing');
    // Migration path: silent — no warning toast for legacy users.
    expect(vi.mocked(vscode.window.showWarningMessage)).not.toHaveBeenCalled();
    expect(mockedDownloadAndExtract).toHaveBeenCalled();
  });

  it('JSON sidecar with wrong contentHash → contentMismatch + warning toast + redownload', async () => {
    const vscode = await import('vscode');
    setupLocalDisk(['1.95.0'], { '1.95.0': 'sourceMd5-ok' }, { sidecarContentHashOverride: { '1.95.0': 'wrong-content-hash' } });
    mockedGetJsonFeed.mockResolvedValue(['1.0.0', '1.95.0'] as any);
    mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

    const context = createMockContext();
    const result = await downloadExtensionBundle(context as any);

    expect(result).toBe(true);
    expect(context.telemetry.properties.localBundleHashCheck).toBe('contentMismatch');
    expect(vi.mocked(vscode.window.showWarningMessage)).toHaveBeenCalledTimes(1);
    const progressTitle = (vi.mocked(vscode.window.withProgress).mock.calls[0]?.[0] as any)?.title ?? '';
    expect(progressTitle).toMatch(/modified or corrupted/);
    expect(mockedDownloadAndExtract).toHaveBeenCalled();
  });

  it('JSON sidecar with correct contentHash + matching CDN MD5 → passed (no download)', async () => {
    const matchingMd5 = 'matching-md5';
    setupLocalDisk(['1.95.0'], { '1.95.0': matchingMd5 });
    mockedGetJsonFeed.mockResolvedValue(['1.0.0', '1.95.0'] as any);
    const integrityModule = await import('../integrity');
    vi.mocked(integrityModule.fetchExpectedMd5).mockResolvedValue(matchingMd5);

    const context = createMockContext();
    const result = await downloadExtensionBundle(context as any);

    expect(result).toBe(false);
    expect(context.telemetry.properties.localBundleHashCheck).toBe('passed');
    expect(mockedDownloadAndExtract).not.toHaveBeenCalled();
  });

  it('dedupes concurrent downloadExtensionBundle calls + waitForExtensionBundleReady blocks until done', async () => {
    setupLocalDisk(['1.75.0']);
    mockedGetJsonFeed.mockResolvedValue(['1.0.0', '1.95.0'] as any);
    // Hold the download open so the second call has time to observe the in-flight state.
    let releaseDownload: () => void = () => undefined;
    const downloadGate = new Promise<void>((resolve) => {
      releaseDownload = resolve;
    });
    mockedDownloadAndExtract.mockImplementation(async () => {
      await downloadGate;
      return { actualMd5: 'md5' } as any;
    });

    expect(isExtensionBundleDownloadInFlight()).toBe(false);

    const context1 = createMockContext();
    const context2 = createMockContext();
    const first = downloadExtensionBundle(context1 as any);
    // Yield so the first call records itself as in-flight before the second starts.
    await Promise.resolve();
    expect(isExtensionBundleDownloadInFlight()).toBe(true);

    const second = downloadExtensionBundle(context2 as any);
    const readyWait = waitForExtensionBundleReady();
    let readyResolved = false;
    readyWait.then(() => {
      readyResolved = true;
    });
    // Give the event loop a tick to confirm the readyWait promise is still pending.
    await Promise.resolve();
    await Promise.resolve();
    expect(readyResolved).toBe(false);

    releaseDownload();
    const [firstResult, secondResult] = await Promise.all([first, second]);
    await readyWait;

    expect(firstResult).toBe(true);
    // The deduped second call returns false (no new work) and doesn't fire another download.
    expect(secondResult).toBe(false);
    expect(mockedDownloadAndExtract).toHaveBeenCalledTimes(1);
    expect(isExtensionBundleDownloadInFlight()).toBe(false);
    expect(readyResolved).toBe(true);
  });

  it('should correctly identify the latest version from an unordered feed list', async () => {
    // Feed versions in random order
    const feedVersions = ['1.3.0', '1.95.0', '1.0.0', '1.50.0', '1.1.0'];

    setupLocalDisk([]);

    mockedGetJsonFeed.mockResolvedValue(feedVersions as any);
    mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

    const context = createMockContext();
    const result = await downloadExtensionBundle(context as any);

    expect(result).toBe(true);
    // Should download 1.95.0 (the actual highest version)
    expect(mockedDownloadAndExtract).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('1.95.0'),
      defaultExtensionBundlePathValue,
      extensionBundleId,
      '1.95.0'
    );
  });

  it('should handle multiple local versions and compare against highest', async () => {
    // Feed has 1.95.0
    const feedVersions = ['1.0.0', '1.95.0'];

    setupLocalDisk(['1.50.0', '1.75.0', '1.60.0']);

    mockedGetJsonFeed.mockResolvedValue(feedVersions as any);
    mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

    const context = createMockContext();
    const result = await downloadExtensionBundle(context as any);

    // Should download since 1.95.0 > 1.75.0
    expect(result).toBe(true);
    expect(mockedDownloadAndExtract).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('1.95.0'),
      defaultExtensionBundlePathValue,
      extensionBundleId,
      '1.95.0'
    );
  });

  it('does not re-download when the env-var-pinned version is one of several local versions', async () => {
    // Phase 5 bug fix: previously this used `semver.eq(envVarVer, latestLocalBundleVersion)`,
    // which returned false when the pin was not the *highest* local version, causing a
    // pointless redownload. Membership in localVersions is the right check.
    const localSettingsMod = await import('../appSettings/localSettings');
    vi.mocked(localSettingsMod.getLocalSettingsJson).mockResolvedValue({
      Values: { AzureFunctionsJobHost_extensionBundle_version: '1.50.0' },
    } as any);
    // Phase 14: pinned-version short-circuit now verifies the on-disk bundle
    // before trusting it. Provide a sidecar so verifyLocalBundle returns 'passed'.
    setupLocalDisk(['1.50.0', '1.60.0'], { '1.50.0': 'pinSourceMd5' });
    const integrityModule = await import('../integrity');
    vi.mocked(integrityModule.fetchExpectedMd5).mockResolvedValue('pinSourceMd5');

    const context = createMockContext();
    const result = await downloadExtensionBundle(context as any);

    expect(result).toBe(false);
    expect(mockedDownloadAndExtract).not.toHaveBeenCalled();
    expect(mockedGetJsonFeed).not.toHaveBeenCalled();
    expect(context.telemetry.properties.extensionBundleVersionSource).toBe('envVar');
    expect(context.telemetry.properties.didUpdateExtensionBundle).toBe('false');
  });

  it('downloads exactly the env-var-pinned version when not on disk', async () => {
    const localSettingsMod = await import('../appSettings/localSettings');
    vi.mocked(localSettingsMod.getLocalSettingsJson).mockResolvedValue({
      Values: { AzureFunctionsJobHost_extensionBundle_version: '1.50.0' },
    } as any);
    setupLocalDisk(['1.60.0']);
    mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

    const context = createMockContext();
    const result = await downloadExtensionBundle(context as any);

    expect(result).toBe(true);
    expect(mockedDownloadAndExtract).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('1.50.0'),
      defaultExtensionBundlePathValue,
      extensionBundleId,
      '1.50.0'
    );
  });

  describe('experimental extension bundle', () => {
    const setExperimentalSettings = async (values: { useExperimental?: boolean; sourceUri?: string; pinnedVersion?: string } = {}) => {
      const settingsModule = await import('../vsCodeConfig/settings');
      vi.mocked(settingsModule.getGlobalSetting).mockImplementation((key: string) => {
        if (key === 'useExperimentalExtensionBundle') {
          return values.useExperimental as any;
        }
        if (key === 'experimentalExtensionBundleSourceUri') {
          return (values.sourceUri ?? '') as any;
        }
        if (key === 'experimentalExtensionBundleVersion') {
          return (values.pinnedVersion ?? '') as any;
        }
        return undefined;
      });
    };

    it('uses the pinned local version and never calls the public feed', async () => {
      await setExperimentalSettings({ useExperimental: true, pinnedVersion: '1.21.0' });
      // Phase 14: experimental pin short-circuit now verifies on disk.
      setupLocalDisk(['1.21.0'], { '1.21.0': 'pinSourceMd5' });
      const integrityModule = await import('../integrity');
      vi.mocked(integrityModule.fetchExpectedMd5).mockResolvedValue('pinSourceMd5');

      const context = createMockContext();
      const result = await downloadExtensionBundle(context as any);

      expect(result).toBe(false);
      expect(mockedGetJsonFeed).not.toHaveBeenCalled();
      expect(mockedDownloadAndExtract).not.toHaveBeenCalled();
      expect(context.telemetry.properties.extensionBundleVersionSource).toBe('experimentalLocalPin');
    });

    it('downloads the pinned version from the experimental URI when missing on disk', async () => {
      await setExperimentalSettings({
        useExperimental: true,
        pinnedVersion: '1.21.0-preview',
        sourceUri: 'https://private-cdn.example.com/public',
      });
      setupLocalDisk(['1.20.0']); // pin not on disk
      // Source URI's index lists the pin.
      mockedGetJsonFeed.mockResolvedValue(['1.10.0', '1.21.0-preview'] as any);
      mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

      const context = createMockContext();
      const result = await downloadExtensionBundle(context as any);

      expect(result).toBe(true);
      // Index is probed against the experimental URI only — never the public CDN.
      const indexCall = (mockedGetJsonFeed.mock.calls[0]?.[1] as string) ?? '';
      expect(indexCall).toContain('https://private-cdn.example.com/public');
      expect(mockedDownloadAndExtract).toHaveBeenCalledTimes(1);
      expect(mockedDownloadAndExtract).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('https://private-cdn.example.com/public'),
        defaultExtensionBundlePathValue,
        extensionBundleId,
        '1.21.0-preview'
      );
      expect(context.telemetry.properties.extensionBundleVersionSource).toBe('experimentalFirstDownload');
      expect(context.telemetry.properties.experimentalSourceFallback).toBeUndefined();
    });

    it('falls back to the public CDN for the pin when source URI is empty and pin is not on disk', async () => {
      // I3 in the plan: pin set, not on disk, no sourceUri → download `pin` from public CDN.
      await setExperimentalSettings({ useExperimental: true, pinnedVersion: '1.21.0', sourceUri: '' });
      setupLocalDisk(['1.20.0']); // pin not on disk
      mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

      const context = createMockContext();
      const result = await downloadExtensionBundle(context as any);

      expect(result).toBe(true);
      // No index probe (no sourceUri to probe).
      expect(mockedGetJsonFeed).not.toHaveBeenCalled();
      expect(mockedDownloadAndExtract).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('cdn.functions.azure.com/public'),
        defaultExtensionBundlePathValue,
        extensionBundleId,
        '1.21.0'
      );
      expect(context.telemetry.properties.extensionBundleVersionSource).toBe('experimentalFirstDownload');
    });

    it('uses latest local without consulting the public feed when no pin is set', async () => {
      await setExperimentalSettings({ useExperimental: true });
      // Phase 14: experimental no-pin short-circuit now verifies on disk.
      setupLocalDisk(['1.50.0', '1.75.0'], { '1.75.0': 'latestSourceMd5' });
      const integrityModule = await import('../integrity');
      vi.mocked(integrityModule.fetchExpectedMd5).mockResolvedValue('latestSourceMd5');

      const context = createMockContext();
      const result = await downloadExtensionBundle(context as any);

      expect(result).toBe(false);
      expect(mockedGetJsonFeed).not.toHaveBeenCalled();
      expect(mockedDownloadAndExtract).not.toHaveBeenCalled();
      expect(context.telemetry.properties.extensionBundleVersionSource).toBe('experimentalLocalLatest');
    });

    it('cold-starts from the experimental URI when nothing is on disk', async () => {
      await setExperimentalSettings({
        useExperimental: true,
        sourceUri: 'https://private-cdn.example.com/public',
      });
      setupLocalDisk([]);
      mockedGetJsonFeed.mockResolvedValue(['1.10.0', '1.21.0-preview'] as any);
      mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

      const context = createMockContext();
      const result = await downloadExtensionBundle(context as any);

      expect(result).toBe(true);
      // Should fetch the experimental index, not the public one.
      const calledWith = (mockedGetJsonFeed.mock.calls[0]?.[1] as string) ?? '';
      expect(calledWith).toContain('https://private-cdn.example.com/public');
      expect(mockedDownloadAndExtract).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('https://private-cdn.example.com/public'),
        defaultExtensionBundlePathValue,
        extensionBundleId,
        '1.21.0-preview'
      );
      expect(context.telemetry.properties.extensionBundleVersionSource).toBe('experimentalFirstDownload');
    });

    it('falls through to the public feed when toggle is on but no pin / no local / no source URI', async () => {
      await setExperimentalSettings({ useExperimental: true });
      setupLocalDisk([]);
      mockedGetJsonFeed.mockResolvedValue(['1.0.0', '1.95.0'] as any);
      mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

      const context = createMockContext();
      const result = await downloadExtensionBundle(context as any);

      expect(result).toBe(true);
      expect(context.telemetry.properties.experimentalFellThroughToPublic).toBe('true');
      expect(mockedDownloadAndExtract).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('1.95.0'),
        defaultExtensionBundlePathValue,
        extensionBundleId,
        '1.95.0'
      );
    });

    // ----- Phase 5 fallback tests -----

    const make404 = () => {
      const err: any = new Error('Request failed with status code 404');
      err.response = { status: 404, headers: {}, data: '' };
      err.isAxiosError = true;
      return err;
    };
    const makeNetworkError = () => {
      const err: any = new Error('getaddrinfo ENOTFOUND private-cdn.example.com');
      err.code = 'ENOTFOUND';
      err.isAxiosError = true;
      return err;
    };

    it('falls back to the public CDN when the experimental URI returns 404 for the pinned zip', async () => {
      await setExperimentalSettings({
        useExperimental: true,
        pinnedVersion: '1.21.0-preview',
        sourceUri: 'https://private-cdn.example.com/public',
      });
      setupLocalDisk(['1.20.0']);
      // Index probe lists the pin so we proceed to download from the source.
      mockedGetJsonFeed.mockResolvedValue(['1.21.0-preview'] as any);
      // Source download 404s, public download succeeds.
      mockedDownloadAndExtract.mockRejectedValueOnce(make404()).mockResolvedValueOnce({ actualMd5: 'md5' } as any);

      const context = createMockContext();
      const result = await downloadExtensionBundle(context as any);

      expect(result).toBe(true);
      expect(mockedDownloadAndExtract).toHaveBeenCalledTimes(2);
      const firstUrl = mockedDownloadAndExtract.mock.calls[0]?.[1] as string;
      const secondUrl = mockedDownloadAndExtract.mock.calls[1]?.[1] as string;
      expect(firstUrl).toContain('private-cdn.example.com');
      expect(secondUrl).toContain('cdn.functions.azure.com/public');
      expect(secondUrl).toContain('1.21.0-preview');
      expect(context.telemetry.properties.experimentalSourceFallback).toBe('zip404');
      expect(context.telemetry.properties.experimentalSourceFallbackTarget).toBe('public');
    });

    it('falls back to the public CDN when the experimental index does not list the pin', async () => {
      await setExperimentalSettings({
        useExperimental: true,
        pinnedVersion: '1.21.0-preview',
        sourceUri: 'https://private-cdn.example.com/public',
      });
      setupLocalDisk(['1.20.0']);
      // Index probe succeeds but pin is missing.
      mockedGetJsonFeed.mockResolvedValue(['1.10.0', '1.20.0'] as any);
      mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

      const context = createMockContext();
      const result = await downloadExtensionBundle(context as any);

      expect(result).toBe(true);
      // Only one download — straight to public, no source-zip attempt.
      expect(mockedDownloadAndExtract).toHaveBeenCalledTimes(1);
      const url = mockedDownloadAndExtract.mock.calls[0]?.[1] as string;
      expect(url).toContain('cdn.functions.azure.com/public');
      expect(url).toContain('1.21.0-preview');
      expect(context.telemetry.properties.experimentalSourceFallback).toBe('pinNotInIndex');
    });

    it('falls back to the public feed when the experimental index returns 404 (cold start, no pin)', async () => {
      await setExperimentalSettings({
        useExperimental: true,
        sourceUri: 'https://private-cdn.example.com/public',
      });
      setupLocalDisk([]);
      // First getJsonFeed call (experimental index) 404s, second call (public feed) succeeds.
      mockedGetJsonFeed.mockRejectedValueOnce(make404()).mockResolvedValueOnce(['1.0.0', '1.95.0'] as any);
      mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

      const context = createMockContext();
      const result = await downloadExtensionBundle(context as any);

      expect(result).toBe(true);
      expect(context.telemetry.properties.experimentalSourceFallback).toBe('index404');
      expect(context.telemetry.properties.experimentalFellThroughToPublic).toBe('true');
      const url = mockedDownloadAndExtract.mock.calls.at(-1)?.[1] as string;
      expect(url).toContain('cdn.functions.azure.com/public');
      expect(url).toContain('1.95.0');
    });

    it('falls back to the public feed on a network error to the experimental URI (cold start, no pin)', async () => {
      await setExperimentalSettings({
        useExperimental: true,
        sourceUri: 'https://private-cdn.example.com/public',
      });
      setupLocalDisk([]);
      mockedGetJsonFeed.mockRejectedValueOnce(makeNetworkError()).mockResolvedValueOnce(['1.0.0', '1.95.0'] as any);
      mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

      const context = createMockContext();
      const result = await downloadExtensionBundle(context as any);

      expect(result).toBe(true);
      expect(context.telemetry.properties.experimentalSourceFallback).toBe('networkError');
      expect(context.telemetry.properties.experimentalFellThroughToPublic).toBe('true');
    });

    it('throws when both the experimental URI and the public CDN 404 for the pinned version', async () => {
      await setExperimentalSettings({
        useExperimental: true,
        pinnedVersion: '9.9.9-bogus',
        sourceUri: 'https://private-cdn.example.com/public',
      });
      setupLocalDisk(['1.20.0']);
      mockedGetJsonFeed.mockResolvedValue(['9.9.9-bogus'] as any);
      mockedDownloadAndExtract.mockRejectedValueOnce(make404()).mockRejectedValueOnce(make404());

      const context = createMockContext();
      // Phase 12+: `downloadExtensionBundleCore` now re-throws on failure so
      // the outer wrapper records `lastBundleInstallResult = 'failed'` and
      // downstream consumers (validateAndInstallBinaries, startDesignTimeApi)
      // can refuse to spawn func.exe. The test originally asserted a swallow
      // returning `false`; that silently let func start against a missing
      // bundle.
      await expect(downloadExtensionBundle(context as any)).rejects.toThrow();
      expect(mockedDownloadAndExtract).toHaveBeenCalledTimes(2);
      expect(getLastBundleInstallResult()).toBe('failed');
    });

    it('does not honor the source URI when the master toggle is off', async () => {
      await setExperimentalSettings({
        useExperimental: false,
        sourceUri: 'https://private-cdn.example.com/public',
        pinnedVersion: '1.21.0-preview',
      });
      setupLocalDisk(['1.20.0']);
      mockedGetJsonFeed.mockResolvedValue(['1.0.0', '1.95.0'] as any);
      mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

      const context = createMockContext();
      const result = await downloadExtensionBundle(context as any);

      expect(result).toBe(true);
      // Public CDN, public latest — toggle off means experimental settings are ignored.
      const url = mockedDownloadAndExtract.mock.calls[0]?.[1] as string;
      expect(url).toContain('cdn.functions.azure.com/public');
      expect(url).toContain('1.95.0');
      expect(url).not.toContain('private-cdn.example.com');
      expect(url).not.toContain('1.21.0-preview');
    });
  });

  describe('deferred post-install design-time restart', () => {
    it('fires startAllDesignTimeApis after the install settles when an update happened', async () => {
      const startApiModule = await import('../codeless/startDesignTimeApi');
      const mockedStart = vi.mocked(startApiModule.startAllDesignTimeApis);
      let inFlightWhenCalled: boolean | undefined;
      let lastResultWhenCalled: ReturnType<typeof getLastBundleInstallResult> | undefined;
      mockedStart.mockImplementation(async () => {
        inFlightWhenCalled = isExtensionBundleDownloadInFlight();
        lastResultWhenCalled = getLastBundleInstallResult();
      });

      setupLocalDisk(['1.75.0']);
      mockedGetJsonFeed.mockResolvedValue(['1.95.0'] as any);
      mockedDownloadAndExtract.mockResolvedValue({ actualMd5: 'md5' } as any);

      const context = createMockContext();
      const result = await downloadExtensionBundle(context as any);
      expect(result).toBe(true);

      // Restart is fire-and-forget — yield to the microtask queue so the IIFE runs.
      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockedStart).toHaveBeenCalledTimes(1);
      expect(inFlightWhenCalled).toBe(false);
      expect(lastResultWhenCalled).toBe('ok');
    });

    it('does NOT fire startAllDesignTimeApis when the download throws', async () => {
      const startApiModule = await import('../codeless/startDesignTimeApi');
      const mockedStart = vi.mocked(startApiModule.startAllDesignTimeApis);
      mockedStart.mockResolvedValue(undefined as any);

      setupLocalDisk(['1.75.0']);
      mockedGetJsonFeed.mockResolvedValue(['1.95.0'] as any);
      mockedDownloadAndExtract.mockRejectedValue(new Error('boom'));

      const context = createMockContext();
      await expect(downloadExtensionBundle(context as any)).rejects.toThrow();

      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockedStart).not.toHaveBeenCalled();
      expect(getLastBundleInstallResult()).toBe('failed');
    });
  });
});

describe('getExtensionBundleBaseUrl', () => {
  let getExtensionBundleBaseUrl: typeof import('../bundleFeed').getExtensionBundleBaseUrl;
  let settingsModule: typeof import('../vsCodeConfig/settings');
  let localSettingsMod: typeof import('../appSettings/localSettings');

  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI;
    ({ getExtensionBundleBaseUrl } = await import('../bundleFeed'));
    settingsModule = await import('../vsCodeConfig/settings');
    localSettingsMod = await import('../appSettings/localSettings');
    vi.mocked(settingsModule.getGlobalSetting).mockReturnValue(undefined);
    vi.mocked(localSettingsMod.getLocalSettingsJson).mockResolvedValue({} as any);
  });

  const ctx = () => ({
    telemetry: { properties: {} as Record<string, string>, measurements: {} as Record<string, number> },
  });

  it('uses local.settings.json over everything else', async () => {
    vi.mocked(localSettingsMod.getLocalSettingsJson).mockResolvedValue({
      Values: { FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI: 'https://from-local-settings' },
    } as any);
    process.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI = 'https://from-env';
    vi.mocked(settingsModule.getGlobalSetting).mockImplementation((key: string) =>
      key === 'useExperimentalExtensionBundle'
        ? (true as any)
        : key === 'experimentalExtensionBundleSourceUri'
          ? ('https://from-vscode' as any)
          : undefined
    );

    const c = ctx();
    const result = await getExtensionBundleBaseUrl(c as any);
    expect(result.baseUrl).toBe('https://from-local-settings');
    expect(result.source).toBe('localSettings');
    expect(c.telemetry.properties.extensionBundleBaseUrlSource).toBe('localSettings');
  });

  it('uses process.env when local.settings.json is empty', async () => {
    process.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI = 'https://from-env';
    const result = await getExtensionBundleBaseUrl(ctx() as any);
    expect(result.baseUrl).toBe('https://from-env');
    expect(result.source).toBe('envVar');
  });

  it('uses experimental setting when toggle is on and the higher-precedence sources are empty', async () => {
    vi.mocked(settingsModule.getGlobalSetting).mockImplementation((key: string) =>
      key === 'useExperimentalExtensionBundle'
        ? (true as any)
        : key === 'experimentalExtensionBundleSourceUri'
          ? ('https://from-vscode' as any)
          : undefined
    );
    const result = await getExtensionBundleBaseUrl(ctx() as any);
    expect(result.baseUrl).toBe('https://from-vscode');
    expect(result.source).toBe('experimentalSetting');
    expect(result.isExperimental).toBe(true);
  });

  it('falls back to the public CDN when nothing is configured', async () => {
    const result = await getExtensionBundleBaseUrl(ctx() as any);
    expect(result.baseUrl).toBe('https://cdn.functions.azure.com/public');
    expect(result.source).toBe('default');
  });
});

describe('assertExtensionBundleOnDiskHealthy', () => {
  const EMPTY_TREE_HASH = '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=';
  const sidecarJson = (sourceMd5: string, contentHash: string) => JSON.stringify({ version: 1, sourceMd5, contentHash });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fse.readFile).mockReset();
    vi.mocked(fse.outputFile).mockResolvedValue(undefined as any);
  });

  it('returns ok when sidecar contentHash matches the recomputed on-disk hash', async () => {
    vi.mocked(fse.readdirSync).mockReturnValue(['1.50.0'] as any);
    vi.mocked(fse.statSync).mockReturnValue({ isDirectory: () => true } as any);
    vi.mocked(fse.pathExists).mockResolvedValue(true as any);
    vi.mocked(fse.readdir).mockResolvedValue([] as any);
    vi.mocked(fse.readFile).mockResolvedValue(sidecarJson('anyMd5', EMPTY_TREE_HASH) as any);

    const result = await assertExtensionBundleOnDiskHealthy();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.version).toBe('1.50.0');
    }
  });

  it('returns contentMismatch when the recomputed hash does not match the sidecar', async () => {
    vi.mocked(fse.readdirSync).mockReturnValue(['1.50.0'] as any);
    vi.mocked(fse.statSync).mockReturnValue({ isDirectory: () => true } as any);
    vi.mocked(fse.pathExists).mockResolvedValue(true as any);
    vi.mocked(fse.readdir).mockResolvedValue([] as any);
    // Sidecar claims a different hash than what computeBundleContentHash would
    // return for an empty tree.
    vi.mocked(fse.readFile).mockResolvedValue(sidecarJson('anyMd5', 'TOTALLY-DIFFERENT-HASH') as any);

    const result = await assertExtensionBundleOnDiskHealthy();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('contentMismatch');
      expect(result.version).toBe('1.50.0');
    }
  });

  it('returns sidecarMissing when no sidecar exists', async () => {
    vi.mocked(fse.readdirSync).mockReturnValue(['1.50.0'] as any);
    vi.mocked(fse.statSync).mockReturnValue({ isDirectory: () => true } as any);
    // pathExists returns true for bundle dir, false for sidecar file.
    vi.mocked(fse.pathExists).mockImplementation(((p: string) => {
      if (typeof p === 'string' && p.endsWith('.bundle-source-md5')) {
        return Promise.resolve(false);
      }
      return Promise.resolve(true);
    }) as any);

    const result = await assertExtensionBundleOnDiskHealthy();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('sidecarMissing');
    }
  });

  it('returns noBundle when no local bundle version exists', async () => {
    vi.mocked(fse.readdirSync).mockReturnValue([] as any);
    vi.mocked(fse.pathExists).mockResolvedValue(true as any);
    const result = await assertExtensionBundleOnDiskHealthy();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('noBundle');
    }
  });
});

describe('assertExtensionBundleOnDiskHealthy tree-fingerprint fast path', () => {
  const VERSION = '1.50.0';
  const bundleDir = path.join(defaultExtensionBundlePathValue, VERSION);
  const binDir = path.join(bundleDir, 'bin');
  const filePath = path.join(binDir, 'bundle.dll');
  const CONTENT = 'bundle-content';
  const SIZE = Buffer.byteLength(CONTENT);
  const MTIME_MS = 1000;

  // Mirror the production digest layout: `<relPath>\0<field>\0…`.
  const digest = (parts: string[]): string => {
    const hash = createHash('sha256');
    for (const part of parts) {
      hash.update(part);
      hash.update('\0');
    }
    return hash.digest('base64');
  };
  const CONTENT_HASH = digest(['bin/bundle.dll', String(SIZE), CONTENT]);
  const TREE_FINGERPRINT = digest(['bin/bundle.dll', String(SIZE), String(MTIME_MS)]);

  // Sets up a one-file bundle tree on the mocked filesystem and returns the last
  // sidecar payload written (for backfill assertions).
  const setupOneFileTree = (sidecar: string) => {
    const state = { written: '' };
    vi.mocked(fse.readdirSync).mockReturnValue([VERSION] as any);
    vi.mocked(fse.statSync).mockReturnValue({ isDirectory: () => true } as any);
    vi.mocked(fse.pathExists).mockResolvedValue(true as any);
    vi.mocked(fse.readdir).mockImplementation(((p: string) => {
      if (p === bundleDir) {
        return Promise.resolve(['bin'] as any);
      }
      if (p === binDir) {
        return Promise.resolve(['bundle.dll'] as any);
      }
      return Promise.resolve([] as any);
    }) as any);
    vi.mocked(fse.lstat).mockImplementation(((p: string) =>
      Promise.resolve({
        isDirectory: () => p === binDir,
        isFile: () => p === filePath,
        size: SIZE,
        mtimeMs: MTIME_MS,
      } as any)) as any);
    vi.mocked(fse.stat).mockImplementation(((p: string) =>
      Promise.resolve({
        size: SIZE,
        mtimeMs: MTIME_MS,
        isDirectory: () => p === bundleDir || p === binDir,
        isFile: () => p === filePath,
      } as any)) as any);
    vi
      .mocked(fse.createReadStream)
      .mockImplementation((p: string) => (p === filePath ? Readable.from([Buffer.from(CONTENT)]) : Readable.from([])) as any) as any;
    vi.mocked(fse.readFile).mockResolvedValue(sidecar as any);
    vi.mocked(fse.outputFile).mockImplementation((async (_p: string, payload: string) => {
      state.written = payload;
    }) as any);
    vi.mocked(fse.move).mockResolvedValue(undefined as any);
    return state;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fse.readFile).mockReset();
    vi.mocked(fse.outputFile).mockResolvedValue(undefined as any);
    // Default: a recent deep verification so the throttle is NOT due.
    vi.mocked(ext.context.globalState.get).mockReturnValue(Date.now());
    vi.mocked(ext.context.globalState.update).mockResolvedValue(undefined as any);
  });

  it('takes the fast path (no byte hash) when the tree fingerprint matches', async () => {
    setupOneFileTree(JSON.stringify({ version: 1, sourceMd5: 'md5', contentHash: CONTENT_HASH, treeFingerprint: TREE_FINGERPRINT }));

    const result = await assertExtensionBundleOnDiskHealthy();

    expect(result.ok).toBe(true);
    // The whole point: the expensive per-byte read never happens.
    expect(vi.mocked(fse.createReadStream)).not.toHaveBeenCalled();
  });

  it('falls back to the byte hash and reports contentMismatch when the fingerprint drifts', async () => {
    setupOneFileTree(JSON.stringify({ version: 1, sourceMd5: 'md5', contentHash: 'WRONG', treeFingerprint: 'STALE-FINGERPRINT' }));

    const result = await assertExtensionBundleOnDiskHealthy();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('contentMismatch');
    }
    expect(vi.mocked(fse.createReadStream)).toHaveBeenCalled();
  });

  it('runs the byte hash and backfills the fingerprint for a legacy sidecar', async () => {
    const state = setupOneFileTree(JSON.stringify({ version: 1, sourceMd5: 'md5', contentHash: CONTENT_HASH }));

    const result = await assertExtensionBundleOnDiskHealthy();

    expect(result.ok).toBe(true);
    // Legacy sidecar has no fingerprint → must byte-hash to verify.
    expect(vi.mocked(fse.createReadStream)).toHaveBeenCalled();
    // …then upgrade the sidecar so the next launch is fast.
    expect(vi.mocked(fse.outputFile)).toHaveBeenCalled();
    expect(JSON.parse(state.written).treeFingerprint).toBe(TREE_FINGERPRINT);
  });

  it('runs the byte hash and records a timestamp when the deep-verify throttle is due', async () => {
    // Fingerprint matches, but the last deep verification was long ago → due.
    vi.mocked(ext.context.globalState.get).mockReturnValue(0);
    setupOneFileTree(JSON.stringify({ version: 1, sourceMd5: 'md5', contentHash: CONTENT_HASH, treeFingerprint: TREE_FINGERPRINT }));

    const result = await assertExtensionBundleOnDiskHealthy();

    expect(result.ok).toBe(true);
    // Throttle due → byte hash runs even though the fingerprint matched.
    expect(vi.mocked(fse.createReadStream)).toHaveBeenCalled();
    expect(vi.mocked(ext.context.globalState.update)).toHaveBeenCalledWith(lastBundleDeepVerificationKey, expect.any(Number));
  });
});

describe('ensureExtensionBundleHealthy repair gate', () => {
  const EMPTY_TREE_HASH = '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=';
  const sidecarJson = (sourceMd5: string, contentHash: string) => JSON.stringify({ version: 1, sourceMd5, contentHash });
  // A modern sidecar for an EMPTY on-disk tree: the lstat tree + structural
  // fingerprints of an empty walk both equal the empty-input sha256, which is the
  // same as EMPTY_TREE_HASH. A recent `lastDeepVerifiedMs` keeps the 24h throttle
  // from firing so the fast gate takes the exact-match path with NO background
  // verification — the real steady-state relaunch.
  const modernHealthySidecar = () =>
    JSON.stringify({
      version: 1,
      sourceMd5: 'md5',
      contentHash: EMPTY_TREE_HASH,
      treeFingerprint: EMPTY_TREE_HASH,
      structuralFingerprint: EMPTY_TREE_HASH,
      lastDeepVerifiedMs: Date.now(),
    });

  const ctx = () => ({
    telemetry: { properties: {} as Record<string, string>, measurements: {} as Record<string, number> },
  });

  beforeEach(async () => {
    // Drain any background deep verification left in flight by a prior test so it
    // can't mutate shared module state (install result / health cache) mid-test.
    await awaitBackgroundBundleDeepVerification();
    vi.clearAllMocks();
    resetCachedBundleVersion();
    vi.mocked(fse.readFile).mockReset();
    vi.mocked(fse.outputFile).mockResolvedValue(undefined as any);
  });

  it('passes through when on-disk health check returns ok', async () => {
    vi.mocked(fse.readdirSync).mockReturnValue(['1.50.0'] as any);
    vi.mocked(fse.statSync).mockReturnValue({ isDirectory: () => true } as any);
    vi.mocked(fse.pathExists).mockResolvedValue(true as any);
    vi.mocked(fse.readdir).mockResolvedValue([] as any);
    vi.mocked(fse.readFile).mockResolvedValue(modernHealthySidecar() as any);

    await expect(ensureExtensionBundleHealthy(ctx() as any)).resolves.toBeUndefined();
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('Logic Apps extension bundle 1.50.0 on-disk integrity check passed.');
    expect(vi.mocked(binariesModule.downloadAndExtractDependency)).not.toHaveBeenCalled();
    // Exact fingerprint match + not due ⇒ the ~40s byte hash never runs.
    expect(vi.mocked(fse.createReadStream)).not.toHaveBeenCalled();
  });

  it('repairs in the background when the fast gate passes but a genuine content mismatch is found', async () => {
    let downloaded = false;
    vi.mocked(fse.readdirSync).mockReturnValue(['1.50.0'] as any);
    vi.mocked(fse.statSync).mockReturnValue({ isDirectory: () => true } as any);
    vi.mocked(fse.pathExists).mockResolvedValue(true as any);
    vi.mocked(fse.readdir).mockResolvedValue([] as any);
    // Legacy sidecar (no fingerprints) whose stored content hash is WRONG. The
    // fast gate passes provisionally; the background deep verify byte-hashes,
    // finds the mismatch, and repairs. After the repair the sidecar reads clean.
    vi.mocked(fse.readFile).mockImplementation((async () =>
      downloaded ? sidecarJson('md5', EMPTY_TREE_HASH) : sidecarJson('md5', 'WRONG')) as any);
    vi.mocked(feedModule.getJsonFeed).mockResolvedValue(['1.50.0'] as any);
    const integrityModule = await import('../integrity');
    vi.mocked(integrityModule.fetchExpectedMd5).mockResolvedValue('md5');
    vi.mocked(binariesModule.downloadAndExtractDependency).mockImplementation((async () => {
      downloaded = true;
      return { actualMd5: 'md5' } as any;
    }) as any);

    // Activation is NOT blocked on the byte hash — it resolves immediately.
    await expect(ensureExtensionBundleHealthy(ctx() as any)).resolves.toBeUndefined();
    // The repair runs off the activation path.
    await awaitBackgroundBundleDeepVerification();
    expect(vi.mocked(binariesModule.downloadAndExtractDependency)).toHaveBeenCalled();
  });

  it('repairs instead of backfilling when the strict on-disk health gate lacks a sidecar', async () => {
    const localVersion = '1.50.0';
    const bundleDir = path.join(defaultExtensionBundlePathValue, localVersion);
    const filePath = path.join(bundleDir, 'bin', 'bundle.dll');
    const depsPath = path.join(bundleDir, 'bin', 'function.deps.json');
    const depsContents = JSON.stringify({ targets: { bundle: { 'bundle/1.0.0': { runtime: { 'lib/netstandard2.0/bundle.dll': {} } } } } });
    let sidecarExists = false;
    let sidecarPayload = '';

    vi.mocked(fse.readdirSync).mockReturnValue([localVersion] as any);
    vi.mocked(fse.statSync).mockReturnValue({ isDirectory: () => true } as any);
    vi.mocked(fse.pathExists).mockImplementation(((p: string) => {
      if (typeof p === 'string' && p.endsWith('.bundle-source-md5')) {
        return Promise.resolve(sidecarExists);
      }
      return Promise.resolve(true);
    }) as any);
    vi.mocked(fse.readdir).mockImplementation(((p: string) => {
      if (p === bundleDir) {
        return Promise.resolve(['bin'] as any);
      }
      if (p === path.join(bundleDir, 'bin')) {
        return Promise.resolve(['bundle.dll', 'function.deps.json'] as any);
      }
      return Promise.resolve([] as any);
    }) as any);
    vi.mocked(fse.lstat).mockImplementation(((p: string) =>
      Promise.resolve({
        isDirectory: () => p === path.join(bundleDir, 'bin'),
        isFile: () => p === filePath || p === depsPath,
      } as any)) as any);
    vi.mocked(fse.stat).mockImplementation(((p: string) =>
      Promise.resolve({
        size: p === filePath ? Buffer.byteLength('bundle-content') : p === depsPath ? Buffer.byteLength(depsContents) : 0,
        isDirectory: () => p === bundleDir || p === path.join(bundleDir, 'bin'),
        isFile: () => p === filePath || p === depsPath,
      } as any)) as any);
    vi.mocked(fse.createReadStream).mockImplementation(((p: string) => {
      if (p === filePath) {
        return Readable.from([Buffer.from('bundle-content')]) as any;
      }
      if (p === depsPath) {
        return Readable.from([Buffer.from(depsContents)]) as any;
      }
      return Readable.from([]) as any;
    }) as any);
    vi.mocked(fse.readFile).mockImplementation(((p: string) => {
      if (p === depsPath) {
        return Promise.resolve(depsContents as any);
      }
      return Promise.resolve(sidecarPayload as any);
    }) as any);
    vi.mocked(fse.outputFile).mockImplementation((async (_p: string, payload: string) => {
      sidecarPayload = payload;
    }) as any);
    vi.mocked(fse.move).mockImplementation((async () => {
      sidecarExists = true;
    }) as any);
    vi.mocked(feedModule.getJsonFeed).mockResolvedValue([localVersion] as any);
    vi.mocked(binariesModule.downloadAndExtractDependency).mockResolvedValue({ actualMd5: 'md5' } as any);

    await expect(ensureExtensionBundleHealthy(ctx() as any)).resolves.toBeUndefined();

    expect(vi.mocked(binariesModule.downloadAndExtractDependency)).toHaveBeenCalled();
  });

  it('does not block activation and logs when a background repair download fails', async () => {
    vi.mocked(fse.readdirSync).mockReturnValue(['1.50.0'] as any);
    vi.mocked(fse.statSync).mockReturnValue({ isDirectory: () => true } as any);
    vi.mocked(fse.pathExists).mockResolvedValue(true as any);
    vi.mocked(fse.readdir).mockResolvedValue([] as any);
    // Legacy sidecar with a WRONG content hash: the fast gate passes provisionally,
    // the background deep verify byte-hashes, finds the mismatch, and tries to
    // repair — but the CDN is down.
    vi.mocked(fse.readFile).mockResolvedValue(sidecarJson('md5', 'WRONG') as any);
    vi.mocked(feedModule.getJsonFeed).mockResolvedValue(['1.50.0'] as any);
    const integrityModule = await import('../integrity');
    vi.mocked(integrityModule.fetchExpectedMd5).mockResolvedValue('md5');
    vi.mocked(binariesModule.downloadAndExtractDependency).mockRejectedValue(new Error('CDN down'));

    // Non-blocking: activation must NOT throw even though the background repair fails.
    await expect(ensureExtensionBundleHealthy(ctx() as any)).resolves.toBeUndefined();
    await awaitBackgroundBundleDeepVerification();
    expect(vi.mocked(binariesModule.downloadAndExtractDependency)).toHaveBeenCalled();
    const failureLogged = vi
      .mocked(ext.outputChannel.appendLog)
      .mock.calls.map(([value]) => String(value))
      .some((line) => line.includes('background deep verification'));
    expect(failureLogged).toBe(true);
  });

  it('downloads and verifies the bundle when required mode starts with no local bundle', async () => {
    let readdirSyncCalls = 0;
    vi.mocked(fse.readdirSync).mockImplementation((() => {
      readdirSyncCalls++;
      return readdirSyncCalls <= 2 ? [] : ['1.50.0'];
    }) as any);
    vi.mocked(fse.statSync).mockReturnValue({ isDirectory: () => true } as any);
    vi.mocked(fse.pathExists).mockResolvedValue(true as any);
    vi.mocked(fse.readdir).mockResolvedValue([] as any);
    vi.mocked(fse.readFile).mockResolvedValue(sidecarJson('md5', EMPTY_TREE_HASH) as any);
    vi.mocked(feedModule.getJsonFeed).mockResolvedValue(['1.50.0'] as any);
    const integrityModule = await import('../integrity');
    vi.mocked(integrityModule.fetchExpectedMd5).mockResolvedValue('md5');
    vi.mocked(binariesModule.downloadAndExtractDependency).mockResolvedValue({ actualMd5: 'md5' } as any);

    await expect(ensureExtensionBundleHealthy(ctx() as any, { requireInstalled: true })).resolves.toBeUndefined();

    expect(vi.mocked(binariesModule.downloadAndExtractDependency)).toHaveBeenCalled();
  });

  it('rejects required mode when bundle install does not leave a sidecar', async () => {
    let readdirSyncCalls = 0;
    vi.mocked(fse.readdirSync).mockImplementation((() => {
      readdirSyncCalls++;
      return readdirSyncCalls <= 2 ? [] : ['1.50.0'];
    }) as any);
    vi.mocked(fse.statSync).mockReturnValue({ isDirectory: () => true } as any);
    vi.mocked(fse.pathExists).mockImplementation(((p: string) => Promise.resolve(!p.endsWith('.bundle-source-md5'))) as any);
    vi.mocked(fse.readdir).mockResolvedValue([] as any);
    vi.mocked(feedModule.getJsonFeed).mockResolvedValue(['1.50.0'] as any);
    const integrityModule = await import('../integrity');
    vi.mocked(integrityModule.fetchExpectedMd5).mockResolvedValue('md5');
    vi.mocked(binariesModule.downloadAndExtractDependency).mockResolvedValue({ actualMd5: 'md5' } as any);

    await expect(ensureExtensionBundleHealthy(ctx() as any, { requireInstalled: true })).rejects.toThrow(
      /on-disk integrity still failed: sidecarMissing/
    );
  });
});

describe('ensureExtensionBundleHealthy session cache', () => {
  const EMPTY_TREE_HASH = '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=';
  const sidecarJson = (sourceMd5: string, contentHash: string) => JSON.stringify({ version: 1, sourceMd5, contentHash });
  // Modern steady-state sidecar for an empty on-disk tree (see the repair-gate
  // describe): fingerprints match the empty walk and the deep-verify throttle is
  // fresh, so the fast gate takes the exact-match path with NO background hash.
  const modernHealthySidecar = () =>
    JSON.stringify({
      version: 1,
      sourceMd5: 'md5',
      contentHash: EMPTY_TREE_HASH,
      treeFingerprint: EMPTY_TREE_HASH,
      structuralFingerprint: EMPTY_TREE_HASH,
      lastDeepVerifiedMs: Date.now(),
    });

  const ctx = () => ({
    telemetry: { properties: {} as Record<string, string>, measurements: {} as Record<string, number> },
  });

  const setupHealthyBundle = () => {
    vi.mocked(fse.readdirSync).mockReturnValue(['1.50.0'] as any);
    vi.mocked(fse.statSync).mockReturnValue({ isDirectory: () => true } as any);
    vi.mocked(fse.pathExists).mockResolvedValue(true as any);
    vi.mocked(fse.readdir).mockResolvedValue([] as any);
    vi.mocked(fse.readFile).mockResolvedValue(modernHealthySidecar() as any);
  };

  beforeEach(async () => {
    await awaitBackgroundBundleDeepVerification();
    vi.clearAllMocks();
    resetCachedBundleVersion();
    vi.mocked(fse.readFile).mockReset();
    vi.mocked(fse.outputFile).mockResolvedValue(undefined as any);
  });

  it('verifies the bundle once and reuses the cached result on later calls', async () => {
    setupHealthyBundle();

    await expect(ensureExtensionBundleHealthy(ctx() as any)).resolves.toBeUndefined();
    await expect(ensureExtensionBundleHealthy(ctx() as any)).resolves.toBeUndefined();

    // The sidecar is read exactly once — the second call short-circuits on the
    // session cache instead of recomputing the full-tree hash.
    expect(vi.mocked(fse.readFile)).toHaveBeenCalledTimes(1);
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(
      'Logic Apps extension bundle 1.50.0 already verified this session; skipping on-disk integrity re-check.'
    );
  });

  it('logs the "already verified" skip on every cached launch (once per project)', async () => {
    setupHealthyBundle();

    // Simulates a multi-project workspace launching several design-time hosts in one session.
    // The first launch computes and caches the health result; each subsequent launch short-circuits
    // on the cache and logs the skip line, consistent with the other per-startup log lines.
    await ensureExtensionBundleHealthy(ctx() as any);
    await ensureExtensionBundleHealthy(ctx() as any);
    await ensureExtensionBundleHealthy(ctx() as any);

    const skipLogs = vi
      .mocked(ext.outputChannel.appendLog)
      .mock.calls.map(([value]) => String(value))
      .filter((line) => line.includes('already verified this session'));
    expect(skipLogs).toHaveLength(2);
  });

  it('logs the "already verified" skip again after the health cache is invalidated', async () => {
    setupHealthyBundle();

    await ensureExtensionBundleHealthy(ctx() as any);
    await ensureExtensionBundleHealthy(ctx() as any);
    invalidateBundleHealthCache();
    await ensureExtensionBundleHealthy(ctx() as any);
    await ensureExtensionBundleHealthy(ctx() as any);

    const skipLogs = vi
      .mocked(ext.outputChannel.appendLog)
      .mock.calls.map(([value]) => String(value))
      .filter((line) => line.includes('already verified this session'));
    expect(skipLogs).toHaveLength(2);
  });

  it('recomputes after invalidateBundleHealthCache', async () => {
    setupHealthyBundle();

    await ensureExtensionBundleHealthy(ctx() as any);
    invalidateBundleHealthCache();
    await ensureExtensionBundleHealthy(ctx() as any);

    expect(vi.mocked(fse.readFile)).toHaveBeenCalledTimes(2);
  });

  it('recomputes after resetCachedBundleVersion', async () => {
    setupHealthyBundle();

    await ensureExtensionBundleHealthy(ctx() as any);
    resetCachedBundleVersion();
    await ensureExtensionBundleHealthy(ctx() as any);

    expect(vi.mocked(fse.readFile)).toHaveBeenCalledTimes(2);
  });

  it('caches only after a successful repair and reuses it afterward', async () => {
    // Drive a SYNCHRONOUS repair via a missing sidecar (a fast-gate failure), so
    // the repair completes before the first call resolves and the session cache is
    // populated deterministically — a genuine byte-level corruption would instead
    // repair off the activation path (covered by the repair-gate describe).
    let sidecarExists = false;
    vi.mocked(fse.readdirSync).mockReturnValue(['1.50.0'] as any);
    vi.mocked(fse.statSync).mockReturnValue({ isDirectory: () => true } as any);
    vi.mocked(fse.pathExists).mockImplementation(((p: string) => {
      if (typeof p === 'string' && p.endsWith('.bundle-source-md5')) {
        return Promise.resolve(sidecarExists);
      }
      return Promise.resolve(true);
    }) as any);
    vi.mocked(fse.readdir).mockResolvedValue([] as any);
    vi.mocked(fse.readFile).mockResolvedValue(modernHealthySidecar() as any);
    vi.mocked(fse.move).mockImplementation((async () => {
      sidecarExists = true;
    }) as any);
    vi.mocked(feedModule.getJsonFeed).mockResolvedValue(['1.50.0'] as any);
    const integrityModule = await import('../integrity');
    vi.mocked(integrityModule.fetchExpectedMd5).mockResolvedValue('md5');
    vi.mocked(binariesModule.downloadAndExtractDependency).mockResolvedValue({ actualMd5: 'md5' } as any);

    // First call: the missing sidecar does NOT short-circuit; it repairs synchronously.
    await expect(ensureExtensionBundleHealthy(ctx() as any)).resolves.toBeUndefined();
    expect(vi.mocked(binariesModule.downloadAndExtractDependency)).toHaveBeenCalledTimes(1);

    // Second call: reuses the cache populated by the successful repair — no
    // second repair, no re-hash.
    await expect(ensureExtensionBundleHealthy(ctx() as any)).resolves.toBeUndefined();
    expect(vi.mocked(binariesModule.downloadAndExtractDependency)).toHaveBeenCalledTimes(1);
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(
      'Logic Apps extension bundle 1.50.0 already verified this session; skipping on-disk integrity re-check.'
    );
  });
});

describe('ensureExtensionBundleHealthy fast gate (non-blocking)', () => {
  const VERSION = '1.60.0';
  const bundleDir = path.join(defaultExtensionBundlePathValue, VERSION);
  const binDir = path.join(bundleDir, 'bin');
  const filePath = path.join(binDir, 'bundle.dll');
  const CONTENT = 'bundle-content';
  const SIZE = Buffer.byteLength(CONTENT);
  const OLD_MTIME = 1000;
  const NEW_MTIME = 2000;

  const digest = (parts: string[]): string => {
    const hash = createHash('sha256');
    for (const part of parts) {
      hash.update(part);
      hash.update('\0');
    }
    return hash.digest('base64');
  };
  const CONTENT_HASH = digest(['bin/bundle.dll', String(SIZE), CONTENT]);
  const STRUCTURAL_FP = digest(['bin/bundle.dll', String(SIZE)]);
  const TREE_FP = (mtime: number) => digest(['bin/bundle.dll', String(SIZE), String(mtime)]);

  const ctx = () => ({
    telemetry: { properties: {} as Record<string, string>, measurements: {} as Record<string, number> },
  });

  // Sets up a one-file bundle tree on the mocked filesystem with the given on-disk
  // mtime and sidecar payload; returns a handle capturing the last sidecar written.
  const setup = (sidecar: string, mtimeMs: number) => {
    const state = { written: '' };
    vi.mocked(fse.readdirSync).mockReturnValue([VERSION] as any);
    vi.mocked(fse.statSync).mockReturnValue({ isDirectory: () => true } as any);
    vi.mocked(fse.pathExists).mockResolvedValue(true as any);
    vi.mocked(fse.readdir).mockImplementation(((p: string) => {
      if (p === bundleDir) {
        return Promise.resolve(['bin'] as any);
      }
      if (p === binDir) {
        return Promise.resolve(['bundle.dll'] as any);
      }
      return Promise.resolve([] as any);
    }) as any);
    vi.mocked(fse.lstat).mockImplementation(((p: string) =>
      Promise.resolve({
        isDirectory: () => p === binDir,
        isFile: () => p === filePath,
        size: SIZE,
        mtimeMs,
      } as any)) as any);
    vi.mocked(fse.stat).mockImplementation(((p: string) =>
      Promise.resolve({
        size: SIZE,
        mtimeMs,
        isDirectory: () => p === bundleDir || p === binDir,
        isFile: () => p === filePath,
      } as any)) as any);
    vi
      .mocked(fse.createReadStream)
      .mockImplementation((p: string) => (p === filePath ? Readable.from([Buffer.from(CONTENT)]) : Readable.from([])) as any) as any;
    vi.mocked(fse.readFile).mockResolvedValue(sidecar as any);
    vi.mocked(fse.outputFile).mockImplementation((async (_p: string, payload: string) => {
      state.written = payload;
    }) as any);
    vi.mocked(fse.move).mockResolvedValue(undefined as any);
    return state;
  };

  beforeEach(async () => {
    await awaitBackgroundBundleDeepVerification();
    vi.clearAllMocks();
    resetCachedBundleVersion();
    vi.mocked(fse.readFile).mockReset();
    vi.mocked(fse.outputFile).mockResolvedValue(undefined as any);
    vi.mocked(ext.context.globalState.get).mockReturnValue(Date.now());
    vi.mocked(ext.context.globalState.update).mockResolvedValue(undefined as any);
  });

  it('refreshes the fingerprint without a byte hash on benign metadata-only drift', async () => {
    // Structural fingerprint (path + size) matches; only mtime moved. The gate must
    // trust it and refresh the tree fingerprint WITHOUT the ~40s byte hash.
    const state = setup(
      JSON.stringify({
        version: 1,
        sourceMd5: 'md5',
        contentHash: CONTENT_HASH,
        treeFingerprint: TREE_FP(OLD_MTIME),
        structuralFingerprint: STRUCTURAL_FP,
        lastDeepVerifiedMs: Date.now(),
      }),
      NEW_MTIME
    );

    await expect(ensureExtensionBundleHealthy(ctx() as any)).resolves.toBeUndefined();
    await awaitBackgroundBundleDeepVerification();

    // No byte hash, no repair download.
    expect(vi.mocked(fse.createReadStream)).not.toHaveBeenCalled();
    expect(vi.mocked(binariesModule.downloadAndExtractDependency)).not.toHaveBeenCalled();
    // The tree fingerprint was refreshed to the current mtime so the next launch
    // takes the exact-match path.
    expect(JSON.parse(state.written).treeFingerprint).toBe(TREE_FP(NEW_MTIME));
  });

  it('honors a fresh sidecar-persisted deep-verify timestamp even when globalState is stale (H1)', async () => {
    // globalState says a deep verify is overdue, but the sidecar carries a fresh
    // lastDeepVerifiedMs. The sidecar must win, so NO background byte hash runs.
    vi.mocked(ext.context.globalState.get).mockReturnValue(0);
    setup(
      JSON.stringify({
        version: 1,
        sourceMd5: 'md5',
        contentHash: CONTENT_HASH,
        treeFingerprint: TREE_FP(OLD_MTIME),
        structuralFingerprint: STRUCTURAL_FP,
        lastDeepVerifiedMs: Date.now(),
      }),
      OLD_MTIME
    );

    await expect(ensureExtensionBundleHealthy(ctx() as any)).resolves.toBeUndefined();
    await awaitBackgroundBundleDeepVerification();

    expect(vi.mocked(fse.createReadStream)).not.toHaveBeenCalled();
    expect(vi.mocked(binariesModule.downloadAndExtractDependency)).not.toHaveBeenCalled();
  });

  it('schedules a background deep verify when the sidecar timestamp is stale (throttle due)', async () => {
    // Exact fingerprint match, but the deep-verify throttle is due per the sidecar
    // timestamp → the byte hash runs OFF the activation path (activation resolves first).
    setup(
      JSON.stringify({
        version: 1,
        sourceMd5: 'md5',
        contentHash: CONTENT_HASH,
        treeFingerprint: TREE_FP(OLD_MTIME),
        structuralFingerprint: STRUCTURAL_FP,
        lastDeepVerifiedMs: 0,
      }),
      OLD_MTIME
    );

    await expect(ensureExtensionBundleHealthy(ctx() as any)).resolves.toBeUndefined();
    // The byte hash has NOT necessarily run yet (it's backgrounded) — drain it.
    await awaitBackgroundBundleDeepVerification();

    // The background deep verify byte-hashed the tree…
    expect(vi.mocked(fse.createReadStream)).toHaveBeenCalled();
    // …matched, so no repair, and it recorded a fresh deep-verify timestamp.
    expect(vi.mocked(binariesModule.downloadAndExtractDependency)).not.toHaveBeenCalled();
    expect(vi.mocked(ext.context.globalState.update)).toHaveBeenCalledWith(lastBundleDeepVerificationKey, expect.any(Number));
  });
});

describe('short-circuit verification (envVar / experimental pins)', () => {
  const sidecarJson = (sourceMd5: string, contentHash: string) => JSON.stringify({ version: 1, sourceMd5, contentHash });

  beforeEach(async () => {
    vi.clearAllMocks();
    resetCachedBundleVersion();
    delete process.env.AzureFunctionsJobHost_extensionBundle_version;
    const settingsMod = await import('../vsCodeConfig/settings');
    vi.mocked(settingsMod.getGlobalSetting).mockReturnValue(undefined);
    const localSettingsMod = await import('../appSettings/localSettings');
    vi.mocked(localSettingsMod.getLocalSettingsJson).mockResolvedValue({} as any);
    vi.mocked(fse.readFile).mockReset();
    vi.mocked(fse.outputFile).mockResolvedValue(undefined as any);
  });

  it('env-var pin: re-downloads when on-disk content hash drifts', async () => {
    const localSettingsMod = await import('../appSettings/localSettings');
    vi.mocked(localSettingsMod.getLocalSettingsJson).mockResolvedValue({
      Values: { AzureFunctionsJobHost_extensionBundle_version: '1.50.0' },
    } as any);
    vi.mocked(fse.readdirSync).mockReturnValue(['1.50.0'] as any);
    vi.mocked(fse.statSync).mockReturnValue({ isDirectory: () => true } as any);
    vi.mocked(fse.pathExists).mockResolvedValue(true as any);
    vi.mocked(fse.readdir).mockResolvedValue([] as any);
    // Sidecar says contentHash X, recompute returns empty-tree hash ≠ X.
    vi.mocked(fse.readFile).mockResolvedValue(sidecarJson('md5', 'STALE') as any);
    const integrityModule = await import('../integrity');
    vi.mocked(integrityModule.fetchExpectedMd5).mockResolvedValue('md5');
    vi.mocked(binariesModule.downloadAndExtractDependency).mockResolvedValue(undefined as any);

    const context = { telemetry: { properties: {} as any, measurements: {} as any } };
    await expect(downloadExtensionBundle(context as any)).rejects.toThrow(/no source MD5 was available/);
    expect(vi.mocked(binariesModule.downloadAndExtractDependency)).toHaveBeenCalled();
  });

  it('experimental pin: re-downloads when on-disk content hash drifts', async () => {
    const settingsMod = await import('../vsCodeConfig/settings');
    vi.mocked(settingsMod.getGlobalSetting).mockImplementation((key: string) => {
      if (key === 'useExperimentalExtensionBundle') {
        return true as any;
      }
      if (key === 'experimentalExtensionBundlePinnedVersion') {
        return '1.50.0' as any;
      }
      return undefined as any;
    });
    vi.mocked(fse.readdirSync).mockReturnValue(['1.50.0'] as any);
    vi.mocked(fse.statSync).mockReturnValue({ isDirectory: () => true } as any);
    vi.mocked(fse.pathExists).mockResolvedValue(true as any);
    vi.mocked(fse.readdir).mockResolvedValue([] as any);
    vi.mocked(fse.readFile).mockResolvedValue(sidecarJson('md5', 'STALE') as any);
    const integrityModule = await import('../integrity');
    vi.mocked(integrityModule.fetchExpectedMd5).mockResolvedValue('md5');
    vi.mocked(binariesModule.downloadAndExtractDependency).mockResolvedValue(undefined as any);

    const context = { telemetry: { properties: {} as any, measurements: {} as any } };
    await expect(downloadExtensionBundle(context as any)).rejects.toThrow(/no source MD5 was available/);
    expect(vi.mocked(binariesModule.downloadAndExtractDependency)).toHaveBeenCalled();
  });

  it('experimental no-pin local latest: re-downloads when on-disk content hash drifts', async () => {
    const settingsMod = await import('../vsCodeConfig/settings');
    vi.mocked(settingsMod.getGlobalSetting).mockImplementation((key: string) => {
      if (key === 'useExperimentalExtensionBundle') {
        return true as any;
      }
      return undefined as any;
    });
    vi.mocked(fse.readdirSync).mockReturnValue(['1.50.0'] as any);
    vi.mocked(fse.statSync).mockReturnValue({ isDirectory: () => true } as any);
    vi.mocked(fse.pathExists).mockResolvedValue(true as any);
    vi.mocked(fse.readdir).mockResolvedValue([] as any);
    vi.mocked(fse.readFile).mockResolvedValue(sidecarJson('md5', 'STALE') as any);
    const integrityModule = await import('../integrity');
    vi.mocked(integrityModule.fetchExpectedMd5).mockResolvedValue('md5');
    vi.mocked(binariesModule.downloadAndExtractDependency).mockResolvedValue(undefined as any);

    const context = { telemetry: { properties: {} as any, measurements: {} as any } };
    await expect(downloadExtensionBundle(context as any)).rejects.toThrow(/no source MD5 was available/);
    expect(vi.mocked(binariesModule.downloadAndExtractDependency)).toHaveBeenCalled();
  });
});
