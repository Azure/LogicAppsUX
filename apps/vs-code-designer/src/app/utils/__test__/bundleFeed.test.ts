import {
  getBundleVersionNumber,
  getBundleDependencyFeed,
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
  awaitBackgroundBundleFeedRefresh,
} from '../bundleFeed';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as cp from 'child_process';
import { extensionBundleId, defaultVersionRange, defaultExtensionBundlePathValue, bundleInstallCompleteFile } from '../../../constants';
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

// Mock integrity error classification used by experimental-source fallback.
vi.mock('../integrity', () => ({
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

vi.mock('../workspace', () => ({
  selectLogicAppRoot: vi.fn().mockResolvedValue('/mock/project/path'),
}));

// Mock the design-time launcher so we can observe the deferred post-install
// restart fire AFTER `inFlightBundleWork` is cleared and the install result
// is settled.
vi.mock('../codeless/startDesignTimeApi', () => ({
  startAllDesignTimeApis: vi.fn(),
}));

// Mock the shared daily update-check throttle. `downloadExtensionBundleCore`
// reads `shouldCheckForDependencyUpdates` to decide whether to skip the CDN
// bundle-version feed lookup on the activation hot path. Default to `true` (the
// check is due) so existing tests keep exercising the feed-backed flow; throttle
// tests override it to `false` per-case.
vi.mock('../../state/dependencies', () => ({
  shouldCheckForDependencyUpdates: vi.fn(() => true),
  recordDependencyUpdateCheck: vi.fn().mockResolvedValue(undefined),
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

describe('getBundleDependencyFeed', () => {
  it('loads dependency feed using a local settings source URI override', async () => {
    const workspaceModule = await import('../workspace');
    vi.mocked(workspaceModule.selectLogicAppRoot).mockResolvedValue('/mock/project/path');
    const mockedGetLocalSettingsJson = await import('../appSettings/localSettings');
    vi.mocked(mockedGetLocalSettingsJson.getLocalSettingsJson).mockResolvedValue({
      Values: {
        FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI: 'https://bundles.example.com',
      },
    } as any);
    vi.mocked(feedModule.getJsonFeed).mockResolvedValue({ id: extensionBundleId } as any);
    const context = { telemetry: { properties: {}, measurements: {} } };

    await expect(getBundleDependencyFeed(context as any)).resolves.toEqual({ id: extensionBundleId });

    expect(feedModule.getJsonFeed).toHaveBeenCalledWith(
      context,
      `https://bundles.example.com/ExtensionBundles/${extensionBundleId}/dependency.json`
    );
    expect(workspaceModule.selectLogicAppRoot).toHaveBeenCalledWith(context, true);
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

describe('downloadExtensionBundle readiness model', () => {
  const mockedGetJsonFeed = vi.mocked(feedModule.getJsonFeed);
  const mockedDownloadAndExtract = vi.mocked(binariesModule.downloadAndExtractDependency);
  const localVersions = new Set<string>();
  const completedVersions = new Set<string>();
  const legacyCompletedVersions = new Set<string>();

  const createMockContext = () => ({
    telemetry: { properties: {} as Record<string, string>, measurements: {} as Record<string, number> },
  });

  const configureDisk = (versions: string[] = [], completed: string[] = versions, legacyCompleted: string[] = []): void => {
    localVersions.clear();
    completedVersions.clear();
    legacyCompletedVersions.clear();
    versions.forEach((version) => localVersions.add(version));
    completed.forEach((version) => completedVersions.add(version));
    legacyCompleted.forEach((version) => legacyCompletedVersions.add(version));

    mockedFse.readdirSync.mockImplementation(((directoryPath: string) =>
      directoryPath === defaultExtensionBundlePathValue ? [...localVersions] : []) as any);
    mockedFse.statSync.mockReturnValue({ isDirectory: () => true } as any);
    mockedFse.pathExists.mockImplementation((async (filePath: string) => {
      const normalized = String(filePath);
      if (normalized.endsWith(bundleInstallCompleteFile)) {
        return completedVersions.has(path.basename(path.dirname(normalized)));
      }
      if (normalized.endsWith('.bundle-source-md5')) {
        return legacyCompletedVersions.has(path.basename(path.dirname(normalized)));
      }
      const version = [...localVersions].find(
        (candidate) =>
          normalized === path.join(defaultExtensionBundlePathValue, candidate) || normalized.includes(`${path.sep}${candidate}${path.sep}`)
      );
      return Boolean(version) || normalized === defaultExtensionBundlePathValue;
    }) as any);
    mockedFse.readFile.mockResolvedValue('' as any);
    mockedFse.remove.mockImplementation((async (filePath: string) => {
      const normalized = String(filePath);
      if (normalized.endsWith(bundleInstallCompleteFile)) {
        completedVersions.delete(path.basename(path.dirname(normalized)));
      }
      if (normalized.endsWith('.bundle-source-md5')) {
        legacyCompletedVersions.delete(path.basename(path.dirname(normalized)));
      }
    }) as any);
    mockedFse.move.mockImplementation((async (_source: string, destination: string) => {
      if (String(destination).endsWith(bundleInstallCompleteFile)) {
        completedVersions.add(path.basename(path.dirname(String(destination))));
      }
    }) as any);
    mockedFse.outputFile.mockResolvedValue(undefined as any);
    mockedDownloadAndExtract.mockImplementation(async (_context, _url, _target, _dependency, version) => {
      localVersions.add(String(version));
      return { actualSize: 1, actualMd5: 'download-md5' };
    });
  };

  beforeEach(async () => {
    await awaitBackgroundBundleFeedRefresh();
    resetCachedBundleVersion();
    vi.clearAllMocks();
    delete process.env.AzureFunctionsJobHost_extensionBundle_version;
    delete process.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI;
    const settingsModule = await import('../vsCodeConfig/settings');
    vi.mocked(settingsModule.getGlobalSetting).mockReturnValue(undefined);
    const depUpdateCheckModule = await import('../../state/dependencies');
    vi.mocked(depUpdateCheckModule.shouldCheckForDependencyUpdates).mockReturnValue(true);
    const workspaceModule = await import('../workspace');
    vi.mocked(workspaceModule.selectLogicAppRoot).mockResolvedValue('/mock/project/path');
    const localSettingsModule = await import('../appSettings/localSettings');
    vi.mocked(localSettingsModule.getLocalSettingsJson).mockResolvedValue({} as any);
    configureDisk();
  });

  it('marks a successfully extracted bundle without interpreting its dependency manifest', async () => {
    mockedGetJsonFeed.mockResolvedValue(['1.2.0']);
    mockedFse.readFile.mockRejectedValue(new Error('function.deps.json must not be interpreted after archive verification'));

    await expect(downloadExtensionBundle(createMockContext() as any)).resolves.toBe(true);

    expect(mockedDownloadAndExtract).toHaveBeenCalledOnce();
    expect(mockedFse.readFile).not.toHaveBeenCalled();
    expect(completedVersions.has('1.2.0')).toBe(true);
    expect(getLastBundleInstallResult()).toBe('ok');
  });

  it('trusts a completed local bundle without reading marker or bundle contents', async () => {
    configureDisk(['1.2.0']);
    const dependencyState = await import('../../state/dependencies');
    vi.mocked(dependencyState.shouldCheckForDependencyUpdates).mockReturnValue(false);
    mockedFse.readFile.mockRejectedValue(new Error('marker and bundle contents must not be read'));

    await expect(downloadExtensionBundle(createMockContext() as any)).resolves.toBe(false);

    expect(mockedGetJsonFeed).not.toHaveBeenCalled();
    expect(mockedDownloadAndExtract).not.toHaveBeenCalled();
    expect(mockedFse.readFile).not.toHaveBeenCalled();
  });

  it('migrates a completed legacy bundle while offline without inspecting bundle contents', async () => {
    configureDisk(['1.2.0'], [], ['1.2.0']);
    mockedGetJsonFeed.mockRejectedValue(new Error('offline'));
    mockedFse.readFile.mockRejectedValue(new Error('legacy marker and bundle contents must not be read'));

    await expect(downloadExtensionBundle(createMockContext() as any)).resolves.toBe(false);
    await awaitBackgroundBundleFeedRefresh();

    expect(mockedGetJsonFeed).toHaveBeenCalledOnce();
    expect(mockedDownloadAndExtract).not.toHaveBeenCalled();
    expect(completedVersions.has('1.2.0')).toBe(true);
    expect(legacyCompletedVersions.has('1.2.0')).toBe(false);
    expect(mockedFse.outputFile).toHaveBeenCalledWith(expect.any(String), '', 'utf8');
    expect(mockedFse.readFile).not.toHaveBeenCalled();
  });

  it('reinstalls a local version when its completion marker is missing', async () => {
    configureDisk(['1.2.0'], []);
    mockedGetJsonFeed.mockResolvedValue(['1.2.0']);

    await expect(downloadExtensionBundle(createMockContext() as any)).resolves.toBe(true);

    expect(mockedDownloadAndExtract).toHaveBeenCalledOnce();
    expect(completedVersions.has('1.2.0')).toBe(true);
  });

  it('uses a completed environment-pinned bundle without consulting the feed', async () => {
    configureDisk(['1.1.0']);
    process.env.AzureFunctionsJobHost_extensionBundle_version = '1.1.0';
    const localSettingsModule = await import('../appSettings/localSettings');
    vi.mocked(localSettingsModule.getLocalSettingsJson).mockResolvedValue({
      Values: { AzureFunctionsJobHost_extensionBundle_version: '1.1.0' },
    } as any);

    await expect(downloadExtensionBundle(createMockContext() as any)).resolves.toBe(false);

    expect(mockedGetJsonFeed).not.toHaveBeenCalled();
    expect(mockedDownloadAndExtract).not.toHaveBeenCalled();
  });

  it('reports marker presence readiness', async () => {
    configureDisk(['1.2.0']);
    await expect(assertExtensionBundleOnDiskHealthy()).resolves.toEqual({ ok: true, version: '1.2.0' });

    completedVersions.clear();
    await expect(assertExtensionBundleOnDiskHealthy()).resolves.toEqual({
      ok: false,
      reason: 'markerMissing',
      version: '1.2.0',
    });
  });

  it('requires installation in strict mode when no local bundle exists', async () => {
    mockedGetJsonFeed.mockResolvedValue(['1.2.0']);

    await expect(ensureExtensionBundleHealthy(createMockContext() as any, { requireInstalled: true })).resolves.toBeUndefined();

    expect(mockedDownloadAndExtract).toHaveBeenCalledOnce();
  });

  it('exposes in-flight bundle work to dependent callers', async () => {
    mockedGetJsonFeed.mockResolvedValue(['1.2.0']);
    let release: (() => void) | undefined;
    mockedDownloadAndExtract.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => {
            localVersions.add('1.2.0');
            resolve({ actualSize: 1, actualMd5: 'download-md5' });
          };
        })
    );

    const install = downloadExtensionBundle(createMockContext() as any);
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    expect(isExtensionBundleDownloadInFlight()).toBe(true);
    const waiter = waitForExtensionBundleReady();
    release?.();
    await Promise.all([install, waiter]);
    expect(isExtensionBundleDownloadInFlight()).toBe(false);
  });
});
