/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useIsAgentSubGraph } from '../agent';
import { SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';
import type { NodesMetadata } from '../../../core/state/workflow/workflowInterfaces';
import React from 'react';

// Mock store setup
const createMockStore = (nodesMetadata: NodesMetadata) => {
  return configureStore({
    reducer: {
      workflow: () => ({
        nodesMetadata,
      }),
    },
  });
};

// Wrapper component for Redux Provider
const createWrapper = (store: any) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useIsAgentSubGraph', () => {
  test('should return true for a node inside an AGENT_CONDITION subgraph', () => {
    const nodesMetadata: NodesMetadata = {
      'node1': {
        graphId: 'agent-tool-1',
        parentNodeId: 'agent-tool-1',
        actionCount: 0,
      },
      'agent-tool-1': {
        graphId: 'agent1',
        parentNodeId: 'agent1',
        subgraphType: SUBGRAPH_TYPES.AGENT_CONDITION,
        actionCount: 0,
      },
      'agent1': {
        graphId: 'root',
        parentNodeId: undefined,
        actionCount: 1,
      },
    };

    const store = createMockStore(nodesMetadata);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useIsAgentSubGraph('node1'), { wrapper });

    expect(result.current).toBe(true);
  });

  test('should return true for a mcp client node', () => {
    const nodesMetadata: NodesMetadata = {
      'mcp-tool-1': {
        graphId: 'agent1',
        parentNodeId: 'agent1',
        subgraphType: SUBGRAPH_TYPES.MCP_CLIENT,
        actionCount: 0,
      },
      'agent1': {
        graphId: 'root',
        parentNodeId: undefined,
        actionCount: 1,
      },
    };

    const store = createMockStore(nodesMetadata);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useIsAgentSubGraph('mcp-tool-1'), { wrapper });

    expect(result.current).toBe(true);
  });

  test('should return false for a node not in an agent subgraph', () => {
    const nodesMetadata: NodesMetadata = {
      'regular-node': {
        graphId: 'root',
        parentNodeId: undefined,
        actionCount: 0,
      },
    };

    const store = createMockStore(nodesMetadata);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useIsAgentSubGraph('regular-node'), { wrapper });

    expect(result.current).toBe(false);
  });

  test('should return false for nested subgraphs that are not agent-related', () => {
    const nodesMetadata: NodesMetadata = {
      'nested-node': {
        graphId: 'condition1',
        parentNodeId: 'condition1',
        actionCount: 0,
      },
      'condition1': {
        graphId: 'root',
        parentNodeId: undefined,
        subgraphType: SUBGRAPH_TYPES.CONDITIONAL_TRUE,
        actionCount: 1,
      },
    };

    const store = createMockStore(nodesMetadata);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useIsAgentSubGraph('nested-node'), { wrapper });

    expect(result.current).toBe(false);
  });

  test('should handle deeply nested agent subgraphs', () => {
    const nodesMetadata: NodesMetadata = {
      'deep-node': {
        graphId: 'level1',
        parentNodeId: 'level1',
        actionCount: 0,
      },
      'level1': {
        graphId: 'level2',
        parentNodeId: 'level2',
        actionCount: 0,
      },
      'level2': {
        graphId: 'agent-tool',
        parentNodeId: 'agent-tool',
        actionCount: 0,
      },
      'agent-tool': {
        graphId: 'agent1',
        parentNodeId: 'agent1',
        subgraphType: SUBGRAPH_TYPES.AGENT_CONDITION,
        actionCount: 0,
      },
      'agent1': {
        graphId: 'root',
        parentNodeId: undefined,
        actionCount: 1,
      },
    };

    const store = createMockStore(nodesMetadata);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useIsAgentSubGraph('deep-node'), { wrapper });

    expect(result.current).toBe(true);
  });

  test('should return false when node metadata is missing', () => {
    const nodesMetadata: NodesMetadata = {};
    const store = createMockStore(nodesMetadata);
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useIsAgentSubGraph('non-existent-node'), { wrapper });

    expect(result.current).toBe(false);
  });
});