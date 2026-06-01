import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SUBGRAPH_TYPES, WORKFLOW_EDGE_TYPES, WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { updateAgenticSubgraph, type UpdateAgenticGraphPayload } from '../updateAgenticGraph';
import type { WorkflowNode } from '../models/workflowNode';
import type { WorkflowState } from '../../state/workflow/workflowInterfaces';

const mockReassignEdgeSources = vi.fn();
const mockRemoveEdge = vi.fn();

vi.mock('../restructuringHelpers', () => ({
  reassignEdgeSources: (...args: any[]) => mockReassignEdgeSources(...args),
  removeEdge: (...args: any[]) => mockRemoveEdge(...args),
}));

const createMockState = (overrides: Partial<WorkflowState> = {}): WorkflowState =>
  ({
    graph: { id: 'root', children: [], edges: [] },
    operations: {},
    nodesMetadata: {},
    collapsedGraphIds: {},
    edgeIdsBySource: {},
    idReplacements: {},
    isDirty: false,
    runInstance: null,
    agentsGraph: {},
    ...overrides,
  }) as unknown as WorkflowState;

const createMockAgentGraph = (overrides: Partial<WorkflowNode> = {}): WorkflowNode => ({
  id: 'agent1',
  children: [
    { id: 'agent1-#scope', children: [], edges: [], type: WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE },
    {
      id: 'myTool',
      children: [{ id: 'myTool-#subgraph', children: [], edges: [], type: WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE }],
      edges: [],
      type: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE,
    },
  ],
  edges: [{ id: 'agent1-#scope-myTool', source: 'agent1-#scope', target: 'myTool', type: WORKFLOW_EDGE_TYPES.ONLY_EDGE }],
  type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
  ...overrides,
});

