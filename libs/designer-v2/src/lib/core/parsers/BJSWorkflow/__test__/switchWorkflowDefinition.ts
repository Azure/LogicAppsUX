import type { NodesMetadata, Operations } from '../../../state/workflow/workflowInterfaces';
import { createWorkflowEdge } from '../../../utils/graph';
import type { WorkflowNode } from '../../models/workflowNode';
import { WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';

export const switchWorkflowDefinitionInput = {
  $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
  actions: {
    Switch_1: {
      type: 'Switch',
      expression: "@variables('number')",
      default: {
        actions: {},
      },
      cases: {
        'Case 2': {
          actions: {
            Compose_5: {
              type: 'Compose',
              inputs: 'dasdas',
            },
          },
          case: 1,
        },
        'Case 3': {
          actions: {
            Compose_4: {
              type: 'Compose',
              inputs: 'sdasda',
            },
          },
          case: 2,
        },
      },
      runAfter: {
        Initialize_variable_2: ['SUCCEEDED'],
      },
    },
    Initialize_variable_2: {
      type: 'InitializeVariable',
      inputs: {
        variables: [
          {
            name: 'number',
            type: 'integer',
            value: 1,
          },
        ],
      },
      runAfter: {},
    },
  },
  contentVersion: '1.0.0.0',
  outputs: {},
  triggers: {
    HTTP_TRIGGER: {
      type: 'Request',
      kind: 'Http',
      inputs: {
        schema: {},
      },
    },
  },
};

export const expectedSwitchWorkflowDefinitionOutput: { graph: WorkflowNode; actionData: Operations; nodesMetadata: NodesMetadata } = {
  graph: {
    id: 'root',
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
    children: [
      {
        id: 'HTTP_TRIGGER',
        width: 200,
        height: 40,
        type: 'OPERATION_NODE',
      },
      {
        id: 'Switch_1',
        width: 200,
        height: 40,
        type: 'GRAPH_NODE',
        children: [
          {
            id: 'Switch_1-#scope',
            width: 200,
            height: 40,
            type: 'SCOPE_CARD_NODE',
          },
          {
            id: 'Case 2',
            children: [
              {
                id: 'Case 2-#subgraph',
                width: 200,
                height: 40,
                type: 'SUBGRAPH_CARD_NODE',
              },
              {
                id: 'Compose_5',
                width: 200,
                height: 40,
                type: 'OPERATION_NODE',
              },
            ],
            edges: [
              {
                id: 'Case 2-#subgraph-Compose_5',
                source: 'Case 2-#subgraph',
                target: 'Compose_5',
                type: 'HEADING_EDGE',
              },
            ],
            type: 'SUBGRAPH_NODE',
            subGraphLocation: 'cases',
          },
          {
            id: 'Case 3',
            children: [
              {
                id: 'Case 3-#subgraph',
                width: 200,
                height: 40,
                type: 'SUBGRAPH_CARD_NODE',
              },
              {
                id: 'Compose_4',
                width: 200,
                height: 40,
                type: 'OPERATION_NODE',
              },
            ],
            edges: [
              {
                id: 'Case 3-#subgraph-Compose_4',
                source: 'Case 3-#subgraph',
                target: 'Compose_4',
                type: 'HEADING_EDGE',
              },
            ],
            type: 'SUBGRAPH_NODE',
            subGraphLocation: 'cases',
          },
          {
            id: 'Switch_1-addCase',
            children: [
              {
                id: 'Switch_1-addCase-#subgraph',
                width: 200,
                height: 40,
                type: 'SUBGRAPH_CARD_NODE',
              },
            ],
            edges: [],
            type: 'HIDDEN_NODE',
            subGraphLocation: undefined,
          },
          {
            id: 'Switch_1-defaultCase',
            children: [
              {
                id: 'Switch_1-defaultCase-#subgraph',
                width: 200,
                height: 40,
                type: 'SUBGRAPH_CARD_NODE',
              },
            ],
            edges: [],
            type: 'SUBGRAPH_NODE',
            subGraphLocation: 'default',
          },
        ],
        edges: [
          {
            id: 'Switch_1-#scope-Case 2',
            source: 'Switch_1-#scope',
            target: 'Case 2',
            type: 'ONLY_EDGE',
          },
          {
            id: 'Switch_1-#scope-Case 3',
            source: 'Switch_1-#scope',
            target: 'Case 3',
            type: 'ONLY_EDGE',
          },
          {
            id: 'Switch_1-#scope-Switch_1-addCase',
            source: 'Switch_1-#scope',
            target: 'Switch_1-addCase',
            type: 'HIDDEN_EDGE',
          },
          {
            id: 'Switch_1-#scope-Switch_1-defaultCase',
            source: 'Switch_1-#scope',
            target: 'Switch_1-defaultCase',
            type: 'ONLY_EDGE',
          },
        ],
      },
      {
        id: 'Initialize_variable_2',
        width: 200,
        height: 40,
        type: 'OPERATION_NODE',
      },
    ],
    edges: [createWorkflowEdge('HTTP_TRIGGER', 'Initialize_variable_2'), createWorkflowEdge('Initialize_variable_2', 'Switch_1')],
  },
  actionData: {
    HTTP_TRIGGER: { type: 'Request', kind: 'Http', inputs: { schema: {} } },
    Switch_1: {
      type: 'Switch',
      expression: "@variables('number')",
      default: { actions: {} },
      cases: {
        'Case 2': {
          actions: { Compose_5: { type: 'Compose', inputs: 'dasdas' } },
          case: 1,
        },
        'Case 3': {
          actions: { Compose_4: { type: 'Compose', inputs: 'sdasda' } },
          case: 2,
        },
      },
      runAfter: { Initialize_variable_2: ['SUCCEEDED'] },
    },
    Compose_5: { type: 'Compose', inputs: 'dasdas' },
    Compose_4: { type: 'Compose', inputs: 'sdasda' },
    Initialize_variable_2: {
      type: 'InitializeVariable',
      inputs: { variables: [{ name: 'number', type: 'integer', value: 1 }] },
      runAfter: {},
    },
  },
  nodesMetadata: {
    HTTP_TRIGGER: { graphId: 'root', isRoot: true, isTrigger: true },
    Switch_1: { graphId: 'root', actionCount: 2, parentNodeId: undefined },
    Compose_5: { graphId: 'Case 2', parentNodeId: 'Switch_1', isRoot: true },
    'Case 2': {
      graphId: 'Switch_1',
      parentNodeId: 'Switch_1',
      subgraphType: 'SWITCH_CASE',
      actionCount: 1,
    },
    Compose_4: { graphId: 'Case 3', parentNodeId: 'Switch_1', isRoot: true },
    'Case 3': {
      graphId: 'Switch_1',
      parentNodeId: 'Switch_1',
      subgraphType: 'SWITCH_CASE',
      actionCount: 1,
    },
    'Switch_1-addCase': {
      graphId: 'Switch_1',
      parentNodeId: 'Switch_1',
      subgraphType: 'SWITCH_ADD_CASE',
      actionCount: 0,
    },
    'Switch_1-defaultCase': {
      graphId: 'Switch_1',
      parentNodeId: 'Switch_1',
      subgraphType: 'SWITCH_DEFAULT',
      actionCount: 0,
    },
    Initialize_variable_2: { graphId: 'root' },
  },
};

export const expectedSwitchWorkflowDefinitionOutputWithoutAddCase: {
  graph: WorkflowNode;
  actionData: Operations;
  nodesMetadata: NodesMetadata;
} = {
  graph: {
    id: 'root',
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
    children: [
      {
        id: 'HTTP_TRIGGER',
        width: 200,
        height: 40,
        type: 'OPERATION_NODE',
      },
      {
        id: 'Switch_1',
        width: 200,
        height: 40,
        type: 'GRAPH_NODE',
        children: [
          {
            id: 'Switch_1-#scope',
            width: 200,
            height: 40,
            type: 'SCOPE_CARD_NODE',
          },
          {
            id: 'Case 2',
            children: [
              {
                id: 'Case 2-#subgraph',
                width: 200,
                height: 40,
                type: 'SUBGRAPH_CARD_NODE',
              },
              {
                id: 'Compose_5',
                width: 200,
                height: 40,
                type: 'OPERATION_NODE',
              },
            ],
            edges: [
              {
                id: 'Case 2-#subgraph-Compose_5',
                source: 'Case 2-#subgraph',
                target: 'Compose_5',
                type: 'HEADING_EDGE',
              },
            ],
            type: 'SUBGRAPH_NODE',
            subGraphLocation: 'cases',
          },
          {
            id: 'Case 3',
            children: [
              {
                id: 'Case 3-#subgraph',
                width: 200,
                height: 40,
                type: 'SUBGRAPH_CARD_NODE',
              },
              {
                id: 'Compose_4',
                width: 200,
                height: 40,
                type: 'OPERATION_NODE',
              },
            ],
            edges: [
              {
                id: 'Case 3-#subgraph-Compose_4',
                source: 'Case 3-#subgraph',
                target: 'Compose_4',
                type: 'HEADING_EDGE',
              },
            ],
            type: 'SUBGRAPH_NODE',
            subGraphLocation: 'cases',
          },
          {
            id: 'Switch_1-defaultCase',
            children: [
              {
                id: 'Switch_1-defaultCase-#subgraph',
                width: 200,
                height: 40,
                type: 'SUBGRAPH_CARD_NODE',
              },
            ],
            edges: [],
            type: 'SUBGRAPH_NODE',
            subGraphLocation: 'default',
          },
        ],
        edges: [
          {
            id: 'Switch_1-#scope-Case 2',
            source: 'Switch_1-#scope',
            target: 'Case 2',
            type: 'ONLY_EDGE',
          },
          {
            id: 'Switch_1-#scope-Case 3',
            source: 'Switch_1-#scope',
            target: 'Case 3',
            type: 'ONLY_EDGE',
          },
          {
            id: 'Switch_1-#scope-Switch_1-defaultCase',
            source: 'Switch_1-#scope',
            target: 'Switch_1-defaultCase',
            type: 'ONLY_EDGE',
          },
        ],
      },
      {
        id: 'Initialize_variable_2',
        width: 200,
        height: 40,
        type: 'OPERATION_NODE',
      },
    ],
    edges: [createWorkflowEdge('HTTP_TRIGGER', 'Initialize_variable_2'), createWorkflowEdge('Initialize_variable_2', 'Switch_1')],
  },
  actionData: {
    HTTP_TRIGGER: { type: 'Request', kind: 'Http', inputs: { schema: {} } },
    Switch_1: {
      type: 'Switch',
      expression: "@variables('number')",
      default: { actions: {} },
      cases: {
        'Case 2': {
          actions: { Compose_5: { type: 'Compose', inputs: 'dasdas' } },
          case: 1,
        },
        'Case 3': {
          actions: { Compose_4: { type: 'Compose', inputs: 'sdasda' } },
          case: 2,
        },
      },
      runAfter: { Initialize_variable_2: ['SUCCEEDED'] },
    },
    Compose_5: { type: 'Compose', inputs: 'dasdas' },
    Compose_4: { type: 'Compose', inputs: 'sdasda' },
    Initialize_variable_2: {
      type: 'InitializeVariable',
      inputs: { variables: [{ name: 'number', type: 'integer', value: 1 }] },
      runAfter: {},
    },
  },
  nodesMetadata: {
    HTTP_TRIGGER: { graphId: 'root', isRoot: true, isTrigger: true },
    Switch_1: { graphId: 'root', actionCount: 2, parentNodeId: undefined },
    Compose_5: { graphId: 'Case 2', parentNodeId: 'Switch_1', isRoot: true },
    'Case 2': {
      graphId: 'Switch_1',
      parentNodeId: 'Switch_1',
      subgraphType: 'SWITCH_CASE',
      actionCount: 1,
    },
    Compose_4: { graphId: 'Case 3', parentNodeId: 'Switch_1', isRoot: true },
    'Case 3': {
      graphId: 'Switch_1',
      parentNodeId: 'Switch_1',
      subgraphType: 'SWITCH_CASE',
      actionCount: 1,
    },
    'Switch_1-defaultCase': {
      graphId: 'Switch_1',
      parentNodeId: 'Switch_1',
      subgraphType: 'SWITCH_DEFAULT',
      actionCount: 0,
    },
    Initialize_variable_2: { graphId: 'root' },
  },
};
