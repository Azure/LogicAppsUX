import { coreBadge } from '../../badges';
import type { OperationManifest } from '@microsoft/logic-apps-shared';

const iconUri =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDY0IDY0IiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiA8cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiMzOTk5YzYiIHN0cm9rZS13aWR0aD0iLjUiLz4NCiA8ZyB0cmFuc2Zvcm09Im1hdHJpeCguMzEwMDggMCAwIC4zMTAwOCA2LjA3NzUgNi4wNzc1KSIgZmlsbD0iI2ZmZiI+DQogIDxwYXRoIGQ9Im02MS42IDMyLjRjMC42LTAuNiAwLjQtMS41IDAtMmwtMi43LTIuNy0xMi4xLTExLjhjLTAuNi0wLjYtMS4zLTAuNi0xLjkgMHMtMC43IDEuNSAwIDJsMTIuNyAxMi40YzAuNiAwLjYgMC42IDEuNSAwIDJsLTEyLjkgMTIuOWMtMC42IDAuNi0wLjYgMS41IDAgMiAwLjYgMC42IDEuNSAwLjQgMS45IDBsMTItMTEuOSAwLjEtMC4xeiIvPg0KICA8cGF0aCBkPSJtMi40IDMyLjRjLTAuNi0wLjYtMC40LTEuNSAwLTJsMi43LTIuNyAxMi4xLTExLjhjMC42LTAuNiAxLjMtMC42IDEuOSAwczAuNyAxLjUgMCAybC0xMi41IDEyLjVjLTAuNiAwLjYtMC42IDEuNSAwIDJsMTIuNyAxMi45YzAuNiAwLjYgMC42IDEuNSAwIDItMC42IDAuNi0xLjUgMC40LTEuOSAwbC0xMi4yLTExLjgtMC4xLTAuMXoiLz4NCiAgPHBvbHlnb24gcG9pbnRzPSI0NS43IDYuMiAyOC42IDYuMiAxOS40IDMyLjEgMzAuNiAzMi4yIDIxLjggNTcuOCA0NiAyMy42IDM0LjIgMjMuNiIvPg0KIDwvZz4NCjwvc3ZnPg0K';

const brandColor = '#3999C6';

const connector = {
  id: '/connectionProviders/azureFunctionOperation',
  name: 'connectionProviders/azureFunctionOperation',
  properties: {
    displayName: 'Azure Functions',
    description: 'Azure Functions',
    iconUri,
    brandColor,
    capabilities: ['actions'],
  },
};

export const selectFunctionManifest = {
  properties: {
    iconUri,
    brandColor,
    summary: 'Choose an Azure function',
    description: 'Show Azure Functions in my subscription',

    environmentBadge: coreBadge,

    inputs: {
      type: 'object',
      required: [],
      properties: {
        body: {
          title: 'Request Body',
          type: 'object',
          'x-ms-summary': 'Request Body',
          'x-ms-visibility': 'important',
          description: 'Context object to be passed to function: { .. }',
        },
        method: {
          type: 'string',
          title: 'Method',
          'x-ms-editor': 'combobox',
          'x-ms-visibility': 'advanced',
          'x-ms-editor-options': {
            options: [
              {
                displayName: 'GET',
                value: 'GET',
              },
              {
                displayName: 'PUT',
                value: 'PUT',
              },
              {
                displayName: 'POST',
                value: 'POST',
              },
              {
                displayName: 'PATCH',
                value: 'PATCH',
              },
              {
                displayName: 'DELETE',
                value: 'DELETE',
              },
            ],
          },
        },
        headers: {
          type: 'object',
          title: 'Headers',
          description: 'Enter JSON object of response headers',
          'x-ms-visibility': 'advanced',
          'x-ms-editor': 'dictionary',
          'x-ms-editor-options': {
            valueType: 'string',
          },
        },
        queries: {
          type: 'object',
          title: 'Queries',
          // description: 'Enter JSON object of query parameters',
          'x-ms-visibility': 'advanced',
        },
        authentication: {
          type: 'object',
          title: 'Authentication',
          description: 'Enter JSON object of authentication parameter',
          'x-ms-visibility': 'advanced',
          'x-ms-editor': 'authentication',
          'x-ms-editor-options': {
            supportedAuthTypes: ['None', 'ActiveDirectoryOAuth', 'Raw', 'ManagedServiceIdentity'],
          },
        },
        function: {
          type: 'object',
          'x-ms-visibility': 'hideInUI',
          properties: {
            id: {
              type: 'string',
              'x-ms-visibility': 'hideInUI',
            },
          },
        },
      },
    },
    isInputsOptional: false,

    outputs: {
      type: 'object',
      properties: {
        body: {
          type: 'any',
          title: 'Body',
        },
        headers: {
          type: 'object',
          title: 'Headers',
        },
        statusCode: {
          type: 'integer',
          title: 'Status Code',
        },
      },
    },
    isOutputsOptional: false,
    includeRootOutputs: true,

    connector,

    settings: {},
  },
} as OperationManifest;
