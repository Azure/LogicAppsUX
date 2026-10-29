import { configureStore } from '@reduxjs/toolkit';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';
import { SUBGRAPH_TYPES, WORKFLOW_NODE_TYPES, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { Deserialize } from '../../../parsers/BJSWorkflow/BJSDeserializer';
import type { WorkflowEdge } from '../../../parsers/models/workflowNode';
import operationReducer, { initialState as initialOperations } from '../../operation/operationMetadataSlice';
import * as selectors from '../workflowSelectors';
import workflowReducer, { initialWorkflowState } from '../workflowSlice';
import type { WorkflowState } from '../workflowInterfaces';

const flow = vi.hoisted(() => ({ edges: [] as WorkflowEdge[] }));
vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@xyflow/react')>()),
  useEdges: () => flow.edges,
}));

const run: LogicAppsV2.WorkflowRunAction = {
  inputsLink: { contentSize: 1 },
  outputsLink: { contentSize: 2 },
  retryHistory: [],
  startTime: '2026-01-01T00:00:00Z',
  endTime: '2026-01-01T00:00:01Z',
  correlation: { actionTrackingId: 'action', clientTrackingId: 'client' },
  status: 'Succeeded',
  code: 'OK',
};
const fixture = (): WorkflowState => {
  const parsed = Deserialize(
    {
      ...initialWorkflowState.originalDefinition,
      triggers: { manual: { type: 'Request', kind: 'Http', inputs: {} } },
      actions: {
        Loop: {
          type: 'Foreach',
          foreach: '@createArray(1)',
          actions: {
            Condition: {
              type: 'If',
              expression: '@equals(1,1)',
              actions: { Inner: { type: 'Compose', inputs: 'inside' } },
              else: { actions: {} },
            },
          },
        },
        Agent: { type: 'Agent', inputs: {}, tools: {}, runAfter: { Loop: ['Succeeded'] } },
        Detached: { type: 'Compose', inputs: 'detached', runAfter: { Missing: ['Succeeded'] } },
      },
    },
    null
  );
  return { ...initialWorkflowState, graph: parsed.graph, operations: parsed.actionData, nodesMetadata: parsed.nodesMetadata };
};
const setup = (workflow = fixture(), operations = initialOperations) => {
  const store = configureStore({
    reducer: { workflow: workflowReducer, operations: operationReducer },
    preloadedState: { workflow, operations },
  });
  return { wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>, store };
};

