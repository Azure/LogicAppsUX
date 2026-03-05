import { describe, vi, beforeEach, it, expect } from 'vitest';
import { trySetDefaultConnectionForNode } from '../add';
import * as connectionsModule from '../../../queries/connections';
import * as connectionActionsModule from '../connections';
import type { Connection, Connector } from '@microsoft/logic-apps-shared';

vi.mock('../../../queries/connections', () => ({
  getConnectionsForConnector: vi.fn(),
}));

vi.mock('@microsoft/logic-apps-shared', async () => {
  const actual = await vi.importActual('@microsoft/logic-apps-shared');
  return {
    ...actual,
    ConnectionService: vi.fn(() => ({
      setupConnectionIfNeeded: vi.fn().mockResolvedValue(undefined),
    })),
    UserPreferenceService: vi.fn(() => ({
      getMostRecentlyUsedConnectionId: vi.fn().mockResolvedValue(undefined),
    })),
    LoggerService: vi.fn(() => ({
      log: vi.fn(),
    })),
  };
});

vi.mock('../connections', () => ({
  updateNodeConnection: vi.fn(() => vi.fn()),
}));

vi.mock('../../../state/connection/connectionSlice', () => ({
  initEmptyConnectionMap: vi.fn(() => ({ type: 'mock/initEmptyConnectionMap' })),
}));

vi.mock('../../../state/panel/panelSlice', () => ({
  openPanel: vi.fn(() => ({ type: 'mock/openPanel' })),
}));

const mockGetConnectionsForConnector = vi.mocked(connectionsModule.getConnectionsForConnector);
const mockUpdateNodeConnection = vi.mocked(connectionActionsModule.updateNodeConnection);

describe('trySetDefaultConnectionForNode', () => {
  const mockDispatch = vi.fn();

  const createMockConnector = (id: string): Connector =>
    ({
      id,
      name: 'test-connector',
      type: 'Microsoft.Web/connections',
      properties: {
        displayName: 'Test Connector',
        iconUri: 'https://example.com/icon.png',
        brandColor: '#0078d4',
      },
    }) as Connector;

  const createMockConnection = (id: string, status = 'Connected'): Connection =>
    ({
      id,
      name: `connection-${id}`,
      type: 'Microsoft.Web/connections',
      properties: {
        displayName: `Connection ${id}`,
        overallStatus: status,
      },
    }) as Connection;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateNodeConnection.mockClear();
  });

  describe('preferredConnectionId parameter', () => {
    it('should use preferred connection when provided and found in available connections', async () => {
      const connector = createMockConnector('/connectors/test');
      const connection1 = createMockConnection('conn-1');
      const connection2 = createMockConnection('conn-2');
      const connection3 = createMockConnection('conn-3');

      mockGetConnectionsForConnector.mockResolvedValue([connection1, connection2, connection3]);

      await trySetDefaultConnectionForNode('test-node', connector, mockDispatch, true, undefined, 'conn-2');

      // Verify updateNodeConnection was called with the preferred connection (conn-2)
      expect(mockUpdateNodeConnection).toHaveBeenCalledWith({
        nodeId: 'test-node',
        connection: connection2,
        connector,
      });
    });

    it('should fall back to first available connection when preferredConnectionId is not found', async () => {
      const connector = createMockConnector('/connectors/test');
      const connection1 = createMockConnection('conn-1');
      const connection2 = createMockConnection('conn-2');

      mockGetConnectionsForConnector.mockResolvedValue([connection1, connection2]);

      await trySetDefaultConnectionForNode('test-node', connector, mockDispatch, true, undefined, 'non-existent-conn');

      // Should fall back to first connection since preferred wasn't found
      expect(mockUpdateNodeConnection).toHaveBeenCalledWith({
        nodeId: 'test-node',
        connection: connection1,
        connector,
      });
    });

    it('should use first available connection when preferredConnectionId is not provided', async () => {
      const connector = createMockConnector('/connectors/test');
      const connection1 = createMockConnection('conn-1');
      const connection2 = createMockConnection('conn-2');

      mockGetConnectionsForConnector.mockResolvedValue([connection1, connection2]);

      await trySetDefaultConnectionForNode('test-node', connector, mockDispatch, true, undefined, undefined);

      // Should use first connection when no preferred is provided
      expect(mockUpdateNodeConnection).toHaveBeenCalledWith({
        nodeId: 'test-node',
        connection: connection1,
        connector,
      });
    });

    it('should filter out error connections before selecting preferred connection', async () => {
      const connector = createMockConnector('/connectors/test');
      const errorConnection = createMockConnection('conn-error', 'Error');
      const goodConnection = createMockConnection('conn-good');

      mockGetConnectionsForConnector.mockResolvedValue([errorConnection, goodConnection]);

      // Try to use the error connection as preferred - it should be filtered out
      await trySetDefaultConnectionForNode('test-node', connector, mockDispatch, true, undefined, 'conn-error');

      // Should use the good connection since error connection was filtered
      expect(mockUpdateNodeConnection).toHaveBeenCalledWith({
        nodeId: 'test-node',
        connection: goodConnection,
        connector,
      });
    });

    it('should apply connectionFilterFunc before selecting preferred connection', async () => {
      const connector = createMockConnector('/connectors/test');
      const connection1 = createMockConnection('conn-1');
      const connection2 = createMockConnection('conn-2');

      mockGetConnectionsForConnector.mockResolvedValue([connection1, connection2]);

      // Filter function that excludes conn-1
      const filterFunc = (c: Connection) => c.id !== 'conn-1';

      // Try to use conn-1 as preferred, but it should be filtered out
      await trySetDefaultConnectionForNode('test-node', connector, mockDispatch, true, filterFunc, 'conn-1');

      // Should use conn-2 since conn-1 was filtered out
      expect(mockUpdateNodeConnection).toHaveBeenCalledWith({
        nodeId: 'test-node',
        connection: connection2,
        connector,
      });
    });

    it('should open connection panel when no connections are available and connection is required', async () => {
      const connector = createMockConnector('/connectors/test');

      mockGetConnectionsForConnector.mockResolvedValue([]);

      await trySetDefaultConnectionForNode('test-node', connector, mockDispatch, true, undefined, 'any-conn');

      // updateNodeConnection should not be called
      expect(mockUpdateNodeConnection).not.toHaveBeenCalled();

      // Should dispatch initEmptyConnectionMap and openPanel
      expect(mockDispatch).toHaveBeenCalledTimes(2);
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'mock/initEmptyConnectionMap' }));
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'mock/openPanel' }));
    });
  });
});
