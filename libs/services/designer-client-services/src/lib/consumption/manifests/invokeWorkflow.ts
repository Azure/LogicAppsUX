import { coreBadge } from '../../badges';
import type { OperationManifest } from '@microsoft/utils-logic-apps';

const iconUri =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDE2IDE2IiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAxNiAxNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiA8cGF0aCBjbGFzcz0ic3QwIiBkPSJtMCAwaDE2djE2aC0xNnoiIGZpbGw9IiM1OWIyZDkiLz4NCiA8cGF0aCBjbGFzcz0ic3QxIiBkPSJtMTAuOTMzIDkuMzMzaDEuMDY3djIuNjY3aC0yLjY2N3YtMi42NjdoMS4wNjd2LTEuMDY3aC00Ljh2MS4wNjdoMS4wNjd2Mi42NjdoLTIuNjY3di0yLjY2N2gxLjA2N3YtMS42aDIuNjY3di0xLjA2N2gtMS4wNjd2LTIuNjY3aDIuNjY3djIuNjY3aC0xLjA2N3YxLjA2N2gyLjY2N3ptLTQuOCAyLjEzM3YtMS42aC0xLjZ2MS42em0xLjA2Ny02LjkzM3YxLjZoMS42di0xLjZ6bTQuMjY3IDYuOTMzdi0xLjZoLTEuNnYxLjZ6IiBmaWxsPSIjZmZmIi8+DQo8L3N2Zz4NCg==';

const brandColor = '#59B2D9';

const connector = {
  id: '/connectionProviders/workflow',
  name: 'connectionProviders/workflow',
  properties: {
    displayName: 'Azure Logic Apps',
    description: 'Azure Logic Apps',
    iconUri,
    brandColor,
    capabilities: ['actions'],
  },
};

export const invokeWorkflowManifest = {
  properties: {
    iconUri,
    brandColor,
    summary: 'Choose a Logic Apps workflow',
    description: 'Show Logic Apps in the same region',

    environmentBadge: coreBadge,

    inputs: {
      type: 'object',
      required: ['host'],
      properties: {
        body: {
          title: 'Body',
          type: 'object',
          'x-ms-summary': 'Body',
          'x-ms-visibility': 'important',
        },
        headers: {
          type: 'object',
          title: 'Headers',
          'x-ms-visibility': 'advanced',
          'x-ms-editor': 'dictionary',
          'x-ms-editor-options': {
            valueType: 'string',
          },
        },
        host: {
          type: 'object',
          required: ['triggerName', 'workflow'],
          properties: {
            workflow: {
              type: 'object',
              required: ['id'],
              properties: {
                id: {
                  title: 'Workflow',
                  required: true,
                  type: 'string',
                },
              },
            },
            triggerName: {
              title: 'Trigger Name',
              required: true,
              type: 'string',
              'x-ms-summary': 'Trigger Name',
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
