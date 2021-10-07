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

export const expectedSimpleWorkflowDefinitionOutput = {
  rootGraph: 'root',
  graphs: {
    root: {
      root: 'manual',
      nodes: ['Increment_variable', 'Initialize_variable', 'Response', 'manual'],
    },
  },
  nodes: [
    {
      id: 'Increment_variable',
      type: 'IncrementVariable',
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
      position: {
        x: 0,
        y: 0,
      },
      size: {
        height: 0,
        width: 0,
      },
      parentNodes: ['Initialize_variable'],
      childrenNodes: ['Response'],
    },
    {
      id: 'Initialize_variable',
      type: 'InitializeVariable',
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
      position: {
        x: 0,
        y: 0,
      },
      size: {
        height: 0,
        width: 0,
      },
      parentNodes: ['manual'],
      childrenNodes: ['Increment_variable'],
    },
    {
      id: 'Response',
      type: 'Response',
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
      position: {
        x: 0,
        y: 0,
      },
      size: {
        height: 0,
        width: 0,
      },
      parentNodes: ['Increment_variable'],
      childrenNodes: [],
    },
    {
      id: 'manual',
      type: 'Request',
      operation: {
        inputs: {},
        kind: 'Http',
        type: 'Request',
      },
      position: {
        x: 0,
        y: 0,
      },
      size: {
        height: 0,
        width: 0,
      },
      parentNodes: [],
      childrenNodes: ['Initialize_variable'],
    },
  ],
};
