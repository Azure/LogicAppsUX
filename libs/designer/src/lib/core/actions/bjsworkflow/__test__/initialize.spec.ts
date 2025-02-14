import { InitOperationManifestService } from '@microsoft/logic-apps-shared';
import * as initialize from '../initialize';
import {
  mockGetMyOffice365ProfileOpenApiManifest,
  mockPostTeamsAdaptiveCardOpenApiManifest,
  mockSendAnOfficeOutlookEmailOpenApiManifest,
} from './initialize.mocks';
import { describe, test, expect, beforeAll, vi, beforeEach, Mock } from 'vitest';
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
  });
  describe('updateCallbackUrl', () => {
    const fakeTriggerId = 'trigger1';
    const fakeOperation = { operationId: 'dummy' };
    const fakeInputs = { someInput: 'dummy' };

    // Create a fake root state with the minimal required structure.
    const createFakeRootState = () => ({
      workflow: {}, // getTriggerNodeId is stubbed to return fakeTriggerId.
      operations: {
        operationInfo: {
          [fakeTriggerId]: fakeOperation,
        },
        inputParameters: {
          [fakeTriggerId]: fakeInputs,
        },
      },
    });

    let dispatch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      dispatch = vi.fn();
      vi.restoreAllMocks();
      // Stub getTriggerNodeId to always return our fake trigger id.
      vi.spyOn(graphModule, 'getTriggerNodeId').mockReturnValue(fakeTriggerId);
    });

    test('should dispatch updateNodeParameters when updateCallbackUrlInInputs returns a parameter', async () => {
      const fakeUpdatedParameter = { id: 'param1', value: [{ value: 'http://callback.url' }] } as ParameterInfo;
      const fakeCallbackUpdater = vi.fn().mockResolvedValue(fakeUpdatedParameter);

      // Stub updateCallbackUrlInInputs to resolve with a fake parameter.
      vi.spyOn(initialize, 'updateCallbackUrlInInputs').mockImplementation(fakeCallbackUpdater);
      const fakeRootState = createFakeRootState();

      await initialize.updateCallbackUrl(fakeRootState as any, dispatch);

      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith(
        updateNodeParameters({
          nodeId: fakeTriggerId,
          parameters: [
            {
              groupId: 'default',
              parameterId: fakeUpdatedParameter.id,
              propertiesToUpdate: fakeUpdatedParameter,
            },
          ],
        })
      );
    });

    test('should not dispatch updateNodeParameters when updateCallbackUrlInInputs returns undefined', async () => {
      // Stub updateCallbackUrlInInputs to resolve with undefined.
      vi.spyOn(initialize, 'updateCallbackUrlInInputs').mockImplementation(async () => undefined);

      const fakeRootState = createFakeRootState();

      await initialize.updateCallbackUrl(fakeRootState as any, dispatch);

      expect(dispatch).not.toHaveBeenCalled();
    });
  });
});
