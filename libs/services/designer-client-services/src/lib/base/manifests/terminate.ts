import type { OperationManifest } from '@microsoft/logic-apps-shared';
import { SettingScope } from '@microsoft/logic-apps-shared';

export default {
  properties: {
    iconUri:
      'data:image/svg+xml;base64,PHN2ZyBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAzMiAzMiIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQogPHBhdGggZD0ibTAgMGgzMnYzMmgtMzJ6IiBmaWxsPSIjZjQxNzAwIi8+DQogPGcgZmlsbD0iI2ZmZiI+DQogIDxwYXRoIGQ9Ik0yMy4xMiAxNmgtNi43MnYtNi43Mmg2LjcydjYuNzJtLjg4Ljg4di04LjQ4aC04LjR2OC40aDguNHoiLz4NCiAgPHBhdGggZD0iTTE3LjI4IDEwLjhsLjU2LS41NiAxLjg0IDEuNzYgMS44NC0xLjc2LjU2LjU2LTEuODQgMS44NCAxLjg0IDEuNzYtLjU2LjY0LTEuODQtMS44NC0xLjg0IDEuODQtLjU2LS42NCAxLjc2LTEuNzZ6Ii8+DQogIDxwYXRoIGQ9Ik0yMy4xMiAyMy42aC0xNS4xMnYtMTMuNTJoNi43MnYuODhoLTUuODR2MTEuNzZoMTMuNDR2LTUuMDRoLjh6Ii8+DQogIDxwYXRoIGQ9Ik04Ljg4IDEyLjY0aDUuOTJ2Ljg4aC01LjkyeiIvPg0KIDwvZz4NCjwvc3ZnPg0K',
    brandColor: '#F41700',
    description: 'Terminate the execution of a Logic App run.',

    inputs: {
      type: 'object',
      properties: {
        runStatus: {
          type: 'string',
          title: 'Status',
          'x-ms-editor': 'combobox',
          'x-ms-editor-options': {
            options: [
              {
                displayName: 'Failed',
                value: 'Failed',
              },
              {
                displayName: 'Cancelled',
                value: 'Cancelled',
              },
              {
                displayName: 'Succeeded',
                value: 'Succeeded',
              },
            ],
          },
          default: 'Failed',
        },
        runError: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'Enter error code',
              'x-ms-visibility': 'important',
              title: 'Code',
              'x-ms-input-dependencies': {
                type: 'visibility',
                parameters: [{ name: 'runStatus', excludeValues: ['Succeeded', 'Cancelled'] }],
              },
            },
            message: {
              type: 'string',
              description: 'Enter error message',
              'x-ms-visibility': 'important',
              title: 'Message',
              'x-ms-input-dependencies': {
                type: 'visibility',
                parameters: [{ name: 'runStatus', excludeValues: ['Succeeded', 'Cancelled'] }],
              },
            },
          },
        },
      },
      required: ['runStatus'],
    },
    inputsLocation: ['inputs'],

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
