import { describe, expect, it, vi } from 'vitest';
import { getMockedUndoRedoPartialRootState } from '../../../__test__/mock-root-state';
import { setStateAfterUndoRedo } from '../global';
import reducer, { initialState, openMcpToolWizard } from '../panel/panelSlice';
import type { PanelState } from '../panel/panelTypes';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';

// Mock LoggerService to avoid initialization errors
vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@microsoft/logic-apps-shared')>();
  return {
    ...actual,
    LoggerService: () => ({
      log: vi.fn(),
    }),
  };
});

const mockMcpOperation: DiscoveryOperation<DiscoveryResultTypes> = {
  id: 'test-mcp-operation',
  name: 'Test MCP Operation',
  type: 'Discovery',
  properties: {
    summary: 'Test MCP Server',
    description: 'A test MCP server operation',
    api: {
      id: 'mcp-api-id',
      name: 'MCP API',
      displayName: 'MCP API',
      brandColor: '#000000',
      iconUri: 'https://example.com/icon.png',
    },
    operationType: 'McpClientTool',
  },
} as DiscoveryOperation<DiscoveryResultTypes>;

describe('panel slice reducers', () => {
  it('should set panel state on undo redo', async () => {
    const undoRedoPartialRootState = getMockedUndoRedoPartialRootState();
    const panelState: PanelState = {
      ...undoRedoPartialRootState.panel,
      isCollapsed: false,
      connectionContent: {
        selectedNodeIds: ['test'],
        isCreatingConnection: true,
        panelMode: 'Connection',
      },
    };
    const state = reducer(
      initialState,
      setStateAfterUndoRedo({
        ...undoRedoPartialRootState,
        panel: panelState,
      })
    );

    expect(state).toEqual(panelState);
  });

  describe('openMcpToolWizard', () => {
    it('should set isConnectionLocked to false when no connectionId is provided', () => {
      const state = reducer(
        initialState,
        openMcpToolWizard({
          operation: mockMcpOperation,
        })
      );

      expect(state.discoveryContent.mcpToolWizard).toBeDefined();
      expect(state.discoveryContent.mcpToolWizard?.isConnectionLocked).toBe(false);
      expect(state.discoveryContent.mcpToolWizard?.currentStep).toBe('CONNECTION');
      expect(state.discoveryContent.mcpToolWizard?.connectionId).toBeUndefined();
    });

    it('should set isConnectionLocked to true when connectionId is provided', () => {
      const state = reducer(
        initialState,
        openMcpToolWizard({
          operation: mockMcpOperation,
          connectionId: 'test-connection-id',
        })
      );

      expect(state.discoveryContent.mcpToolWizard).toBeDefined();
      expect(state.discoveryContent.mcpToolWizard?.isConnectionLocked).toBe(true);
      expect(state.discoveryContent.mcpToolWizard?.currentStep).toBe('PARAMETERS');
      expect(state.discoveryContent.mcpToolWizard?.connectionId).toBe('test-connection-id');
    });

    it('should start at CREATE_CONNECTION step when forceCreateConnection is true', () => {
      const state = reducer(
        initialState,
        openMcpToolWizard({
          operation: mockMcpOperation,
          forceCreateConnection: true,
        })
      );

      expect(state.discoveryContent.mcpToolWizard).toBeDefined();
      expect(state.discoveryContent.mcpToolWizard?.currentStep).toBe('CREATE_CONNECTION');
      expect(state.discoveryContent.mcpToolWizard?.isConnectionLocked).toBe(false);
    });

    it('should initialize allowedTools as undefined', () => {
      const state = reducer(
        initialState,
        openMcpToolWizard({
          operation: mockMcpOperation,
          connectionId: 'test-connection-id',
        })
      );

      expect(state.discoveryContent.mcpToolWizard?.allowedTools).toBeUndefined();
    });
  });
});
