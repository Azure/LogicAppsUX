import { createWorkflowNode } from '../../utils/graph';
import { addAgentToolToWorkflow, addNodeToWorkflow, addSwitchCaseToWorkflow } from '../addNodeToWorkflow';
import type { WorkflowNode } from '../models/workflowNode';
import { initialState, mockGraph } from './mocks/workflowMock';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('edit workflow', () => {
  let graph: WorkflowNode;

  const nodeToAdd = createWorkflowNode('post_in_teams');

  beforeEach(() => {
    graph = mockGraph;
  });

  // The null coalescing operators are just to avoid linting errors, all the nodes exist in the mock

  it('adds middle workflow node', () => {
    const parentId = graph?.children?.[0].id ?? '';
    const childId = graph?.children?.[1].id ?? '';

    addNodeToWorkflow(
      {
        operation: {
          type: nodeToAdd.type,
        } as any,
        nodeId: nodeToAdd.id,
        relationshipIds: {
          graphId: graph.id,
          parentId: parentId,
          childId: childId,
        },
      },
      graph,
      {} as any,
      initialState
    );

    expect(graph?.edges?.find((edge) => edge.source === parentId && edge.target === nodeToAdd.id)).toBeDefined();
    expect(graph?.edges?.find((edge) => edge.source === nodeToAdd.id && edge.target === childId)).toBeDefined();
    // edge from parent to original child should be undefined
    expect(graph?.edges?.find((edge) => edge.source === parentId && edge.target === childId)).toBeUndefined();
  });

  it('adds workflow edge to insert node as last', () => {
    const parentId = graph?.children?.[3].id ?? '';

    addNodeToWorkflow(
      {
        operation: {
          type: nodeToAdd.type,
        } as any,
        nodeId: nodeToAdd.id,
        relationshipIds: {
          graphId: graph.id,
          parentId: parentId,
          childId: undefined,
        },
      },
      graph,
      {} as any,
      initialState
    );

    expect(graph?.edges?.find((edge) => edge.source === parentId && edge.target === nodeToAdd.id)).toBeDefined();
  });

  it.each([
    [
      'If',
      [
        ['If-actions-#subgraph', 120, 32],
        ['If-elseActions-#subgraph', 120, 32],
      ],
    ],
    [
      'Switch',
      [
        ['Switch-addCase-#subgraph', 20, 44],
        ['Switch-defaultCase-#subgraph', 120, 32],
      ],
    ],
    ['Agent', [['Agent-addCase-#subgraph', 20, 44]]],
    ['Until', [['Until-#subgraph', 120, 32]]],
  ] as const)('sizes newly added %s headers for their rendered variants', (type, expected) => {
    const root: WorkflowNode = { id: 'root', type: 'GRAPH_NODE', children: [], edges: [] };
    const state = structuredClone(initialState);
    state.operations = {};
    state.newlyAddedOperations = {};
    const metadata = {};
    addNodeToWorkflow(
      {
        operation: {
          id: type,
          name: type,
          type,
          properties: {
            api: { id: type, displayName: type, iconUri: '' },
            operationType: type,
            summary: '',
            description: '',
            brandColor: '',
            visibility: '',
            iconUri: '',
          },
        },
        nodeId: type,
        relationshipIds: { graphId: 'root' },
      },
      root,
      metadata,
      state
    );
    const added = root.children!.find((child) => child.id === type)!;
    const headings = [...(added.children ?? []), ...(added.children ?? []).flatMap((child) => child.children ?? [])];
    for (const [id, width, height] of expected) {
      expect(headings.find((heading) => heading.id === id)).toMatchObject({ width, height });
    }

    if (type === 'Switch') {
      addSwitchCaseToWorkflow('new-case', added, metadata, state);
      expect(added.children!.find((child) => child.id === 'new-case')!.children![0]).toMatchObject({ width: 200, height: 44 });
    }
    if (type === 'Agent') {
      addAgentToolToWorkflow('new-tool', added, metadata, state);
      expect(added.children!.find((child) => child.id === 'new-tool')!.children![0]).toMatchObject({ width: 200, height: 44 });
    }
  });
});
