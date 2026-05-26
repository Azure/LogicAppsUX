import { SUBGRAPH_TYPES, WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { describe, expect, it } from 'vitest';
import { getMockedUndoRedoPartialRootState } from '../../../__test__/mock-root-state';
import { initialState } from '../../parsers/__test__/mocks/workflowMock';
import type { AddNodePayload } from '../../parsers/addNodeToWorkflow';
import { setStateAfterUndoRedo } from '../global';
import { WorkflowState, NodeMetadata } from '../workflow/workflowInterfaces';
import reducer, {
  addNode,
  addMcpServer,
  deleteMcpServer,
  setToolRunIndex,
  updateAgenticMetadata,
  initialWorkflowState,
} from '../workflow/workflowSlice';
import { initializeInputsOutputsBinding, fetchBuiltInToolRunData } from '../../actions/bjsworkflow/monitoring';
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
      const agentNode = state.graph?.children?.find((child) => child.id === mockAgentId);
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
        [mockAgentId]: (<unknown>{
          tools: {},
        }) as OperationDefinition,
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

  describe('built-in agent tool support', () => {
    it('should set inputsLink and outputsLink for built-in tools in updateAgenticMetadata', () => {
      const mockAgentId = 'agent-123';
      const state = { ...initialState };
      state.nodesMetadata = {
        code_interpreter: {
          graphId: mockAgentId,
          isRoot: false,
          isTrigger: false,
        } as NodeMetadata,
      };

      const mockPayload: UpdateAgenticGraphPayload = {
        nodeId: mockAgentId,
        scopeRepetitionRunData: {
          inputsLink: { uri: 'https://example.com/inputs' },
          outputsLink: { uri: 'https://example.com/outputs' },
          tools: {
            code_interpreter: {
              status: 'Succeeded',
              iterations: 1,
            },
          },
        },
      };

      const newState = reducer(state, updateAgenticMetadata(mockPayload));

      const toolMetadata = newState.nodesMetadata.code_interpreter;
      expect(toolMetadata.runData).toBeDefined();
      expect(toolMetadata.runData?.status).toBe('Succeeded');
      expect((toolMetadata.runData as any)?.inputsLink).toEqual({ uri: 'https://example.com/inputs' });
      expect((toolMetadata.runData as any)?.outputsLink).toEqual({ uri: 'https://example.com/outputs' });
      expect(toolMetadata.runIndex).toBe(0);
    });

    it('should NOT set inputsLink and outputsLink for regular (non-built-in) tools in updateAgenticMetadata', () => {
      const mockAgentId = 'agent-123';
      const state = { ...initialState };
      state.nodesMetadata = {
        my_custom_tool: {
          graphId: mockAgentId,
          isRoot: false,
          isTrigger: false,
        } as NodeMetadata,
      };

      const mockPayload: UpdateAgenticGraphPayload = {
        nodeId: mockAgentId,
        scopeRepetitionRunData: {
          inputsLink: { uri: 'https://example.com/inputs' },
          outputsLink: { uri: 'https://example.com/outputs' },
          tools: {
            my_custom_tool: {
              status: 'Succeeded',
              iterations: 2,
            },
          },
        },
      };

      const newState = reducer(state, updateAgenticMetadata(mockPayload));

      const toolMetadata = newState.nodesMetadata.my_custom_tool;
      expect(toolMetadata.runData).toBeDefined();
      expect(toolMetadata.runData?.status).toBe('Succeeded');
      // Regular tools should NOT have inputsLink/outputsLink
      expect((toolMetadata.runData as any)?.inputsLink).toBeUndefined();
      expect((toolMetadata.runData as any)?.outputsLink).toBeUndefined();
    });

    it('should handle fetchBuiltInToolRunData.fulfilled by setting run data on nodesMetadata', () => {
      const state = { ...initialState };
      state.nodesMetadata = {};

      const mockPayload = {
        toolNodeId: 'code_interpreter',
        inputsLink: { uri: 'https://example.com/inputs' },
        outputsLink: { uri: 'https://example.com/outputs' },
        inputs: { message: { displayName: 'Message', value: 'hello' } },
        outputs: { result: { displayName: 'Result', value: 'world' } },
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-01T00:01:00Z',
        status: 'Succeeded',
        correlation: { actionTrackingId: 'test-id' },
      };

      const action = {
        type: fetchBuiltInToolRunData.fulfilled.type,
        payload: mockPayload,
      };

      const newState = reducer(state, action);

      expect(newState.nodesMetadata.code_interpreter).toBeDefined();
      const runData = newState.nodesMetadata.code_interpreter.runData;
      expect(runData).toBeDefined();
      expect(runData?.status).toBe('Succeeded');
      expect(runData?.startTime).toBe('2024-01-01T00:00:00Z');
      expect(runData?.endTime).toBe('2024-01-01T00:01:00Z');
      expect((runData as any)?.inputs).toEqual({ message: { displayName: 'Message', value: 'hello' } });
      expect((runData as any)?.outputs).toEqual({ result: { displayName: 'Result', value: 'world' } });
    });

    it('should create nodesMetadata entry if it does not exist for fetchBuiltInToolRunData.fulfilled', () => {
      const state = { ...initialState };
      state.nodesMetadata = {}; // Empty - no entry for code_interpreter

      const action = {
        type: fetchBuiltInToolRunData.fulfilled.type,
        payload: {
          toolNodeId: 'code_interpreter',
          inputsLink: null,
          outputsLink: null,
          inputs: {},
          outputs: {},
          startTime: '2024-01-01T00:00:00Z',
          endTime: '2024-01-01T00:01:00Z',
          status: 'Failed',
          correlation: null,
        },
      };

      const newState = reducer(state, action);

      // Should have created the nodesMetadata entry
      expect(newState.nodesMetadata.code_interpreter).toBeDefined();
      expect(newState.nodesMetadata.code_interpreter.runData?.status).toBe('Failed');
    });

    it('should preserve existing nodesMetadata when fetchBuiltInToolRunData.fulfilled updates', () => {
      const state = { ...initialState };
      state.nodesMetadata = {
        code_interpreter: {
          graphId: 'agent-1',
          isRoot: false,
          isTrigger: false,
          runData: {
            status: 'Running',
            repetitionCount: 1,
          },
        } as NodeMetadata,
      };

      const action = {
        type: fetchBuiltInToolRunData.fulfilled.type,
        payload: {
          toolNodeId: 'code_interpreter',
          inputsLink: { uri: 'https://example.com/inputs' },
          outputsLink: { uri: 'https://example.com/outputs' },
          inputs: { code: { displayName: 'Code', value: 'print("hi")' } },
          outputs: { result: { displayName: 'Result', value: 'hi' } },
          startTime: '2024-01-01T00:00:00Z',
          endTime: '2024-01-01T00:01:00Z',
          status: 'Succeeded',
          correlation: null,
        },
      };

      const newState = reducer(state, action);

      // Should preserve graphId and other existing metadata
      expect(newState.nodesMetadata.code_interpreter.graphId).toBe('agent-1');
      // But update runData
      expect(newState.nodesMetadata.code_interpreter.runData?.status).toBe('Succeeded');
      expect((newState.nodesMetadata.code_interpreter.runData as any)?.inputs).toEqual({
        code: { displayName: 'Code', value: 'print("hi")' },
      });
    });

    it('should preserve existing inputs/outputs in initializeInputsOutputsBinding.fulfilled when new values are empty', () => {
      const state = { ...initialState };
      const existingInputs = { code: { displayName: 'Code', value: 'print("hi")' } };
      const existingOutputs = { result: { displayName: 'Result', value: 'hi' } };

      state.nodesMetadata = {
        code_interpreter: {
          graphId: 'agent-1',
          isRoot: false,
          isTrigger: false,
          runData: {
            status: 'Succeeded',
            inputs: existingInputs,
            outputs: existingOutputs,
          },
        } as NodeMetadata,
      };

      const action = {
        type: initializeInputsOutputsBinding.fulfilled.type,
        payload: {
          nodeId: 'code_interpreter',
          inputs: {}, // Empty - should not overwrite existing
          outputs: {}, // Empty - should not overwrite existing
        },
      };

      const newState = reducer(state, action);

      // Existing inputs/outputs should be preserved
      expect((newState.nodesMetadata.code_interpreter.runData as any)?.inputs).toEqual(existingInputs);
      expect((newState.nodesMetadata.code_interpreter.runData as any)?.outputs).toEqual(existingOutputs);
    });

    it('should overwrite existing inputs/outputs in initializeInputsOutputsBinding.fulfilled when new values are non-empty', () => {
      const state = { ...initialState };

      state.nodesMetadata = {
        test_node: {
          graphId: 'root',
          isRoot: false,
          isTrigger: false,
          runData: {
            status: 'Succeeded',
            inputs: { old: { displayName: 'Old', value: 'old-value' } },
            outputs: { old: { displayName: 'Old', value: 'old-value' } },
          },
        } as NodeMetadata,
      };

      const newInputs = { new_input: { displayName: 'New Input', value: 'new-value' } };
      const newOutputs = { new_output: { displayName: 'New Output', value: 'new-value' } };

      const action = {
        type: initializeInputsOutputsBinding.fulfilled.type,
        payload: {
          nodeId: 'test_node',
          inputs: newInputs,
          outputs: newOutputs,
        },
      };

      const newState = reducer(state, action);

      // New non-empty inputs/outputs should overwrite existing
      expect((newState.nodesMetadata.test_node.runData as any)?.inputs).toEqual(newInputs);
      expect((newState.nodesMetadata.test_node.runData as any)?.outputs).toEqual(newOutputs);
    });

    it('should write empty inputs/outputs when no existing data exists (regular actions like Response)', () => {
      const state = { ...initialState };

      state.nodesMetadata = {
        Response: {
          graphId: 'root',
          isRoot: false,
          isTrigger: false,
          runData: {
            status: 'Succeeded',
          },
        } as NodeMetadata,
      };

      const action = {
        type: initializeInputsOutputsBinding.fulfilled.type,
        payload: {
          nodeId: 'Response',
          inputs: {},
          outputs: {},
        },
      };

      const newState = reducer(state, action);

      // Empty {} should be written (not left as undefined) so the UI shows "No outputs" instead of a download link
      expect((newState.nodesMetadata.Response.runData as any)?.inputs).toEqual({});
      expect((newState.nodesMetadata.Response.runData as any)?.outputs).toEqual({});
    });
  });
});
