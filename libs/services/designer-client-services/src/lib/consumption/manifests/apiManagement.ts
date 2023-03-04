import { coreBadge } from '../../badges';
import type { OperationManifest } from '@microsoft/utils-logic-apps';

const iconUri = 'https://logicappsv2resources.blob.core.windows.net/icons/apimanagement.svg';

const brandColor = '#68217A';

const connector = {
  id: 'connectionProviders/apiManagementOperation',
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

    inputs: {
      type: 'object',
      properties: {
        authentication: {
          type: 'object',
          title: 'Authentication',
          description: 'Enter JSON object of authentication parameter',
          'x-ms-visibility': 'advanced',
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
          'x-ms-visibility': 'hideInUI',
          properties: {
            id: {
              type: 'string',
              'x-ms-visibility': 'hideInUI',
            },
          },
        },
        method: {
          type: 'string',
          'x-ms-visibility': 'hideInUI',
        },
        pathTemplate: {
          type: 'object',
          'x-ms-visibility': 'hideInUI',
          properties: {
            template: {
              type: 'string',
              'x-ms-visibility': 'hideInUI',
            },
            parameters: {
              type: 'object',
              'x-ms-visibility': 'hideInUI',
            },
          },
        },
        // Dynamic params
        apiManagement: {
          type: 'object',
          properties: {
            operationId: {
              type: 'string',
              title: 'Operation Id',
              description: 'Operation Id',
              'x-ms-dynamic-list': {
                dynamicState: {
                  operationId: 'getApimOperations',
                  parameters: {},
                },
                parameters: {},
              },
            },
          },
          required: ['operationId'],
        },
        operationDetails: {
          title: 'Operation Parameters',
          description: 'Operation parameters for the above operation',
          'x-ms-dynamic-properties': {
            dynamicState: {
              extension: {
                operationId: 'getApimOperationSchema',
              },
              isInput: true,
            },
            parameters: {
              type: 'object',
              operationId: {
                parameterReference: 'apiManagement.operationId',
                required: true,
              },
            },
          },
        },
      },
      required: ['apiManagement'],
    },

    inputsLocation: ['inputs'],
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
          type: 'object',
          operationId: {
            parameterReference: 'apiManagement.operationId',
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
    iconUri,
    brandColor,
    summary: 'Choose an Azure API Management trigger',
    description: `Show API Management APIs in my subscription`,

    environmentBadge: coreBadge,

    inputs: {},
    isInputsOptional: false,

    outputs: {},
    isOutputsOptional: false,
    includeRootOutputs: true,

    connector,

    settings: {},
  },
} as OperationManifest;
