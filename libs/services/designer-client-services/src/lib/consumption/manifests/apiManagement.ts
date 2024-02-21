import { coreBadge } from '../../badges';
import { SettingScope, type OperationManifest, RecurrenceType } from '@microsoft/logic-apps-shared';

const iconUri = 'https://logicappsv2resources.blob.core.windows.net/icons/apimanagement.svg';

const brandColor = '#68217A';

const connector = {
  id: '/connectionProviders/apiManagementOperation',
  name: 'apiManagementOperation',
  type: 'apimanagement',
  properties: {
    displayName: 'API Management operations',
    description: 'API Management operations',
    iconUri,
    brandColor,
  },
};

export const apiManagementActionManifest = {
  properties: {
    iconUri,
    brandColor,
    summary: 'Choose an Azure API Management action',
    description: `Show API Management APIs in my subscription`,

    environmentBadge: coreBadge,

    customSwagger: {
      service: {
        name: 'apimanagement',
        operationId: 'fetchApiMSwagger',
        parameters: {
          apiId: {
            parameterReference: 'api.id',
          },
        },
      },
    },

    inputs: {
      type: 'object',
      properties: {
        authentication: {
          type: 'object',
          title: 'Authentication',
          description: 'Enter JSON object of authentication parameter',
          'x-ms-editor': 'authentication',
          'x-ms-editor-options': {
            supportedAuthTypes: ['None', 'Basic', 'ClientCertificate', 'ActiveDirectoryOAuth', 'Raw', 'ManagedServiceIdentity'],
          },
        },
        subscriptionKey: {
          type: 'string',
          title: 'Subscription key',
          description: 'Enter subscription key',
        },
        api: {
          type: 'object',
          title: 'API',
          properties: {
            id: {
              type: 'string',
              'x-ms-visibility': 'hideInUI',
            },
          },
          required: ['id'],
        },
        // Dynamic params
        operationId: {
          type: 'string',
          title: 'Operation Id',
          description: 'Operation Id',
          'x-ms-serialization': { skip: true },
          'x-ms-deserialization': {
            type: 'swaggeroperationid',
            parameterReference: 'operationId',
            options: {
              swaggerOperation: {
                methodPath: ['operationDetails', 'method'],
                templatePath: ['operationDetails', 'pathTemplate', 'template'],
              },
            },
          },
          'x-ms-dynamic-list': {
            dynamicState: {
              operationId: 'getApimOperations',
            },
            parameters: {
              type: 'object',
              apiId: {
                parameterReference: 'api.id',
                required: true,
              },
            },
          },
        },
        operationDetails: {
          description: 'Operation parameters for the above operation',
          'x-ms-dynamic-properties': {
            dynamicState: {
              extension: {
                operationId: 'getApimOperationSchema',
              },
              isInput: true,
            },
            parameters: {
              apiId: {
                parameterReference: 'api.id',
                required: true,
              },
              operationId: {
                parameterReference: 'operationId',
                required: true,
              },
            },
          },
        },
      },
      required: ['api', 'operationId', 'operationDetails'],
    },

    inputsLocationSwapMap: [{ source: ['operationDetails'], target: [] }],
    isInputsOptional: false,
    outputs: {
      'x-ms-dynamic-properties': {
        dynamicState: {
          extension: {
            operationId: 'getApimOperationSchema',
          },
        },
        parameters: {
          apiId: {
            parameterReference: 'api.id',
            required: true,
          },
          operationId: {
            parameterReference: 'operationId',
            required: true,
          },
        },
      },
    },
    isOutputsOptional: false,
    settings: {
      secureData: {},
      trackedProperties: {
        scopes: ['action'],
      },
      retryPolicy: {
        scopes: ['action'],
      },
      operationOptions: {
        options: ['DisableAsyncPattern'],
        scopes: ['action'],
      },
    },
    includeRootOutputs: true,
    connector,
  },
} as OperationManifest;

export const apiManagementTriggerManifest = {
  properties: {
    ...apiManagementActionManifest.properties,
    summary: 'Choose an Azure API Management trigger',
    description: `Show API Management APIs in my subscription`,

    recurrence: {
      type: RecurrenceType.Basic,
    },
    settings: {
      concurrency: { scopes: [SettingScope.Trigger] },
      retryPolicy: { scopes: [SettingScope.Trigger] },
      secureData: {},
    },
  },
} as OperationManifest;
