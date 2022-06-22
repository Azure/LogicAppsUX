import type { Operations, NodesMetadata } from '../../../state/workflowSlice';
import type { WorkflowEdge, WorkflowEdgeType, WorkflowNode, WorkflowNodeType } from '../../models/workflowNode';

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

const createWorkflowNode = (id: string, type?: WorkflowNodeType) => ({
  id,
  height: 40,
  width: 200,
  type: type ?? 'testNode',
});

const createWorkflowEdge = (source: string, target: string, type?: WorkflowEdgeType): WorkflowEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  type: type ?? 'buttonEdge',
});

export const expectedSimpleWorkflowDefinitionOutput: { graph: WorkflowNode; actionData: Operations; nodesMetadata: NodesMetadata } = {
  graph: {
    id: 'root',
    type: 'graphNode',
    children: [
      createWorkflowNode('manual'),
      createWorkflowNode('Increment_variable'),
      createWorkflowNode('Initialize_variable'),
      createWorkflowNode('Response'),
    ],
    edges: [
      createWorkflowEdge('manual', 'Initialize_variable'),
      createWorkflowEdge('Initialize_variable', 'Increment_variable'),
      createWorkflowEdge('Increment_variable', 'Response'),
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
