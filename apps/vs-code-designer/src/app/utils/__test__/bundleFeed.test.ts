import { getExtensionBundleFolder } from '../bundleFeed';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as cp from 'child_process';
import { extensionBundleId } from '../../../constants';
import * as cpUtils from '../funcCoreTools/cpUtils';

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
