import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import { WorkflowState } from '../workflowInterfaces';
import { getParentsUncollapseFromGraphState } from '../workflowSelectors';

describe('workflowSelectors', () => {
  const operationInfo: WorkflowState = {
    workflowSpec: 'BJS',
    workflowKind: undefined,
    graph: {
      id: 'node-root',
      type: 'GRAPH_NODE',
      children: [
        {
          id: 'node-1',
          type: 'GRAPH_NODE',
          edges: [],
        },
        {
          id: 'node-2',
          type: 'GRAPH_NODE',
          edges: [],
          children: [
            {
              id: 'node-3',
              type: 'GRAPH_NODE',
              edges: [],
            },
            {
              id: 'node-4',
              type: 'OPERATION_NODE',
              edges: [],
              children: [
                {
                  id: 'node-5',
                  type: 'GRAPH_NODE',
                  edges: [],
                },
              ],
            },
          ],
        },
      ],
    },
    runInstance: null,
    operations: {},
    nodesMetadata: {},
    collapsedGraphIds: {
      'node-1': false,
    },
    edgeIdsBySource: {},
    idReplacements: {},
    newlyAddedOperations: {},
    isDirty: false,
    originalDefinition: {
      $schema: '',
      contentVersion: '1.0.0.0',
    },
    hostData: {
      errorMessages: {},
    },
  };

  it('getParentsUncollapseFromGraphState', () => {
    const collapsedGraphIdsWoParent = getParentsUncollapseFromGraphState(operationInfo, 'node-2');
    expect(collapsedGraphIdsWoParent).toEqual({
      'node-1': false,
      'node-root': false,
    });
    const collapsedGraphIdsWithParent = getParentsUncollapseFromGraphState(operationInfo, 'node-3');
    expect(collapsedGraphIdsWithParent).toEqual({
      'node-2': false,
      'node-1': false,
      'node-root': false,
    });

    const collapsedGraphIdsWithParent2 = getParentsUncollapseFromGraphState(operationInfo, 'node-5');
    expect(collapsedGraphIdsWithParent2).toEqual({
      'node-1': false,
      'node-2': false,
      'node-4': false,
      'node-root': false,
    });
  });
});
