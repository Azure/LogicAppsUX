import { createWorkflowEdge, createWorkflowNode } from '../graph';
import { getTokenNodeIds, filterTokensForAgentPerInput, convertOutputsToTokens } from '../tokens';
import { WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { TokenType } from '@microsoft/designer-ui';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('Token Picker Utilities', () => {
  const graph = {
    id: 'root',
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
    children: [
      createWorkflowNode('manual'),
      createWorkflowNode('Compose'),
      createWorkflowNode('Compose_11'),
      createWorkflowNode('Compose_2'),
      createWorkflowNode('Execute_a_navigation_plan'),
      createWorkflowNode('Response'),
      {
        id: 'Until',
        width: 200,
        height: 40,
        type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
        children: [
          createWorkflowNode('Until-#scope', WORKFLOW_NODE_TYPES.SCOPE_NODE),
          createWorkflowNode('Compose_10'),
          createWorkflowNode('Compose_3'),
          createWorkflowNode('Compose_4'),
          createWorkflowNode('Compose_5'),
          createWorkflowNode('Compose_6'),
          {
            id: 'Until_2',
            width: 200,
            height: 40,
            type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
            children: [
              createWorkflowNode('Until_2-#scope', WORKFLOW_NODE_TYPES.SCOPE_NODE),
              createWorkflowNode('Compose_7'),
              createWorkflowNode('Compose_8'),
              createWorkflowNode('Compose_9'),
            ],
            edges: [
              createWorkflowEdge('Compose_7', 'Compose_8'),
              createWorkflowEdge('Compose_7', 'Compose_9'),
              createWorkflowEdge('Until_2-#scope', 'Compose_7'),
            ],
          },
        ],
        edges: [
          createWorkflowEdge('Until_2', 'Compose_10'),
          createWorkflowEdge('Compose_3', 'Compose_4'),
          createWorkflowEdge('Compose_3', 'Compose_5'),
          createWorkflowEdge('Compose_4', 'Compose_6'),
          createWorkflowEdge('Compose_5', 'Until_2'),
          createWorkflowEdge('Until-#scope', 'Compose_10'),
        ],
      },
    ],
    edges: [
      createWorkflowEdge('manual', 'Compose'),
      createWorkflowEdge('manual', 'Execute_a_navigation_plan'),
      createWorkflowEdge('Until', 'Compose_11'),
      createWorkflowEdge('Compose', 'Compose_2'),
      createWorkflowEdge('Execute_a_navigation_plan', 'Response'),
      createWorkflowEdge('Response', 'Until'),
    ],
  };

  const nodesMetadata = {
    manual: { graphId: 'root' },
    Compose: { graphId: 'root' },
    Compose_11: { graphId: 'root' },
    Compose_2: { graphId: 'root' },
    Execute_a_navigation_plan: { graphId: 'root' },
    Response: { graphId: 'root' },
    Until: { graphId: 'root' },
    Compose_10: { graphId: 'Until', parentNodeId: 'Until' },
    Compose_3: { graphId: 'Until', parentNodeId: 'Until' },
    Compose_4: { graphId: 'Until', parentNodeId: 'Until' },
    Compose_5: { graphId: 'Until', parentNodeId: 'Until' },
    Compose_6: { graphId: 'Until', parentNodeId: 'Until' },
    Until_2: { graphId: 'Until', parentNodeId: 'Until' },
    Compose_7: { graphId: 'Until_2', parentNodeId: 'Until_2' },
    Compose_8: { graphId: 'Until_2', parentNodeId: 'Until_2' },
    Compose_9: { graphId: 'Until_2', parentNodeId: 'Until_2' },
  };

  const operationMap = {
    manual: 'manual',
    Compose: 'Compose',
    Compose_11: 'Compose_11',
    Compose_2: 'Compose_2',
    Execute_a_navigation_plan: 'Execute_a_navigation_plan',
    Response: 'Response',
    Until: 'Until',
    Compose_10: 'Compose_10',
    Compose_3: 'Compose_3',
    Compose_4: 'Compose_4',
    Compose_5: 'Compose_5',
    Compose_6: 'Compose_6',
    Until_2: 'Until_2',
    Compose_7: 'Compose_7',
    Compose_8: 'Compose_8',
    Compose_9: 'Compose_9',
  };

  const operationInfos = {
    manual: { type: 'Request' },
    Compose: { type: 'Compose' },
    Compose_11: { type: 'Compose' },
    Compose_2: { type: 'Compose' },
    Execute_a_navigation_plan: 'Execute_a_navigation_plan',
    Response: { type: 'Response' },
    Until: { type: 'Until' },
    Compose_10: { type: 'Compose' },
    Compose_3: { type: 'Compose' },
    Compose_4: { type: 'Compose' },
    Compose_5: { type: 'Compose' },
    Compose_6: { type: 'Compose' },
    Until_2: { type: 'Until' },
    Compose_7: { type: 'Compose' },
    Compose_8: { type: 'Compose' },
    Compose_9: { type: 'Compose' },
  } as any;

  const nodesManifest = {
    Until: { manifest: { properties: { outputTokens: { selfReference: true } } } },
    Until_2: { manifest: { properties: { outputTokens: { selfReference: true } } } },
    manual: { manifest: { properties: {} } },
    Compose: { manifest: { properties: {} } },
    Compose_11: { manifest: { properties: {} } },
    Compose_2: { manifest: { properties: {} } },
    Execute_a_navigation_plan: { manifest: { properties: {} } },
    Response: { manifest: { properties: {} } },
    Compose_10: { manifest: { properties: {} } },
    Compose_3: { manifest: { properties: {} } },
    Compose_4: { manifest: { properties: {} } },
    Compose_5: { manifest: { properties: {} } },
    Compose_6: { manifest: { properties: {} } },
    Compose_7: { manifest: { properties: {} } },
    Compose_8: { manifest: { properties: {} } },
    Compose_9: { manifest: { properties: {} } },
  } as any;

  describe('getTokenNodeIds', () => {
    it('should get all nodes in upstream chain for a node in root graph', () => {
      let result = getTokenNodeIds('Response', graph, nodesMetadata, nodesManifest, operationInfos, operationMap);
      expect(result).toEqual(['Execute_a_navigation_plan', 'manual']);

      result = getTokenNodeIds('Compose_8', graph, nodesMetadata, nodesManifest, operationInfos, operationMap);
      expect(result).toEqual([
        'Compose_7',
        'Compose_5',
        'Compose_3',
        'Until_2',
        'Response',
        'Execute_a_navigation_plan',
        'manual',
        'Until',
      ]);
    });

    it('should get all containing nodes for until operation along with its upstream nodes in graph', () => {
      let result = getTokenNodeIds('Until_2', graph, nodesMetadata, nodesManifest, operationInfos, operationMap);
      expect(result).toEqual([
        'Compose_5',
        'Compose_3',
        'Response',
        'Execute_a_navigation_plan',
        'manual',
        'Until',
        'Compose_7',
        'Compose_8',
        'Compose_9',
      ]);

      result = getTokenNodeIds('Until', graph, nodesMetadata, nodesManifest, operationInfos, operationMap);
      expect(result).toEqual([
        'Response',
        'Execute_a_navigation_plan',
        'manual',
        'Compose_10',
        'Compose_3',
        'Compose_4',
        'Compose_5',
        'Compose_6',
        'Until_2',
        'Compose_7',
        'Compose_8',
        'Compose_9',
      ]);
    });
  });

  describe('filterTokensForAgentPerInput', () => {
    it('should return only body outputs when responseFormat.type is json_schema', () => {
      const mockInputs = {
        parameterGroups: {
          default: {
            parameters: [
              {
                parameterName: 'agentModelSettings.agentChatCompletionSettings.responseFormat.type',
                value: [{ value: 'json_schema' }],
              },
            ],
          },
        },
      };

      const mockOutputs = {
        body1: { name: 'body', type: 'string' },
        body2: { name: 'response_body', type: 'object' },
        output1: { name: 'outputs', type: 'object' },
        message1: { name: 'lastAssistantMessage', type: 'string' },
      };

      const result = filterTokensForAgentPerInput(mockInputs as any, mockOutputs as any);

      expect(Object.keys(result)).toEqual(['body1', 'body2']);
      expect(result.body1).toEqual(mockOutputs.body1);
      expect(result.body2).toEqual(mockOutputs.body2);
    });

    it('should return only outputs when responseFormat.type is json_object or text', () => {
      const mockInputsJsonObject = {
        parameterGroups: {
          default: {
            parameters: [
              {
                parameterName: 'agentModelSettings.agentChatCompletionSettings.responseFormat.type',
                value: [{ value: 'json_object' }],
              },
            ],
          },
        },
      };

      const mockInputsText = {
        parameterGroups: {
          default: {
            parameters: [
              {
                parameterName: 'agentModelSettings.agentChatCompletionSettings.responseFormat.type',
                value: [{ value: 'text' }],
              },
            ],
          },
        },
      };

      const mockOutputs = {
        body1: { name: 'body', type: 'string' },
        output1: { name: 'outputs', type: 'object' },
        message1: { name: 'lastAssistantMessage', type: 'string' },
      };

      let result = filterTokensForAgentPerInput(mockInputsJsonObject as any, mockOutputs as any);
      expect(Object.keys(result)).toEqual(['output1']);
      expect(result.output1).toEqual(mockOutputs.output1);

      result = filterTokensForAgentPerInput(mockInputsText as any, mockOutputs as any);
      expect(Object.keys(result)).toEqual(['output1']);
      expect(result.output1).toEqual(mockOutputs.output1);
    });

    it('should return only lastAssistantMessage when no responseFormat.type or default case', () => {
      const mockInputsNoParam = { parameterGroups: { default: { parameters: [] } } };
      const mockInputsEmptyValue = {
        parameterGroups: {
          default: {
            parameters: [
              {
                parameterName: 'agentModelSettings.agentChatCompletionSettings.responseFormat.type',
                value: [],
              },
            ],
          },
        },
      };

      const mockOutputs = {
        body1: { name: 'body', type: 'string' },
        output1: { name: 'outputs', type: 'object' },
        message1: { name: 'lastAssistantMessage', type: 'string' },
        message2: { name: 'anotherAssistantMessage', type: 'string' },
      };

      let result = filterTokensForAgentPerInput(mockInputsNoParam as any, mockOutputs as any);
      expect(Object.keys(result)).toEqual(['message1']);
      expect(result.message1).toEqual(mockOutputs.message1);

      result = filterTokensForAgentPerInput(mockInputsEmptyValue as any, mockOutputs as any);
      expect(Object.keys(result)).toEqual(['message1']);
      expect(result.message1).toEqual(mockOutputs.message1);
    });
  });

  describe('convertOutputsToTokens', () => {
    const mockOperationMetadata = {
      iconUri: 'test-icon',
      brandColor: '#123456',
    };

    it('should filter outputs for Agent node type when inputs are provided', () => {
      const mockInputs = {
        parameterGroups: {
          default: {
            parameters: [
              {
                parameterName: 'agentModelSettings.agentChatCompletionSettings.responseFormat.type',
                value: [{ value: 'json_schema' }],
              },
            ],
          },
        },
      };

      const mockOutputs = {
        body1: { key: 'body1', name: 'body', type: 'string', isAdvanced: false, required: true },
        output1: { key: 'output1', name: 'outputs', type: 'object', isAdvanced: false, required: false },
        message1: { key: 'message1', name: 'lastAssistantMessage', type: 'string', isAdvanced: false, required: false },
      };

      const result = convertOutputsToTokens('test-node', 'Agent', mockOutputs as any, mockOperationMetadata, undefined, mockInputs as any);

      // Should only include body output due to filtering
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('body1');
      expect(result[0].name).toBe('body');
      expect(result[0].brandColor).toBe('#123456');
      expect(result[0].icon).toBe('test-icon');
    });

    it('should set correct token type for different node types', () => {
      const mockOutputs = {
        output1: { key: 'output1', name: 'outputs', type: 'object', isAdvanced: false, required: false },
      };

      // Test FOREACH node type - the convertOutputsToTokens function uses nodeType.toLowerCase()
      let result = convertOutputsToTokens('test-node', 'foreach', mockOutputs as any, mockOperationMetadata);
      expect(result[0].outputInfo.type).toBe(TokenType.ITEM);

      // Test AGENT_CONDITION node type
      result = convertOutputsToTokens('test-node', 'agentcondition', mockOutputs as any, mockOperationMetadata);
      expect(result[0].outputInfo.type).toBe(TokenType.AGENTPARAMETER);

      // Test default case
      result = convertOutputsToTokens('test-node', 'Compose', mockOutputs as any, mockOperationMetadata);
      expect(result[0].outputInfo.type).toBe(TokenType.OUTPUTS);
    });

    it('should not filter outputs for non-Agent node types', () => {
      const mockOutputs = {
        body1: { key: 'body1', name: 'body', type: 'string', isAdvanced: false, required: true },
        output1: { key: 'output1', name: 'outputs', type: 'object', isAdvanced: false, required: false },
      };

      const result = convertOutputsToTokens('test-node', 'Compose', mockOutputs as any, mockOperationMetadata);

      // Should include all outputs for non-Agent types
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.key)).toEqual(['body1', 'output1']);
    });
  });
});
