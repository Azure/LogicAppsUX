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

export const expectedScopedWorkflowDefinitionOutput: WorkflowGraph = {
  id: 'root',
  children: [
    { id: 'manual', type: 'Request', operation: { inputs: {}, kind: 'Http', type: 'Request' }, height: 0, width: 0 },
    {
      id: 'Increment_variable',
      type: 'IncrementVariable',
      operation: { inputs: { name: 'var1', value: 2 }, runAfter: { Initialize_variable: ['Succeeded'] }, type: 'IncrementVariable' },
    },
    {
      id: 'Initialize_variable',
      type: 'InitializeVariable',
      operation: { inputs: { variables: [{ name: 'var1', type: 'integer' }] }, runAfter: {}, type: 'InitializeVariable' },
    },
    {
      id: 'ActionIf',
      type: 'InitializeVariable',
      operation: {
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
      },
      children: [
        {
          id: 'ActionIf-actions',
          children: [
            {
              id: 'Increment_variable2',
              type: 'IncrementVariable',
              operation: { inputs: { name: 'var1', value: 2 }, type: 'IncrementVariable' },
            },
            {
              id: 'Increment_variable4',
              type: 'IncrementVariable',
              operation: {
                inputs: { name: 'var1', value: 2 },
                runAfter: { Increment_variable2: ['Succeeded'] },
                type: 'IncrementVariable',
              },
            },
          ],
          edges: [{ id: 'Increment_variable2-Increment_variable4', source: 'Increment_variable2', target: 'Increment_variable4' }],
        },
        {
          id: 'ActionIf-elseActions',
          children: [
            {
              id: 'Increment_variable3',
              type: 'IncrementVariable',
              operation: { inputs: { name: 'var1', value: 2 }, type: 'IncrementVariable' },
            },
          ],
          edges: [],
        },
      ],
    },
    {
      id: 'Response',
      type: 'Response',
      operation: {
        inputs: { body: "@variables('var1')", statusCode: 200 },
        kind: 'http',
        runAfter: { ActionIf: ['Succeeded'] },
        type: 'Response',
      },
    },
  ],
  edges: [
    { id: 'Initialize_variable-Increment_variable', source: 'Initialize_variable', target: 'Increment_variable' },
    { id: 'Increment_variable-ActionIf', source: 'Increment_variable', target: 'ActionIf' },
    { id: 'ActionIf-Response', source: 'ActionIf', target: 'Response' },
  ],
};
