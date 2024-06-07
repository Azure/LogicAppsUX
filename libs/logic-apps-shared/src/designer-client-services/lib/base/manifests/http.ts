import type { OperationManifest } from '../../../../utils/src';
import { SettingScope, OperationOptions, RecurrenceType } from '../../../../utils/src';

const methodOptions = [
  { value: 'GET', displayName: 'GET' },
  { value: 'PUT', displayName: 'PUT' },
  { value: 'POST', displayName: 'POST' },
  { value: 'PATCH', displayName: 'PATCH' },
  { value: 'DELETE', displayName: 'DELETE' },
];
const brandColor = '#709727';
const connector = {
  id: 'connectionProviders/http',
  name: 'http',
  properties: {
    description: 'All Http operations',
    displayName: 'HTTP',
  },
} as any;
const authenticationParameter = {
  type: 'object',
  title: 'Authentication',
  description: 'Enter JSON object of authentication parameter',
  'x-ms-visibility': 'advanced',
  'x-ms-editor': 'authentication',
  'x-ms-editor-options': {
    supportedAuthTypes: ['None', 'Basic', 'ClientCertificate', 'ActiveDirectoryOAuth', 'Raw', 'ManagedServiceIdentity'],
  },
};

const webhookParameters = {
  method: {
    type: 'string',
    title: 'Method',
    'x-ms-editor': 'combobox',
    'x-ms-editor-options': {
      options: methodOptions,
    },
  },
  uri: {
    type: 'string',
    format: 'uri',
    title: 'URI',
  },
  headers: {
    type: 'object',
    title: 'Headers',
    description: 'Enter JSON object of headers',
    'x-ms-editor': 'dictionary',
    'x-ms-editor-options': {
      valueType: 'string',
    },
  },
  body: {
    title: 'Body',
    description: 'Enter content',
    'x-ms-visibility': 'important',
  },
  authentication: authenticationParameter,
};

export const httpManifest = {
  properties: {
    inputs: {
      type: 'object',
      properties: {
        schema: {
          type: 'object',
          default: {
            type: 'object',
            properties: {},
          },
          'x-ms-editor': 'floatingactionmenu',
          'x-ms-editor-options': {
            supportedTypes: ['text', 'file', 'email', 'boolean', 'number', 'date'],
            menuKind: 'outputs',
            includeOutputDescription: true,
            includeOutputDescriptionTwo: 'true',
          },
        },
        statusCode: {
          type: 'number',
          default: 200,
          'x-ms-visibility': 'hideInUI',
        },
      },
      required: ['schema', 'statusCode'],
    },
    inputsLocation: ['inputs'],
    inputsLocationSwapMap: [
      {
        source: ['schema', 'additionalProperties', 'outputValueMap'],
        target: ['body'],
      },
    ],
    settings: {
      secureData: {
        options: {
          outputsMode: 'linkedtoinputs',
        },
      },
      trackedProperties: {
        scopes: ['action'],
      },
      operationOptions: {
        scopes: ['action'],
        options: ['Asynchronous'],
      },
    },
  },
} as OperationManifest;

export const httpTriggerManifest = {
  properties: {
    inputs: {
      type: 'object',
      properties: {
        schema: {
          type: 'object',
          'x-ms-editor': 'floatingactionmenu',
          'x-ms-editor-options': {
            supportedTypes: ['text', 'file', 'email', 'boolean', 'number', 'date'],
            isRequestApiConnectionTrigger: false,
          },
        },
      },
      required: ['schema'],
    },
    outputs: {
      type: 'object',
      properties: {
        body: {},
      },
    },
    outputsSchema: {
      outputPaths: [
        {
          outputLocation: ['properties', 'body'],
          name: 'schema',
          schema: 'Value',
        },
      ],
    },
    settings: {
      secureData: {},
      correlation: {
        scopes: ['trigger'],
      },
      concurrency: {},
    },
  },
} as OperationManifest;

