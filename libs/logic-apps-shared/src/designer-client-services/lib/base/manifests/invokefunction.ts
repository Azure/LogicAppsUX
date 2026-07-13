import type { OperationManifest } from '../../../../utils/src';
import { SettingScope } from '../../../../utils/src';
import { coreBadge } from '../../badges';

const iconUri = 'https://logicappsv2resources.blob.core.windows.net/icons/invokefunction.svg';
const brandColor = '#3999C6';

const connector = {
  id: 'connectionProviders/localFunctionOperation',
  name: 'localFunctionOperation',
  properties: {
    displayName: 'Call a local function in this logic app',
    description: 'Call a local function in this logic app',
    iconUri,
    brandColor,
    capabilities: ['actions'],
  },
};

const invokeFunctionManifest = {
  properties: {
    iconUri,
    brandColor,
    summary: 'Call a local function in this logic app',
    description: 'Call a local function in this logic app',

    environmentBadge: coreBadge,

    inputs: {
      type: 'object',
      required: ['functionName', 'parameters'],
      properties: {
        functionName: {
          type: 'string',
          title: 'Function name',
          description: 'The name for the function.',
          'x-ms-dynamic-list': {
            dynamicState: {
              operationId: 'getFunctions',
              parameters: {},
            },
            parameters: {},
          },
        },
        parameters: {
          type: 'object',
          title: 'Function parameters',
          description: 'The function parameters.',
          'x-ms-dynamic-properties': {
            dynamicState: {
              extension: {
                operationId: 'getParameters',
              },
              isInput: true,
            },
            parameters: {
              functionName: {
                parameterReference: 'functionName',
                required: true,
              },
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
          type: 'object',
          title: 'Function output',
          description: "The function's output.",
          'x-ms-dynamic-properties': {
            dynamicState: {
              extension: {
                operationId: 'getOutputSchema',
              },
            },
            parameters: {
              functionName: {
                parameterReference: 'functionName',
                required: true,
              },
            },
          },
        },
      },
    },
    isOutputsOptional: false,
    includeRootOutputs: false,

    connector,

    dynamicContent: {
      payloadConfiguration: ['WorkflowAppLocation'],
    },

    settings: {
      secureData: {},
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
      retryPolicy: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;

export default invokeFunctionManifest;
