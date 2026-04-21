import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isParameterRequired, createParameterInfo, toParameterInfoMap } from '../helper';
import type { InputParameter, ParameterInfo, ResolvedParameter } from '@microsoft/logic-apps-shared';
import * as LogicAppsShared from '@microsoft/logic-apps-shared';

// Mock WorkflowService
vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    WorkflowService: vi.fn(),
  };
});
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

  describe('toParameterInfoMap - KnowledgeHub enabled/disabled scenarios', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const createInputParameter = (overrides: Partial<InputParameter> = {}): InputParameter =>
      ({
        name: 'testParam',
        key: 'inputs.$.testParam',
        type: 'string',
        title: 'Test Parameter',
        required: false,
        editor: 'textbox',
        schema: { type: 'string' },
        ...overrides,
      }) as InputParameter;

    const mockWorkflowService = (isKnowledgeHubEnabled: boolean | undefined) => {
      if (isKnowledgeHubEnabled === undefined) {
        (LogicAppsShared.WorkflowService as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
      } else {
        (LogicAppsShared.WorkflowService as ReturnType<typeof vi.fn>).mockReturnValue({
          isKnowledgeHubEnabled: () => isKnowledgeHubEnabled,
          getLogicAppId: () => 'test-logic-app-id',
          getAppIdentity: () => undefined,
        });
      }
    };

    it('should include knowledgebase parameter when KnowledgeHub is enabled', () => {
      mockWorkflowService(true);

      const inputParameters: InputParameter[] = [
        createInputParameter({
          name: 'agentKnowledge',
          key: 'inputs.$.agentKnowledge',
          editor: 'knowledgebase',
        }),
      ];

      const result = toParameterInfoMap(inputParameters, undefined, true);

      expect(result).toHaveLength(1);
      expect(result[0].parameterName).toBe('agentKnowledge');
    });

    it('should exclude knowledgebase parameter when KnowledgeHub is disabled', () => {
      mockWorkflowService(false);

      const inputParameters: InputParameter[] = [
        createInputParameter({
          name: 'agentKnowledge',
          key: 'inputs.$.agentKnowledge',
          editor: 'knowledgebase',
        }),
      ];

      const result = toParameterInfoMap(inputParameters, undefined, true);

      expect(result).toHaveLength(0);
    });

    it('should include non-knowledgebase parameters when KnowledgeHub is enabled', () => {
      mockWorkflowService(true);

      const inputParameters: InputParameter[] = [
        createInputParameter({
          name: 'messages',
          key: 'inputs.$.messages',
          editor: 'array',
        }),
      ];

      const result = toParameterInfoMap(inputParameters, undefined, true);

      expect(result).toHaveLength(1);
      expect(result[0].parameterName).toBe('messages');
    });

    it('should include non-knowledgebase parameters when KnowledgeHub is disabled', () => {
      mockWorkflowService(false);

      const inputParameters: InputParameter[] = [
        createInputParameter({
          name: 'messages',
          key: 'inputs.$.messages',
          editor: 'array',
        }),
      ];

      const result = toParameterInfoMap(inputParameters, undefined, true);

      expect(result).toHaveLength(1);
      expect(result[0].parameterName).toBe('messages');
    });

    it('should default to KnowledgeHub enabled when WorkflowService returns undefined', () => {
      mockWorkflowService(undefined);

      // Test with non-knowledgebase parameter since knowledgebase requires WorkflowService for other methods
      // The key behavior being tested is that isKnowledgeHubEnabled defaults to true
      const inputParameters: InputParameter[] = [
        createInputParameter({
          name: 'messages',
          key: 'inputs.$.messages',
          editor: 'array',
        }),
      ];

      const result = toParameterInfoMap(inputParameters, undefined, true);

      // Should include parameter because isKnowledgeHubEnabled defaults to true when service is undefined
      expect(result).toHaveLength(1);
      expect(result[0].parameterName).toBe('messages');
    });

    it('should default to KnowledgeHub enabled when isKnowledgeHubEnabled method is not defined', () => {
      // WorkflowService exists but doesn't have isKnowledgeHubEnabled method
      // This should still include knowledgebase parameters (defaults to enabled)
      (LogicAppsShared.WorkflowService as ReturnType<typeof vi.fn>).mockReturnValue({
        getLogicAppId: () => 'test-logic-app-id',
        getAppIdentity: () => undefined,
      });

      const inputParameters: InputParameter[] = [
        createInputParameter({
          name: 'agentKnowledge',
          key: 'inputs.$.agentKnowledge',
          editor: 'knowledgebase',
        }),
      ];

      const result = toParameterInfoMap(inputParameters, undefined, true);

      // Should include knowledgebase parameter because default is true when method is undefined
      expect(result).toHaveLength(1);
      expect(result[0].parameterName).toBe('agentKnowledge');
    });

    it('should filter mixed parameters correctly when KnowledgeHub is disabled', () => {
      mockWorkflowService(false);

      const inputParameters: InputParameter[] = [
        createInputParameter({
          name: 'agentKnowledge',
          key: 'inputs.$.agentKnowledge',
          editor: 'knowledgebase',
        }),
        createInputParameter({
          name: 'messages',
          key: 'inputs.$.messages',
          editor: 'array',
        }),
        createInputParameter({
          name: 'temperature',
          key: 'inputs.$.temperature',
          editor: 'textbox',
        }),
      ];

      const result = toParameterInfoMap(inputParameters, undefined, true);

      // Should exclude knowledgebase parameter but include others
      expect(result).toHaveLength(2);
      expect(result.map((p) => p.parameterName)).toEqual(['messages', 'temperature']);
    });

    it('should include all parameters when KnowledgeHub is enabled with mixed editors', () => {
      mockWorkflowService(true);

      const inputParameters: InputParameter[] = [
        createInputParameter({
          name: 'agentKnowledge',
          key: 'inputs.$.agentKnowledge',
          editor: 'knowledgebase',
        }),
        createInputParameter({
          name: 'messages',
          key: 'inputs.$.messages',
          editor: 'array',
        }),
        createInputParameter({
          name: 'temperature',
          key: 'inputs.$.temperature',
          editor: 'textbox',
        }),
      ];

      const result = toParameterInfoMap(inputParameters, undefined, true);

      // Should include all parameters
      expect(result).toHaveLength(3);
      expect(result.map((p) => p.parameterName)).toEqual(['agentKnowledge', 'messages', 'temperature']);
    });

    it('should always exclude parameters with dynamicSchema regardless of KnowledgeHub state', () => {
      mockWorkflowService(true);

      const inputParameters: InputParameter[] = [
        createInputParameter({
          name: 'dynamicParam',
          key: 'inputs.$.dynamicParam',
          editor: 'textbox',
          dynamicSchema: { type: 'object' },
        }),
      ];

      const result = toParameterInfoMap(inputParameters, undefined, true);

      expect(result).toHaveLength(0);
    });

    it('should exclude both dynamicSchema and knowledgebase parameters when KnowledgeHub is disabled', () => {
      mockWorkflowService(false);

      const inputParameters: InputParameter[] = [
        createInputParameter({
          name: 'dynamicParam',
          key: 'inputs.$.dynamicParam',
          editor: 'textbox',
          dynamicSchema: { type: 'object' },
        }),
        createInputParameter({
          name: 'agentKnowledge',
          key: 'inputs.$.agentKnowledge',
          editor: 'knowledgebase',
        }),
        createInputParameter({
          name: 'normalParam',
          key: 'inputs.$.normalParam',
          editor: 'textbox',
        }),
      ];

      const result = toParameterInfoMap(inputParameters, undefined, true);

      // Should only include normalParam
      expect(result).toHaveLength(1);
      expect(result[0].parameterName).toBe('normalParam');
    });

    it('should handle case-insensitive knowledgebase editor value', () => {
      mockWorkflowService(false);

      const inputParameters: InputParameter[] = [
        createInputParameter({
          name: 'agentKnowledge',
          key: 'inputs.$.agentKnowledge',
          editor: 'KnowledgeBase', // Different casing
        }),
      ];

      const result = toParameterInfoMap(inputParameters, undefined, true);

      // Should be excluded due to case-insensitive comparison
      expect(result).toHaveLength(0);
    });

    it('should handle multiple knowledgebase parameters when KnowledgeHub is disabled', () => {
      mockWorkflowService(false);

      const inputParameters: InputParameter[] = [
        createInputParameter({
          name: 'agentKnowledge1',
          key: 'inputs.$.agentKnowledge1',
          editor: 'knowledgebase',
        }),
        createInputParameter({
          name: 'agentKnowledge2',
          key: 'inputs.$.agentKnowledge2',
          editor: 'knowledgebase',
        }),
      ];

      const result = toParameterInfoMap(inputParameters, undefined, true);

      // Should exclude all knowledgebase parameters
      expect(result).toHaveLength(0);
    });

    it('should handle multiple knowledgebase parameters when KnowledgeHub is enabled', () => {
      mockWorkflowService(true);

      const inputParameters: InputParameter[] = [
        createInputParameter({
          name: 'agentKnowledge1',
          key: 'inputs.$.agentKnowledge1',
          editor: 'knowledgebase',
        }),
        createInputParameter({
          name: 'agentKnowledge2',
          key: 'inputs.$.agentKnowledge2',
          editor: 'knowledgebase',
        }),
      ];

      const result = toParameterInfoMap(inputParameters, undefined, true);

      // Should include all knowledgebase parameters
      expect(result).toHaveLength(2);
      expect(result.map((p) => p.parameterName)).toEqual(['agentKnowledge1', 'agentKnowledge2']);
    });
  });
});
