import { coreBadge } from '../../badges';
import type { OperationManifest } from '@microsoft/utils-logic-apps';

const iconUri = ' https://logicappsv2resources.blob.core.windows.net/icons/apimanagement.svg';
const brandColor = '#2280CC';

const connector = {
  id: 'connectionProviders/batch',
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
