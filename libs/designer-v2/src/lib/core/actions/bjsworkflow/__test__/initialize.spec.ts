import { InitOperationManifestService } from '@microsoft/logic-apps-shared';
import * as initialize from '../initialize';
import {
  mockGetMyOffice365ProfileOpenApiManifest,
  mockPostTeamsAdaptiveCardOpenApiManifest,
  mockSendAnOfficeOutlookEmailOpenApiManifest,
} from './initialize.mocks';
import { describe, test, expect, beforeAll, vi, it, Mock, beforeEach } from 'vitest';
import { updateNodeParameters } from '../../../state/operation/operationMetadataSlice';
import * as graphModule from '../../../utils/graph';
import { ParameterInfo } from '@microsoft/designer-ui';

describe('bjsworkflow initialize', () => {
  describe('getInputParametersFromManifest', () => {
    beforeAll(() => {
      const operationManifestService = {
        isSupported: () => true,
        isAliasingSupported: () => true,
        getOperationInfo: () => Promise.resolve({} as any),
        getOperationManifest: () => Promise.resolve({} as any),
        getOperation: () => Promise.resolve({} as any),
        isBuiltInConnector: () => false,
        getBuiltInConnector: () => ({}) as any,
      };
      InitOperationManifestService(operationManifestService);
    });

    test('works for an OpenAPI operation with input parameters and values', () => {
      const stepDefinition = {
        runAfter: {},
        type: 'OpenApiConnection',
        inputs: {
          parameters: {
            'emailMessage/Body': 'test1',
            'emailMessage/Importance': 'Normal',
            'emailMessage/Subject': 'test2',
            'emailMessage/To': 'johndoe@example.com',
          },
          host: {
            apiId: '/providers/Microsoft.PowerApps/apis/shared_office365',
            operationId: 'SendEmailV2',
            connection: 'shared_office365',
          },
          authentication: {
            value: 'dummy',
            type: 'Raw',
          },
        },
      };

      const inputParameters = initialize.getInputParametersFromManifest(
        'Send_an_email',
        { type: 'OpenApiConnection', operationId: 'SendEmailV2', connectorId: '/providers/Microsoft.PowerApps/apis/shared_office365' },
        mockSendAnOfficeOutlookEmailOpenApiManifest,
        undefined /* presetParameterValues */,
        undefined /* customSwagger */,
        stepDefinition
      );

      expect(inputParameters.inputs.parameterGroups.default.parameters.length).toBe(10);
      expect(inputParameters.inputs.parameterGroups.default.parameters[0].value[0].value).toBe('johndoe@example.com');
      expect(inputParameters.inputs.parameterGroups.default.parameters[1].value[0].value).toBe('test2');
      expect(inputParameters.inputs.parameterGroups.default.parameters[2].value[0].value).toBe('test1');
      expect(inputParameters.inputs.parameterGroups.default.parameters[9].value[0].value).toBe('Normal');
    });
    test('works for an OpenAPI operation with input parameters that have a dynamic schema', () => {
      const stepDefinition = {
        runAfter: {
          Get_items: ['Succeeded'],
        },
        metadata: {
          operationMetadataId: 'f7bc459b-4bea-4135-b65d-dd4f4136441e',
        },
        type: 'OpenApiConnectionWebhook',
        inputs: {
          host: {
            apiId: '/providers/Microsoft.PowerApps/apis/shared_teams',
            operationId: 'PostCardAndWaitForResponse',
            connection: 'shared_teams',
          },
          parameters: {
            poster: 'Flow bot',
            location: 'Chat with Flow bot',
            'body/body/messageBody': 'hi hello ',
            'body/body/updateMessage': 'Thanks for your response!',
            'body/body/recipient/to': 'johndoe@example.com;',
          },
          authentication: "@parameters('$authentication')",
        },
      };

      const inputParameters = initialize.getInputParametersFromManifest(
        'Post_an_adaptive_card',
        {
          type: 'OpenApiConnectionWebhook',
          operationId: 'PostCardAndWaitForResponse',
          connectorId: '/providers/Microsoft.PowerApps/apis/shared_teams',
        },
        mockPostTeamsAdaptiveCardOpenApiManifest,
        undefined /* presetParameterValues */,
        undefined /* customSwagger */,
        stepDefinition
      );

      expect(inputParameters.inputs.parameterGroups.default.parameters.length).toBe(4); // Dynamic schema param (recipient/to) should not be in the array.
      expect(inputParameters.inputs.parameterGroups.default.parameters[0].value[0].value).toBe('Flow bot');
      expect(inputParameters.inputs.parameterGroups.default.parameters[1].value[0].value).toBe('Chat with Flow bot');
      expect(inputParameters.inputs.parameterGroups.default.parameters[2].value[0].value).toBe('hi hello ');
      expect(inputParameters.inputs.parameterGroups.default.parameters[3].value[0].value).toBe('Thanks for your response!');
    });

    test('works for an OpenAPI operation with input parameters but no values', () => {
      const stepDefinition = {
        runAfter: {},
        type: 'OpenApiConnection',
        inputs: {
          host: {
            apiId: '/providers/Microsoft.PowerApps/apis/shared_office365users',
            operationId: 'MyProfile_V2',
            connection: 'shared_office365users',
          },
          authentication: {
            value: 'dummy',
            type: 'Raw',
          },
        },
      };

      const inputParameters = initialize.getInputParametersFromManifest(
        'Get_my_profile',
        {
          type: 'OpenApiConnection',
          operationId: 'MyProfile_V2',
          connectorId: '/providers/Microsoft.PowerApps/apis/shared_office365users',
        },
        mockGetMyOffice365ProfileOpenApiManifest,
        undefined /* presetParameterValues */,
        undefined /* customSwagger */,
        stepDefinition
      );

      expect(inputParameters.inputs.parameterGroups.default.parameters.length).toBe(1);
      expect(inputParameters.inputs.parameterGroups.default.parameters[0].value[0].value).toBe('');
    });

    test('should preserve multiSelect editorOptions for array parameters with dynamic list', () => {
      const mockMultiSelectManifest: any = {
        properties: {
          description: 'Test MCP manifest',
          summary: 'Test MCP',
          iconUri: 'test.png',
          brandColor: '#000000',
          inputs: {
            type: 'object',
            properties: {
              allowedTools: {
                type: 'array',
                items: {
                  type: 'string',
                },
                title: 'Allowed tools',
                'x-ms-editor': 'combobox',
                'x-ms-editor-options': {
                  multiSelect: true,
                  titleSeparator: ',',
                  serialization: {
                    valueType: 'array',
                  },
                },
                'x-ms-dynamic-list': {
                  dynamicState: {
                    apiType: 'mcp',
                    operationId: 'listMcpTools',
                  },
                },
              },
            },
          },
          inputsLocation: ['inputs', 'parameters'],
        },
      };

      const stepDefinition = {
        type: 'McpClientTool',
        inputs: {
          parameters: {},
        },
      };

      const inputParameters = initialize.getInputParametersFromManifest(
        'test_node',
        { type: 'McpClientTool', operationId: 'test', connectorId: 'test' },
        mockMultiSelectManifest,
        undefined,
        undefined,
        stepDefinition
      );

      const allowedToolsParam = inputParameters.inputs.parameterGroups.default.parameters.find(
        (p: ParameterInfo) => p.parameterName === 'allowedTools'
      );

      expect(allowedToolsParam).toBeDefined();
      expect(allowedToolsParam?.editor).toBe('combobox');
      expect(allowedToolsParam?.editorOptions?.multiSelect).toBe(true);
      expect(allowedToolsParam?.editorOptions?.serialization).toEqual({ valueType: 'array' });
    });
  });

  describe('updateParameterConditionalVisibilityAndRefreshOutputs', () => {
    let mockDispatch: Mock;
    let mockGetState: Mock;

    beforeEach(() => {
      mockDispatch = vi.fn();
      mockGetState = vi.fn();
    });

    test('should execute thunk successfully with valid payload', async () => {
      const mockInputParameters = {
        'test-node': {
          parameterGroups: {
            'test-group': {
              parameters: [
                {
                  id: 'test-param',
                  parameterName: 'test-param',
                  value: [{ value: 'test-value' }],
                },
              ],
            },
          },
        },
      };

      mockGetState.mockReturnValue({
        operations: {
          inputParameters: mockInputParameters,
        },
      });

      const payload = {
        nodeId: 'test-node',
        groupId: 'test-group',
        parameterId: 'test-param',
        value: true,
        operationInfo: { type: 'Agent', kind: 'test', connectorId: 'test-connector', operationId: 'test-operation' },
        isTrigger: false,
      };

      const thunk = initialize.updateParameterConditionalVisibilityAndRefreshOutputs(payload);
      await expect(thunk(mockDispatch, mockGetState, undefined)).resolves.not.toThrow();
    });

    test('should handle missing input parameters gracefully', async () => {
      mockGetState.mockReturnValue({
        operations: {
          inputParameters: {},
        },
      });

      const payload = {
        nodeId: 'missing-node',
        groupId: 'default',
        parameterId: 'test-param',
        value: true,
        operationInfo: { type: 'Compose', kind: 'test', connectorId: 'test-connector', operationId: 'test-operation' },
        isTrigger: false,
      };

      const thunk = initialize.updateParameterConditionalVisibilityAndRefreshOutputs(payload);

      // Should not throw when input parameters are missing
      await expect(thunk(mockDispatch, mockGetState, undefined)).resolves.not.toThrow();
      expect(mockGetState).toHaveBeenCalled();
    });

    test('should dispatch parameter visibility update for Agent operations', async () => {
      const mockInputParameters = {
        'agent-node': {
          parameterGroups: {
            default: {
              parameters: [
                {
                  id: 'test-param',
                  parameterName: 'agentModelSettings.agentChatCompletionSettings.responseFormat.type',
                  value: [{ value: 'json_schema' }],
                },
              ],
            },
          },
        },
      };

      mockGetState.mockReturnValue({
        operations: {
          inputParameters: mockInputParameters,
        },
      });

      const payload = {
        nodeId: 'agent-node',
        groupId: 'default',
        parameterId: 'test-param',
        value: true,
        operationInfo: { type: 'Agent', kind: 'test', connectorId: 'agent-connector', operationId: 'agent-operation' },
        isTrigger: false,
      };

      const thunk = initialize.updateParameterConditionalVisibilityAndRefreshOutputs(payload);
      await thunk(mockDispatch, mockGetState, undefined);

      expect(mockDispatch).toHaveBeenCalled();
      expect(mockGetState).toHaveBeenCalled();
    });
  });
});
