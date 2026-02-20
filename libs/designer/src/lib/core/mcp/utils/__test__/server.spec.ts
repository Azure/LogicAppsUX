/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateMcpServerName, validateMcpServerDescription, updateAuthSettings, generateKeys, addExpiryToCurrent } from '../server';

// Mock external dependencies
vi.mock('@microsoft/logic-apps-shared', () => ({
  equals: vi.fn(),
  getIntl: vi.fn(() => ({
    formatMessage: vi.fn(({ defaultMessage }) => defaultMessage),
  })),
  getPropertyValue: vi.fn(),
  getObjectPropertyValue: vi.fn(),
  isNullOrEmpty: vi.fn(),
  ResourceService: vi.fn(() => ({
    executeResourceAction: vi.fn(),
  })),
}));

vi.mock('../queries', () => ({
  getHostConfig: vi.fn(),
  resetQueriesOnServerAuthUpdate: vi.fn(),
}));

describe('server utils', () => {
  let mockEquals: any;
  let mockGetIntl: any;
  let mockGetPropertyValue: any;
  let mockGetObjectPropertyValue: any;
  let mockIsNullOrEmpty: any;
  let mockResourceService: any;
  let mockExecuteResourceAction: any;
  let mockGetHostConfig: any;
  let mockResetQueriesOnServerAuthUpdate: any;

  beforeEach(async () => {
    // Clear any existing renders
    document.body.innerHTML = '';

    // Import mocked functions dynamically
    const shared = await import('@microsoft/logic-apps-shared');
    const queries = await import('../queries');

    mockEquals = shared.equals as any;
    mockGetIntl = shared.getIntl as any;
    mockGetPropertyValue = shared.getPropertyValue as any;
    mockGetObjectPropertyValue = shared.getObjectPropertyValue as any;
    mockIsNullOrEmpty = shared.isNullOrEmpty as any;
    mockResourceService = shared.ResourceService as any;
    mockGetHostConfig = queries.getHostConfig as any;
    mockResetQueriesOnServerAuthUpdate = queries.resetQueriesOnServerAuthUpdate as any;

    mockExecuteResourceAction = vi.fn();
    mockResourceService.mockReturnValue({
      executeResourceAction: mockExecuteResourceAction,
    });

    // Set up default mock implementations
    mockGetIntl.mockReturnValue({
      formatMessage: vi.fn(({ defaultMessage }, values) => {
        if (values && values.error) {
          return defaultMessage.replace('{error}', values.error);
        }
        return defaultMessage;
      }),
    });
    mockEquals.mockImplementation((a, b) => a === b);
    mockIsNullOrEmpty.mockImplementation((value) => !value || value.trim() === '');
    mockGetPropertyValue.mockReturnValue('test-api-key');
    mockGetHostConfig.mockResolvedValue({
      properties: {
        extensions: {
          workflow: {
            McpServerEndpoints: {},
          },
        },
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  describe('validateMcpServerName', () => {
    it('should return error message for null or empty server name', () => {
      mockIsNullOrEmpty.mockReturnValue(true);

      const result = validateMcpServerName('');

      expect(result).toBe('Server name is required.');
      expect(mockIsNullOrEmpty).toHaveBeenCalledWith('');
    });

    it('should return error message for "default" server name', () => {
      mockIsNullOrEmpty.mockReturnValue(false);
      mockEquals.mockReturnValue(true);

      const result = validateMcpServerName('default');

      expect(result).toBe('Can\'t use "default" as the server name.');
      expect(mockEquals).toHaveBeenCalledWith('default', 'default');
    });

    it('should return error message for server name longer than 80 characters', () => {
      mockIsNullOrEmpty.mockReturnValue(false);
      mockEquals.mockReturnValue(false);
      const longName = 'a'.repeat(81);

      const result = validateMcpServerName(longName);

      expect(result).toBe('Server name must be less than 80 characters.');
    });

    it('should return error message for server name with invalid characters', () => {
      mockIsNullOrEmpty.mockReturnValue(false);
      mockEquals.mockReturnValue(false);

      const result = validateMcpServerName('server-name!@#');

      expect(result).toBe('Enter a unique name under 80 characters with only letters and numbers.');
    });

    it('should return undefined for valid server name with letters only', () => {
      mockIsNullOrEmpty.mockReturnValue(false);
      mockEquals.mockReturnValue(false);

      const result = validateMcpServerName('validServerName');

      expect(result).toBeUndefined();
    });

    it('should return undefined for valid server name with numbers only', () => {
      mockIsNullOrEmpty.mockReturnValue(false);
      mockEquals.mockReturnValue(false);

      const result = validateMcpServerName('12345');

      expect(result).toBeUndefined();
    });

    it('should return undefined for valid server name with letters and numbers', () => {
      mockIsNullOrEmpty.mockReturnValue(false);
      mockEquals.mockReturnValue(false);

      const result = validateMcpServerName('server123');

      expect(result).toBeUndefined();
    });

    it('should return undefined for single character server name', () => {
      mockIsNullOrEmpty.mockReturnValue(false);
      mockEquals.mockReturnValue(false);

      const result = validateMcpServerName('a');

      expect(result).toBeUndefined();
    });

    it('should return undefined for 80 character server name', () => {
      mockIsNullOrEmpty.mockReturnValue(false);
      mockEquals.mockReturnValue(false);
      const exactLengthName = 'a'.repeat(80);

      const result = validateMcpServerName(exactLengthName);

      expect(result).toBeUndefined();
    });
  });

  describe('validateMcpServerDescription', () => {
    it('should return error message for null or empty description', () => {
      mockIsNullOrEmpty.mockReturnValue(true);

      const result = validateMcpServerDescription('');

      expect(result).toBe('Description is required.');
      expect(mockIsNullOrEmpty).toHaveBeenCalledWith('');
    });

    it('should return error message for description longer than 1024 characters', () => {
      mockIsNullOrEmpty.mockReturnValue(false);
      const longDescription = 'a'.repeat(1025);

      const result = validateMcpServerDescription(longDescription);

      expect(result).toBe('Description must be less than 1024 characters.');
    });

    it('should return undefined for valid description', () => {
      mockIsNullOrEmpty.mockReturnValue(false);

      const result = validateMcpServerDescription('Valid description');

      expect(result).toBeUndefined();
    });

    it('should return undefined for description with exactly 1024 characters', () => {
      mockIsNullOrEmpty.mockReturnValue(false);
      const exactLengthDescription = 'a'.repeat(1024);

      const result = validateMcpServerDescription(exactLengthDescription);

      expect(result).toBeUndefined();
    });

    it('should return undefined for description with special characters', () => {
      mockIsNullOrEmpty.mockReturnValue(false);

      const result = validateMcpServerDescription('Description with special chars !@#$%^&*()');

      expect(result).toBeUndefined();
    });
  });

  describe('updateAuthSettings', () => {
    const siteResourceId = '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Web/sites/test-site';

    it('should update authentication settings with single option', async () => {
      mockExecuteResourceAction.mockResolvedValue({});

      await updateAuthSettings(siteResourceId, ['apikey']);

      expect(mockGetHostConfig).toHaveBeenCalledWith(siteResourceId);
      expect(mockExecuteResourceAction).toHaveBeenCalledWith(
        `${siteResourceId}/deployWorkflowArtifacts`,
        'POST',
        { 'api-version': '2020-06-01' },
        {
          files: {
            'host.json': {
              extensions: {
                workflow: {
                  McpServerEndpoints: {
                    authentication: { type: 'apikey' },
                  },
                },
              },
            },
          },
        }
      );
      expect(mockResetQueriesOnServerAuthUpdate).toHaveBeenCalledWith(siteResourceId);
    });

    it('should update authentication settings with multiple options (empty auth)', async () => {
      mockExecuteResourceAction.mockResolvedValue({});

      await updateAuthSettings(siteResourceId, ['apikey', 'oauth2']);

      expect(mockExecuteResourceAction).toHaveBeenCalledWith(
        `${siteResourceId}/deployWorkflowArtifacts`,
        'POST',
        { 'api-version': '2020-06-01' },
        {
          files: {
            'host.json': {
              extensions: {
                workflow: {
                  McpServerEndpoints: {
                    authentication: {},
                  },
                },
              },
            },
          },
        }
      );
    });

    it('should update authentication settings with empty options', async () => {
      mockExecuteResourceAction.mockResolvedValue({});

      await updateAuthSettings(siteResourceId, []);

      expect(mockExecuteResourceAction).toHaveBeenCalledWith(
        `${siteResourceId}/deployWorkflowArtifacts`,
        'POST',
        { 'api-version': '2020-06-01' },
        {
          files: {
            'host.json': {
              extensions: {
                workflow: {
                  McpServerEndpoints: {
                    authentication: {},
                  },
                },
              },
            },
          },
        }
      );
    });

    it('should preserve existing host config properties', async () => {
      mockGetHostConfig.mockResolvedValue({
        properties: {
          version: '2.0',
          extensions: {
            workflow: {
              existingProperty: 'value',
              McpServerEndpoints: {
                existingEndpoint: 'config',
              },
            },
            http: {
              routePrefix: 'api',
            },
          },
        },
      });
      mockExecuteResourceAction.mockResolvedValue({});

      await updateAuthSettings(siteResourceId, ['api-key']);

      expect(mockExecuteResourceAction).toHaveBeenCalledWith(
        `${siteResourceId}/deployWorkflowArtifacts`,
        'POST',
        { 'api-version': '2020-06-01' },
        {
          files: {
            'host.json': {
              version: '2.0',
              extensions: {
                workflow: {
                  existingProperty: 'value',
                  McpServerEndpoints: {
                    existingEndpoint: 'config',
                    authentication: { type: 'api-key' },
                  },
                },
                http: {
                  routePrefix: 'api',
                },
              },
            },
          },
        }
      );
    });

    it('should handle missing host config properties gracefully', async () => {
      mockGetHostConfig.mockResolvedValue({ properties: {} });
      mockExecuteResourceAction.mockResolvedValue({});

      await updateAuthSettings(siteResourceId, ['oauth']);

      expect(mockExecuteResourceAction).toHaveBeenCalledWith(
        `${siteResourceId}/deployWorkflowArtifacts`,
        'POST',
        { 'api-version': '2020-06-01' },
        {
          files: {
            'host.json': {
              extensions: {
                workflow: {
                  McpServerEndpoints: {
                    authentication: { type: 'oauth' },
                  },
                },
              },
            },
          },
        }
      );
    });

    it('should throw error when resource action fails', async () => {
      const errorMessage = 'Resource action failed';
      mockExecuteResourceAction.mockRejectedValue(new Error(errorMessage));

      await expect(updateAuthSettings(siteResourceId, ['apikey'])).rejects.toThrow(
        /An error occurred while updating authentication settings./
      );

      expect(mockResetQueriesOnServerAuthUpdate).toHaveBeenCalledWith(siteResourceId);
    });

    it('should reset queries even when error occurs', async () => {
      mockExecuteResourceAction.mockRejectedValue(new Error('Test error'));

      try {
        await updateAuthSettings(siteResourceId, ['bearer']);
      } catch (error) {
        // Expected error
      }

      expect(mockResetQueriesOnServerAuthUpdate).toHaveBeenCalledWith(siteResourceId);
    });
  });

  describe('generateKeys', () => {
    const siteResourceId = '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Web/sites/test-site';

    it('should generate keys with expiry duration', async () => {
      const testApiKey = 'test-generated-api-key';
      mockGetPropertyValue.mockReturnValue(testApiKey);
      mockExecuteResourceAction.mockResolvedValue({
        headers: { 'X-API-Key': testApiKey },
      });

      const result = await generateKeys(siteResourceId, '2024-12-31T23:59:59Z', 'primary');

      expect(mockExecuteResourceAction).toHaveBeenCalledWith(
        `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/listMcpServerUrl`,
        'POST',
        { 'api-version': '2021-02-01', getApikey: 'true' },
        { keyType: 'primary', notAfter: '2024-12-31T23:59:59Z' }
      );
      expect(result).toBe(testApiKey);
    });

    it('should generate keys with no expiry', async () => {
      const testApiKey = 'test-never-expire-key';
      mockGetPropertyValue.mockReturnValue(testApiKey);
      mockExecuteResourceAction.mockResolvedValue({
        headers: { 'X-API-Key': testApiKey },
      });

      const result = await generateKeys(siteResourceId, 'noexpiry', 'secondary');

      expect(mockExecuteResourceAction).toHaveBeenCalledWith(
        `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/listMcpServerUrl`,
        'POST',
        { 'api-version': '2021-02-01', getApikey: 'true' },
        { keyType: 'secondary', neverExpire: true }
      );
      expect(result).toBe(testApiKey);
    });

    it('should extract API key from response headers', async () => {
      const testApiKey = 'extracted-api-key-12345';
      mockGetPropertyValue.mockReturnValue(testApiKey);
      mockExecuteResourceAction.mockResolvedValue({
        headers: { 'X-API-Key': testApiKey, 'Content-Type': 'application/json' },
      });

      const result = await generateKeys(siteResourceId, '2025-01-01T00:00:00Z', 'primary');

      expect(mockGetPropertyValue).toHaveBeenCalledWith({ 'X-API-Key': testApiKey, 'Content-Type': 'application/json' }, 'X-API-Key');
      expect(result).toBe(testApiKey);
    });

    it('should throw error when key generation fails', async () => {
      const errorMessage = 'Key generation failed';
      mockGetObjectPropertyValue.mockReturnValue(errorMessage);
      mockExecuteResourceAction.mockRejectedValue(new Error(errorMessage));

      await expect(generateKeys(siteResourceId, '2024-12-31T23:59:59Z', 'primary')).rejects.toThrow(
        /An error occurred while generating keys/
      );
    });

    it('should handle different access key types', async () => {
      mockGetPropertyValue.mockReturnValue('test-key');
      mockExecuteResourceAction.mockResolvedValue({ headers: { 'X-API-Key': 'test-key' } });

      // Test with different key types
      await generateKeys(siteResourceId, 'noexpiry', 'primary');
      expect(mockExecuteResourceAction).toHaveBeenLastCalledWith(expect.any(String), 'POST', expect.any(Object), {
        keyType: 'primary',
        neverExpire: true,
      });

      await generateKeys(siteResourceId, 'noexpiry', 'secondary');
      expect(mockExecuteResourceAction).toHaveBeenLastCalledWith(expect.any(String), 'POST', expect.any(Object), {
        keyType: 'secondary',
        neverExpire: true,
      });
    });
  });

  describe('addExpiryToCurrent', () => {
    let originalDate: any;
    let mockDate: any;

    beforeEach(() => {
      originalDate = Date;
      mockDate = vi.fn(() => ({
        setHours: vi.fn().mockReturnThis(),
        setDate: vi.fn().mockReturnThis(),
        toISOString: vi.fn(() => '2024-01-23T12:00:00.000Z'),
      }));
      mockDate.prototype = originalDate.prototype;
      global.Date = mockDate as any;
    });

    afterEach(() => {
      global.Date = originalDate;
    });

    it('should add hours to current date', () => {
      const mockDateInstance = {
        setHours: vi.fn().mockReturnThis(),
        setDate: vi.fn(),
        toISOString: vi.fn(() => '2024-01-23T15:00:00.000Z'),
        getHours: vi.fn(() => 12),
      };
      mockDate.mockReturnValue(mockDateInstance);

      const result = addExpiryToCurrent(3);

      expect(mockDateInstance.setHours).toHaveBeenCalledWith(15);
      expect(mockDateInstance.setDate).not.toHaveBeenCalled();
      expect(result).toBe('2024-01-23T15:00:00.000Z');
    });

    it('should add days to current date', () => {
      const mockDateInstance = {
        setHours: vi.fn(),
        setDate: vi.fn().mockReturnThis(),
        toISOString: vi.fn(() => '2024-01-26T12:00:00.000Z'),
        getDate: vi.fn(() => 23),
      };
      mockDate.mockReturnValue(mockDateInstance);

      const result = addExpiryToCurrent(undefined, 3);

      expect(mockDateInstance.setDate).toHaveBeenCalledWith(26);
      expect(mockDateInstance.setHours).not.toHaveBeenCalled();
      expect(result).toBe('2024-01-26T12:00:00.000Z');
    });

    it('should return current date ISO string when no parameters provided', () => {
      const mockDateInstance = {
        setHours: vi.fn(),
        setDate: vi.fn(),
        toISOString: vi.fn(() => '2024-01-23T12:00:00.000Z'),
      };
      mockDate.mockReturnValue(mockDateInstance);

      const result = addExpiryToCurrent();

      expect(mockDateInstance.setHours).not.toHaveBeenCalled();
      expect(mockDateInstance.setDate).not.toHaveBeenCalled();
      expect(result).toBe('2024-01-23T12:00:00.000Z');
    });

    it('should prioritize hours over days when both provided', () => {
      const mockDateInstance = {
        setHours: vi.fn().mockReturnThis(),
        setDate: vi.fn(),
        toISOString: vi.fn(() => '2024-01-23T18:00:00.000Z'),
        getHours: vi.fn(() => 12),
      };
      mockDate.mockReturnValue(mockDateInstance);

      const result = addExpiryToCurrent(6, 10);

      expect(mockDateInstance.setHours).toHaveBeenCalledWith(18);
      expect(mockDateInstance.setDate).not.toHaveBeenCalled();
      expect(result).toBe('2024-01-23T18:00:00.000Z');
    });

    it('should handle zero hours', () => {
      const mockDateInstance = {
        setHours: vi.fn().mockReturnThis(),
        setDate: vi.fn(),
        toISOString: vi.fn(() => '2024-01-23T12:00:00.000Z'),
        getHours: vi.fn(() => 12),
      };
      mockDate.mockReturnValue(mockDateInstance);

      const result = addExpiryToCurrent(0);

      expect(result).toBe('2024-01-23T12:00:00.000Z');
    });

    it('should handle zero days', () => {
      const mockDateInstance = {
        setHours: vi.fn(),
        setDate: vi.fn().mockReturnThis(),
        toISOString: vi.fn(() => '2024-01-23T12:00:00.000Z'),
        getDate: vi.fn(() => 23),
      };
      mockDate.mockReturnValue(mockDateInstance);

      const result = addExpiryToCurrent(undefined, 0);

      expect(result).toBe('2024-01-23T12:00:00.000Z');
    });
  });
});
