import { coreBadge } from '../../badges';
import type { OperationManifest } from '@microsoft/logic-apps-shared';

const iconUri =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDY0IDY0IiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiA8cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiMzOTk5YzYiIHN0cm9rZS13aWR0aD0iLjUiLz4NCiA8ZyB0cmFuc2Zvcm09Im1hdHJpeCguMzEwMDggMCAwIC4zMTAwOCA2LjA3NzUgNi4wNzc1KSIgZmlsbD0iI2ZmZiI+DQogIDxwYXRoIGQ9Im02MS42IDMyLjRjMC42LTAuNiAwLjQtMS41IDAtMmwtMi43LTIuNy0xMi4xLTExLjhjLTAuNi0wLjYtMS4zLTAuNi0xLjkgMHMtMC43IDEuNSAwIDJsMTIuNyAxMi40YzAuNiAwLjYgMC42IDEuNSAwIDJsLTEyLjkgMTIuOWMtMC42IDAuNi0wLjYgMS41IDAgMiAwLjYgMC42IDEuNSAwLjQgMS45IDBsMTItMTEuOSAwLjEtMC4xeiIvPg0KICA8cGF0aCBkPSJtMi40IDMyLjRjLTAuNi0wLjYtMC40LTEuNSAwLTJsMi43LTIuNyAxMi4xLTExLjhjMC42LTAuNiAxLjMtMC42IDEuOSAwczAuNyAxLjUgMCAybC0xMi41IDEyLjVjLTAuNiAwLjYtMC42IDEuNSAwIDJsMTIuNyAxMi45YzAuNiAwLjYgMC42IDEuNSAwIDItMC42IDAuNi0xLjUgMC40LTEuOSAwbC0xMi4yLTExLjgtMC4xLTAuMXoiLz4NCiAgPHBvbHlnb24gcG9pbnRzPSI0NS43IDYuMiAyOC42IDYuMiAxOS40IDMyLjEgMzAuNiAzMi4yIDIxLjggNTcuOCA0NiAyMy42IDM0LjIgMjMuNiIvPg0KIDwvZz4NCjwvc3ZnPg0K';

const brandColor = '#3999C6';

const connector = {
  id: '/connectionProviders/azureFunctionOperation',
  name: 'connectionProviders/azureFunctionOperation',
  properties: {
    displayName: 'Azure Swagger Functions',
    description: 'Azure Swagger Functions',
    iconUri,
    brandColor,
    capabilities: ['actions'],
  },
};

export const selectSwaggerFunctionManifest = {
  properties: {
    iconUri,
    brandColor,
    summary: 'Choose an Azure swagger function',
    description: 'Show Azure Swagger Functions in my subscription',

    environmentBadge: coreBadge,

    customSwagger: {
      service: {
        name: 'function',
        operationId: 'fetchFunctionAppSwagger',
        parameters: {
          apiId: {
            parameterReference: 'functionApp.id',
          },
        },
      },
    },

    inputs: {
      type: 'object',
      properties: {
        functionApp: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              'x-ms-visibility': 'hideInUI',
            },
          },
        },

        // Dynamic params
        operationId: {
          required: true,
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
                uriPath: ['operationDetails', 'uri'],
              },
            },
          },
          'x-ms-dynamic-list': {
            dynamicState: {
              operationId: 'getSwaggerFunctionOperations',
            },
            parameters: {
              functionAppId: {
                parameterReference: 'functionApp.id',
                required: true,
              },
            },
          },
        },
        operationDetails: {
          title: 'Operation Parameters',
          description: 'Operation parameters for the above operation',
          'x-ms-dynamic-properties': {
            dynamicState: {
              extension: {
                operationId: 'getSwaggerFunctionOperationSchema',
              },
              isInput: true,
            },
            parameters: {
              operationId: {
                parameterReference: 'operationId',
                required: true,
              },
              functionAppId: {
                parameterReference: 'functionApp.id',
                required: true,
              },
            },
          },
        },
      },
      required: ['operationId'],
    },
    inputsLocationSwapMap: [{ source: ['operationDetails'], target: [] }],
    inputsLocation: ['inputs'],
    isInputsOptional: false,

    outputs: {
      type: 'object',
      required: [],
      properties: {
        body: {
          title: 'Body',
          'x-ms-dynamic-properties': {
            dynamicState: {
              extension: {
                operationId: 'getSwaggerFunctionOperationSchema',
              },
            },
            parameters: {
              operationId: {
                parameterReference: 'operationId',
                required: true,
              },
              functionAppId: {
                parameterReference: 'functionApp.id',
                required: true,
              },
            },
          },
        },
      },
    },
    isOutputsOptional: false,
    includeRootOutputs: true,

    connector,

    settings: {},
  },
} as unknown as OperationManifest;
