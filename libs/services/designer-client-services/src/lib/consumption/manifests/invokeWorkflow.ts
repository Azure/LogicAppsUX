import { coreBadge } from '../../badges';
import { invokeWorkflowGroup } from '../operations';
import type { OperationManifest } from '@microsoft/logic-apps-shared';

export const invokeWorkflowManifest = {
  properties: {
    iconUri: invokeWorkflowGroup.properties.iconUri,
    brandColor: invokeWorkflowGroup.properties.brandColor,
    summary: 'Choose a Logic Apps workflow',
    description: 'Show Logic Apps in the same region',

    environmentBadge: coreBadge,

    inputs: {
      type: 'object',
      required: ['host'],
      properties: {
        body: {
          title: 'Body',
          description: 'The trigger body',
          'x-ms-visibility': 'important',
          'x-ms-dynamic-properties': {
            dynamicState: {
              extension: { operationId: 'getLogicAppSwagger' },
              isInput: true,
            },
            parameters: {
              workflowId: {
                parameterReference: 'host.workflow.id',
                required: true,
              },
            },
          },
        },
        headers: {
          type: 'object',
          title: 'Headers',
          description: 'The trigger headers',
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
                  title: 'Workflow Id',
                  type: 'string',
                },
              },
            },
            triggerName: {
              title: 'Trigger Name',
              required: true,
              type: 'string',
            },
          },
        },
      },
    },
    inputsLocation: ['inputs'],
    isInputsOptional: false,

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
        options: ['DisableAsyncPattern'],
        scopes: ['action'],
      },
      retryPolicy: {
        scopes: ['action'],
      },
      secureData: {},
      trackedProperties: {
        scopes: ['action'],
      },
    },
  },
} as OperationManifest;
