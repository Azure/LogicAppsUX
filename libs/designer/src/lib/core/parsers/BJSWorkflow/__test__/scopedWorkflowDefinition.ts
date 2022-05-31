import type { Operations, NodesMetadata } from '../../../state/workflowSlice';
import type { WorkflowGraph } from '../../models/workflowNode';

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

export const expectedScopedWorkflowDefinitionOutput: { graph: WorkflowGraph; actionData: Operations; nodesMetadata: NodesMetadata } = {
  graph: {
    id: 'root',
    children: [
      { id: 'manual', height: 0, width: 0 },
      { id: 'Increment_variable', height: 0, width: 0 },
      { id: 'Initialize_variable', height: 0, width: 0 },
      {
        id: 'ActionIf',
        height: 0,
        width: 0,
        children: [
          {
            id: 'ActionIf-actions',
            children: [
              { id: 'Increment_variable2', height: 0, width: 0 },
              { id: 'Increment_variable4', height: 0, width: 0 },
            ],
            edges: [{ id: 'Increment_variable2-Increment_variable4', source: 'Increment_variable2', target: 'Increment_variable4' }],
          },
          { id: 'ActionIf-elseActions', children: [{ id: 'Increment_variable3', height: 0, width: 0 }], edges: [] },
        ],
      },
      {
        id: 'EmptyScope',
        height: 0,
        width: 0,
        children: [
          {
            id: 'EmptyScope-actions',
            children: [{ id: 'EmptyScope-actions-emptyNode', height: 0, width: 0 }],
            edges: [],
          },
        ],
      },
      { id: 'Response', height: 0, width: 0 },
    ],
    edges: [
      { id: 'manual-Initialize_variable', source: 'manual', target: 'Initialize_variable' },
      { id: 'Initialize_variable-Increment_variable', source: 'Initialize_variable', target: 'Increment_variable' },
      { id: 'Increment_variable-ActionIf', source: 'Increment_variable', target: 'ActionIf' },
      { id: 'ActionIf-EmptyScope', source: 'ActionIf', target: 'EmptyScope' },
      { id: 'EmptyScope-Response', source: 'EmptyScope', target: 'Response' },
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
    Increment_variable2: { graphId: 'ActionIf-actions' },
    Increment_variable4: { graphId: 'ActionIf-actions' },
    Increment_variable3: { graphId: 'ActionIf-elseActions' },
    EmptyScope: { graphId: 'root' },
    'EmptyScope-actions-emptyNode': { graphId: 'EmptyScope-actions', isPlaceholderNode: true },
    Response: { graphId: 'root' },
  },
};