export const httpWithSwaggerManifest = {
  properties: {
    iconUri:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDMyIDMyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KIDxwYXRoIGZpbGw9IiM3MDk3MjciIGQ9Im0wIDBoMzJ2MzJoLTMyeiIvPg0KIDxnIGZpbGw9IiNmZmYiPg0KICA8cGF0aCBjbGFzcz0ic3QxIiBkPSJNMTEuODE3IDIxLjIwNmMtLjM2NyAwLS42NjEtLjE0Ny0uNjYxLS41ODdsLS4wNzMtMS43NjJjLS4wNzMtMS4xMDEtLjE0Ny0yLjIwMi0xLjI0OC0yLjkzNi42NjEtLjQ0IDEuMTAxLTEuMTAxIDEuMTc0LTEuODM1bC4xNDctMi4yMDJjMC0xLjAyOC4yMi0xLjMyMSAxLjEwMS0xLjE3NGguMDczYy4wNzMtLjA3My4yMi0uMTQ3LjIyLS4yMnYtMS4yNDhoLS44MDdjLTEuMzIxIDAtMi4wNTUuNzM0LTIuMTI5IDIuMDU1LS4wNzMuNzM0LS4wNzMgMS41NDItLjA3MyAyLjI3NiAwIDEuMTAxLS4zNjcgMS4zOTUtMS4zMjEgMS42MTUtLjA3MyAwLS4yMi4yMi0uMjIuMjk0djEuMDI4YzAgLjI5NC4wNzMuMzY3LjM2Ny4zNjcuNTg3IDAgLjg4MS4yMiAxLjAyOC44MDcuMDczLjI5NC4xNDcuNjYxLjE0Ny45NTRsLjA3MyAyLjIwMmMuMDczLjczNC4yOTQgMS4zOTUgMS4wMjggMS42ODguNTg3LjI5NCAxLjI0OC4yOTQgMS45ODIuMjJ2LS42NjFjLS4wNzMtLjgwNy0uMDczLS44ODEtLjgwNy0uODgxeiIvPg0KICA8cGF0aCBjbGFzcz0ic3QxIiBkPSJNMjMuNjM1IDE1LjExM2MtLjQ0IDAtLjgwNy0uMjItLjk1NC0uNjYxbC0uMjItMS4xMDFjLS4wNzMtLjczNC0uMDczLTEuMzk1LS4wNzMtMi4xMjktLjA3My0xLjI0OC0uODA3LTEuOTA5LTEuOTgyLTEuOTgyLS45NTQtLjA3My0uOTU0LS4wNzMtLjk1NC44ODF2LjA3M2MwIC41MTQgMCAuNTE0LjUxNC41MTQuNjYxIDAgLjg4MS4yMi44ODEuODgxIDAgLjczNCAwIDEuMzk1LjA3MyAyLjEyOS4wNzMuODA3LjI5NCAxLjYxNSAxLjAyOCAyLjEyOWwuMjIuMTQ3Yy0uNzM0LjQ0LTEuMTAxIDEuMTAxLTEuMTc0IDEuOTA5LS4wNzMuNzM0LS4xNDcgMS40NjgtLjE0NyAyLjEyOSAwIDEuMDI4LS4yMiAxLjMyMS0xLjE3NCAxLjI0OC0uMDczIDAtLjI5NC4xNDctLjI5NC4yMnYxLjI0OGgxLjAyOGMxLjAyOC0uMDczIDEuNjE1LS41ODcgMS44MzUtMS42MTUuMTQ3LS41ODcuMDczLTEuMjQ4LjE0Ny0xLjgzNSAwLS40NCAwLS44ODEuMDczLTEuMzIxLjA3My0uNzM0LjQ0LTEuMTAxIDEuMTc0LTEuMTAxLjIyIDAgLjI5NC0uMDczLjI5NC0uMjk0di0uOTU0Yy4xNDctLjQ0LjA3My0uNTg3LS4yOTQtLjUxNHoiLz4NCiAgPHBhdGggY2xhc3M9InN0MSIgZD0iTTEyLjc3MSAxNS4wNGMtLjUxNCAwLS45NTQuNDQtLjk1NC45NTRzLjQ0Ljg4MS45NTQuODgxLjk1NC0uMzY3Ljk1NC0uOTU0YzAtLjUxNC0uNDQtLjg4MS0uOTU0LS44ODF6Ii8+DQogIDxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0xNi4wMDEgMTUuMDRjLS41MTQgMC0uOTU0LjM2Ny0uOTU0Ljg4MSAwIC41ODcuMzY3Ljk1NC44ODEuOTU0cy45NTQtLjM2Ny45NTQtLjg4MWMuMDczLS41ODctLjI5NC0uOTU0LS44ODEtLjk1NHoiLz4NCiAgPHBhdGggY2xhc3M9InN0MSIgZD0iTTIwLjE4NSAxNS45MmMwLS41MTQtLjQ0LS44ODEtLjk1NC0uODgxcy0uOTU0LjQ0LS45NTQuODgxYzAgLjUxNC40NC45NTQuOTU0Ljk1NHMuOTU0LS40NC45NTQtLjk1NHoiLz4NCiA8L2c+DQo8L3N2Zz4NCg==',
    brandColor,
    description: 'Choose a Swagger-enabled API to invoke.',
    summary: 'HTTP + Swagger',

    inputs: {
      type: 'object',
      properties: {
        inputs: {
          type: 'object',
          properties: {
            // Dynamic Params
            operationId: {
              required: true,
              type: 'string',
              title: 'Swagger Operation',
              description: 'Swagger Operation',
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
              description: 'Enter all swagger parameters',
              'x-ms-dynamic-properties': {
                dynamicState: {
                  extension: {
                    operationId: 'getSwaggerOperationSchema',
                  },
                  isInput: true,
                },
                parameters: {
                  type: 'object',
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
              default: 'custom',
            },
          },
          required: ['apiDefinitionUrl', 'swaggerSource'],
        },
      },
      required: ['inputs', 'metadata'],
    },
    inputsLocationSwapMap: [{ source: ['inputs', 'operationDetails'], target: ['inputs'] }],
    inputsLocation: [],
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
                operationId: 'getSwaggerOperationSchema',
              },
            },
            parameters: {
              type: 'object',
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
    },
    isOutputsOptional: false,

    customSwagger: { location: ['metadata', 'apiDefinitionUrl'] },

    connector,

    settings: {
      chunking: {
        scopes: [SettingScope.Action],
        chunkTransferSupported: true,
      },
      operationOptions: {
        scopes: [SettingScope.Action],
        options: [
          OperationOptions.DisableAsyncPattern,
          OperationOptions.DisableAutomaticDecompression,
          OperationOptions.SuppressWorkflowHeaders,
        ],
      },
      requestOptions: {
        scopes: [SettingScope.Action],
      },
      retryPolicy: {
        scopes: [SettingScope.Action],
      },
      secureData: {},
      timeout: {
        scopes: [SettingScope.Action],
      },
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;

export const httpWithSwaggerTriggerManifest = {
  properties: {
    ...httpWithSwaggerManifest.properties,

    description: 'Trigger an event based on a select Swagger-enabled API.',

    recurrence: {
      type: RecurrenceType.Advanced,
    },

    settings: {
      concurrency: {
        scopes: [SettingScope.Trigger],
      },
      correlation: {
        scopes: [SettingScope.Trigger],
      },
      retryPolicy: {
        scopes: [SettingScope.Trigger],
      },
      secureData: {},
    },
  },
};

export const httpWebhookManifest = {
  properties: {
    iconUri:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDMyIDMyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KIDxwYXRoIGZpbGw9IiM3MDk3MjciIGQ9Im0wIDBoMzJ2MzJoLTMyeiIvPg0KIDxnIGZpbGw9IiNmZmYiPg0KICA8cGF0aCBjbGFzcz0ic3QxIiBkPSJNMTEuODE3IDIxLjIwNmMtLjM2NyAwLS42NjEtLjE0Ny0uNjYxLS41ODdsLS4wNzMtMS43NjJjLS4wNzMtMS4xMDEtLjE0Ny0yLjIwMi0xLjI0OC0yLjkzNi42NjEtLjQ0IDEuMTAxLTEuMTAxIDEuMTc0LTEuODM1bC4xNDctMi4yMDJjMC0xLjAyOC4yMi0xLjMyMSAxLjEwMS0xLjE3NGguMDczYy4wNzMtLjA3My4yMi0uMTQ3LjIyLS4yMnYtMS4yNDhoLS44MDdjLTEuMzIxIDAtMi4wNTUuNzM0LTIuMTI5IDIuMDU1LS4wNzMuNzM0LS4wNzMgMS41NDItLjA3MyAyLjI3NiAwIDEuMTAxLS4zNjcgMS4zOTUtMS4zMjEgMS42MTUtLjA3MyAwLS4yMi4yMi0uMjIuMjk0djEuMDI4YzAgLjI5NC4wNzMuMzY3LjM2Ny4zNjcuNTg3IDAgLjg4MS4yMiAxLjAyOC44MDcuMDczLjI5NC4xNDcuNjYxLjE0Ny45NTRsLjA3MyAyLjIwMmMuMDczLjczNC4yOTQgMS4zOTUgMS4wMjggMS42ODguNTg3LjI5NCAxLjI0OC4yOTQgMS45ODIuMjJ2LS42NjFjLS4wNzMtLjgwNy0uMDczLS44ODEtLjgwNy0uODgxeiIvPg0KICA8cGF0aCBjbGFzcz0ic3QxIiBkPSJNMjMuNjM1IDE1LjExM2MtLjQ0IDAtLjgwNy0uMjItLjk1NC0uNjYxbC0uMjItMS4xMDFjLS4wNzMtLjczNC0uMDczLTEuMzk1LS4wNzMtMi4xMjktLjA3My0xLjI0OC0uODA3LTEuOTA5LTEuOTgyLTEuOTgyLS45NTQtLjA3My0uOTU0LS4wNzMtLjk1NC44ODF2LjA3M2MwIC41MTQgMCAuNTE0LjUxNC41MTQuNjYxIDAgLjg4MS4yMi44ODEuODgxIDAgLjczNCAwIDEuMzk1LjA3MyAyLjEyOS4wNzMuODA3LjI5NCAxLjYxNSAxLjAyOCAyLjEyOWwuMjIuMTQ3Yy0uNzM0LjQ0LTEuMTAxIDEuMTAxLTEuMTc0IDEuOTA5LS4wNzMuNzM0LS4xNDcgMS40NjgtLjE0NyAyLjEyOSAwIDEuMDI4LS4yMiAxLjMyMS0xLjE3NCAxLjI0OC0uMDczIDAtLjI5NC4xNDctLjI5NC4yMnYxLjI0OGgxLjAyOGMxLjAyOC0uMDczIDEuNjE1LS41ODcgMS44MzUtMS42MTUuMTQ3LS41ODcuMDczLTEuMjQ4LjE0Ny0xLjgzNSAwLS40NCAwLS44ODEuMDczLTEuMzIxLjA3My0uNzM0LjQ0LTEuMTAxIDEuMTc0LTEuMTAxLjIyIDAgLjI5NC0uMDczLjI5NC0uMjk0di0uOTU0Yy4xNDctLjQ0LjA3My0uNTg3LS4yOTQtLjUxNHoiLz4NCiAgPHBhdGggY2xhc3M9InN0MSIgZD0iTTEyLjc3MSAxNS4wNGMtLjUxNCAwLS45NTQuNDQtLjk1NC45NTRzLjQ0Ljg4MS45NTQuODgxLjk1NC0uMzY3Ljk1NC0uOTU0YzAtLjUxNC0uNDQtLjg4MS0uOTU0LS44ODF6Ii8+DQogIDxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0xNi4wMDEgMTUuMDRjLS41MTQgMC0uOTU0LjM2Ny0uOTU0Ljg4MSAwIC41ODcuMzY3Ljk1NC44ODEuOTU0cy45NTQtLjM2Ny45NTQtLjg4MWMuMDczLS41ODctLjI5NC0uOTU0LS44ODEtLjk1NHoiLz4NCiAgPHBhdGggY2xhc3M9InN0MSIgZD0iTTIwLjE4NSAxNS45MmMwLS41MTQtLjQ0LS44ODEtLjk1NC0uODgxcy0uOTU0LjQ0LS45NTQuODgxYzAgLjUxNC40NC45NTQuOTU0Ljk1NHMuOTU0LS40NC45NTQtLjk1NHoiLz4NCiA8L2c+DQo8L3N2Zz4NCg==',
    brandColor,
    description: 'Create a custom HTTP callback to occur when something happens.',
    summary: 'HTTP Webhook',

    inputs: {
      type: 'object',
      properties: {
        subscribe: {
          title: 'Subscribe',
          type: 'object',
          properties: webhookParameters,
          required: ['method', 'uri'],
        },
        unsubscribe: {
          title: 'Unsubscribe',
          type: 'object',
          properties: webhookParameters,
          required: [],
        },
      },
      required: ['subscribe'],
    },
    inputsLocation: ['inputs'],
    isInputsOptional: false,

    outputs: {
      type: 'object',
      required: [],
      properties: {
        body: {
          title: 'Body',
        },
        headers: {
          type: 'object',
          title: 'Headers',
        },
        queries: {
          type: 'object',
          title: 'Queries',
        },
      },
    },
    isOutputsOptional: false,

    connector,

    settings: {
      retryPolicy: {
        scopes: [SettingScope.Action],
      },
      secureData: {},
      timeout: {
        scopes: [SettingScope.Action],
      },
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;

export const httpWebhookTriggerManifest = {
  properties: {
    ...httpWebhookManifest.properties,

    description: 'Create a custom HTTP callback to trigger an action when something happens.',

    settings: {
      concurrency: {
        scopes: [SettingScope.Trigger],
      },
      correlation: {
        scopes: [SettingScope.Trigger],
      },
      retryPolicy: {
        scopes: [SettingScope.Trigger],
      },
      secureData: {},
    },
  },
};
