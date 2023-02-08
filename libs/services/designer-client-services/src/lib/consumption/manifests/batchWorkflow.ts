import { coreBadge } from '../../badges';
import type { OperationManifest } from '@microsoft/utils-logic-apps';

const iconUri =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDUwIDUwIiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAzMiAzMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4NCiA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMjI4MGNjIi8+DQogPGcgdHJhbnNmb3JtPSJtYXRyaXgoLjQxMDI2IDAgMCAuNDEwMjYgNS41Mzg1IDEzLjEyOCkiIGZpbGw9IiNmZmYiPg0KICA8cGF0aCBkPSJtMzYgMTh2NmgtMTZ2LThoLTV2OWMwIDEuNjU3IDEuMzQzIDMgMyAzaDE5YzEuNjU3IDAgMy0xLjM0MyAzLTN2LTEwaC00eiIvPg0KICA8cG9seWdvbiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLC0xOCkiIHBvaW50cz0iMzMuNSAzMyA0Mi41IDMzIDM4IDI3Ii8+DQogIDxyZWN0IHg9IjYiIHk9Ii0xNCIgd2lkdGg9IjIyIiBoZWlnaHQ9IjIiLz4NCiAgPHJlY3QgeD0iNiIgeT0iMTIiIHdpZHRoPSIyMiIgaGVpZ2h0PSIyIi8+DQogIDxyZWN0IHg9IjYiIHk9Ii0xNCIgd2lkdGg9IjIiIGhlaWdodD0iMjgiLz4NCiAgPHJlY3QgeD0iMjYiIHk9Ii0xNCIgd2lkdGg9IjIiIGhlaWdodD0iMjgiLz4NCiAgPHJlY3QgeD0iMTAiIHk9Ii04IiB3aWR0aD0iMTQiIGhlaWdodD0iMiIvPg0KICA8cmVjdCB4PSIxMCIgeT0iLTIiIHdpZHRoPSIxNCIgaGVpZ2h0PSIyIi8+DQogIDxyZWN0IHg9IjEwIiB5PSI0IiB3aWR0aD0iMTQiIGhlaWdodD0iMiIvPg0KICA8cmVjdCB4PSIzMSIgeT0iNCIgd2lkdGg9IjE0IiBoZWlnaHQ9IjIiLz4NCiAgPHJlY3QgeD0iMzEiIHk9Ii0yIiB3aWR0aD0iMTQiIGhlaWdodD0iMiIvPg0KICA8cmVjdCB4PSIzMSIgeT0iLTgiIHdpZHRoPSIxNCIgaGVpZ2h0PSIyIi8+DQogPC9nPg0KPC9zdmc+DQo=';

const brandColor = '#2280CC';

const connector = {
  id: 'connectionProviders/batch',
  name: 'connectionProviders/batch',
  properties: {
    displayName: 'Send messages to batch',
    description: 'Send messages to batch',
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
      required: ['batchName', 'content', 'host'],
      properties: {
        batchName: {
          title: 'Batch Name',
          required: true,
          type: 'string',
          'x-ms-summary': 'Batch Name',
          description: 'Name of the batch to send message.',
        },
        content: {
          title: 'Message Content',
          required: true,
          'x-ms-summary': 'Message Content',
          description: 'The message to send to batch.',
        },
        partitionName: {
          title: 'Partition Name',
          required: false,
          type: 'string',
          'x-ms-summary': 'Partition Name',
          description: 'Name of the partition to send message.',
        },
        messageId: {
          title: 'Message Id',
          required: false,
          type: 'string',
          'x-ms-summary': 'Message Id',
          description: 'The message identifier.',
        },
        host: {
          type: 'object',
          required: ['triggerName', 'workflow'],
          properties: {
            triggerName: {
              title: 'Trigger Name',
              required: true,
              type: 'string',
              'x-ms-summary': 'Trigger Name',
            },
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
        batchName: {
          type: 'string',
          title: 'Batch Name',
        },
        paritionName: {
          type: 'string',
          title: 'Partition Name',
        },
        messageId: {
          type: 'string',
          title: 'Message Id',
        },
      },
    },
    isOutputsOptional: false,
    includeRootOutputs: true,

    connector,

    settings: {},
  },
} as OperationManifest;
