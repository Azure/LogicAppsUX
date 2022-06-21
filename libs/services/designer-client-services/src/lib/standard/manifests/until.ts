import type { OperationManifest } from '@microsoft-logic-apps/utils';
import { SettingScope } from '@microsoft-logic-apps/utils';

export default {
  properties: {
    iconUri:
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZlcnNpb249IjEuMSIgdmlld0JveD0iMCAwIDMyIDMyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPg0KIDxwYXRoIGQ9Im0wIDBoMzJ2MzJoLTMyeiIgZmlsbD0iIzQ4Njk5MSIvPg0KIDxnIGZpbGw9IiNmZmYiPg0KICA8cGF0aCBkPSJNMTEuNDI5IDIwLjMxaDEyLjU3MXYxLjE0M2gtMTMuNzE0di0zLjU0M2wtMS40ODYgMS40ODYtLjgtLjggMi44NTctMi44NTcgMi44NTcgMi44NTctLjguOC0xLjQ4Ni0xLjQ4NnoiLz4NCiAgPHBhdGggZD0iTTIyLjg1NyAyMS4zNjh2LTkuODM2aC04di0uOTg0aDkuMTQzdjEwLjgyIi8+DQogIDxwYXRoIGQ9Im05LjE0MyAxMC41NDhoMy40Mjl2My40MjloLTMuNDI5eiIvPg0KIDwvZz4NCjwvc3ZnPg0K',
    brandColor: '#486991',
    description: 'Executes a block of actions until a specified condition evaluates to true.',

    allowChildOperations: true,
    childOperationsLocation: ['actions'],

    inputs: {
      type: 'object',
      properties: {
        limit: {
          type: 'object',
          'x-ms-group-name': 'Change limits',
          required: [],
          properties: {
            count: {
              type: 'integer',
              default: 60,
              title: 'Count',
            },
            timeout: {
              type: 'string',
              default: 'PT1H',
              title: 'Timeout',
            },
          },
        },
        expression: {
          type: 'string',
          'x-ms-editor': 'condition',
          'x-ms-editor-options': {
            isOldFormat: true,
          },
          required: true,
          title: 'Loop until',
        },
      },
      required: ['expression'],
    },
    isInputsOptional: false,

    outputs: {
      type: 'integer',
      required: true,
      title: 'Current Iteration Index',
    },
    isOutputsOptional: false,

    connector: {
      id: 'connectionProviders/control',
      name: 'Control',
      properties: {
        description: 'Control operations',
        displayName: 'Control',
      },
    } as any,

    settings: {
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;
