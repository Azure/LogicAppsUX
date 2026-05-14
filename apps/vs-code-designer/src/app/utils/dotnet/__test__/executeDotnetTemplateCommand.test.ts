import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { SemVer } from 'semver';

// Hoisted mock variables for mocks that need per-test configuration
const { mockUseBinariesDependencies, mockExecuteCommand, mockGetDotNetCommand, mockGetLocalDotNetVersionFromBinaries } = vi.hoisted(() => ({
  mockUseBinariesDependencies: vi.fn(),
  mockExecuteCommand: vi.fn(),
  mockGetDotNetCommand: vi.fn(() => 'dotnet'),
  mockGetLocalDotNetVersionFromBinaries: vi.fn(),
}));

// Module mocks
vi.mock('../../binaries', () => ({
  useBinariesDependencies: mockUseBinariesDependencies,
}));

vi.mock('../../funcCoreTools/cpUtils', () => ({
  executeCommand: mockExecuteCommand,
  wrapArgInQuotes: (s: string) => `"${s}"`,
}));

vi.mock('../dotnet', () => ({
  getDotNetCommand: mockGetDotNetCommand,
  getLocalDotNetVersionFromBinaries: mockGetLocalDotNetVersionFromBinaries,
}));

vi.mock('../../../../extensionVariables', () => ({
  ext: {
    context: {
      asAbsolutePath: (p: string) => `/extension/${p}`,
      globalStorageUri: { fsPath: '/global-storage' },
    },
    outputChannel: { show: vi.fn(), appendLog: vi.fn(), appendLine: vi.fn() },
    extensionVersion: '1.0.0',
    latestBundleVersion: '1.2.3',
  },
}));

vi.mock('../../../../localize', () => ({
  localize: (_key: string, defaultValue: string) => defaultValue,
}));

vi.mock('../../../../constants', () => ({
  assetsFolderName: 'assets',
}));

// Use plain function for semver.coerce to avoid restoreMocks clearing it
vi.mock('semver', () => ({
  coerce: (v: string) => {
    const num = parseInt(v, 10);
    if (!isNaN(num)) {
      return { major: num, minor: 0, patch: 0, version: `${num}.0.0` } as unknown as SemVer;
    }
    return null;
  },
}));

// Create a base action context for tests
function createActionContext(): IActionContext {
  return {
    telemetry: { properties: {}, measurements: {} },
    errorHandling: {},
    ui: {},
    valuesToMask: [],
  } as unknown as IActionContext;
}

// Static import - uses the mocked modules defined above
import {
  getFramework,
  getDotnetTemplateDir,
  getDotnetItemTemplatePath,
  getDotnetProjectTemplatePath,
  validateDotnetInstalled,
  executeDotnetTemplateCommand as execDotnetCmd,
} from '../executeDotnetTemplateCommand';

