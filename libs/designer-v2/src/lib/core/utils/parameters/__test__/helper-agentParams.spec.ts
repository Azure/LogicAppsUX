import { describe, it, expect } from 'vitest';
import { isParameterRequired, createParameterInfo, toParameterInfoMap } from '../helper';
import type { InputParameter, ParameterInfo, ResolvedParameter } from '@microsoft/logic-apps-shared';

describe('Parameter validation logic for Agent operations', () => {
  describe('isParameterRequired', () => {
    it('should return false for hidden parameters', () => {
      const parameterInfo: ParameterInfo = {
        id: '1',
        parameterName: 'deploymentId',
        parameterKey: 'inputs.$.deploymentId',
        required: true,
        hideInUI: true,
        type: 'string',
        value: [],
        info: { format: 'text' },
        label: 'Deployment ID',
        editor: 'textbox',
        editorOptions: {},
      } as any;

      expect(isParameterRequired(parameterInfo)).toBe(false);
    });

    it('should return false for deploymentId parameter with input dependencies', () => {
      const parameterInfo: ParameterInfo = {
        id: '1',
        parameterName: 'deploymentId',
        parameterKey: 'inputs.$.deploymentId',
        required: true,
        hideInUI: false,
        type: 'string',
        value: [],
        info: { format: 'text' },
        label: 'Deployment ID',
        editor: 'textbox',
        editorOptions: {},
        schema: {
          'x-ms-input-dependencies': {
            type: 'visibility',
            parameters: [
              {
                name: 'agentModelType',
                values: ['AzureOpenAI', 'FoundryAgentServiceV2', 'APIMGenAIGateway'],
              },
            ],
          },
        },
      } as any;

      // Should return false because it has input dependencies
      expect(isParameterRequired(parameterInfo)).toBe(false);
    });

    it('should return false for modelId parameter with input dependencies', () => {
      const parameterInfo: ParameterInfo = {
        id: '2',
        parameterName: 'modelId',
        parameterKey: 'inputs.$.modelId',
        required: true,
        hideInUI: false,
        type: 'string',
        value: [],
        info: { format: 'text' },
        label: 'Model ID',
        editor: 'textbox',
        editorOptions: {},
        schema: {
          'x-ms-input-dependencies': {
            type: 'visibility',
            parameters: [
              {
                name: 'agentModelType',
                values: ['V1ChatCompletionsService'],
              },
            ],
          },
        },
      } as any;

      // Should return false because it has input dependencies
      expect(isParameterRequired(parameterInfo)).toBe(false);
    });

    it('should return true for regular required parameter without input dependencies', () => {
      const parameterInfo: ParameterInfo = {
        id: '3',
        parameterName: 'messages',
        parameterKey: 'inputs.$.messages',
        required: true,
        hideInUI: false,
        type: 'array',
        value: [],
        info: { format: 'text' },
        label: 'Messages',
        editor: 'textbox',
        editorOptions: {},
      } as any;

      expect(isParameterRequired(parameterInfo)).toBe(true);
    });

    it('should return true for deploymentId parameter without input dependencies', () => {
      const parameterInfo: ParameterInfo = {
        id: '4',
        parameterName: 'deploymentId',
        parameterKey: 'inputs.$.deploymentId',
        required: true,
        hideInUI: false,
        type: 'string',
        value: [],
        info: { format: 'text' },
        label: 'Deployment ID',
        editor: 'textbox',
        editorOptions: {},
        schema: {
          // No x-ms-input-dependencies
        },
      } as any;

      // Should return true when there are no input dependencies
      expect(isParameterRequired(parameterInfo)).toBe(true);
    });

    it('should return false for optional parameters', () => {
      const parameterInfo: ParameterInfo = {
        id: '5',
        parameterName: 'temperature',
        parameterKey: 'inputs.$.temperature',
        required: false,
        hideInUI: false,
        type: 'number',
        value: [],
        info: { format: 'text' },
        label: 'Temperature',
        editor: 'textbox',
        editorOptions: {},
      } as any;

      expect(isParameterRequired(parameterInfo)).toBe(false);
    });

    it('should return false for required parameter with optional parent property', () => {
      const parameterInfo: ParameterInfo = {
        id: '6',
        parameterName: 'nestedParam',
        parameterKey: 'inputs.$.parent.nestedParam',
        required: true,
        hideInUI: false,
        type: 'string',
        value: [],
        info: {
          format: 'text',
          parentProperty: {
            optional: true,
          } as any,
        },
        label: 'Nested Parameter',
        editor: 'textbox',
        editorOptions: {},
      } as any;

      expect(isParameterRequired(parameterInfo)).toBe(false);
    });

    it('should handle case-insensitive parameter names for deploymentId', () => {
      const parameterInfo: ParameterInfo = {
        id: '7',
        parameterName: 'DEPLOYMENTID',
        parameterKey: 'inputs.$.DEPLOYMENTID',
        required: true,
        hideInUI: false,
        type: 'string',
        value: [],
        info: { format: 'text' },
        label: 'Deployment ID',
        editor: 'textbox',
        editorOptions: {},
        schema: {
          'x-ms-input-dependencies': {
            type: 'visibility',
            parameters: [{ name: 'agentModelType', values: ['AzureOpenAI'] }],
          },
        },
      } as any;

      expect(isParameterRequired(parameterInfo)).toBe(false);
    });

    it('should handle case-insensitive parameter names for modelId', () => {
      const parameterInfo: ParameterInfo = {
        id: '8',
        parameterName: 'MODELID',
        parameterKey: 'inputs.$.MODELID',
        required: true,
        hideInUI: false,
        type: 'string',
        value: [],
        info: { format: 'text' },
        label: 'Model ID',
        editor: 'textbox',
        editorOptions: {},
        schema: {
          'x-ms-input-dependencies': {
            type: 'visibility',
            parameters: [{ name: 'agentModelType', values: ['V1ChatCompletionsService'] }],
          },
        },
      } as any;

      expect(isParameterRequired(parameterInfo)).toBe(false);
    });
  });

  describe('createParameterInfo - agent parameter requirement logic', () => {
    it('should mark deploymentId as required when not hidden', () => {
      const parameter: ResolvedParameter = {
        name: 'deploymentId',
        key: 'inputs.$.deploymentId',
        type: 'string',
        title: 'Deployment ID',
        required: false, // Not marked as required in schema
        schema: {
          type: 'string',
          // Not hidden in UI
        },
      } as any;

      const parameterInfo = createParameterInfo(parameter, {}, false, true);

      // Should be marked as required because it's deploymentId and not hidden
      expect(parameterInfo.required).toBe(true);
    });

    it('should mark modelId as required when not hidden', () => {
      const parameter: ResolvedParameter = {
        name: 'modelId',
        key: 'inputs.$.modelId',
        type: 'string',
        title: 'Model ID',
        required: false, // Not marked as required in schema
        schema: {
          type: 'string',
          // Not hidden in UI
        },
      } as any;

      const parameterInfo = createParameterInfo(parameter, {}, false, true);

      // Should be marked as required because it's modelId and not hidden
      expect(parameterInfo.required).toBe(true);
    });

    it('should not mark deploymentId as required when hidden', () => {
      const parameter: ResolvedParameter = {
        name: 'deploymentId',
        key: 'inputs.$.deploymentId',
        type: 'string',
        title: 'Deployment ID',
        required: false,
        schema: {
          type: 'string',
          'x-ms-visibility': 'hideInUI',
        },
      } as any;

      const parameterInfo = createParameterInfo(parameter, {}, false, true);

      // Should not be marked as required because it's hidden
      expect(parameterInfo.required).toBe(false);
    });

    it('should preserve required flag for explicitly required parameters', () => {
      const parameter: ResolvedParameter = {
        name: 'messages',
        key: 'inputs.$.messages',
        type: 'array',
        title: 'Messages',
        required: true, // Explicitly marked as required
        schema: {
          type: 'array',
        },
      } as any;

      const parameterInfo = createParameterInfo(parameter, {}, false, true);

      expect(parameterInfo.required).toBe(true);
    });

    it('should handle parameter with input dependencies visibility', () => {
      const parameter: ResolvedParameter = {
        name: 'deploymentId',
        key: 'inputs.$.deploymentId',
        type: 'string',
        title: 'Deployment ID',
        required: false,
        schema: {
          type: 'string',
          'x-ms-input-dependencies': {
            type: 'visibility',
            parameters: [
              {
                name: 'agentModelType',
                values: ['AzureOpenAI', 'FoundryAgentServiceV2'],
              },
            ],
          },
        },
      } as any;

      const parameterInfo = createParameterInfo(parameter, {}, false, true);

      // Should be marked as required initially, but isParameterRequired should handle the validation
      expect(parameterInfo.required).toBe(true);
      // But when validating, isParameterRequired should return false due to input dependencies
      expect(isParameterRequired(parameterInfo)).toBe(false);
    });
  });

  describe('toParameterInfoMap - knowledgebase parameter hiding', () => {
    it('should exclude parameters with editor: "knowledgebase" from the result', () => {
      const inputParameters: InputParameter[] = [
        {
          name: 'agentKnowledge',
          key: 'inputs.$.agentKnowledge',
          type: 'object',
          title: 'Agent Knowledge',
          required: false,
          editor: 'knowledgebase',
          schema: {
            type: 'object',
          },
        } as any,
        {
          name: 'messages',
          key: 'inputs.$.messages',
          type: 'array',
          title: 'Messages',
          required: true,
          editor: 'array',
          schema: {
            type: 'array',
          },
        } as any,
      ];

      const result = toParameterInfoMap(inputParameters, undefined, true);

      // Should only contain 'messages', not 'agentKnowledge'
      expect(result).toHaveLength(1);
      expect(result[0].parameterName).toBe('messages');
    });

    it('should exclude parameters with editor: "knowledgebase" regardless of case', () => {
      const inputParameters: InputParameter[] = [
        {
          name: 'agentKnowledge',
          key: 'inputs.$.agentKnowledge',
          type: 'object',
          title: 'Agent Knowledge',
          required: false,
          editor: 'Knowledgebase', // Different casing
          schema: {
            type: 'object',
          },
        } as any,
      ];

      const result = toParameterInfoMap(inputParameters, undefined, true);

      // Should be empty since knowledgebase parameters are hidden
      expect(result).toHaveLength(0);
    });

    it('should include all parameters when none have editor: "knowledgebase"', () => {
      const inputParameters: InputParameter[] = [
        {
          name: 'deploymentId',
          key: 'inputs.$.deploymentId',
          type: 'string',
          title: 'Deployment ID',
          required: false,
          editor: 'textbox',
          schema: {
            type: 'string',
          },
        } as any,
        {
          name: 'temperature',
          key: 'inputs.$.temperature',
          type: 'number',
          title: 'Temperature',
          required: false,
          editor: 'textbox',
          schema: {
            type: 'number',
          },
        } as any,
      ];

      const result = toParameterInfoMap(inputParameters, undefined, true);

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.parameterName)).toEqual(['deploymentId', 'temperature']);
    });
  });
});
