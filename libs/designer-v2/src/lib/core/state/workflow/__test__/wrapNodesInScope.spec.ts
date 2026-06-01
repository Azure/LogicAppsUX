import { describe, test, expect, beforeEach } from 'vitest';
import { workflowSlice } from '../workflowSlice';
import type { WorkflowState } from '../workflowInterfaces';
import type { WorkflowNode, WorkflowEdge } from '../../../parsers/models/workflowNode';
import { Deserialize } from '../../../parsers/BJSWorkflow/BJSDeserializer';
import { simpleWorkflowDefinitionInput } from '../../../parsers/BJSWorkflow/__test__/simpleWorkflowDefinition';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';

const findNode = (node: WorkflowNode, id: string): WorkflowNode | undefined => {
  if (node.id === id) {
    return node;
  }
  for (const child of node.children ?? []) {
    const found = findNode(child, id);
    if (found) {
      return found;
    }
  }
  return undefined;
};

const edgeStrings = (node: WorkflowNode | undefined): string[] =>
  (node?.edges ?? []).map((edge: WorkflowEdge) => `${edge.source}->${edge.target}`);

const buildState = (): WorkflowState => {
  const { graph, actionData, nodesMetadata } = Deserialize(simpleWorkflowDefinitionInput as LogicAppsV2.WorkflowDefinition, null);
  return {
    graph,
    operations: actionData,
    nodesMetadata,
    collapsedGraphIds: {},
    collapsedActionIds: {},
    idReplacements: {},
    newlyAddedOperations: {},
    runInstance: null,
    isDirty: false,
    workflowKind: undefined,
    originalDefinition: {} as LogicAppsV2.WorkflowDefinition,
    hostData: { errorMessages: {} },
    agentsGraph: {},
    timelineRepetitionIndex: 0,
    changeCount: 0,
    timelineRepetitionArray: [],
    flowErrors: {},
  } as unknown as WorkflowState;
};

describe('workflowSlice - wrapNodesInScope', () => {
  let state: WorkflowState;
  const chain = ['Initialize_variable', 'Increment_variable', 'Response'];

  beforeEach(() => {
    state = buildState();
  });

  test('wraps the selected chain inside a conditional true branch', () => {
    const next = workflowSlice.reducer(
      state,
      workflowSlice.actions.wrapNodesInScope({
        scopeId: 'Condition',
        nodeIds: chain,
        graphId: 'root',
        operation: { type: 'If' },
      })
    );

    const actions = findNode(next.graph as WorkflowNode, 'Condition-actions');
    const elseActions = findNode(next.graph as WorkflowNode, 'Condition-elseActions');

    // All selected nodes moved into the true branch.
    const actionChildIds = (actions?.children ?? []).map((c) => c.id);
    for (const id of chain) {
      expect(actionChildIds).toContain(id);
      expect(next.nodesMetadata[id].graphId).toBe('Condition-actions');
    }

    // The else branch only contains its header.
    const elseChildIds = (elseActions?.children ?? []).map((c) => c.id);
    expect(elseChildIds).toEqual(['Condition-elseActions-#subgraph']);
  });

  test('connects the subgraph header to the first node so it lays out inside the branch', () => {
    const next = workflowSlice.reducer(
      state,
      workflowSlice.actions.wrapNodesInScope({
        scopeId: 'Condition',
        nodeIds: chain,
        graphId: 'root',
        operation: { type: 'If' },
      })
    );

    const actions = findNode(next.graph as WorkflowNode, 'Condition-actions');
    const edges = edgeStrings(actions);

    // The fix: header -> first node edge keeps the chain inside the true branch
    // instead of beside the true/false labels.
    expect(edges).toContain('Condition-actions-#subgraph->Initialize_variable');
    expect(edges).toContain('Initialize_variable->Increment_variable');
    expect(edges).toContain('Increment_variable->Response');

    // First node becomes a root of the branch with no lingering runAfter.
    expect(next.nodesMetadata['Initialize_variable'].isRoot).toBe(true);
    expect((next.operations['Initialize_variable'] as LogicAppsV2.ActionDefinition)?.runAfter ?? {}).toEqual({});

    // The new scope is wired into the root flow where the chain used to be.
    const rootEdges = edgeStrings(next.graph as WorkflowNode);
    expect(rootEdges).toContain('manual->Condition');
  });

  test('wraps the selected chain inside a plain scope below the scope header', () => {
    const next = workflowSlice.reducer(
      state,
      workflowSlice.actions.wrapNodesInScope({
        scopeId: 'Scope',
        nodeIds: chain,
        graphId: 'root',
        operation: { type: 'Scope' },
      })
    );

    const scope = findNode(next.graph as WorkflowNode, 'Scope');
    const scopeChildIds = (scope?.children ?? []).map((c) => c.id);
    for (const id of chain) {
      expect(scopeChildIds).toContain(id);
    }

    const edges = edgeStrings(scope);
    expect(edges).toContain('Scope-#scope->Initialize_variable');
    expect(edges).toContain('Initialize_variable->Increment_variable');
    expect(edges).toContain('Increment_variable->Response');
  });
});