describe('executeDotnetTemplateCommand', () => {
  beforeEach(() => {
    // Explicitly reset hoisted mocks to clear all state (calls, implementations, once-queues)
    mockUseBinariesDependencies.mockReset();
    mockExecuteCommand.mockReset();
    mockGetDotNetCommand.mockReset();
    mockGetLocalDotNetVersionFromBinaries.mockReset();

    // Set default implementations
    mockUseBinariesDependencies.mockResolvedValue(false);
    mockExecuteCommand.mockResolvedValue('');
    mockGetDotNetCommand.mockReturnValue('dotnet');
    mockGetLocalDotNetVersionFromBinaries.mockResolvedValue('');
  });

  // NOTE: All getFramework tests use isCodeful=true to bypass the module-level cache,
  // allowing each test to independently verify version detection logic.

  describe('getFramework', () => {
    it('should pick .NET 8 when available (highest priority)', async () => {
      const ctx = createActionContext();

      mockExecuteCommand
        .mockResolvedValueOnce('8.0.100\n') // --version
        .mockResolvedValueOnce('8.0.100 [/usr/share/dotnet/sdk]\n'); // --list-sdks

      const result = await getFramework(ctx, '/workspace', true);
      expect(result).toBe('net8.0');
    });

    it('should pick .NET 6 when 8 not available', async () => {
      const ctx = createActionContext();

      mockExecuteCommand
        .mockResolvedValueOnce('6.0.400\n') // --version
        .mockResolvedValueOnce('6.0.400 [/usr/share/dotnet/sdk]\n'); // --list-sdks

      const result = await getFramework(ctx, '/workspace', true);
      expect(result).toBe('net6.0');
    });

    it('should pick .NET 3 with netcoreapp prefix', async () => {
      const ctx = createActionContext();

      mockExecuteCommand
        .mockResolvedValueOnce('3.0.100\n') // --version
        .mockResolvedValueOnce('3.0.100 [/usr/share/dotnet/sdk]\n'); // --list-sdks

      const result = await getFramework(ctx, '/workspace', true);
      expect(result).toBe('netcoreapp3.0');
    });

    it('should pick .NET 2 with netcoreapp prefix', async () => {
      const ctx = createActionContext();

      mockExecuteCommand
        .mockResolvedValueOnce('2.0.300\n') // --version
        .mockResolvedValueOnce('2.0.300 [/usr/share/dotnet/sdk]\n'); // --list-sdks

      const result = await getFramework(ctx, '/workspace', true);
      expect(result).toBe('netcoreapp2.0');
    });

    it('should pick .NET 9 as lower priority than 8', async () => {
      const ctx = createActionContext();

      mockExecuteCommand
        .mockResolvedValueOnce('9.0.100\n') // --version
        .mockResolvedValueOnce('9.0.100 [/usr/share/dotnet/sdk]\n'); // --list-sdks

      const result = await getFramework(ctx, '/workspace', true);
      expect(result).toBe('net9.0');
    });

    it('should prefer GA over preview versions', async () => {
      const ctx = createActionContext();

      // Only preview version of .NET 8, but GA version of .NET 6
      mockExecuteCommand
        .mockResolvedValueOnce('8.0.100-preview.1\n') // --version (preview)
        .mockResolvedValueOnce('8.0.100-preview.1 [/usr/share/dotnet/sdk]\n6.0.400 [/usr/share/dotnet/sdk]\n'); // --list-sdks

      const result = await getFramework(ctx, '/workspace', true);
      expect(result).toBe('net6.0');
    });

    it('should fall back to preview when no GA version available', async () => {
      const ctx = createActionContext();

      mockExecuteCommand
        .mockResolvedValueOnce('8.0.100-preview.1\n') // --version
        .mockResolvedValueOnce('8.0.100-preview.1 [/usr/share/dotnet/sdk]\n'); // --list-sdks

      const result = await getFramework(ctx, '/workspace', true);
      expect(result).toBe('net8.0');
    });

    it('should throw when no .NET version found', async () => {
      const ctx = createActionContext();

      mockExecuteCommand.mockRejectedValue(new Error('not found'));

      await expect(getFramework(ctx, '/workspace', true)).rejects.toThrow();
      expect((ctx.errorHandling as any).suppressReportIssue).toBe(true);
    });

    it('should use binaries when useBinariesDependencies returns true', async () => {
      const ctx = createActionContext();

      mockUseBinariesDependencies.mockResolvedValue(true);
      mockGetLocalDotNetVersionFromBinaries.mockResolvedValue('8.0.100\n');
      mockExecuteCommand
        .mockResolvedValueOnce('') // --version
        .mockResolvedValueOnce(''); // --list-sdks

      const result = await getFramework(ctx, '/workspace', true);
      expect(mockGetLocalDotNetVersionFromBinaries).toHaveBeenCalled();
      expect(result).toBe('net8.0');
    });

    it('should not use binaries when useBinariesDependencies returns false', async () => {
      const ctx = createActionContext();

      mockUseBinariesDependencies.mockResolvedValue(false);
      mockExecuteCommand
        .mockResolvedValueOnce('8.0.100\n') // --version
        .mockResolvedValueOnce(''); // --list-sdks

      const result = await getFramework(ctx, '/workspace', true);
      expect(mockGetLocalDotNetVersionFromBinaries).not.toHaveBeenCalled();
      expect(result).toBe('net8.0');
    });

    it('should handle executeCommand failures gracefully', async () => {
      const ctx = createActionContext();

      mockUseBinariesDependencies.mockResolvedValue(true);
      mockGetLocalDotNetVersionFromBinaries.mockResolvedValue('8.0.100\n');
      mockExecuteCommand.mockRejectedValue(new Error('command not found'));

      const result = await getFramework(ctx, '/workspace', true);
      expect(result).toBe('net8.0');
    });

    it('should cache result for subsequent calls', async () => {
      const ctx = createActionContext();

      mockExecuteCommand
        .mockResolvedValueOnce('8.0.100\n') // --version (first call)
        .mockResolvedValueOnce('8.0.100 [/sdk]\n'); // --list-sdks (first call)

      // First call with isCodeful to set cache
      const result1 = await getFramework(ctx, '/workspace', true);
      expect(result1).toBe('net8.0');

      // Second call without isCodeful - should use cache
      const result2 = await getFramework(ctx, '/workspace');
      expect(result2).toBe('net8.0');
    });
  });

  describe('getDotnetTemplateDir', () => {
    it('should return correct directory path', () => {
      const result = getDotnetTemplateDir('~4', 'myTemplateKey');
      expect(result).toContain('global-storage');
      expect(result).toContain('~4');
      expect(result).toContain('myTemplateKey');
    });
  });

  describe('getDotnetItemTemplatePath', () => {
    it('should return path with item.nupkg', () => {
      const result = getDotnetItemTemplatePath('~4', 'myTemplateKey');
      expect(result).toContain('item.nupkg');
      expect(result).toContain('myTemplateKey');
    });
  });

  describe('getDotnetProjectTemplatePath', () => {
    it('should return path with project.nupkg', () => {
      const result = getDotnetProjectTemplatePath('~4', 'myTemplateKey');
      expect(result).toContain('project.nupkg');
      expect(result).toContain('myTemplateKey');
    });
  });

  describe('validateDotnetInstalled', () => {
    it('should call getFramework to validate dotnet installation', async () => {
      // Use vi.resetModules + dynamic import to get fresh cachedFramework=undefined
      vi.resetModules();
      const { validateDotnetInstalled: validateFn } = await import('../executeDotnetTemplateCommand');
      const ctx = createActionContext();

      mockExecuteCommand
        .mockResolvedValueOnce('8.0.100\n') // --version
        .mockResolvedValueOnce(''); // --list-sdks

      await expect(validateFn(ctx)).resolves.toBeUndefined();
    });

    it('should throw when dotnet is not installed', async () => {
      // Use vi.resetModules + dynamic import to get fresh cachedFramework=undefined
      vi.resetModules();
      const { validateDotnetInstalled: validateFn } = await import('../executeDotnetTemplateCommand');
      const ctx = createActionContext();

      mockExecuteCommand.mockReset();
      mockExecuteCommand.mockRejectedValue(new Error('not found'));

      await expect(validateFn(ctx)).rejects.toThrow();
    });
  });

  describe('executeDotnetTemplateCommand', () => {
    it('should construct and execute the dotnet command correctly', async () => {
      // Use vi.resetModules + dynamic import to get fresh cachedFramework=undefined
      vi.resetModules();
      const { executeDotnetTemplateCommand: execFn } = await import('../executeDotnetTemplateCommand');
      const ctx = createActionContext();

      mockExecuteCommand
        .mockResolvedValueOnce('8.0.100\n') // --version (for getFramework)
        .mockResolvedValueOnce('') // --list-sdks (for getFramework)
        .mockResolvedValueOnce('command output'); // actual template command

      const result = await execFn(ctx, '~4', 'testKey', '/workspace', 'list', '--arg1');

      expect(result).toBe('command output');
      expect(mockExecuteCommand).toHaveBeenCalledTimes(3);

      // The actual template command call (3rd call)
      const templateCall = mockExecuteCommand.mock.calls[2];
      expect(templateCall[0]).toBeUndefined(); // outputChannel
      expect(templateCall[1]).toBe('/workspace'); // workingDirectory
      expect(templateCall[2]).toBe('dotnet'); // dotnet command
      expect(templateCall).toContain('--templateDir');
      expect(templateCall).toContain('--operation');
      expect(templateCall).toContain('list');
      expect(templateCall).toContain('--arg1');
    });
  });
});
