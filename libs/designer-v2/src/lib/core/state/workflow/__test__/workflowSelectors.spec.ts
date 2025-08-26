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
      'node-1': true,
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

  describe('getParentsUncollapseFromGraphState', () => {
    it('Should return node-1 as true since node-2 is not children from node-1', () => {
      const collapsedGraphIdsParent = getParentsUncollapseFromGraphState(operationInfo, 'node-2');
      expect(collapsedGraphIdsParent).toEqual({
        'node-1': true,
      });
    });

    it('Should return node-2 as false since node-3 is children from node-2', () => {
      operationInfo.collapsedGraphIds['node-2'] = true;
      const collapsedGraphIdsParent = getParentsUncollapseFromGraphState(operationInfo, 'node-3');
      expect(collapsedGraphIdsParent).toEqual({
        'node-1': true,
        'node-2': false,
      });
    });

    it('Should return node-2 and node-4 as false since node-5 is children from both', () => {
      operationInfo.collapsedGraphIds['node-2'] = true;
      operationInfo.collapsedGraphIds['node-4'] = true;
      const collapsedGraphIdsParent = getParentsUncollapseFromGraphState(operationInfo, 'node-5');
      expect(collapsedGraphIdsParent).toEqual({
        'node-1': true,
        'node-2': false,
        'node-4': false,
      });
    });
  });
});
