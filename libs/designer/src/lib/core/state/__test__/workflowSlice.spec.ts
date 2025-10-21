import { SUBGRAPH_TYPES, WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { describe, expect, it } from 'vitest';
import { getMockedUndoRedoPartialRootState } from '../../../__test__/mock-root-state';
import { initialState } from '../../parsers/__test__/mocks/workflowMock';
import type { AddNodePayload } from '../../parsers/addNodeToWorkflow';
import { setStateAfterUndoRedo } from '../global';
import { WorkflowState, NodeMetadata } from '../workflow/workflowInterfaces';
import reducer, { addNode, addMcpServer, deleteMcpServer, setToolRunIndex, updateAgenticMetadata } from '../workflow/workflowSlice';
import { OperationDefinition } from '../../../../../../logic-apps-shared/src/utils/src/lib/models/logicApps';
import type { UpdateAgenticGraphPayload } from '../../parsers/updateAgenticGraph';

describe('workflow slice reducers', () => {
  it('should add initial node to the workflow', () => {
    const mockAddNode: AddNodePayload = {
      nodeId: '123',
      relationshipIds: {
        graphId: 'root',
      },
      operation: {
        id: 'test-id',
        name: 'test-name',
        properties: {
          trigger: 'test-trigger',
        } as any,
        type: 'discovery',
      },
    };
    const state = reducer(initialState, addNode(mockAddNode));
    expect(state.graph?.children).toEqual([
      {
        id: '123',
        height: 40,
        width: 200,
        type: WORKFLOW_NODE_TYPES.OPERATION_NODE,
      },
    ]);
    expect(state.nodesMetadata).toEqual({
      '123': {
        graphId: 'root',
        isRoot: true,
        isTrigger: true,
      },
    });
  });

  it('should set workflow state on undo redo', async () => {
    const undoRedoPartialRootState = getMockedUndoRedoPartialRootState();
    const workflowState: WorkflowState = {
      ...undoRedoPartialRootState.workflow,
      operations: {
        mockOperation: {
          type: 'built-in',
        },
      },
      graph: {
        id: 'root',
        type: 'GRAPH_NODE',
      },
    };
    const state = reducer(
      initialState,
      setStateAfterUndoRedo({
        ...undoRedoPartialRootState,
        workflow: workflowState,
      })
    );

    expect(state).toEqual(workflowState);
  });

  describe('mcp client actions', () => {
    const mockAgentId = 'agent-123';
    const mockToolId = 'mcp-tool-456';

    const createStateWithAgentAndMcpTool = () => {
      const state = { ...initialState };

      // Set up the main graph with an agent node
      state.graph = {
        id: 'root',
        type: 'GRAPH_NODE',
        children: [
          {
            id: mockAgentId,
            type: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE,
            width: 200,
            height: 40,
            children: [
              {
                id: mockToolId,
                type: WORKFLOW_NODE_TYPES.OPERATION_NODE,
                width: 200,
                height: 40,
              },
            ],
          },
        ],
      };

      // Set up nodes metadata
      state.nodesMetadata = {
        [mockAgentId]: {
          graphId: 'root',
          isRoot: false,
          isTrigger: false,
          subgraphType: SUBGRAPH_TYPES.AGENT_SUBGRAPH,
        } as NodeMetadata,
        [mockToolId]: {
          graphId: mockAgentId,
          isRoot: false,
          isTrigger: false,
          subgraphType: SUBGRAPH_TYPES.MCP_CLIENT,
          parentNodeId: mockAgentId,
        } as NodeMetadata,
      };

      // Set up operations
      state.operations = {
        [mockToolId]: {
          type: 'mcpclienttool',
          connector: {
            id: 'mcp-client',
            name: 'MCP Client',
          },
        } as any,
      };

      // Initialize other required state properties
      state.idReplacements = {};
      
      return state;
    };

    it('should successfully delete MCP server tool from agent', () => {
      const state = createStateWithAgentAndMcpTool();
      const mockPayload = {
        toolId: mockToolId,
        agentId: mockAgentId,
      };

      const newState = reducer(state, deleteMcpServer(mockPayload));

      const agentNode = newState.graph?.children?.find((child: any) => child.id === mockAgentId);
      expect(agentNode?.children).toEqual([]);

      expect(newState.nodesMetadata[mockToolId]).toBeUndefined();
      expect(newState.nodesMetadata[mockAgentId]).toBeDefined();
      expect(newState.operations[mockToolId]).toBeUndefined();
    });


    it('should preserve other tools when deleting specific MCP server', () => {
      const state = createStateWithAgentAndMcpTool();
      const otherToolId = 'other-tool-789';
      
      // Add another tool to the agent's children
      const agentNode = state.graph?.children?.find(child => child.id === mockAgentId);
      if (agentNode?.children) {
        agentNode.children.push({
          id: otherToolId,
          type: WORKFLOW_NODE_TYPES.OPERATION_NODE,
          width: 200,
          height: 40,
        });
      }
      
      // Add metadata for the other tool
      state.nodesMetadata[otherToolId] = {
        graphId: mockAgentId,
        isRoot: false,
        isTrigger: false,
        subgraphType: SUBGRAPH_TYPES.UNTIL_SUBGRAPH, // Different type
        parentNodeId: mockAgentId,
      } as NodeMetadata;

      // Add operation for the other tool
      state.operations[otherToolId] = {
        type: 'tool',
      } as any;

      const mockPayload = {
        toolId: mockToolId,
        agentId: mockAgentId,
      };

      const newState = reducer(state, deleteMcpServer(mockPayload));

      // Verify the MCP tool is removed
      expect(newState.nodesMetadata[mockToolId]).toBeUndefined();
      expect(newState.operations[mockToolId]).toBeUndefined();
      
      // Verify other nodes are preserved
      expect(newState.nodesMetadata[mockAgentId]).toBeDefined();
      expect(newState.nodesMetadata[otherToolId]).toBeDefined();
      expect(newState.operations[otherToolId]).toBeDefined();
      
      // Verify the other tool is still in the agent's children
      const updatedAgentNode = newState.graph?.children?.find((child: any) => child.id === mockAgentId);
      expect(updatedAgentNode?.children).toHaveLength(1);
      expect(updatedAgentNode?.children?.[0].id).toBe(otherToolId);
    });

    const createStateWithAgent = () => {
      const state = { ...initialState };
      
      // Set up the main graph with an agent node (without MCP tools)
      state.graph = {
        id: 'root',
        type: 'GRAPH_NODE',
        children: [
          {
            id: mockAgentId,
            type: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE,
            width: 200,
            height: 40,
            children: [], // Empty children array for agent
          },
        ],
      };

      // Set up agent metadata
      state.nodesMetadata = {
        [mockAgentId]: {
          graphId: 'root',
          isRoot: false,
          isTrigger: false,
          subgraphType: SUBGRAPH_TYPES.AGENT_SUBGRAPH,
        } as NodeMetadata,
      };

      // Initialize other required state properties
      state.operations = {
        [mockAgentId]: <unknown>{
          tools: {}
        } as OperationDefinition,
      };
      state.idReplacements = {};
      
      return state;
    };

    it('should successfully add MCP server to agent', () => {
      const state = createStateWithAgent();
      const mockOperation = {
        id: 'mcp-server-id',
        name: 'mcp-server-name',
        properties: {
          api: {
            id: 'mcp-client',
            name: 'MCP Client',
            type: 'MCP',
          },
        } as any,
        type: 'mcpclienttool' as const,
      };

      const mockPayload: AddNodePayload = {
        nodeId: mockToolId,
        relationshipIds: {
          graphId: mockAgentId,
        },
        operation: mockOperation,
      };

      const newState = reducer(state, addMcpServer(mockPayload));

      // Verify the MCP tool is added to the agent's children
      const agentNode = newState.graph?.children?.find((child: any) => child.id === mockAgentId);
      expect(agentNode?.children).toHaveLength(1);
      expect(agentNode?.children?.[0].id).toBe(mockToolId);
      expect(agentNode?.children?.[0].type).toBe(WORKFLOW_NODE_TYPES.OPERATION_NODE);

      // Verify the tool metadata is created
      expect(newState.nodesMetadata[mockToolId]).toBeDefined();
      expect(newState.nodesMetadata[mockToolId].subgraphType).toBe(SUBGRAPH_TYPES.MCP_CLIENT);
      expect(newState.nodesMetadata[mockToolId].graphId).toBe(mockAgentId);
      expect(newState.nodesMetadata[mockToolId].parentNodeId).toBe(mockAgentId);

      // Verify the agent node is still present
      expect(newState.nodesMetadata[mockAgentId]).toBeDefined();
    });
  });

  it('should set tool run index for existing node', () => {
    const mockNodeId = 'node-123';
    const mockPage = 2;
    const state = { ...initialState };
    state.nodesMetadata = {
      [mockNodeId]: {
        graphId: 'root',
        subgraphType: SUBGRAPH_TYPES.MCP_CLIENT,
      } as NodeMetadata,
    };

    const newState = reducer(state, setToolRunIndex({ page: mockPage, nodeId: mockNodeId }));

    expect(newState.nodesMetadata[mockNodeId].toolRunIndex).toBe(mockPage);
  });

  it('should update MCP client tool run data', () => {
    const mockAgentId = 'agent-123';
    const mockMcpToolId = 'mcp-tool-456';
    const mockRegularToolId = 'regular-tool-789';
    const state = { ...initialState };
    state.nodesMetadata = {
      [mockMcpToolId]: {
        graphId: mockAgentId,
        isRoot: false,
        isTrigger: false,
        subgraphType: SUBGRAPH_TYPES.MCP_CLIENT,
      } as NodeMetadata,
      [mockRegularToolId]: {
        graphId: mockAgentId,
        isRoot: false,
        isTrigger: false,
        subgraphType: SUBGRAPH_TYPES.UNTIL_SUBGRAPH, // Not MCP_CLIENT
      } as NodeMetadata,
    };

    const mockPayload: UpdateAgenticGraphPayload = {
      nodeId: mockAgentId,
      scopeRepetitionRunData: {
        tools: {
          [mockMcpToolId]: {
            status: 'Succeeded',
            iterations: 3,
          },
        },
      },
    };

    const newState = reducer(state, updateAgenticMetadata(mockPayload));

    const mcpToolMetadata = newState.nodesMetadata[mockMcpToolId];
    expect(mcpToolMetadata.toolRunData).toEqual({
      status: 'Succeeded',
      repetitionCount: 3,
    });
    expect(mcpToolMetadata.toolRunIndex).toBe(0);
  });
});
