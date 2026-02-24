import { describe, test, expect } from 'vitest';
import { isAgentSubgraphFromMetadata } from '../agent';
import { SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';
import type { NodesMetadata } from '../../../core/state/workflow/workflowInterfaces';

describe('isAgentSubgraphFromMetadata', () => {
  test('should return true for a node inside an AGENT_CONDITION subgraph', () => {
    const nodesMetadata: NodesMetadata = {
      node1: {
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
      agent1: {
        graphId: 'root',
        parentNodeId: undefined,
        actionCount: 1,
      },
    };

    const result = isAgentSubgraphFromMetadata('node1', nodesMetadata);

    expect(result).toBe(true);
  });

  test('should return true for a mcp client node', () => {
    const nodesMetadata: NodesMetadata = {
      'mcp-tool-1': {
        graphId: 'agent1',
        parentNodeId: 'agent1',
        subgraphType: SUBGRAPH_TYPES.MCP_CLIENT,
        actionCount: 0,
      },
      agent1: {
        graphId: 'root',
        parentNodeId: undefined,
        actionCount: 1,
      },
    };

    const result = isAgentSubgraphFromMetadata('mcp-tool-1', nodesMetadata);

    expect(result).toBe(true);
  });

  test('should return false for a node not in an agent subgraph', () => {
    const nodesMetadata: NodesMetadata = {
      'regular-node': {
        graphId: 'root',
        parentNodeId: undefined,
        actionCount: 0,
      },
    };

    const result = isAgentSubgraphFromMetadata('regular-node', nodesMetadata);

    expect(result).toBe(false);
  });

  test('should return false when node metadata is missing', () => {
    const nodesMetadata: NodesMetadata = {};

    const result = isAgentSubgraphFromMetadata('non-existent-node', nodesMetadata);

    expect(result).toBe(false);
  });

  test('should return false when nodeId is undefined', () => {
    const nodesMetadata: NodesMetadata = {
      'some-node': {
        graphId: 'root',
        parentNodeId: undefined,
        actionCount: 0,
      },
    };

    const result = isAgentSubgraphFromMetadata(undefined, nodesMetadata);

    expect(result).toBe(false);
  });

  test('should return false when nodesMetadata is undefined', () => {
    const result = isAgentSubgraphFromMetadata('some-node', undefined);

    expect(result).toBe(false);
  });
});