describe('workflow selector view models from real parsed graph state', () => {
  it('projects authoring identity, errors, focus and workflow changes without replacing operation IDs', () => {
    const state = fixture();
    state.idReplacements = { Inner: 'Renamed_inner' };
    state.operations.Inner.description = 'authored description';
    state.focusElement = 'parameter';
    state.isDirty = true;
    state.changeCount = 3;
    state.copilotModifiedNodeIds = { Inner: true };
    state.flowErrors = { Inner: ['invalid input'] };
    const { wrapper } = setup(state);
    const { result } = renderHook(
      () => ({
        replacement: selectors.useNodeReplacedId('Inner'),
        replacements: selectors.useReplacedIds(),
        metadata: selectors.useNodeMetadata('Inner'),
        operation: selectors.useActionMetadata('Inner'),
        description: selectors.useNodeDescription('Inner'),
        focus: selectors.useFocusElement(),
        dirty: selectors.useIsWorkflowDirty(),
        count: selectors.useWorkflowChangeCount(),
        modified: selectors.useIsCopilotModifiedNode('Inner'),
        unmodified: selectors.useIsCopilotModifiedNode('Loop'),
        errors: selectors.useFlowErrors(),
        ownErrors: selectors.useFlowErrorsForNode('Inner'),
        missingErrors: selectors.useFlowErrorsForNode('Missing'),
        ids: selectors.useNodeIds(),
        selectable: selectors.useAllSelectableNodeIds(),
        graphId: selectors.useNodeGraphId('Inner'),
        nextId: selectors.useNewAdditiveSubgraphId('Inner'),
        missing: selectors.useWorkflowNode(),
      }),
      { wrapper }
    );
    expect(result.current).toMatchObject({
      replacement: 'Renamed_inner',
      replacements: state.idReplacements,
      metadata: state.nodesMetadata.Inner,
      operation: state.operations.Inner,
      description: 'authored description',
      focus: 'parameter',
      dirty: true,
      count: 3,
      modified: true,
      unmodified: false,
      errors: state.flowErrors,
      ownErrors: ['invalid input'],
      missingErrors: {},
      selectable: Object.keys(state.operations),
      graphId: 'Condition-actions',
      nextId: 'Inner_2',
      missing: undefined,
    });
    expect(result.current.ids).toEqual(Object.keys(state.nodesMetadata));
  });

  it('follows loop/conditional ancestry and excludes structural footer edges from leaf detection', () => {
    const state = fixture();
    flow.edges = [
      { id: 'to-inner', source: 'Loop', target: 'Inner', type: 'BUTTON_EDGE' },
      { id: 'to-footer', source: 'Inner', target: 'Loop-#footer', type: 'BUTTON_EDGE' },
    ];
    const { wrapper } = setup(state);
    const { result } = renderHook(
      () => ({
        parents: selectors.useAllGraphParents('Inner'),
        children: selectors.useGetAllOperationNodesWithin('Loop'),
        absentChildren: selectors.useGetAllOperationNodesWithin('Missing'),
        rootEdges: selectors.useEdgesBySource('manual'),
        missingEdges: selectors.useEdgesBySource(),
        targets: selectors.useNodeEdgeTargets('Loop'),
        innerLeaf: selectors.useIsLeafNode('Inner'),
        loopLeaf: selectors.useIsLeafNode('Loop'),
        innerParent: selectors.useParentNodeId('Inner'),
        noParent: selectors.useParentNodeId(undefined),
      }),
      { wrapper }
    );
    expect(result.current).toMatchObject({
      parents: ['root', 'Loop', 'Condition', 'Condition-actions', 'Inner'],
      children: ['Inner'],
      absentChildren: [],
      missingEdges: [],
      targets: ['Inner'],
      innerLeaf: true,
      loopLeaf: false,
      innerParent: 'Condition',
      noParent: undefined,
    });
    expect(result.current.rootEdges.map(({ target }) => target)).toEqual(['Loop']);
  });

  it('finds reachable root nodes through handoffs while retaining disconnected operations', () => {
    const state = fixture();
    state.nodesMetadata.Agent.handoffs = { Tool: 'SecondAgent' };
    state.nodesMetadata.SecondAgent = { graphId: 'root' };
    state.operations.SecondAgent = { type: 'Agent', inputs: {}, tools: {} };
    state.graph!.children!.push({ id: 'SecondAgent', type: WORKFLOW_NODE_TYPES.GRAPH_NODE, children: [] });
    const { wrapper } = setup(state);
    const { result } = renderHook(
      () => ({
        connected: selectors.useConnectedRootGraphNodeIds(),
        disconnected: selectors.useDisconnectedNodes(),
        detached: selectors.useIsDisconnected('Detached'),
        agent: selectors.useIsDisconnected('SecondAgent'),
        edges: selectors.useHandoffEdges(),
      }),
      { wrapper }
    );
    expect(result.current.connected).toEqual(expect.arrayContaining(['manual', 'Loop', 'Agent', 'SecondAgent']));
    expect(result.current.disconnected).toEqual(['Detached']);
    expect(result.current.detached).toBe(true);
    expect(result.current.agent).toBe(false);
    expect(result.current.edges).toEqual([{ id: 'Agent-SecondAgent', source: 'Agent', target: 'SecondAgent', type: 'HANDOFF_EDGE' }]);
  });

  it('projects collapsed scope headers without mutating the parsed original graph', () => {
    const state = fixture();
    state.collapsedGraphIds = { Loop: true };
    const original = JSON.stringify(state.graph);
    const { wrapper } = setup(state);
    const { result } = renderHook(
      () => ({
        graph: selectors.useRootWorkflowGraphForLayout(),
        collapsed: selectors.useIsGraphCollapsed('Loop'),
        action: selectors.useIsActionCollapsed('Inner'),
        expanded: selectors.useIsEverythingExpanded(),
        mapping: selectors.useCollapsedMapping(),
      }),
      { wrapper }
    );
    expect(result.current.graph?.children?.find(({ id }) => id === 'Loop')?.children?.map(({ id }) => id)).toEqual(['Loop-#scope']);
    expect(result.current).toMatchObject({ collapsed: true, action: false, expanded: false, mapping: {} });
    expect(JSON.stringify(state.graph)).toBe(original);
  });

  it('selects monitoring data and the nearest loop repetition without confusing tool repetitions', () => {
    const state = fixture();
    state.timelineRepetitionIndex = 1;
    state.timelineRepetitionArray = [['Inner'], ['Inner', 'Loop', 'Inner']];
    state.nodesMetadata.Loop.runIndex = 2;
    state.nodesMetadata.Inner = {
      ...state.nodesMetadata.Inner,
      runIndex: 4,
      toolRunIndex: 5,
      runData: run,
      toolRunData: run,
      subgraphRunData: { iteration: { actionResults: [run] } },
    };
    const { wrapper } = setup(state);
    const { result } = renderHook(
      () => ({
        timeline: selectors.useTimelineRepetitionIndex(),
        repetitions: selectors.useTimelineRepetitionArray(),
        count: selectors.useActionTimelineRepetitionCount('Inner', 3),
        selected: selectors.useIsActionInSelectedTimelineRepetition('Missing'),
        parentIndexes: selectors.useParentRunIndexes('Inner'),
        parentIndex: selectors.useParentRunIndex('Inner'),
        runIndex: selectors.useRunIndex('Inner'),
        toolIndex: selectors.useToolRunIndex('Inner'),
        run: selectors.useRunData('Inner'),
        tool: selectors.useToolRunData('Inner'),
        subgraph: selectors.useSubgraphRunData('Inner'),
        retry: selectors.useRetryHistory('Inner'),
        noParent: selectors.useParentRunIndexes(undefined),
        noIndex: selectors.useParentRunIndex(undefined),
        noRun: selectors.useRunIndex(undefined),
        noTool: selectors.useToolRunIndex(undefined),
        nodes: selectors.useNodesMetadata(),
        instance: selectors.useRunInstance(),
        mode: selectors.useRunMode(),
        unsupported: selectors.useHasUnsupportedMultipleTriggers(),
      }),
      { wrapper }
    );
    expect(result.current).toEqual({
      timeline: 1,
      repetitions: state.timelineRepetitionArray,
      count: 3,
      selected: true,
      parentIndexes: { Loop: 2 },
      parentIndex: 2,
      runIndex: 4,
      toolIndex: 5,
      run,
      tool: run,
      subgraph: { iteration: { actionResults: [run] } },
      retry: [],
      noParent: {},
      noIndex: undefined,
      noRun: undefined,
      noTool: undefined,
      nodes: state.nodesMetadata,
      instance: null,
      mode: null,
      unsupported: false,
    });
  });

  it('recognizes Agent ancestry, upstream Agents and selected agent timeline actions', () => {
    const state = fixture();
    state.workflowKind = 'agent';
    state.nodesMetadata.Inner.parentNodeId = 'Agent';
    state.nodesMetadata.Tool = { graphId: 'Agent', parentNodeId: 'Agent', subgraphType: SUBGRAPH_TYPES.AGENT_CONDITION };
    state.timelineRepetitionArray = [['Agent']];
    const { wrapper } = setup(state);
    const { result } = renderHook(
      () => ({
        agents: selectors.useAgentOperations(),
        all: selectors.useAllAgentIds(),
        loop: selectors.useIsAgentLoop('Agent'),
        nonAgent: selectors.useIsAgentLoop('Inner'),
        absent: selectors.useIsAgentLoop(),
        within: selectors.useIsWithinAgenticLoop('Inner'),
        outside: selectors.useIsWithinAgenticLoop('manual'),
        noId: selectors.useIsWithinAgenticLoop(),
        upstream: selectors.useHasUpstreamAgenticLoop(['Loop', 'Agent']),
        noUpstream: selectors.useHasUpstreamAgenticLoop(['Loop']),
        selected: selectors.useIsActionInSelectedTimelineRepetition('Agent'),
        unselected: selectors.useIsActionInSelectedTimelineRepetition('Inner'),
        parent: selectors.useGetSwitchOrAgentParentId('Tool'),
        otherParent: selectors.useGetSwitchOrAgentParentId('manual'),
        chat: selectors.useUriForAgentChat('Agent'),
        absentChat: selectors.useUriForAgentChat(),
        last: selectors.useAgentLastOperations(['Agent', 'Missing']),
      }),
      { wrapper }
    );
    expect(result.current).toEqual({
      agents: ['Agent'],
      all: ['Agent'],
      loop: true,
      nonAgent: false,
      absent: false,
      within: true,
      outside: false,
      noId: false,
      upstream: true,
      noUpstream: false,
      selected: true,
      unselected: false,
      parent: { parentId: 'Agent', type: SUBGRAPH_TYPES.AGENT_CONDITION },
      otherParent: undefined,
      chat: undefined,
      absentChat: undefined,
      last: {},
    });
    expect(selectors.getAgentFromCondition(state, 'Tool')).toBe('Agent');
    expect(selectors.getAgentFromCondition(state, 'manual')).toBeUndefined();
  });
});
