import { Actions } from '../../../state/workflowSlice';
import { WorkflowGraph } from '../../models/workflowNode';

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
      type: 'InitializeVariable',
    },
    Response: {
      inputs: {
        body: "@variables('var1')",
        statusCode: 200,
      },
      kind: 'http',
      runAfter: {
        ActionIf: ['Succeeded'],
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

export const expectedScopedWorkflowDefinitionOutput: { graph: WorkflowGraph; actionData: Actions } = {
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
      { id: 'Response', height: 0, width: 0 },
    ],
    edges: [
      { id: 'manual-Initialize_variable', source: 'manual', target: 'Initialize_variable' },
      { id: 'Initialize_variable-Increment_variable', source: 'Initialize_variable', target: 'Increment_variable' },
      { id: 'Increment_variable-ActionIf', source: 'Increment_variable', target: 'ActionIf' },
      { id: 'ActionIf-Response', source: 'ActionIf', target: 'Response' },
    ],
  },
  actionData: {
    manual: { scope: 'root', inputs: {}, kind: 'Http', type: 'Request' },
    Increment_variable: {
      inputs: { name: 'var1', value: 2 },
      runAfter: { Initialize_variable: ['Succeeded'] },
      type: 'IncrementVariable',
      scope: 'root',
    },
    Initialize_variable: {
      inputs: { variables: [{ name: 'var1', type: 'integer' }] },
      runAfter: {},
      type: 'InitializeVariable',
      scope: 'root',
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
      type: 'InitializeVariable',
      scope: 'root',
    },
    Increment_variable2: { inputs: { name: 'var1', value: 2 }, type: 'IncrementVariable', scope: 'ActionIf-actions' },
    Increment_variable4: {
      inputs: { name: 'var1', value: 2 },
      runAfter: { Increment_variable2: ['Succeeded'] },
      type: 'IncrementVariable',
      scope: 'ActionIf-actions',
    },
    Increment_variable3: { inputs: { name: 'var1', value: 2 }, type: 'IncrementVariable', scope: 'ActionIf-elseActions' },
    Response: {
      inputs: { body: "@variables('var1')", statusCode: 200 },
      kind: 'http',
      runAfter: { ActionIf: ['Succeeded'] },
      type: 'Response',
      scope: 'root',
    },
  },
};
