import type { OperationManifest } from '../../../../utils/src';
import { coreBadge } from '../../badges';
import { invokeWorkflowGroup } from '../operations';

export const invokeNestedAgentManifest = {
  properties: {
    iconUri: invokeWorkflowGroup.properties.iconUri,
    brandColor: invokeWorkflowGroup.properties.brandColor,
    summary: 'Choose a Logic Apps workflow',
    description: 'Send a task to a nested agent workflow in the same region',

    environmentBadge: coreBadge,

    inputs: {
      type: 'object',
      required: ['host'],
      properties: {
        taskMessage: {
          title: 'Task Message',
          type: 'string',
          description: 'The task message to send to the nested agent',
          'x-ms-visibility': 'important',
        },
        host: {
          type: 'object',
          required: ['workflow'],
          properties: {
            workflow: {
              type: 'object',
              required: ['id'],
              properties: {
                id: {
                  title: 'Workflow Id',
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
    inputsLocation: ['inputs'],
    isInputsOptional: false,
    autoCast: true,

    outputs: {
      type: 'object',
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
          title: 'Status Code',
        },
      },
    },
    isOutputsOptional: false,
    includeRootOutputs: true,

    connector: invokeWorkflowGroup,

    settings: {
      operationOptions: {
        options: ['DisableAsyncPattern', 'DisableAutomaticDecompression'],
        scopes: ['action'],
      },
      retryPolicy: {
        scopes: ['action'],
      },
      secureData: {},
      trackedProperties: {
        scopes: ['action'],
      },
      timeout: {
        scopes: ['action'],
      },
    },
  },
} as OperationManifest;
