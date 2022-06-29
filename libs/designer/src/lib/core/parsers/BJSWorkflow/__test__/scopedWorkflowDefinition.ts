import type { Operations, NodesMetadata } from '../../../state/workflowSlice';
import { createWorkflowNode, createWorkflowEdge } from '../../../utils/graph';
import type { WorkflowNode } from '../../models/workflowNode';
import { WORKFLOW_EDGE_TYPES, WORKFLOW_NODE_TYPES } from '../../models/workflowNode';
import { SUBGRAPH_TYPES } from '@microsoft-logic-apps/utils';

export const scopedWorkflowDefinitionInput = {
  $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
  actions: {
    Increment_variable: {
      inputs: {
        name: 'var1',
        value: 2,
      },
      runAfter: {
        Initialize_variable: ['Succeeded'],
      },
      type: 'IncrementVariable',
    },
    Initialize_variable: {
      inputs: {
        variables: [
          {
            name: 'var1',
            type: 'integer',
          },
        ],
      },
      runAfter: {},
      type: 'InitializeVariable',
    },
    ActionIf: {
      actions: {
        Increment_variable2: {
          inputs: {
            name: 'var1',
            value: 2,
          },
          type: 'IncrementVariable',
        },
        Increment_variable4: {
          inputs: {
            name: 'var1',
            value: 2,
          },
          runAfter: {
            Increment_variable2: ['Succeeded'],
          },
          type: 'IncrementVariable',
        },
      },
      else: {
        actions: {
          Increment_variable3: {
            inputs: {
              name: 'var1',
              value: 2,
            },
            type: 'IncrementVariable',
          },
        },
      },

      runAfter: {
        Increment_variable: ['Succeeded'],
      },
      type: 'If',
    },
    EmptyScope: {
      runAfter: {
        ActionIf: ['Succeeded'],
      },
      type: 'Scope',
    },
    Response: {
      inputs: {
        body: "@variables('var1')",
        statusCode: 200,
      },
      kind: 'http',
      runAfter: {
        EmptyScope: ['Succeeded'],
      },
      type: 'Response',
    },
  },
  contentVersion: '1.0.0.0',
  outputs: {},
  triggers: {
    manual: {
      inputs: {},
      kind: 'Http',
      type: 'Request',
    },
  },
};

export const expectedScopedWorkflowDefinitionOutput: { graph: WorkflowNode; actionData: Operations; nodesMetadata: NodesMetadata } = {
  graph: {
    id: 'root',
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
    children: [
      createWorkflowNode('manual'),
      createWorkflowNode('Increment_variable'),
      createWorkflowNode('Initialize_variable'),
      {
        id: 'ActionIf',
        type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
        height: 40,
        width: 200,
        children: [
          createWorkflowNode('ActionIf-#scopeHeader', WORKFLOW_NODE_TYPES.SCOPE_HEADER),
          {
            id: 'ActionIf-actions',
            type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
            children: [
              createWorkflowNode('ActionIf-actions-#subgraphHeader', WORKFLOW_NODE_TYPES.SUBGRAPH_HEADER),
              createWorkflowNode('Increment_variable2'),
              createWorkflowNode('Increment_variable4'),
            ],
            edges: [
              createWorkflowEdge('Increment_variable2', 'Increment_variable4'),
              createWorkflowEdge('ActionIf-actions-#subgraphHeader', 'Increment_variable2'),
            ],
          },
          {
            id: 'ActionIf-elseActions',
            type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
            children: [
              createWorkflowNode('ActionIf-elseActions-#subgraphHeader', WORKFLOW_NODE_TYPES.SUBGRAPH_HEADER),
              createWorkflowNode('Increment_variable3'),
            ],
            edges: [createWorkflowEdge('ActionIf-elseActions-#subgraphHeader', 'Increment_variable3')],
          },
        ],
        edges: [
          createWorkflowEdge('ActionIf-#scopeHeader', 'ActionIf-actions-#subgraphHeader', WORKFLOW_EDGE_TYPES.ONLY_EDGE),
          createWorkflowEdge('ActionIf-#scopeHeader', 'ActionIf-elseActions-#subgraphHeader', WORKFLOW_EDGE_TYPES.ONLY_EDGE),
        ],
      },
      {
        id: 'EmptyScope',
        type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
        height: 40,
        width: 200,
        children: [createWorkflowNode('EmptyScope-#scopeHeader', WORKFLOW_NODE_TYPES.SCOPE_HEADER)],
        edges: [],
      },
      createWorkflowNode('Response'),
    ],
    edges: [
      createWorkflowEdge('manual', 'Initialize_variable'),
      createWorkflowEdge('Initialize_variable', 'Increment_variable'),
      createWorkflowEdge('Increment_variable', 'ActionIf'),
      createWorkflowEdge('ActionIf', 'EmptyScope'),
      createWorkflowEdge('EmptyScope', 'Response'),
    ],
  },
  actionData: {
    manual: { inputs: {}, kind: 'Http', type: 'Request' },
    Increment_variable: {
      inputs: { name: 'var1', value: 2 },
      runAfter: { Initialize_variable: ['Succeeded'] },
      type: 'IncrementVariable',
    },
    Initialize_variable: {
      inputs: { variables: [{ name: 'var1', type: 'integer' }] },
      runAfter: {},
      type: 'InitializeVariable',
    },
    ActionIf: {
      actions: {
        Increment_variable2: { inputs: { name: 'var1', value: 2 }, type: 'IncrementVariable' },
        Increment_variable4: {
          inputs: { name: 'var1', value: 2 },
          runAfter: { Increment_variable2: ['Succeeded'] },
          type: 'IncrementVariable',
        },
      },
      else: { actions: { Increment_variable3: { inputs: { name: 'var1', value: 2 }, type: 'IncrementVariable' } } },
      runAfter: { Increment_variable: ['Succeeded'] },
      type: 'If',
    },
    Increment_variable2: { inputs: { name: 'var1', value: 2 }, type: 'IncrementVariable' },
    Increment_variable4: {
      inputs: { name: 'var1', value: 2 },
      runAfter: { Increment_variable2: ['Succeeded'] },
      type: 'IncrementVariable',
    },
    Increment_variable3: { inputs: { name: 'var1', value: 2 }, type: 'IncrementVariable' },
    EmptyScope: {
      runAfter: { ActionIf: ['Succeeded'] },
      type: 'Scope',
    },
    Response: {
      inputs: { body: "@variables('var1')", statusCode: 200 },
      kind: 'http',
      runAfter: { EmptyScope: ['Succeeded'] },
      type: 'Response',
    },
  },
  nodesMetadata: {
    manual: { graphId: 'root' },
    Increment_variable: { graphId: 'root' },
    Initialize_variable: { graphId: 'root' },
    ActionIf: { graphId: 'root' },
    'ActionIf-actions': { graphId: 'ActionIf-actions', subgraphType: SUBGRAPH_TYPES.CONDITIONAL_TRUE },
    'ActionIf-elseActions': { graphId: 'ActionIf-elseActions', subgraphType: SUBGRAPH_TYPES.CONDITIONAL_FALSE },
    Increment_variable2: { graphId: 'ActionIf-actions' },
    Increment_variable4: { graphId: 'ActionIf-actions' },
    Increment_variable3: { graphId: 'ActionIf-elseActions' },
    EmptyScope: { graphId: 'root' },
    Response: { graphId: 'root' },
  },
};
