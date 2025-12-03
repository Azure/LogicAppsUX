import type { Operations, NodesMetadata } from '../../../state/workflow/workflowInterfaces';
import { createWorkflowNode, createWorkflowEdge } from '../../../utils/graph';
import type { WorkflowNode } from '../../models/workflowNode';
import { WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import type { DeserializedWorkflow } from '../BJSDeserializer';

export const agentMcpWorkflowDefinitionInput = {
  $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
  contentVersion: '1.0.0.0',
  parameters: {},
  triggers: {
    'manual': {
      type: 'Request',
      kind: 'Http',
      inputs: {
        schema: {}
      }
    }
  },
  actions: {
    'WorkflowAgent': {
      type: 'Agent',
      inputs: {
        parameters: {
          deploymentId: 'gpt-4o',
          messages: [
            {
              role: 'System',
              content: 'You are a helpful assistant that can use tools to accomplish tasks.'
            },
            {
              role: 'User',
              content: 'Help me manage files and data.'
            }
          ]
        }
      },
      tools: {
        'McpFileServer': {
            type: 'McpClientTool',
            kind: 'BuiltIn',
            inputs: {
                parameters: {
                    mcpServerPath: '/servers/filesystem',
                    toolName: 'list_files',
                }
            }
        }
      },
      runAfter: {},
      limit: {
        timeout: 'PT2H',
        count: 50
      }
    },
    'ResponseAction': {
      type: 'Response',
      inputs: {
        statusCode: 200,
        body: '@outputs("WorkflowAgent")'
      },
      runAfter: {
        'WorkflowAgent': ['SUCCEEDED']
      }
    }
  },
  outputs: {}
};

export const expectedAgentMcpWorkflowDefinitionOutput = {
  graph: {
    id: 'root',
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
    children: [
      createWorkflowNode('manual'),
      {
        children: [
          {
            height: 40,
            id: 'WorkflowAgent-#scope',
            type: 'SCOPE_CARD_NODE',
            width: 200,
          },
          {
            height: 40,
            id: 'McpFileServer',
            type: 'OPERATION_NODE',
            width: 200,
            subGraphLocation: 'tools',
          },
          {
            children: [
              {
                height: 40,
                id: "WorkflowAgent-addCase-#subgraph",
                type: "SUBGRAPH_CARD_NODE",
                width: 200,
              },
            ],
            edges: [],
            id: "WorkflowAgent-addCase",
            subGraphLocation: undefined,
            type: "HIDDEN_NODE",
        },
        ],
        edges: [
          {
            id: 'WorkflowAgent-#scope-McpFileServer',
            source: 'WorkflowAgent-#scope',
            target: 'McpFileServer',
            type: 'ONLY_EDGE',
          },
          {
            id: 'WorkflowAgent-#scope-WorkflowAgent-addCase',
            source: 'WorkflowAgent-#scope',
            target: 'WorkflowAgent-addCase',
            type: 'HIDDEN_EDGE',
          },
        ],
        height: 40,
        id: 'WorkflowAgent',
        type: 'GRAPH_NODE',
        width: 200,
      },
      createWorkflowNode('ResponseAction'),
    ],
    edges: [
      createWorkflowEdge('manual', 'WorkflowAgent'),
      createWorkflowEdge('WorkflowAgent', 'ResponseAction'),
    ],
  },
  actionData: {
    manual: {
      inputs: {
        schema: {}
      },
      kind: 'Http',
      type: 'Request',
    },
    WorkflowAgent: {
      inputs: {
        parameters: {
          deploymentId: 'gpt-4o',
          messages: [
            {
              role: 'System',
              content: 'You are a helpful assistant that can use tools to accomplish tasks.'
            },
            {
              role: 'User',
              content: 'Help me manage files and data.'
            }
          ]
        }
      },
      tools: {
        'McpFileServer': {
            type: 'McpClientTool',
            kind: 'BuiltIn',
            inputs: {
                parameters: {
                    mcpServerPath: '/servers/filesystem',
                    toolName: 'list_files',
                }
            }
        }
      },
      limit: {
        timeout: 'PT2H',
        count: 50
      },
      runAfter: {},
      type: 'Agent',
    },
    ResponseAction: {
      inputs: {
        statusCode: 200,
        body: '@outputs("WorkflowAgent")'
      },
      runAfter: {
        'WorkflowAgent': ['SUCCEEDED']
      },
      type: 'Response',
    },
    McpFileServer: {
        type: 'McpClientTool',
        kind: 'BuiltIn',
        inputs: {
            parameters: {
                mcpServerPath: '/servers/filesystem',
                toolName: 'list_files',
            }
        }
    },
  },
  nodesMetadata: {
    manual: { graphId: 'root', isRoot: true, isTrigger: true },
    WorkflowAgent: { 
      graphId: 'root',
      actionCount: 1,
      parentNodeId: undefined,
    },
    ResponseAction: { graphId: 'root' },
    McpFileServer: {
      graphId: 'WorkflowAgent',
      parentNodeId: 'WorkflowAgent',
      subgraphType: "MCP_CLIENT",
    },
    'WorkflowAgent-addCase': {
       actionCount: 0,
       graphId: 'WorkflowAgent',
       parentNodeId: 'WorkflowAgent',
       subgraphType: 'AGENT_ADD_CONDITON',
    },
  },
};