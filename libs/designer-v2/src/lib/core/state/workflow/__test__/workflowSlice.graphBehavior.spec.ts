import { describe, expect, it } from 'vitest';
import { RUN_AFTER_STATUS, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { Deserialize } from '../../../parsers/BJSWorkflow/BJSDeserializer';
import { getWorkflowNodeFromGraphState } from '../workflowGraphTraversal';
import type { WorkflowState } from '../workflowInterfaces';
import reducer, { initialWorkflowState, workflowSlice } from '../workflowSlice';

const actions = workflowSlice.actions;
const fixture = (definition: Pick<LogicAppsV2.WorkflowDefinition, 'actions' | 'triggers'>): WorkflowState => {
  const parsed = Deserialize({ ...initialWorkflowState.originalDefinition, ...definition }, null);
  return { ...initialWorkflowState, graph: parsed.graph, operations: parsed.actionData, nodesMetadata: parsed.nodesMetadata };
};
const linear = (): WorkflowState =>
  fixture({
    triggers: { manual: { type: 'Request', kind: 'Http', inputs: {} } },
    actions: {
      A: { type: 'Compose', inputs: 'first' },
      B: { type: 'Compose', inputs: 'second', runAfter: { A: ['Succeeded'] } },
      C: { type: 'Compose', inputs: 'third', runAfter: { B: ['Succeeded'] } },
    },
  });

describe('workflow graph mutations preserve authoring topology', () => {
  it.each(['Scope', 'If'])('wraps parallel selected actions into %s without serializing their dependency branches', (type) => {
    const state = fixture({
      triggers: { manual: { type: 'Request', kind: 'Http', inputs: {} } },
      actions: {
        A: { type: 'Compose', inputs: 'entry' },
        B: { type: 'Compose', inputs: 'left', runAfter: { A: ['Succeeded'] } },
        C: { type: 'Compose', inputs: 'right', runAfter: { A: ['Succeeded'] } },
        D: { type: 'Compose', inputs: 'merge', runAfter: { B: ['Succeeded'], C: ['Succeeded'] } },
        Tail: { type: 'Compose', inputs: 'outside', runAfter: { D: ['Succeeded'] } },
      },
    });
    const original = JSON.stringify(state);
    const result = reducer(
      state,
      actions.wrapNodesInScope({
        scopeId: 'Wrapped',
        nodeIds: ['A', 'B', 'C', 'D'],
        graphId: 'root',
        operation:
          type === 'If' ? { type: 'If', expression: '@equals(1,1)', actions: {}, else: { actions: {} } } : { type: 'Scope', actions: {} },
      })
    );
    const target = type === 'If' ? 'Wrapped-actions' : 'Wrapped';
    const graph = getWorkflowNodeFromGraphState(result, target);
    expect(graph?.children?.map(({ id }) => id)).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D']));
    expect(graph?.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'A', target: 'B' }),
        expect.objectContaining({ source: 'A', target: 'C' }),
        expect.objectContaining({ source: 'B', target: 'D' }),
        expect.objectContaining({ source: 'C', target: 'D' }),
      ])
    );
    expect(graph?.edges?.some(({ source, target }) => source === 'B' && target === 'C')).toBe(false);
    expect(result.nodesMetadata.D.graphId).toBe(target);
    expect(result.graph?.children?.some(({ id }) => id === 'Tail')).toBe(true);
    expect(result.operations.D).toMatchObject({ runAfter: { B: [RUN_AFTER_STATUS.SUCCEEDED], C: [RUN_AFTER_STATUS.SUCCEEDED] } });
    expect(result.isDirty).toBe(true);
    expect(JSON.stringify(state)).toBe(original);
  });

  it('wraps a terminal multi-parent merge and rejects empty selections without creating a scope', () => {
    const state = fixture({
      actions: {
        A: { type: 'Compose', inputs: 'left' },
        B: { type: 'Compose', inputs: 'right' },
        C: { type: 'Compose', inputs: 'merge', runAfter: { A: ['Succeeded'], B: ['Succeeded'] } },
      },
    });
    const empty = reducer(
      state,
      actions.wrapNodesInScope({
        scopeId: 'Empty',
        nodeIds: [],
        graphId: 'root',
        operation: { type: 'Scope', actions: {} },
      })
    );
    expect(empty.operations.Empty).toBeUndefined();
    const result = reducer(
      state,
      actions.wrapNodesInScope({
        scopeId: 'Wrapped',
        nodeIds: ['A', 'B', 'C'],
        graphId: 'root',
        operation: { type: 'Scope', actions: {} },
      })
    );
    expect(getWorkflowNodeFromGraphState(result, 'Wrapped')?.edges).toEqual(
      expect.arrayContaining([expect.objectContaining({ source: 'A', target: 'C' }), expect.objectContaining({ source: 'B', target: 'C' })])
    );
  });

  it('replaces an operation with its implicit foreach and moves that same operation into the loop', () => {
    const result = reducer(
      linear(),
      actions.addImplicitForeachNode({
        nodeId: 'B',
        foreachNodeId: 'Loop',
        operation: { type: 'Foreach', foreach: '@createArray(1)', actions: {} },
      })
    );
    expect(result.nodesMetadata.B.graphId).toBe('Loop');
    expect(getWorkflowNodeFromGraphState(result, 'Loop')?.children?.map(({ id }) => id)).toContain('B');
    expect(result.graph?.children?.some(({ id }) => id === 'B')).toBe(false);
    expect(result.operations.B).toMatchObject({ type: 'Compose', inputs: 'second' });
    expect(result.operations.Loop).toMatchObject({ type: 'Foreach', foreach: '@createArray(1)' });
  });

  it('replaces a deleted trigger with a placeholder and rewires it when the real trigger is added again', () => {
    const deleted = reducer(linear(), actions.deleteNode({ nodeId: 'manual', isTrigger: true }));
    const placeholder = Object.keys(deleted.nodesMetadata).find((id) => deleted.nodesMetadata[id].isTrigger)!;
    expect(placeholder).not.toBe('manual');
    expect(deleted.graph?.edges).toEqual(expect.arrayContaining([expect.objectContaining({ source: placeholder, target: 'A' })]));
    const restored = reducer(
      deleted,
      actions.addNode({
        nodeId: 'Replacement',
        isTrigger: true,
        operation: {
          id: 'request',
          name: 'Request',
          type: 'Request',
          kind: 'Http',
          properties: {
            api: { id: 'connectionless', displayName: 'Request', iconUri: '' },
            description: 'HTTP request trigger',
            operationType: 'Request',
            operationKind: 'Http',
            summary: 'When an HTTP request is received',
            brandColor: '',
            visibility: 'Important',
            iconUri: '',
          },
        },
        relationshipIds: { graphId: 'root' },
      })
    );
    expect(restored.operations[placeholder]).toBeUndefined();
    expect(restored.nodesMetadata[placeholder]).toBeUndefined();
    expect(restored.graph?.edges).toEqual(expect.arrayContaining([expect.objectContaining({ source: 'Replacement', target: 'A' })]));
  });

  it('pastes an action between existing neighbors without replacing their definitions', () => {
    const result = reducer(
      linear(),
      actions.pasteNode({
        nodeId: 'Pasted',
        relationshipIds: { graphId: 'root', parentId: 'A', childId: 'B' },
        operation: { type: 'Compose', connectorId: 'connectionless', operationId: 'compose' },
      })
    );
    expect(result.nodesMetadata.Pasted.graphId).toBe('root');
    expect(result.graph?.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'A', target: 'Pasted' }),
        expect.objectContaining({ source: 'Pasted', target: 'B' }),
      ])
    );
    expect(result.operations.A).toMatchObject({ inputs: 'first' });
    expect(result.operations.B).toMatchObject({ inputs: 'second' });
  });

  it('adds, updates and removes run-after links in a nested scope without modifying root edges', () => {
    const state = fixture({
      actions: {
        Scope: {
          type: 'Scope',
          actions: {
            A: { type: 'Compose', inputs: 'first' },
            B: { type: 'Compose', inputs: 'second' },
          },
        },
      },
    });
    const linked = reducer(state, actions.addRunAfter({ childOperationId: 'B', parentOperationId: 'A' }));
    expect(getWorkflowNodeFromGraphState(linked, 'Scope')?.edges).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'A-B', source: 'A', target: 'B' })])
    );
    const updated = reducer(linked, actions.updateRunAfter({ childOperation: 'B', parentOperation: 'A', statuses: ['Failed', 'Skipped'] }));
    expect(updated.operations.B).toMatchObject({ runAfter: { A: ['Failed', 'Skipped'] } });
    const removed = reducer(updated, actions.removeRunAfter({ childOperationId: 'B', parentOperationId: 'A' }));
    expect(getWorkflowNodeFromGraphState(removed, 'Scope')?.edges?.some(({ id }) => id === 'A-B')).toBe(false);
    expect(removed.graph?.edges).toEqual(state.graph?.edges);
  });

  it('deduplicates existing dependencies and removes the ordinary workflow trigger sentinel after unlinking', () => {
    const state = linear();
    const linked = reducer(state, actions.addRunAfter({ childOperationId: 'A', parentOperationId: 'C' }));
    expect(linked.operations.A).toMatchObject({ runAfter: { manual: [RUN_AFTER_STATUS.SUCCEEDED], C: [RUN_AFTER_STATUS.SUCCEEDED] } });
    const repeated = reducer(linked, actions.addRunAfter({ childOperationId: 'A', parentOperationId: 'C' }));
    expect(repeated.graph?.edges?.filter(({ id }) => id === 'C-A')).toHaveLength(1);
    const removed = reducer(repeated, actions.removeRunAfter({ childOperationId: 'A', parentOperationId: 'C' }));
    expect(removed.operations.A).toMatchObject({ runAfter: {} });
  });

  it('adds and deletes authored Switch cases and Agent tools through their existing reducer commands', () => {
    let state = fixture({
      actions: {
        Switch: { type: 'Switch', expression: 'value', cases: {}, default: { actions: {} } },
        Agent: { type: 'Agent', inputs: {}, tools: {} },
      },
    });
    state = reducer(state, actions.addSwitchCase({ graphId: 'Switch', caseId: 'NewCase' }));
    expect(state.operations.Switch).toMatchObject({ cases: { NewCase: { actions: {} } } });
    state = reducer(state, actions.deleteSwitchCase({ nodeId: 'Switch', caseId: 'NewCase' }));
    expect(state.operations.Switch).toMatchObject({ cases: {} });
    state = reducer(state, actions.addAgentTool({ graphId: 'Agent', toolId: 'Tool' }));
    expect(state.operations.Agent).toMatchObject({ tools: { Tool: { actions: {} } } });
    state = reducer(state, actions.deleteAgentTool({ agentId: 'Agent', toolId: 'Tool' }));
    expect(state.operations.Agent).toMatchObject({ tools: {} });
  });

  it('collapses and expands nested graph descendants independently from collapsed action branches', () => {
    const state = fixture({
      actions: {
        Outer: {
          type: 'Scope',
          actions: {
            Inner: { type: 'Scope', actions: { A: { type: 'Compose', inputs: 'inside' } } },
          },
        },
      },
    });
    const collapsed = reducer(state, actions.toggleCollapsedGraphId({ id: 'Outer', includeNested: true }));
    expect(collapsed.collapsedGraphIds).toEqual({ Outer: true, Inner: true });
    const expanded = reducer(collapsed, actions.toggleCollapsedGraphId({ id: 'Outer', includeNested: true }));
    expect(expanded.collapsedGraphIds).toEqual({});
    const actionCollapsed = reducer(expanded, actions.toggleCollapsedActionId('A'));
    expect(actionCollapsed.collapsedActionIds).toEqual({ A: true });
    expect(actionCollapsed.focusCollapsedNodeId).toBe('A');
    const actionExpanded = reducer(actionCollapsed, actions.toggleCollapsedActionId('A'));
    expect(actionExpanded.collapsedActionIds).toEqual({});
    expect(reducer(actionExpanded, actions.clearFocusCollapsedNode()).focusCollapsedNodeId).toBeUndefined();
  });
});
