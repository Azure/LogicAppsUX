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
      required: ['functionName'],
      properties: {
        functionName: {
          title: 'Function Name',
          type: 'string',
          description: 'The name of the local function to invoke',
          'x-ms-visibility': 'important',
        },
        parameters: {
          title: 'Parameters',
          type: 'object',
          description: 'Parameters to pass to the local function',
          'x-ms-visibility': 'important',
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
          description: 'The return value from the local function',
        },
      },
    },
    isOutputsOptional: false,
    includeRootOutputs: true,

    connector,

    settings: {
      retryPolicy: {
        scopes: [SettingScope.Action],
      },
      secureData: {},
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
      timeout: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;

export default invokeFunctionManifest;
