import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import * as os from 'os';
import { openUrl } from '@microsoft/vscode-azext-utils';
import type { IErrorHandlerContext, IParsedError } from '@microsoft/vscode-azext-utils';
import { ext } from '../../../extensionVariables';
import { reportAnIssue, getReportAnIssueLink, maxUrlLength } from '../reportAnIssue';

describe('reportAnIssue', () => {
  const mockErrorContext: IErrorHandlerContext = {
    callbackId: 'test-callback',
    error: new Error('Test error'),
    telemetry: { measurements: {}, properties: {} },
    ui: {} as any,
    valuesToMask: [],
    errorHandling: {
      issueProperties: {
        'Custom Property': 'Custom Value',
      },
    },
  };

  const mockIssue: IParsedError = {
    message: 'Test error message',
    errorType: 'TestError',
    stack: 'Error: Test error\n    at test (test.js:1:1)',
    isUserCancelledError: false,
  };

  const mockCorrelationId = 'test-correlation-id';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock process.platform
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      configurable: true,
    });

    // Mock workspace configuration
    const mockConfig = {
      get: vi.fn((key: string) => {
        const settings = {
          dataMapperVersion: '1.0.0',
          validateFuncCoreTools: true,
          autoRuntimeDependenciesPath: '/path/to/deps',
          autoRuntimeDependenciesValidationAndInstallation: false,
          parameterizeConnectionsInProjectLoad: true,
        };
        return settings[key as keyof typeof settings];
      }),
    };
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('reportAnIssue', () => {
    test('should generate link and open URL', async () => {
      await reportAnIssue(mockErrorContext, mockIssue, mockCorrelationId);

      expect(openUrl).toHaveBeenCalledWith(expect.stringContaining('https://github.com/Azure/LogicAppsUX/issues/new'));
    });

    test('should handle errors during URL opening gracefully', async () => {
      vi.mocked(openUrl).mockRejectedValue(new Error('Failed to open URL'));

      await expect(reportAnIssue(mockErrorContext, mockIssue, mockCorrelationId)).rejects.toThrow('Failed to open URL');
    });
  });

  describe('getReportAnIssueLink', () => {
    test('should return direct link when URL is within length limit', async () => {
      const shortErrorContext: IErrorHandlerContext = {
        callbackId: 'short',
        error: new Error('Short error'),
        telemetry: { measurements: {}, properties: {} },
        ui: {} as any,
        valuesToMask: [],
        errorHandling: {
          issueProperties: {},
        },
      };
      const shortIssue: IParsedError = {
        message: 'Short message',
        errorType: 'ShortError',
        isUserCancelledError: false,
      };

      const link = await getReportAnIssueLink(shortErrorContext, shortIssue, 'short-id');

      expect(link).toContain('https://github.com/Azure/LogicAppsUX/issues/new');
      expect(link.length).toBeLessThanOrEqual(maxUrlLength);
      expect(vscode.env.clipboard.writeText).not.toHaveBeenCalled();
    });

    test('should copy to clipboard when URL exceeds length limit', async () => {
      // Create a large error context that will exceed the URL limit
      const largeErrorContext: IErrorHandlerContext = {
        callbackId: 'very-long-callback-id-that-will-make-the-url-too-long',
        error: new Error('Large error'),
        telemetry: { measurements: {}, properties: {} },
        ui: {} as any,
        valuesToMask: [],
        errorHandling: {
          issueProperties: {
            'Large Property 1': 'x'.repeat(1000),
            'Large Property 2': 'y'.repeat(1000),
            'Large Property 3': 'z'.repeat(1000),
          },
        },
      };
      const largeIssue: IParsedError = {
        message: 'A very long error message that will contribute to making the URL exceed the maximum length limit'.repeat(50),
        errorType: 'VeryLongError',
        stack: 'Error: Very long stack trace\n'.repeat(100),
        isUserCancelledError: false,
      };

      vi.mocked(vscode.env.clipboard.writeText).mockResolvedValue();

      const link = await getReportAnIssueLink(largeErrorContext, largeIssue, 'long-correlation-id');

      expect(vscode.env.clipboard.writeText).toHaveBeenCalled();
      expect(decodeURIComponent(link)).toContain('The issue text was copied to the clipboard');
    });

    test('should truncate when clipboard write fails', async () => {
      // Create a large error context that will exceed the URL limit
      const largeErrorContext: IErrorHandlerContext = {
        callbackId: 'very-long-callback-id-that-will-make-the-url-too-long',
        error: new Error('Large error'),
        telemetry: { measurements: {}, properties: {} },
        ui: {} as any,
        valuesToMask: [],
        errorHandling: {
          issueProperties: {
            'Large Property': 'x'.repeat(2000),
          },
        },
      };
      const largeIssue: IParsedError = {
        message: 'Long error message'.repeat(100),
        errorType: 'VeryLongError',
        stack: 'Error: Very long stack trace\n'.repeat(200),
        isUserCancelledError: false,
      };

      vi.mocked(vscode.env.clipboard.writeText).mockRejectedValue(new Error('Clipboard failed'));

      const link = await getReportAnIssueLink(largeErrorContext, largeIssue, 'long-correlation-id');

      expect(decodeURIComponent(link)).toContain('...[truncated]');
    });
  });

  describe('buildIssueBody', () => {
    test('should build complete issue body with all components', async () => {
      // We need to access the internal buildIssueBody function
      // Since it's not exported, we'll test it through getReportAnIssueLink
      const result = await getReportAnIssueLink(mockErrorContext, mockIssue, mockCorrelationId);

      // The function should complete without throwing
      expect(result).toBeDefined();
    });

    test('should handle missing issue data gracefully', async () => {
      const contextWithoutIssue: IErrorHandlerContext = {
        callbackId: 'test-callback',
        error: new Error('Test error'),
        telemetry: { measurements: {}, properties: {} },
        ui: {} as any,
        valuesToMask: [],
        errorHandling: {
          issueProperties: {},
        },
      };

      const link = await getReportAnIssueLink(contextWithoutIssue, null as any, mockCorrelationId);

      expect(link).toContain('https://github.com/Azure/LogicAppsUX/issues/new');
    });

    test('should include environment information', async () => {
      const link = await getReportAnIssueLink(mockErrorContext, mockIssue, mockCorrelationId);
      const decodedLink = decodeURIComponent(link);

      expect(decodedLink).toContain('Extension version: 1.0.0');
      expect(decodedLink).toContain('Extension bundle version: 1.2.3');
      expect(decodedLink).toContain('OS: darwin');
      expect(decodedLink).toContain('Product: Visual Studio Code');
      expect(decodedLink).toContain('Product version: 1.85.0');
      expect(decodedLink).toContain('Session id: test-session-id');
      expect(decodedLink).toContain('Correlation Id: test-correlation-id');
    });

    test('should include error details when provided', async () => {
      const link = await getReportAnIssueLink(mockErrorContext, mockIssue, mockCorrelationId);
      const decodedLink = decodeURIComponent(link);

      expect(decodedLink).toContain('Action: test-callback');
      expect(decodedLink).toContain('Error type: TestError');
      expect(decodedLink).toContain('Error message: Test error message');
    });

    test('should include custom properties from error context', async () => {
      const link = await getReportAnIssueLink(mockErrorContext, mockIssue, mockCorrelationId);
      const decodedLink = decodeURIComponent(link);

      expect(decodedLink).toContain('Custom Property');
      expect(decodedLink).toContain('Custom Value');
    });
  });

  describe('createSettingsDetail', () => {
    test('should include whitelisted settings in issue body', async () => {
      const link = await getReportAnIssueLink(mockErrorContext, mockIssue, mockCorrelationId);
      const decodedLink = decodeURIComponent(link);

      expect(decodedLink).toContain('Settings');
      expect(decodedLink).toContain('dataMapperVersion');
      expect(decodedLink).toContain('validateFuncCoreTools');
      expect(decodedLink).toContain('autoRuntimeDependenciesPath');
      expect(decodedLink).toContain('autoRuntimeDependenciesValidationAndInstallation');
      expect(decodedLink).toContain('parameterizeConnectionsInProjectLoad');
    });

    test('should handle configuration errors gracefully', async () => {
      vi.mocked(vscode.workspace.getConfiguration).mockImplementation(() => {
        throw new Error('Configuration error');
      });

      const link = await getReportAnIssueLink(mockErrorContext, mockIssue, mockCorrelationId);

      // Should still generate a link without settings
      expect(link).toContain('https://github.com/Azure/LogicAppsUX/issues/new');
    });
  });

  describe('createNewIssueLinkFromBody', () => {
    test('should generate proper GitHub issue URL', async () => {
      const link = await getReportAnIssueLink(mockErrorContext, mockIssue, mockCorrelationId);

      expect(link).toContain('https://github.com/Azure/LogicAppsUX/issues/new');
      expect(link).toContain('template=bug_report.yml');
      expect(link).toContain('description=');
    });

    test('should URL encode the issue body', async () => {
      const contextWithSpecialChars: IErrorHandlerContext = {
        callbackId: 'test&callback=with%special#chars',
        error: new Error('Special chars error'),
        telemetry: { measurements: {}, properties: {} },
        ui: {} as any,
        valuesToMask: [],
        errorHandling: {
          issueProperties: {},
        },
      };
      const issueWithSpecialChars: IParsedError = {
        message: 'Error with special chars: & % # + =',
        errorType: 'SpecialCharsError',
        isUserCancelledError: false,
      };

      const link = await getReportAnIssueLink(contextWithSpecialChars, issueWithSpecialChars, mockCorrelationId);

      // URL should be properly encoded
      expect(link).not.toContain('&callback=');
      expect(link).not.toContain('#chars');
      expect(link).toContain('%');
    });
  });

  describe('createBodyDetail', () => {
    test('should format details as collapsible markdown sections', async () => {
      const link = await getReportAnIssueLink(mockErrorContext, mockIssue, mockCorrelationId);
      const decodedLink = decodeURIComponent(link);

      expect(decodedLink).toContain('<details>');
      expect(decodedLink).toContain('<summary>');
      expect(decodedLink).toContain('</summary>');
      expect(decodedLink).toContain('```');
      expect(decodedLink).toContain('</details>');
    });
  });

  describe('truncateIfNeeded', () => {
    test('should not truncate short strings', async () => {
      const shortIssue: IParsedError = {
        message: 'Short message',
        errorType: 'ShortError',
        stack: 'Short stack',
        isUserCancelledError: false,
      };

      const link = await getReportAnIssueLink(mockErrorContext, shortIssue, mockCorrelationId);
      const decodedLink = decodeURIComponent(link);

      expect(decodedLink).toContain('Short message');
      expect(decodedLink).toContain('Short stack');
      expect(decodedLink).not.toContain('...[truncated to');
    });

    test('should truncate long strings with notice', async () => {
      // Mock clipboard to fail to force URL-based truncation
      vi.mocked(vscode.env.clipboard.writeText).mockRejectedValue(new Error('Clipboard failed'));

      const longIssue: IParsedError = {
        message: 'x'.repeat(2000), // Exceeds MAX_INLINE_MESSAGE_CHARS (1000)
        errorType: 'LongError',
        stack: 'y'.repeat(5000), // Exceeds MAX_INLINE_STACK_CHARS (4000)
        isUserCancelledError: false,
      };

      const link = await getReportAnIssueLink(mockErrorContext, longIssue, mockCorrelationId);
      const decodedLink = decodeURIComponent(link);

      expect(decodedLink).toContain('[truncated]');
    });

    test('should handle undefined values', async () => {
      const issueWithUndefined: IParsedError = {
        message: undefined as any,
        errorType: 'UndefinedError',
        stack: undefined as any,
        isUserCancelledError: false,
      };

      const link = await getReportAnIssueLink(mockErrorContext, issueWithUndefined, mockCorrelationId);

      // Should not throw and should generate a valid link
      expect(link).toContain('https://github.com/Azure/LogicAppsUX/issues/new');
    });
  });

  describe('edge cases', () => {
    test('should handle empty error context', async () => {
      const emptyContext: IErrorHandlerContext = {
        callbackId: 'empty',
        error: new Error('Empty error'),
        telemetry: { measurements: {}, properties: {} },
        ui: {} as any,
        valuesToMask: [],
        errorHandling: {
          issueProperties: {},
        },
      };
      const link = await getReportAnIssueLink(emptyContext, mockIssue, mockCorrelationId);

      expect(link).toContain('https://github.com/Azure/LogicAppsUX/issues/new');
    });

    test('should handle missing extension versions', async () => {
      const originalExtensionVersion = ext.extensionVersion;
      const originalBundleVersion = ext.latestBundleVersion;

      (ext as any).extensionVersion = undefined;
      (ext as any).latestBundleVersion = undefined;

      const link = await getReportAnIssueLink(mockErrorContext, mockIssue, mockCorrelationId);
      const decodedLink = decodeURIComponent(link);

      expect(decodedLink).toContain('Extension version: unknown');
      expect(decodedLink).toContain('Extension bundle version: unknown');

      // Restore original values
      (ext as any).extensionVersion = originalExtensionVersion;
      (ext as any).latestBundleVersion = originalBundleVersion;
    });

    test('should handle different OS platforms', async () => {
      // Test Windows
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true,
      });
      vi.mocked(os.type).mockReturnValue('Windows_NT');
      vi.mocked(os.release).mockReturnValue('10.0.19043');
      vi.mocked(os.arch).mockReturnValue('x64');

      const link = await getReportAnIssueLink(mockErrorContext, mockIssue, mockCorrelationId);
      const decodedLink = decodeURIComponent(link);

      expect(decodedLink).toContain('OS: win32 (Windows_NT 10.0.19043)');
      expect(decodedLink).toContain('OS arch: x64');

      // Reset to original
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true,
      });
      vi.mocked(os.type).mockReturnValue('Darwin');
      vi.mocked(os.release).mockReturnValue('23.1.0');
    });

    test('should include timestamp in UTC format', async () => {
      const link = await getReportAnIssueLink(mockErrorContext, mockIssue, mockCorrelationId);
      const decodedLink = decodeURIComponent(link);

      expect(decodedLink).toMatch(/UTC time: \w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT/);
    });
  });
});
