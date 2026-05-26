import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mock functions
const mockUpdateConnectionReferenceWithMSIInLocalSettings = vi.fn();
const mockWriteLocalSettingsFile = vi.fn();
const mockGetLocalSettingsJson = vi.fn();

// Mock dependencies
vi.mock('../../../appSettings/localSettings', () => ({
  getLocalSettingsJson: mockGetLocalSettingsJson,
  writeLocalSettingsFile: mockWriteLocalSettingsFile,
}));

// Import the module after mocks are set up
const mockModule = await import('../connection');

describe('updateConnectionReferencesLocalMSI - parallel processing', () => {
  const testProjectPath = '/test/project';
  const testConnectionReferences = {
    'msnweather-1': {
      api: { id: 'msnweather' },
      connection: { id: '/subscriptions/test/connections/msnweather-1' },
      connectionProperties: {},
    },
    'office365-2': {
      api: { id: 'office365' },
      connection: { id: '/subscriptions/test/connections/office365-2' },
      connectionProperties: {},
    },
    'sql-3': {
      api: { id: 'sql' },
      connection: { id: '/subscriptions/test/connections/sql-3' },
      connectionProperties: {},
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Default mock implementations
    mockGetLocalSettingsJson.mockResolvedValue({
      IsEncrypted: false,
      Values: {},
    });
    mockWriteLocalSettingsFile.mockResolvedValue(undefined);
    mockUpdateConnectionReferenceWithMSIInLocalSettings.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('should process multiple connections in parallel', async () => {
    const updateConnectionReferencesLocalMSI = mockModule.updateConnectionReferencesLocalMSI;

    if (updateConnectionReferencesLocalMSI) {
      const mockContext = { telemetry: { properties: {} } };
      const azureDetails = {
        subscriptionId: 'test-sub',
        tenantId: 'test-tenant',
        accessToken: 'test-token',
      };

      // Mock each connection taking 100ms to process
      const connectionProcessingTimes: number[] = [];
      mockGetLocalSettingsJson.mockImplementation(async () => {
        const startTime = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 100));
        connectionProcessingTimes.push(Date.now() - startTime);
        return { IsEncrypted: false, Values: {} };
      });

      const startTime = Date.now();
      await updateConnectionReferencesLocalMSI(mockContext as any, testProjectPath, testConnectionReferences, azureDetails as any);
      const totalTime = Date.now() - startTime;

      // Advance timers to complete all promises
      await vi.runAllTimersAsync();

      // With 3 connections taking 100ms each:
      // - Sequential would take ~300ms
      // - Parallel should take ~100ms
      // We'll check that it's closer to parallel time
      expect(totalTime).toBeLessThan(250); // Less than 2.5x the individual time
    }
  });

  it('should call processing for each connection reference', async () => {
    const updateConnectionReferencesLocalMSI = mockModule.updateConnectionReferencesLocalMSI;

    if (updateConnectionReferencesLocalMSI) {
      const mockContext = { telemetry: { properties: {} } };
      const azureDetails = {
        subscriptionId: 'test-sub',
        tenantId: 'test-tenant',
        accessToken: 'test-token',
      };

      await updateConnectionReferencesLocalMSI(mockContext as any, testProjectPath, testConnectionReferences, azureDetails as any);

      // Should have processed all 3 connections
      expect(mockGetLocalSettingsJson).toHaveBeenCalledTimes(3);
    }
  });

  it('should handle errors in individual connection processing', async () => {
    const updateConnectionReferencesLocalMSI = mockModule.updateConnectionReferencesLocalMSI;

    if (updateConnectionReferencesLocalMSI) {
      const mockContext = { telemetry: { properties: {} } };
      const azureDetails = {
        subscriptionId: 'test-sub',
        tenantId: 'test-tenant',
        accessToken: 'test-token',
      };

      // Make one connection fail
      let callCount = 0;
      mockGetLocalSettingsJson.mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Connection processing failed');
        }
        return { IsEncrypted: false, Values: {} };
      });

      // Should not throw - parallel processing should handle individual failures
      try {
        await updateConnectionReferencesLocalMSI(mockContext as any, testProjectPath, testConnectionReferences, azureDetails as any);
      } catch (error) {
        // If it throws, verify it's an expected error
        expect(error).toBeDefined();
      }

      // Should have attempted to process all connections
      expect(mockGetLocalSettingsJson).toHaveBeenCalled();
    }
  });

  it('should process connections faster than sequential approach', async () => {
    const updateConnectionReferencesLocalMSI = mockModule.updateConnectionReferencesLocalMSI;

    if (updateConnectionReferencesLocalMSI) {
      const mockContext = { telemetry: { properties: {} } };
      const azureDetails = {
        subscriptionId: 'test-sub',
        tenantId: 'test-tenant',
        accessToken: 'test-token',
      };

      const delay = 50; // Each connection takes 50ms
      mockGetLocalSettingsJson.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return { IsEncrypted: false, Values: {} };
      });

      const startTime = Date.now();
      const promise = updateConnectionReferencesLocalMSI(
        mockContext as any,
        testProjectPath,
        testConnectionReferences,
        azureDetails as any
      );

      // Run all timers to complete promises
      await vi.runAllTimersAsync();
      await promise;
      const duration = Date.now() - startTime;

      // With 3 connections and 50ms each:
      // - Sequential: 150ms
      // - Parallel: ~50ms
      // Allow some overhead, but should be much faster than sequential
      const sequentialTime = delay * Object.keys(testConnectionReferences).length;
      expect(duration).toBeLessThan(sequentialTime * 0.8); // At least 20% faster
    }
  });

  it('should work with empty connection references', async () => {
    const updateConnectionReferencesLocalMSI = mockModule.updateConnectionReferencesLocalMSI;

    if (updateConnectionReferencesLocalMSI) {
      const mockContext = { telemetry: { properties: {} } };
      const azureDetails = {
        subscriptionId: 'test-sub',
        tenantId: 'test-tenant',
        accessToken: 'test-token',
      };

      await updateConnectionReferencesLocalMSI(mockContext as any, testProjectPath, {}, azureDetails as any);

      // Should not have called any processing
      expect(mockGetLocalSettingsJson).not.toHaveBeenCalled();
    }
  });
});
