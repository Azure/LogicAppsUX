import { coreBadge } from '../../badges';
import type { OperationManifest } from '@microsoft/logic-apps-shared';

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

export const batchTriggerManifest = {
  properties: {
    iconUri,
    brandColor,
    summary: 'Batch Trigger',
    description: 'Batches related messages together and releases the messages from the trigger when a specified release criteria is met.',

    environmentBadge: coreBadge,

    inputs: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          default: 'Inline',
          description: 'The batch mode to use.',
          'x-ms-editor': 'dropdown',
          'x-ms-editor-options': {
            options: [
              { value: 'Inline', displayName: 'Inline' },
              { value: 'IntegrationAccount', displayName: 'IntegrationAccount' },
            ],
          },
        },
        configurations: {
          type: 'object',
          properties: {
            $$batchName$$: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  title: 'Batch name',
                  description: 'The batch name',
                  'x-ms-input-dependencies': {
                    type: 'visibility',
                    parameters: [
                      {
                        name: 'mode',
                        values: ['Inline'],
                      },
                    ],
                  },
                  'x-ms-serialization': {
                    property: {
                      type: 'parentobject',
                      name: '$$batchName$$',
                      parameterReference: 'configurations.$$batchName$$',
                    },
                  },
                },
                releaseCriteria: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'array',
                      title: 'Release criteria',
                      description: 'Release criteria of the batch.',
                      'x-ms-editor': 'dropdown',
                      'x-ms-editor-options': {
                        multiSelect: true,
                        titleSeparator: ',',
                        serialization: {
                          valueType: 'array',
                        },
                        options: [
                          {
                            value: 'messageCount',
                            displayName: 'Message count based',
                          },
                          {
                            value: 'batchSize',
                            displayName: 'Size based',
                          },
                          {
                            value: 'recurrence',
                            displayName: 'Schedule based',
                          },
                        ],
                      },
                      'x-ms-input-dependencies': {
                        type: 'visibility',
                        parameters: [
                          {
                            name: 'mode',
                            values: ['Inline'],
                          },
                        ],
                      },
                      'x-ms-serialization': {
                        skip: true,
                      },
                      'x-ms-deserialization': {
                        type: 'parentobjectproperties',
                        parameterReference: 'configurations.$$batchName$$.releaseCriteria',
                      },
                    },
                    messageCount: {
                      type: 'integer',
                      title: 'Message count',
                      description: 'The number of messages to batch and release.',
                      'x-ms-visibility': 'important',
                      'x-ms-input-dependencies': {
                        type: 'visibility',
                        parameters: [
                          {
                            name: 'mode',
                            values: ['Inline'],
                          },
                          {
                            name: 'configurations.$$batchName$$.releaseCriteria.type',
                            values: ['messageCount'],
                          },
                        ],
                      },
                    },
                    batchSize: {
                      type: 'integer',
                      title: 'Batch size',
                      description: 'The total byte size of all messages in the batch to release.',
                      'x-ms-visibility': 'important',
                      'x-ms-input-dependencies': {
                        type: 'visibility',
                        parameters: [
                          {
                            name: 'mode',
                            values: ['Inline'],
                          },
                          {
                            name: 'configurations.$$batchName$$.releaseCriteria.type',
                            values: ['batchSize'],
                          },
                        ],
                      },
                    },
                    recurrence: {
                      type: 'object',
                      title: 'Recurrence',
                      description: 'The recurrence details.',
                      'x-ms-visibility': 'important',
                      'x-ms-editor': 'recurrence',
                      'x-ms-editor-options': {
                        recurrenceType: 'advanced',
                      },
                      'x-ms-input-dependencies': {
                        type: 'visibility',
                        parameters: [
                          {
                            name: 'mode',
                            values: ['Inline'],
                          },
                          {
                            name: 'configurations.$$batchName$$.releaseCriteria.type',
                            values: ['recurrence'],
                          },
                        ],
                      },
                    },
                  },
                  required: ['type'],
                },
              },
              required: ['name', 'releaseCriteria'],
            },
          },
          required: ['$$batchName$$'],
        },
        batchGroupName: {
          type: 'string',
          default: 'DEFAULT',
          hideInUI: true,
          'x-ms-input-dependencies': {
            type: 'visibility',
            parameters: [
              {
                name: 'mode',
                values: ['IntegrationAccount'],
              },
            ],
          },
          'x-ms-serialization': { value: 'DEFAULT' },
        },
      },
      required: ['mode', 'configurations'],
    },
    inputsLocation: ['inputs'],
    isInputsOptional: false,

    outputs: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'object',
          properties: {
            batchName: {
              type: 'string',
              title: 'Batch Name',
              description: 'Name of the batch.',
            },
            items: {
              type: 'array',
              title: 'Batched Items',
              description: 'The batched items.',
              items: {
                type: 'object',
                title: 'Message',
                properties: {
                  content: { title: 'Message Content' },
                  messageId: { title: 'Message Id', type: 'string' },
                },
                required: ['content', 'messageId'],
              },
            },
            partitionName: {
              type: 'string',
              title: 'Partition Name',
              description: 'Name of the partition.',
            },
          },
          required: ['batchName', 'partitionName', 'items'],
        },
      },
    },
    isOutputsOptional: false,

    includeRootOutputs: false,
    connector,
  },
} as OperationManifest;

export const sendToBatchManifest = {
  properties: {
    iconUri,
    brandColor,
    summary: 'Send to batch trigger workflow',
    description: 'Sends messages to a Logic App with batch triggers in the same region',

    environmentBadge: coreBadge,

    inputs: {
      type: 'object',
      properties: {
        batchName: {
          type: 'string',
          title: 'Batch Name',
          description: 'The name of the batch where to send the message.',
        },
        content: {
          title: 'Message Content',
          description: 'The message to send to batch.',
        },
        partitionName: {
          type: 'string',
          title: 'Partition Name',
          description: 'The name of the partition where to send the message.',
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
              description: 'The batch trigger name.',
            },
            workflow: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  title: 'Workflow id',
                  description: 'The resource id of the workflow with the batch trigger.',
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
      required: ['body'],
      properties: {
        body: {
          type: 'object',
          properties: {
            batchName: {
              type: 'string',
              title: 'Batch Name',
              description: 'The name of the batch where the message was sent.',
            },
            messageId: {
              type: 'string',
              title: 'Message Id',
              description: 'The message identifier.',
            },
            partitionName: {
              type: 'string',
              title: 'Partition Name',
              description: 'The name of the partition where the message was sent.',
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
