import { coreBadge } from '../../badges';
import type { OperationManifest } from '@microsoft/utils-logic-apps';

const iconUri =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDUwIDUwIiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMjI4MGNjIi8+DQogPGcgdHJhbnNmb3JtPSJtYXRyaXgoLjQxMDI2IDAgMCAuNDEwMjYgNS41Mzg1IDEzLjEyOCkiIGZpbGw9IiNmZmYiPg0KICA8cGF0aCBkPSJtMzYgMTh2NmgtMTZ2LThoLTV2OWMwIDEuNjU3IDEuMzQzIDMgMyAzaDE5YzEuNjU3IDAgMy0xLjM0MyAzLTN2LTEwaC00eiIvPg0KICA8cG9seWdvbiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLC0xOCkiIHBvaW50cz0iMzMuNSAzMyA0Mi41IDMzIDM4IDI3Ii8+DQogIDxyZWN0IHg9IjYiIHk9Ii0xNCIgd2lkdGg9IjIyIiBoZWlnaHQ9IjIiLz4NCiAgPHJlY3QgeD0iNiIgeT0iMTIiIHdpZHRoPSIyMiIgaGVpZ2h0PSIyIi8+DQogIDxyZWN0IHg9IjYiIHk9Ii0xNCIgd2lkdGg9IjIiIGhlaWdodD0iMjgiLz4NCiAgPHJlY3QgeD0iMjYiIHk9Ii0xNCIgd2lkdGg9IjIiIGhlaWdodD0iMjgiLz4NCiAgPHJlY3QgeD0iMTAiIHk9Ii04IiB3aWR0aD0iMTQiIGhlaWdodD0iMiIvPg0KICA8cmVjdCB4PSIxMCIgeT0iLTIiIHdpZHRoPSIxNCIgaGVpZ2h0PSIyIi8+DQogIDxyZWN0IHg9IjEwIiB5PSI0IiB3aWR0aD0iMTQiIGhlaWdodD0iMiIvPg0KICA8cmVjdCB4PSIzMSIgeT0iNCIgd2lkdGg9IjE0IiBoZWlnaHQ9IjIiLz4NCiAgPHJlY3QgeD0iMzEiIHk9Ii0yIiB3aWR0aD0iMTQiIGhlaWdodD0iMiIvPg0KICA8cmVjdCB4PSIzMSIgeT0iLTgiIHdpZHRoPSIxNCIgaGVpZ2h0PSIyIi8+DQogPC9nPg0KPC9zdmc+DQo=';
const brandColor = '#2280CC';

const connector = {
  id: '/connectionProviders/batch',
  name: 'connectionProviders/batch',
  properties: {
    displayName: 'Batch',
    iconUri,
    brandColor,
    description: 'Batch operations',
  },
};

export const selectBatchWorkflowManifest = {
  properties: {
    iconUri,
    brandColor,
    summary: 'Choose a Logic Apps workflow with batch trigger',
    description: 'Show Logic Apps with batch triggers in the same region',

    environmentBadge: coreBadge,

    inputs: {
      type: 'object',
      properties: {
        batchName: {
          type: 'string',
          title: 'Batch Name',
          description: 'Name of the batch to send message.',
        },
        content: {
          title: 'Message Content',
          description: 'The message to send to batch.',
        },
        partitionName: {
          type: 'string',
          title: 'Partition Name',
          description: 'Name of the partition to send message.',
        },
        messageId: {
          type: 'string',
          title: 'Message Id',
          description: 'The message identifier.',
        },
        host: {
          type: 'object',
          properties: {
            triggerName: {
              type: 'string',
              title: 'Trigger Name',
              description: 'Name of the trigger',
            },
            workflow: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  title: 'Workflow',
                  description: 'Workflow name',
                },
              },
              required: ['id'],
            },
          },
          required: ['triggerName', 'workflow'],
        },
      },
      required: ['host', 'batchName', 'content'],
    },
    inputsLocation: ['inputs'],
    isInputsOptional: false,
    outputs: {
      type: 'object',
      required: [],
      properties: {
        body: {
          title: 'Body',
          type: 'object',
          properties: {
            batchName: {
              type: 'string',
              title: 'Batch Name',
              description: 'Name of the batch to send message.',
            },
            messageId: {
              type: 'string',
              title: 'Message Id',
              description: 'The message identifier.',
            },
            partitionName: {
              type: 'string',
              title: 'Partition Name',
              description: 'Name of the partition to send message.',
            },
          },
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
    settings: {
      secureData: {},
      trackedProperties: {
        scopes: ['action'],
      },
    },
    includeRootOutputs: false,
    connector,
  },
} as OperationManifest;