describe('updateAgenticSubgraph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw when agentGraph has no id', () => {
    const state = createMockState();
    const agentGraph = { children: [], edges: [] } as unknown as WorkflowNode;
    const payload: UpdateAgenticGraphPayload = { nodeId: 'agent1', scopeRepetitionRunData: {} };

    expect(() => updateAgenticSubgraph(payload, agentGraph, state)).toThrow('Workflow graph is missing an id');
  });

  it('should save original agent graph to state.agentsGraph on first call', () => {
    const agentGraph = createMockAgentGraph();
    const state = createMockState();
    const payload: UpdateAgenticGraphPayload = {
      nodeId: 'agent1',
      scopeRepetitionRunData: { tools: { myTool: {} } },
    };

    updateAgenticSubgraph(payload, agentGraph, state);

    expect(state.agentsGraph['agent1']).toBeDefined();
    expect(state.agentsGraph['agent1'].id).toBe('agent1');
  });

  it('should use saved original graph on subsequent calls', () => {
    const agentGraph = createMockAgentGraph();
    const originalGraph = createMockAgentGraph();
    const state = createMockState({ agentsGraph: { agent1: originalGraph } });
    const payload: UpdateAgenticGraphPayload = {
      nodeId: 'agent1',
      scopeRepetitionRunData: { tools: { myTool: {} } },
    };

    updateAgenticSubgraph(payload, agentGraph, state);

    // agentGraph children should be restored from the original graph
    expect(agentGraph.children).toEqual(originalGraph.children);
  });

  it('should inject built-in tool node (code_interpreter) as new child', () => {
    const agentGraph = createMockAgentGraph();
    const state = createMockState();
    const payload: UpdateAgenticGraphPayload = {
      nodeId: 'agent1',
      scopeRepetitionRunData: { tools: { code_interpreter: {}, myTool: {} } },
    };

    updateAgenticSubgraph(payload, agentGraph, state);

    // code_interpreter should be injected as a child
    const codeInterpreterChild = agentGraph.children?.find((c) => c.id === 'code_interpreter');
    expect(codeInterpreterChild).toBeDefined();
    expect(codeInterpreterChild?.type).toBe(WORKFLOW_NODE_TYPES.SUBGRAPH_NODE);
    expect(codeInterpreterChild?.children?.[0]?.id).toBe('code_interpreter-#subgraph');
  });

  it('should not inject non-built-in tools as new children', () => {
    const agentGraph = createMockAgentGraph({
      children: [{ id: 'agent1-#scope', children: [], edges: [], type: WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE }],
      edges: [],
    });
    const state = createMockState();
    const payload: UpdateAgenticGraphPayload = {
      nodeId: 'agent1',
      scopeRepetitionRunData: { tools: { customTool: {} } },
    };

    updateAgenticSubgraph(payload, agentGraph, state);

    // customTool should NOT be injected (not built-in)
    const customToolChild = agentGraph.children?.find((c) => c.id === 'customTool');
    expect(customToolChild).toBeUndefined();
  });

  it('should not duplicate already-existing built-in tool child nodes', () => {
    const existingCodeInterpreter: WorkflowNode = {
      id: 'code_interpreter',
      children: [{ id: 'code_interpreter-#subgraph', children: [], edges: [], type: WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE }],
      edges: [],
      type: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE,
    };
    const agentGraph = createMockAgentGraph({
      children: [{ id: 'agent1-#scope', children: [], edges: [], type: WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE }, existingCodeInterpreter],
    });
    const state = createMockState();
    const payload: UpdateAgenticGraphPayload = {
      nodeId: 'agent1',
      scopeRepetitionRunData: { tools: { code_interpreter: {} } },
    };

    updateAgenticSubgraph(payload, agentGraph, state);

    const codeInterpreterChildren = agentGraph.children?.filter((c) => c.id === 'code_interpreter');
    expect(codeInterpreterChildren?.length).toBe(1);
  });

  it('should set nodesMetadata with AGENT_CONDITION subgraphType for injected tools', () => {
    const agentGraph = createMockAgentGraph();
    const state = createMockState();
    const payload: UpdateAgenticGraphPayload = {
      nodeId: 'agent1',
      scopeRepetitionRunData: { tools: { code_interpreter: {}, myTool: {} } },
    };

    updateAgenticSubgraph(payload, agentGraph, state);

    expect(state.nodesMetadata['code_interpreter']).toBeDefined();
    expect(state.nodesMetadata['code_interpreter'].subgraphType).toBe(SUBGRAPH_TYPES.AGENT_CONDITION);
    expect(state.nodesMetadata['code_interpreter'].graphId).toBe('agent1');
    expect(state.nodesMetadata['code_interpreter'].parentNodeId).toBe('agent1');
  });

  it('should filter children to only visible tools from scopeRepetitionRunData.tools', () => {
    const agentGraph = createMockAgentGraph({
      children: [
        { id: 'agent1-#scope', children: [], edges: [], type: WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE },
        { id: 'toolA', children: [], edges: [], type: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE },
        { id: 'toolB', children: [], edges: [], type: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE },
      ],
      edges: [
        { id: 'agent1-#scope-toolA', source: 'agent1-#scope', target: 'toolA', type: WORKFLOW_EDGE_TYPES.ONLY_EDGE },
        { id: 'toolA-toolB', source: 'toolA', target: 'toolB', type: WORKFLOW_EDGE_TYPES.ONLY_EDGE },
      ],
    });
    const state = createMockState();
    // Only toolA is visible
    const payload: UpdateAgenticGraphPayload = {
      nodeId: 'agent1',
      scopeRepetitionRunData: { tools: { toolA: {} } },
    };

    updateAgenticSubgraph(payload, agentGraph, state);

    const childIds = agentGraph.children?.map((c) => c.id);
    expect(childIds).toContain('agent1-#scope');
    expect(childIds).toContain('toolA');
    expect(childIds).not.toContain('toolB');
  });

  it('should preserve #scope and -addCase children regardless of visibility', () => {
    const agentGraph = createMockAgentGraph({
      children: [
        { id: 'agent1-#scope', children: [], edges: [], type: WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE },
        { id: 'agent1-addCase', children: [], edges: [], type: WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE },
        { id: 'someTool', children: [], edges: [], type: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE },
      ],
      edges: [],
    });
    const state = createMockState();
    // No tools are visible
    const payload: UpdateAgenticGraphPayload = {
      nodeId: 'agent1',
      scopeRepetitionRunData: { tools: {} },
    };

    updateAgenticSubgraph(payload, agentGraph, state);

    const childIds = agentGraph.children?.map((c) => c.id);
    expect(childIds).toContain('agent1-#scope');
    expect(childIds).toContain('agent1-addCase');
    expect(childIds).not.toContain('someTool');
  });

  it('should call reassignEdgeSources and removeEdge for hidden tools', () => {
    const agentGraph = createMockAgentGraph({
      children: [
        { id: 'agent1-#scope', children: [], edges: [], type: WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE },
        { id: 'hiddenTool', children: [], edges: [], type: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE },
      ],
      edges: [{ id: 'agent1-#scope-hiddenTool', source: 'agent1-#scope', target: 'hiddenTool', type: WORKFLOW_EDGE_TYPES.ONLY_EDGE }],
    });
    const state = createMockState();
    const payload: UpdateAgenticGraphPayload = {
      nodeId: 'agent1',
      scopeRepetitionRunData: { tools: {} },
    };

    updateAgenticSubgraph(payload, agentGraph, state);

    expect(mockReassignEdgeSources).toHaveBeenCalledWith(state, 'hiddenTool', 'agent1-#scope', agentGraph, true);
    expect(mockRemoveEdge).toHaveBeenCalledWith(state, 'agent1-#scope', 'hiddenTool', agentGraph);
  });

  it('should be a no-op when scopeRepetitionRunData is falsy', () => {
    const agentGraph = createMockAgentGraph();
    const originalChildren = [...(agentGraph.children ?? [])];
    const state = createMockState();
    const payload: UpdateAgenticGraphPayload = {
      nodeId: 'agent1',
      scopeRepetitionRunData: undefined as any,
    };

    updateAgenticSubgraph(payload, agentGraph, state);

    // Nothing should have changed
    expect(agentGraph.children).toEqual(originalChildren);
    expect(mockReassignEdgeSources).not.toHaveBeenCalled();
  });
});
