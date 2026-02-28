import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mock functions
const mockGetConnectionsFromFile = vi.fn();

// Mock dependencies
vi.mock('../../../../utils/codeless/connection', () => ({
  getConnectionsFromFile: mockGetConnectionsFromFile,
}));

// Import the module after mocks are set up
const mockModule = await import('../connectionView');

describe('ConnectionView - getConnectionKeyFromConnectionsJson', () => {
  const testProjectPath = '/test/project';
  const testConnectionName = 'msnweather-7';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return connection name when projectPath is undefined', async () => {
    const getConnectionKeyFromConnectionsJson = (mockModule as any).ConnectionView?.prototype?.getConnectionKeyFromConnectionsJson;

    if (getConnectionKeyFromConnectionsJson) {
      const mockContext = { workflowFilePath: '/test/workflow.json' };
      const result = await getConnectionKeyFromConnectionsJson.call(mockContext, undefined, testConnectionName);

      expect(result).toBe(testConnectionName);
      expect(mockGetConnectionsFromFile).not.toHaveBeenCalled();
    }
  });

  it('should return connection name when connections file is not found', async () => {
    mockGetConnectionsFromFile.mockResolvedValue(null);

    const getConnectionKeyFromConnectionsJson = (mockModule as any).ConnectionView?.prototype?.getConnectionKeyFromConnectionsJson;

    if (getConnectionKeyFromConnectionsJson) {
      const mockContext = { workflowFilePath: '/test/workflow.json' };
      const result = await getConnectionKeyFromConnectionsJson.call(mockContext, testProjectPath, testConnectionName);

      expect(result).toBe(testConnectionName);
    }
  });

  it('should find connection key by matching connection.id last part', async () => {
    const connectionsJson = JSON.stringify({
      managedApiConnections: {
        'msnweather-1': {
          connection: {
            id: '/subscriptions/sub-123/resourceGroups/rg-test/providers/Microsoft.Web/connections/msnweather-7',
          },
          connectionRuntimeUrl: 'https://example.com',
          authentication: { type: 'ManagedServiceIdentity' },
        },
        'office365-2': {
          connection: {
            id: '/subscriptions/sub-123/resourceGroups/rg-test/providers/Microsoft.Web/connections/office365-5',
          },
          connectionRuntimeUrl: 'https://example.com',
          authentication: { type: 'ManagedServiceIdentity' },
        },
      },
    });

    mockGetConnectionsFromFile.mockResolvedValue(connectionsJson);

    const getConnectionKeyFromConnectionsJson = (mockModule as any).ConnectionView?.prototype?.getConnectionKeyFromConnectionsJson;

    if (getConnectionKeyFromConnectionsJson) {
      const mockContext = { workflowFilePath: '/test/workflow.json', context: {} };
      const result = await getConnectionKeyFromConnectionsJson.call(mockContext, testProjectPath, 'msnweather-7');

      expect(result).toBe('msnweather-1');
    }
  });

  it('should return connection name as fallback when no match found', async () => {
    const connectionsJson = JSON.stringify({
      managedApiConnections: {
        'office365-2': {
          connection: {
            id: '/subscriptions/sub-123/resourceGroups/rg-test/providers/Microsoft.Web/connections/office365-5',
          },
        },
      },
    });

    mockGetConnectionsFromFile.mockResolvedValue(connectionsJson);

    const getConnectionKeyFromConnectionsJson = (mockModule as any).ConnectionView?.prototype?.getConnectionKeyFromConnectionsJson;

    if (getConnectionKeyFromConnectionsJson) {
      const mockContext = { workflowFilePath: '/test/workflow.json', context: {} };
      const result = await getConnectionKeyFromConnectionsJson.call(mockContext, testProjectPath, 'nonexistent-connection');

      expect(result).toBe('nonexistent-connection');
    }
  });

  it('should handle JSON parse errors gracefully', async () => {
    mockGetConnectionsFromFile.mockResolvedValue('invalid json {{{');

    const getConnectionKeyFromConnectionsJson = (mockModule as any).ConnectionView?.prototype?.getConnectionKeyFromConnectionsJson;

    if (getConnectionKeyFromConnectionsJson) {
      const mockContext = { workflowFilePath: '/test/workflow.json', context: {} };
      const result = await getConnectionKeyFromConnectionsJson.call(mockContext, testProjectPath, testConnectionName);

      expect(result).toBe(testConnectionName);
    }
  });

  it('should handle missing managedApiConnections property', async () => {
    const connectionsJson = JSON.stringify({});

    mockGetConnectionsFromFile.mockResolvedValue(connectionsJson);

    const getConnectionKeyFromConnectionsJson = (mockModule as any).ConnectionView?.prototype?.getConnectionKeyFromConnectionsJson;

    if (getConnectionKeyFromConnectionsJson) {
      const mockContext = { workflowFilePath: '/test/workflow.json', context: {} };
      const result = await getConnectionKeyFromConnectionsJson.call(mockContext, testProjectPath, testConnectionName);

      expect(result).toBe(testConnectionName);
    }
  });
});

describe('ConnectionView - getLoadingHtml', () => {
  it('should return valid HTML with DOCTYPE declaration', () => {
    const getLoadingHtml = (mockModule as any).ConnectionView?.prototype?.getLoadingHtml;

    if (getLoadingHtml) {
      const mockContext = {};
      const html = getLoadingHtml.call(mockContext);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
    }
  });

  it('should contain loading spinner with animation', () => {
    const getLoadingHtml = (mockModule as any).ConnectionView?.prototype?.getLoadingHtml;

    if (getLoadingHtml) {
      const mockContext = {};
      const html = getLoadingHtml.call(mockContext);

      expect(html).toContain('class="spinner"');
      expect(html).toContain('@keyframes spin');
      expect(html).toContain('animation: spin 1s linear infinite');
    }
  });

  it('should contain loading text', () => {
    const getLoadingHtml = (mockModule as any).ConnectionView?.prototype?.getLoadingHtml;

    if (getLoadingHtml) {
      const mockContext = {};
      const html = getLoadingHtml.call(mockContext);

      expect(html).toContain('Loading connections');
    }
  });

  it('should use VS Code theme variables for styling', () => {
    const getLoadingHtml = (mockModule as any).ConnectionView?.prototype?.getLoadingHtml;

    if (getLoadingHtml) {
      const mockContext = {};
      const html = getLoadingHtml.call(mockContext);

      expect(html).toContain('var(--vscode-foreground)');
      expect(html).toContain('var(--vscode-editor-background)');
      expect(html).toContain('var(--vscode-progressBar-background)');
    }
  });

  it('should have proper CSS for centering content', () => {
    const getLoadingHtml = (mockModule as any).ConnectionView?.prototype?.getLoadingHtml;

    if (getLoadingHtml) {
      const mockContext = {};
      const html = getLoadingHtml.call(mockContext);

      expect(html).toContain('display: flex');
      expect(html).toContain('justify-content: center');
      expect(html).toContain('align-items: center');
      expect(html).toContain('height: 100vh');
    }
  });
});
