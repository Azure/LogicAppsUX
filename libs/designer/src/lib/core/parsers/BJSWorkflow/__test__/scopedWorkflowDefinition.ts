import type { NodesMetadata, Operations } from '../../../state/workflow/workflowInterfaces';
import { createWorkflowNode, createWorkflowEdge } from '../../../utils/graph';
import type { WorkflowNode } from '../../models/workflowNode';
import { SUBGRAPH_TYPES, WORKFLOW_NODE_TYPES, WORKFLOW_EDGE_TYPES } from '@microsoft-logic-apps/utils';

export const scopedWorkflowDefinitionInput = {
  $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
  actions: {
    Initialize_variable: {
      inputs: {
        variables: [
          {
            name: 'var1',
            type: 'integer',
          },
        ],
      },
      runAfter: {
        manual: ['Succeeded'],
      },
      type: 'InitializeVariable',
    },
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
      createWorkflowNode('Initialize_variable'),
      createWorkflowNode('Increment_variable'),
      {
        id: 'ActionIf',
        type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
        height: 40,
        width: 200,
        children: [
          createWorkflowNode('ActionIf-#scope', WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE),
          {
            id: 'ActionIf-actions',
            type: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE,
            subGraphLocation: 'actions',
            children: [
              createWorkflowNode('ActionIf-actions-#subgraph', WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE),
              createWorkflowNode('Increment_variable2'),
              createWorkflowNode('Increment_variable4'),
            ],
            edges: [
              createWorkflowEdge('Increment_variable2', 'Increment_variable4'),
              createWorkflowEdge('ActionIf-actions-#subgraph', 'Increment_variable2', WORKFLOW_EDGE_TYPES.HEADING_EDGE),
            ],
          },
          {
            id: 'ActionIf-elseActions',
            type: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE,
            subGraphLocation: 'else',
            children: [
              createWorkflowNode('ActionIf-elseActions-#subgraph', WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE),
              createWorkflowNode('Increment_variable3'),
            ],
            edges: [createWorkflowEdge('ActionIf-elseActions-#subgraph', 'Increment_variable3', WORKFLOW_EDGE_TYPES.HEADING_EDGE)],
          },
        ],
        edges: [
          createWorkflowEdge('ActionIf-#scope', 'ActionIf-actions-#subgraph', WORKFLOW_EDGE_TYPES.ONLY_EDGE),
          createWorkflowEdge('ActionIf-#scope', 'ActionIf-elseActions-#subgraph', WORKFLOW_EDGE_TYPES.ONLY_EDGE),
        ],
      },
      {
        id: 'EmptyScope',
        type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
        height: 40,
        width: 200,
        children: [createWorkflowNode('EmptyScope-#scope', WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE)],
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
    Initialize_variable: {
      inputs: { variables: [{ name: 'var1', type: 'integer' }] },
      runAfter: { manual: ['Succeeded'] },
      type: 'InitializeVariable',
    },
    Increment_variable: {
      inputs: { name: 'var1', value: 2 },
      runAfter: { Initialize_variable: ['Succeeded'] },
      type: 'IncrementVariable',
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
    manual: { graphId: 'root', isRoot: true },
    Initialize_variable: { graphId: 'root' },
    Increment_variable: { graphId: 'root' },
    ActionIf: { graphId: 'root', actionCount: 2 },
    'ActionIf-actions': {
      graphId: 'ActionIf',
      actionCount: 2,
      subgraphType: SUBGRAPH_TYPES.CONDITIONAL_TRUE,
    },
    'ActionIf-elseActions': {
      graphId: 'ActionIf',
      actionCount: 1,
      subgraphType: SUBGRAPH_TYPES.CONDITIONAL_FALSE,
    },
    Increment_variable2: { graphId: 'ActionIf-actions', parentNodeId: 'ActionIf', isRoot: true },
    Increment_variable4: { graphId: 'ActionIf-actions', parentNodeId: 'ActionIf' },
    Increment_variable3: { graphId: 'ActionIf-elseActions', parentNodeId: 'ActionIf', isRoot: true },
    EmptyScope: { graphId: 'root', actionCount: 0 },
    Response: { graphId: 'root' },
  },
};
