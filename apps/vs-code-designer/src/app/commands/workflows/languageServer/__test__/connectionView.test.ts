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

describe('resolveConnectionEdit', () => {
  const resolveConnectionEdit = (mockModule as any).resolveConnectionEdit;

  describe('Case 1: Range covers just the string parameter', () => {
    it('should replace a quoted string directly', () => {
      const result = resolveConnectionEdit('"azureblob"', 'azureblob-1');
      expect(result).toEqual({
        offset: 0,
        length: '"azureblob"'.length,
        text: '"azureblob-1"',
      });
    });

    it('should handle empty quoted string', () => {
      const result = resolveConnectionEdit('""', 'msnweather');
      expect(result).toEqual({
        offset: 0,
        length: 2,
        text: '"msnweather"',
      });
    });
  });

  describe('Case 2: Range covers method call WITH existing connection name', () => {
    it('should find and replace the string parameter within a method call', () => {
      const existingText = 'WorkflowActions.ManagedConnectors.Azureblob("azureblob").ListFolderV4()';
      const result = resolveConnectionEdit(existingText, 'azureblob-1');
      expect(result).toEqual({
        offset: existingText.indexOf('"azureblob"'),
        length: '"azureblob"'.length,
        text: '"azureblob-1"',
      });
    });

    it('should find string parameter in simple method call', () => {
      const existingText = 'Msnweather("msnweather")';
      const result = resolveConnectionEdit(existingText, 'msnweather-2');
      expect(result).toEqual({
        offset: existingText.indexOf('"msnweather"'),
        length: '"msnweather"'.length,
        text: '"msnweather-2"',
      });
    });

    it('should replace the first string parameter when multiple exist', () => {
      const existingText = 'Connector("conn1", "param2")';
      const result = resolveConnectionEdit(existingText, 'newconn');
      expect(result).toEqual({
        offset: existingText.indexOf('"conn1"'),
        length: '"conn1"'.length,
        text: '"newconn"',
      });
    });
  });

  describe('Case 3: Range covers method call with NO connection name (empty parens)', () => {
    it('should insert connection name into empty parentheses', () => {
      const existingText = 'Azureblob()';
      const result = resolveConnectionEdit(existingText, 'azureblob');
      expect(result).toEqual({
        offset: existingText.indexOf('(') + 1,
        length: 0,
        text: '"azureblob"',
      });
    });

    it('should insert into chained method call with no arguments', () => {
      const existingText = 'WorkflowActions.ManagedConnectors.Msnweather()';
      const result = resolveConnectionEdit(existingText, 'msnweather');
      expect(result).toEqual({
        offset: existingText.indexOf('(') + 1,
        length: 0,
        text: '"msnweather"',
      });
    });
  });

  describe('Case 4: Stale range (user edited file after opening connection pane)', () => {
    it('should find the string when user changed the connection name to a shorter one', () => {
      // User changed "msnweather" to "mw" while connection pane was open
      const existingText = 'WorkflowActions.ManagedConnectors.Msnweather("mw").CurrentWeather()';
      const result = resolveConnectionEdit(existingText, 'msnweather-1');
      expect(result).toEqual({
        offset: existingText.indexOf('"mw"'),
        length: '"mw"'.length,
        text: '"msnweather-1"',
      });
    });

    it('should find the string when user changed the connection name to a longer one', () => {
      // User changed "mw" to "my-custom-weather-connection" while connection pane was open
      const existingText = 'WorkflowActions.ManagedConnectors.Msnweather("my-custom-weather-connection").CurrentWeather()';
      const result = resolveConnectionEdit(existingText, 'msnweather');
      expect(result).toEqual({
        offset: existingText.indexOf('"my-custom-weather-connection"'),
        length: '"my-custom-weather-connection"'.length,
        text: '"msnweather"',
      });
    });
  });

  describe('Case 5: User emptied the string and quotes while pane was open', () => {
    it('should insert into empty parens found on the full line when range text has no quotes or parens', () => {
      // The stale range text no longer contains the method call — fall back to full line
      const staleRangeText = 'ather().Curre';
      const fullLine = '            var weather = WorkflowActions.ManagedConnectors.Msnweather().CurrentWeather()';
      const result = resolveConnectionEdit(staleRangeText, 'msnweather', fullLine);
      expect(result).not.toBeNull();
      expect(result?.text).toBe('"msnweather"');
      expect(result?.length).toBe(0); // insert, not replace
    });
  });

  describe('Edge cases', () => {
    it('should return null when no string or parens found', () => {
      const result = resolveConnectionEdit('some random text without quotes or parens', 'conn');
      expect(result).toBeNull();
    });

    it('should handle connection names with hyphens and numbers', () => {
      const result = resolveConnectionEdit('"msnweather-10"', 'msnweather-11');
      expect(result).toEqual({
        offset: 0,
        length: '"msnweather-10"'.length,
        text: '"msnweather-11"',
      });
    });
  });
});

describe('resolveCurrentConnectionId', () => {
  const resolveCurrentConnectionId = (mockModule as any).resolveCurrentConnectionId;

  it('returns mapped connection id leaf when current id is a connections.json key', () => {
    const connectionsData = JSON.stringify({
      managedApiConnections: {
        'msnweather-1': {
          connection: {
            id: '/subscriptions/sub-123/resourceGroups/rg/providers/Microsoft.Web/connections/msnweather-10',
          },
        },
      },
    });

    const result = resolveCurrentConnectionId(connectionsData, 'msnweather-1');
    expect(result).toBe('msnweather-10');
  });

  it('returns original id when key is not found', () => {
    const connectionsData = JSON.stringify({ managedApiConnections: {} });
    const result = resolveCurrentConnectionId(connectionsData, 'msnweather-1');
    expect(result).toBe('msnweather-1');
  });

  it('returns original id when json is invalid', () => {
    const result = resolveCurrentConnectionId('not-json', 'msnweather-1');
    expect(result).toBe('msnweather-1');
  });
});
