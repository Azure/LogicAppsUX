import type { Operations, NodesMetadata } from '../../../state/workflowSlice';
import type { WorkflowGraph } from '../../models/workflowNode';

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

export const expectedSimpleWorkflowDefinitionOutput: { graph: WorkflowGraph; actionData: Operations; nodesMetadata: NodesMetadata } = {
  graph: {
    id: 'root',
    children: [
      { id: 'manual', height: 0, width: 0 },
      { id: 'Increment_variable', height: 0, width: 0 },
      { id: 'Initialize_variable', height: 0, width: 0 },
      { id: 'Response', height: 0, width: 0 },
    ],
    edges: [
      { id: 'manual-Initialize_variable', source: 'manual', target: 'Initialize_variable' },
      { id: 'Initialize_variable-Increment_variable', source: 'Initialize_variable', target: 'Increment_variable' },
      { id: 'Increment_variable-Response', source: 'Increment_variable', target: 'Response' },
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
    Response: {
      inputs: { body: "@variables('var1')", statusCode: 200 },
      kind: 'http',
      runAfter: { Increment_variable: ['Succeeded'] },
      type: 'Response',
    },
  },
  nodesMetadata: {
    manual: { graphId: 'root' },
    Increment_variable: { graphId: 'root' },
    Initialize_variable: { graphId: 'root' },
    Response: { graphId: 'root' },
  },
};
