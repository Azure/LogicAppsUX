import { OperationOptions, RecurrenceType, SettingScope } from '@microsoft-logic-apps/utils';
import type { OperationManifest } from '@microsoft-logic-apps/utils';

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
  authentication: {
    type: 'object',
    title: 'Authentication',
  },
};

export const httpManifest = {
  properties: {
    iconUri:
      'data:image/svg+xml;base64,PCEtLSBQbGVhc2UgbGV0IHRoZSBGbG93IHRlYW0ga25vdyBpZiB0aGlzIGNoYW5nZXMuIEl0IG5lZWRzIHRvIGFsc28gYmUgY2hhbmdlZCBpbiB0aGUgUG93ZXJBcHBzLVBvcnRhbCBmb3IgRExQIFBvbGljaWVzICgvc3JjL1BvcnRhbC9Db250ZW50L0ltYWdlcy9Db25uZWN0aW9ucy9odHRwLWNvbm5lY3Rvci1pY29uLnN2ZykgLS0+DQo8c3ZnIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQogPHBhdGggZmlsbD0iIzcwOTcyNyIgZD0ibTAgMGgzMnYzMmgtMzJ6Ii8+DQogPGcgZmlsbD0iI2ZmZiI+DQogIDxwYXRoIGQ9Ik0yMS4xMjcgMTAuOTgyYy0xLjA5MS0xLjgxOC0yLjk4Mi0yLjk4Mi01LjE2NC0yLjk4MnMtNC4wNzMgMS4xNjQtNS4wOTEgMi45MDljLS41MDkuODczLS44IDEuODkxLS44IDIuOTgyIDAgMy4wNTUgMi4zMjcgNS41MjcgNS4yMzYgNS44OTF2MS4wMThoMS4zODJ2LTEuMDE4YzIuOTgyLS4zNjQgNS4yMzYtMi44MzYgNS4yMzYtNS44OTEgMC0xLjAxOC0uMjkxLTIuMDM2LS44LTIuOTA5em0tMS4wMTguNTgyYy0uNDM2LjIxOC0xLjA5MS40MzYtMS44OTEuNTgyLS4xNDUtMS4xNjQtLjQzNi0yLjEwOS0uODczLTIuNzY0IDEuMTY0LjM2NCAyLjEwOSAxLjA5MSAyLjc2NCAyLjE4MnptLTIuMjU1IDIuNGMwIC42NTUtLjA3MyAxLjIzNi0uMTQ1IDEuNzQ1LS41MDkuMDczLTEuMDkxLjA3My0xLjc0NS4wNzNzLTEuMjM2IDAtMS43NDUtLjA3M2MtLjA3My0uNTgyLS4xNDUtMS4xNjQtLjE0NS0xLjc0NSAwLS40MzYgMC0uODczLjA3My0xLjMwOS41ODIuMDczIDEuMTY0LjE0NSAxLjgxOC4xNDVzMS4yMzYtLjA3MyAxLjgxOC0uMTQ1bC4wNzMgMS4zMDl6bS0xLjg5MS00LjhjLjIxOCAwIC40MzYgMCAuNjU1LjA3My40MzYuNTA5Ljg3MyAxLjYgMS4wOTEgMi45ODItLjUwOS4wNzMtMS4wOTEuMTQ1LTEuNzQ1LjE0NXMtMS4yMzYtLjA3My0xLjc0NS0uMTQ1Yy4yMTgtMS4zODIuNTgyLTIuNDczIDEuMDkxLTIuOTgyLjIxOC0uMDczLjQzNi0uMDczLjY1NS0uMDczem0tMS4zODIuMjE4Yy0uMzY0LjY1NS0uNzI3IDEuNi0uODczIDIuNzY0LS44LS4xNDUtMS40NTUtLjM2NC0xLjg5MS0uNTgyLjY1NS0xLjA5MSAxLjYtMS44MTggMi43NjQtMi4xODJ6bS0zLjQxOCA0LjU4MmMwLS43MjcuMTQ1LTEuMzgyLjQzNi0yLjAzNi41MDkuMjkxIDEuMjM2LjUwOSAyLjEwOS42NTUtLjA3My40MzYtLjA3My44NzMtLjA3MyAxLjM4MmwuMDczIDEuNzQ1Yy0xLjE2NC0uMTQ1LTEuOTY0LS40MzYtMi40NzMtLjcyN2wtLjA3My0xLjAxOHptLjI5MSAxLjZjLjU4Mi4yOTEgMS40NTUuNDM2IDIuMzI3LjU4Mi4xNDUuOTQ1LjQzNiAxLjgxOC44IDIuNC0xLjQ1NS0uNDM2LTIuNjE4LTEuNTI3LTMuMTI3LTIuOTgyem01LjE2NCAzLjEyN2wtLjY1NS4wNzNzLS40MzYgMC0uNjU1LS4wNzNjLS40MzYtLjUwOS0uOC0xLjMwOS0uOTQ1LTIuNDczLjU4Mi4wNzMgMS4wOTEuMDczIDEuNjczLjA3M3MxLjA5MSAwIDEuNjczLS4wNzNjLS4yOTEgMS4xNjQtLjY1NSAxLjk2NC0xLjA5MSAyLjQ3M3ptLjcyNy0uMTQ1Yy4zNjQtLjU4Mi42NTUtMS40NTUuOC0yLjQuODczLS4xNDUgMS43NDUtLjI5MSAyLjMyNy0uNTgyLS41MDkgMS40NTUtMS42NzMgMi41NDUtMy4xMjcgMi45ODJ6bTMuMjczLTMuNTY0Yy0uNTA5LjI5MS0xLjMwOS41ODItMi40NzMuNzI3LjA3My0uNTA5LjA3My0xLjA5MS4wNzMtMS43NDUgMC0uNDM2IDAtLjk0NS0uMDczLTEuMzgyLjgtLjE0NSAxLjUyNy0uMzY0IDIuMTA5LS42NTUuMjkxLjU4Mi40MzYgMS4zMDkuNDM2IDIuMDM2LjA3My4zNjQgMCAuNjU1LS4wNzMgMS4wMTh6TTEzLjg1NSAyMS4xNjRoNC4yMTh2MS44OTFoLTQuMjE4ek0xOC4zNjQgMjEuNjczaDEuNTI3djEuMzgyaC0xLjUyN3pNMTEuOTY0IDIxLjY3M2gxLjUyN3YxLjM4MmgtMS41Mjd6TTE1LjIzNiAyMy40MThoMS4zODJ2LjU4MmgtMS4zODJ6Ii8+DQogPC9nPg0KPC9zdmc+DQo=',
    brandColor,
    description: 'Choose a REST API to invoke.',
    summary: 'HTTP',

    inputs: {
      type: 'object',
      properties: {
        uri: {
          type: 'string',
          format: 'uri',
          title: 'URI',
          description: 'Enter request url',
        },
        method: {
          type: 'string',
          title: 'Method',
          'x-ms-editor': 'combobox',
          'x-ms-editor-options': {
            options: methodOptions,
          },
        },
        headers: {
          type: 'object',
          title: 'Headers',
          description: 'Enter JSON object of request headers',
          'x-ms-editor': 'dictionary',
          'x-ms-editor-options': {
            valueType: 'string',
          },
          'x-ms-visibility': 'important',
        },
        queries: {
          type: 'object',
          title: 'Queries',
          description: 'Enter JSON object of query string parameters',
          'x-ms-editor': 'dictionary',
          'x-ms-editor-options': {
            valueType: 'string',
          },
          'x-ms-visibility': 'important',
        },
        body: {
          title: 'Body',
          description: 'Enter request content',
          'x-ms-visibility': 'important',
        },
        cookie: {
          type: 'string',
          title: 'Cookie',
          description: 'Enter HTTP cookie',
          'x-ms-visibility': 'important',
        },
        authentication: {
          type: 'object',
          title: 'Authentication',
          description: 'Enter JSON object of authentication parameter',
          'x-ms-editor': 'authentication',
          'x-ms-editor-options': {
            legacy: true,
          },
        },
      },
      required: ['uri', 'method'],
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
        statusCode: {
          type: 'integer',
          title: 'Status code',
        },
      },
    },
    isOutputsOptional: false,

    connector,

    settings: {
      chunking: {
        scopes: [SettingScope.Action],
        chunkTransferSupported: true,
      },
      operationOptions: {
        scopes: [SettingScope.Action],
        options: [OperationOptions.Asynchronous, OperationOptions.DisableAutomaticDecompression, OperationOptions.SuppressWorkflowHeaders],
      },
      paging: {
        scopes: [SettingScope.Action],
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

export const httpTriggerManifest = {
  properties: {
    ...httpManifest.properties,
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
} as OperationManifest;

// TODO - Might need more metadata here if can be generalised.
export const httpWithSwaggerManifest = {
  properties: {
    iconUri:
      'data:image/svg+xml;base64,PCEtLSBQbGVhc2UgbGV0IHRoZSBGbG93IHRlYW0ga25vdyBpZiB0aGlzIGNoYW5nZXMuIEl0IG5lZWRzIHRvIGFsc28gYmUgY2hhbmdlZCBpbiB0aGUgUG93ZXJBcHBzLVBvcnRhbCBmb3IgRExQIFBvbGljaWVzICgvc3JjL1BvcnRhbC9Db250ZW50L0ltYWdlcy9Db25uZWN0aW9ucy9odHRwLXdlYmhvb2stY29ubmVjdG9yLWljb24uc3ZnKSAtLT4NCjxzdmcgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiA8cGF0aCBmaWxsPSIjNzA5NzI3IiBkPSJtMCAwaDMydjMyaC0zMnoiLz4NCiA8ZyBmaWxsPSIjZmZmIj4NCiAgPHBhdGggZD0iTTIwLjEyOCAyMS4xODdjLjg3NyAwIDEuNjA3LS43MzEgMS42MDctMS42MDcgMC0uODc3LS43MzEtMS42MDctMS42MDctMS42MDctLjY1OCAwLTEuMjQyLjM2NS0xLjQ2MS45NWgtNC4xNjR2LjY1OGMwIDEuNDYxLTEuMTY5IDIuNTU3LTIuNTU3IDIuNTU3LTEuNDYxIDAtMi41NTctMS4xNjktMi41NTctMi41NTcgMC0xLjI0Mi44MDQtMi4yNjUgMS45NzMtMi40ODRsLS4yOTItMS4zMTVjLTEuODI2LjM2NS0zLjA2OCAxLjk3My0zLjA2OCAzLjc5OSAwIDIuMTkyIDEuNzUzIDMuOTQ1IDMuOTQ1IDMuOTQ1IDEuOSAwIDMuNTA3LTEuMzg4IDMuODcyLTMuMjE1aDIuOTIyYy4yMTkuNTExLjczMS44NzcgMS4zODguODc3eiIvPg0KICA8cGF0aCBkPSJNMTAuMjY1IDE5LjU4YzAgLjg3Ny43MzEgMS42MDcgMS42MDcgMS42MDcuODc3IDAgMS42MDctLjczMSAxLjYwNy0xLjYwNyAwLS4zNjUtLjE0Ni0uNjU4LS4yOTItLjk1bDIuMTE5LTMuNzI2LTEuMTY5LS42NThjLS41MTEtLjUxMS0uODA0LTEuMTY5LS44MDQtMS44MjYgMC0xLjQ2MSAxLjE2OS0yLjU1NyAyLjU1Ny0yLjU1NyAxLjQ2MSAwIDIuNTU3IDEuMTY5IDIuNTU3IDIuNTU3IDAgLjIxOSAwIC40MzgtLjA3My42NThsMS4zMTUuMzY1Yy4wNzMtLjI5Mi4xNDYtLjY1OC4xNDYtMS4wMjMgMC0yLjE5Mi0xLjc1My0zLjk0NS0zLjk0NS0zLjk0NXMtMy45NDUgMS43NTMtMy45NDUgMy45NDVjMCAxLjE2OS41MTEgMi4yNjUgMS4zODggMi45OTVsLTEuNDYxIDIuNTU3aC0uMTQ2Yy0uNzMxIDAtMS40NjEuNzMxLTEuNDYxIDEuNjA3eiIvPg0KICA8cGF0aCBkPSJNMjAuMTI4IDE1LjYzNWMtLjQzOCAwLS45NS4wNzMtMS4zODguMjE5bC0xLjQ2MS0yLjU1N2MuMjE5LS4yOTIuMjkyLS41ODQuMjkyLS45NSAwLS44NzctLjczMS0xLjYwNy0xLjYwNy0xLjYwNy0uODc3IDAtMS42MDcuNzMxLTEuNjA3IDEuNjA3IDAgLjg3Ny43MzEgMS42MDcgMS42MDcgMS42MDdoLjE0NmwyLjExOSAzLjcyNiAxLjE2OS0uNjU4Yy4yMTktLjA3My40MzgtLjA3My42NTgtLjA3MyAxLjQ2MSAwIDIuNTU3IDEuMTY5IDIuNTU3IDIuNTU3IDAgMS40NjEtMS4xNjkgMi41NTctMi41NTcgMi41NTctLjY1OCAwLTEuMzE1LS4yOTItMS44MjYtLjczMWwtLjk1Ljk1Yy43MzEuNzMxIDEuNzUzIDEuMTY5IDIuNzc2IDEuMTY5IDIuMTkyIDAgMy45NDUtMS43NTMgMy45NDUtMy45NDVzLTEuNjgtMy44NzItMy44NzItMy44NzJ6Ii8+DQogPC9nPg0KLTwvc3ZnPg0K',
    brandColor,
    description: 'Choose a Swagger-enabled API to invoke.',
    summary: 'HTTP + Swagger',

    inputs: {
      type: 'object',
      properties: {
        swaggerEndpoint: {
          type: 'string',
          title: 'Swagger Endpoint url',
          description: 'Example: https://myapi.azurewebsites.net/swagger/docs/v1',
          'x-ms-serialization': 'uionly',
        },
        parameters: {
          title: 'Swagger Parameters',
          description: 'Enter all swagger parameters',
          'x-ms-dynamic-properties': {
            dynamicState: {
              extension: {
                operationId: 'getHttpSwagger',
              },
              isInput: true,
            },
            parameters: {
              uri: {
                parameterReference: {
                  name: 'swaggerEndpoint',
                  required: true,
                },
              },
            },
          },
        },
      },
      required: ['swaggerEndpoint'],
    },
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
                operationId: 'getHttpSwagger',
              },
            },
            parameters: {
              uri: {
                parameterReference: {
                  name: 'swaggerEndpoint',
                  required: true,
                },
              },
            },
          },
        },
      },
    },
    isOutputsOptional: false,

    connector,

    settings: {
      chunking: {
        scopes: [SettingScope.Action],
        chunkTransferSupported: true,
      },
      operationOptions: {
        scopes: [SettingScope.Action],
        options: [OperationOptions.Asynchronous, OperationOptions.DisableAutomaticDecompression, OperationOptions.SuppressWorkflowHeaders],
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
    outputTokens: {
      builtIns: [{ name: 'listCallbackUrl()', title: 'Callback url', type: 'string', required: true }],
    },

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
