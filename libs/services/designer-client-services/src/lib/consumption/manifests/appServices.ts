import { coreBadge } from '../../badges';
import { RecurrenceType, SettingScope, type OperationManifest } from '@microsoft/logic-apps-shared';

const iconUri =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzJweCIgaGVpZ2h0PSIzMnB4IiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAzMiAzMiIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQogPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjNTliMmQ5Ii8+DQogPHBhdGggZD0ibTI0LjYyOCA4aC0xNy44NDN2MTZoMTguNDI5di0xNnptLTAuNjcwMTYgNy4zNzE3aC0zLjc2OTZjLTAuMzM1MDgtMi4wOTQyLTIuMDk0Mi0zLjY4NTktNC4yNzIzLTMuNjg1OS0xLjE3MjggMC0yLjI2MTggMC41MDI2Mi0zLjA5OTUgMS4yNTY1bDAuODM3NyAwLjgzNzdjMC41ODYzOS0wLjU4NjM5IDEuMzQwMy0wLjkyMTQ3IDIuMTc4LTAuOTIxNDcgMS42NzU0IDAgMy4wOTk1IDEuMzQwMyAzLjA5OTUgMy4wOTk1cy0xLjI1NjUgMy4wOTk1LTIuOTMxOSAzLjA5OTVjLTAuODM3NyAwLTEuNTkxNi0wLjMzNTA4LTIuMTc4LTAuOTIxNDdsLTAuODM3NyAwLjgzNzdjMC44Mzc3IDAuODM3NyAxLjkyNjcgMS4yNTY1IDMuMDk5NSAxLjI1NjUgMi4xNzggMCAzLjkzNzItMS41OTE2IDQuMjcyMy0zLjY4NTloMy43Njk2djYuMTE1MmgtMTYuMDg0di02LjExNTJoNi45NTI5YzAuMjUxMzEgMC4zMzUwOCAwLjU4NjM5IDAuNTg2MzkgMS4wODkgMC41ODYzOSAwLjY3MDE2IDAgMS4yNTY1LTAuNTg2MzkgMS4yNTY1LTEuMjU2NSAwLTAuNjcwMTYtMC41ODYzOS0xLjI1NjUtMS4yNTY1LTEuMjU2NS0wLjQxODg1IDAtMC44Mzc3IDAuMjUxMzEtMS4wODkgMC41ODYzOWgtNi45NTI5di02LjAzMTRoMTZ2Ni4xOTl6IiBmaWxsPSIjZmZmIiBzdHJva2Utd2lkdGg9Ii44Mzc3Ii8+DQo8L3N2Zz4NCg==';

const brandColor = '#59B2D9';

const connector = {
  id: '/connectionProviders/appService',
  name: 'connectionProviders/appService',
  type: 'appservice',
  properties: {
    displayName: 'Azure App Services',
    description: 'Azure App Services',
    iconUri,
    brandColor,
  },
};

export const appServiceActionManifest = {
  properties: {
    iconUri,
    brandColor,
    summary: 'Choose an App Services action',
    description: `Show APIs for App Services in my subscription`,

    environmentBadge: coreBadge,

    inputs: {
      type: 'object',
      properties: {
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
            // Dynamic Params
            operationId: {
              required: true,
              type: 'string',
              title: 'Operation Id',
              description: 'Operation Id',
              'x-ms-serialization': { skip: true },
              'x-ms-deserialization': {
                type: 'swaggeroperationid',
                parameterReference: 'inputs.operationId',
                options: {
                  swaggerOperation: {
                    methodPath: ['inputs', 'operationDetails', 'method'],
                    uriPath: ['inputs', 'operationDetails', 'uri'],
                  },
                },
              },
              'x-ms-dynamic-list': {
                dynamicState: {
                  operationId: 'getSwaggerOperations',
                  parameters: {},
                },
                parameters: {
                  swaggerUrl: {
                    parameterReference: 'metadata.apiDefinitionUrl',
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
                    operationId: 'getAppserviceSwaggerOperationSchema',
                  },
                  isInput: true,
                },
                parameters: {
                  operationId: {
                    parameterReference: 'inputs.operationId',
                    required: true,
                  },
                  swaggerUrl: {
                    parameterReference: 'metadata.apiDefinitionUrl',
                    required: true,
                  },
                },
              },
            },
          },
          required: ['operationId'],
        },
        metadata: {
          type: 'object',
          properties: {
            apiDefinitionUrl: {
              type: 'string',
              hideInUI: true,
            },
            swaggerSource: {
              type: 'string',
              hideInUI: true,
              default: 'website',
            },
          },
          required: ['apiDefinitionUrl', 'swaggerSource'],
        },
      },
      required: ['inputs', 'metadata'],
    },
    inputsLocation: [],
    inputsLocationSwapMap: [{ source: ['inputs', 'operationDetails'], target: ['inputs'] }],
    isInputsOptional: false,

    outputs: {
      'x-ms-dynamic-properties': {
        dynamicState: {
          extension: {
            operationId: 'getAppserviceSwaggerOperationSchema',
          },
        },
        parameters: {
          operationId: {
            parameterReference: 'inputs.operationId',
            required: true,
          },
          swaggerUrl: {
            parameterReference: 'metadata.apiDefinitionUrl',
            required: true,
          },
        },
      },
    },
    isOutputsOptional: false,

    customSwagger: { location: ['metadata', 'apiDefinitionUrl'] },

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

export const appServiceTriggerManifest = {
  properties: {
    ...appServiceActionManifest.properties,
    summary: 'Choose an App Services trigger',
    description: `Show APIs for App Services in my subscription`,

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
