import { WorkflowGraph } from '../../models/workflowNode';

export const simpleWorkflowDefinitionInput = {
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
    Response: {
      inputs: {
        body: "@variables('var1')",
        statusCode: 200,
      },
      kind: 'http',
      runAfter: {
        Increment_variable: ['Succeeded'],
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

export const expectedSimpleWorkflowDefinitionOutput: WorkflowGraph = {
  id: 'root',
  children: [
    {
      id: 'manual',
      operation: {
        inputs: {},
        kind: 'Http',
        type: 'Request',
      },
      type: 'Request',
    },
    {
      id: 'Increment_variable',
      operation: {
        inputs: {
          name: 'var1',
          value: 2,
        },
        runAfter: {
          Initialize_variable: ['Succeeded'],
        },
        type: 'IncrementVariable',
      },
      type: 'IncrementVariable',
    },
    {
      id: 'Initialize_variable',
      operation: {
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
      type: 'InitializeVariable',
    },
    {
      id: 'Response',
      operation: {
        inputs: {
          body: "@variables('var1')",
          statusCode: 200,
        },
        kind: 'http',
        runAfter: {
          Increment_variable: ['Succeeded'],
        },
        type: 'Response',
      },
      type: 'Response',
    },
  ],
  edges: [
    {
      id: 'Initialize_variable-Increment_variable',
      source: 'Initialize_variable',
      target: 'Increment_variable',
    },
    {
      id: 'Increment_variable-Response',
      source: 'Increment_variable',
      target: 'Response',
    },
  ],
};
