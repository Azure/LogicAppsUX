import { coreBadge } from '../../badges';
import type { OperationManifest } from '@microsoft/utils-logic-apps';

const iconUri =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzJweCIgaGVpZ2h0PSIzMnB4IiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAzMiAzMiIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQogPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjNTliMmQ5Ii8+DQogPHBhdGggZD0ibTI0LjYyOCA4aC0xNy44NDN2MTZoMTguNDI5di0xNnptLTAuNjcwMTYgNy4zNzE3aC0zLjc2OTZjLTAuMzM1MDgtMi4wOTQyLTIuMDk0Mi0zLjY4NTktNC4yNzIzLTMuNjg1OS0xLjE3MjggMC0yLjI2MTggMC41MDI2Mi0zLjA5OTUgMS4yNTY1bDAuODM3NyAwLjgzNzdjMC41ODYzOS0wLjU4NjM5IDEuMzQwMy0wLjkyMTQ3IDIuMTc4LTAuOTIxNDcgMS42NzU0IDAgMy4wOTk1IDEuMzQwMyAzLjA5OTUgMy4wOTk1cy0xLjI1NjUgMy4wOTk1LTIuOTMxOSAzLjA5OTVjLTAuODM3NyAwLTEuNTkxNi0wLjMzNTA4LTIuMTc4LTAuOTIxNDdsLTAuODM3NyAwLjgzNzdjMC44Mzc3IDAuODM3NyAxLjkyNjcgMS4yNTY1IDMuMDk5NSAxLjI1NjUgMi4xNzggMCAzLjkzNzItMS41OTE2IDQuMjcyMy0zLjY4NTloMy43Njk2djYuMTE1MmgtMTYuMDg0di02LjExNTJoNi45NTI5YzAuMjUxMzEgMC4zMzUwOCAwLjU4NjM5IDAuNTg2MzkgMS4wODkgMC41ODYzOSAwLjY3MDE2IDAgMS4yNTY1LTAuNTg2MzkgMS4yNTY1LTEuMjU2NSAwLTAuNjcwMTYtMC41ODYzOS0xLjI1NjUtMS4yNTY1LTEuMjU2NS0wLjQxODg1IDAtMC44Mzc3IDAuMjUxMzEtMS4wODkgMC41ODYzOWgtNi45NTI5di02LjAzMTRoMTZ2Ni4xOTl6IiBmaWxsPSIjZmZmIiBzdHJva2Utd2lkdGg9Ii44Mzc3Ii8+DQo8L3N2Zz4NCg==';

const brandColor = '#59B2D9';

const connector = {
  id: 'connectionProviders/appService',
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

    inputsLocation: ['inputs'],
    inputs: {
      type: 'object',
      properties: {
        metadata: {
          type: 'object',
          required: [],
          properties: {
            apiDefinitionUrl: {
              type: 'string',
              'x-ms-visibility': 'hideInUI',
            },
            swaggerSource: {
              type: 'string',
              'x-ms-visibility': 'hideInUI',
            },
          },
        },
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
        uri: {
          type: 'string',
          'x-ms-visibility': 'hideInUI',
        },
        method: {
          type: 'string',
          'x-ms-visibility': 'hideInUI',
        },
        // Dynamic params
        appService: {
          type: 'object',
          properties: {
            operationId: {
              required: true,
              type: 'string',
              title: 'Operation Id',
              description: 'Operation Id',
              'x-ms-dynamic-list': {
                dynamicState: {
                  operationId: 'getAppServiceOperations',
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
                operationId: 'getAppServiceOperationSchema',
              },
              isInput: true,
            },
            parameters: {
              type: 'object',
              operationId: {
                parameterReference: 'appService.operationId',
                required: true,
              },
            },
          },
        },
      },
    },
    inputsLocationSwapMap: [
      { source: ['operationDetails'], target: [] },
      { source: ['metadata'], target: [] },
    ],
    isInputsOptional: false,

    outputs: {
      'x-ms-dynamic-properties': {
        dynamicState: {
          extension: {
            operationId: 'getAppServiceOperationSchema',
          },
        },
        parameters: {
          type: 'object',
          operationId: {
            parameterReference: 'appService.operationId',
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

export const appServiceTriggerManifest = {
  properties: {
    iconUri,
    brandColor,
    summary: 'Choose an App Services trigger',
    description: `Show APIs for App Services in my subscription`,

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
