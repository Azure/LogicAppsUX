import { SettingScope } from '../../../../utils/src';
import type { OperationManifest } from '../../../../utils/src';
export const ConnectorManifest = {
  // iconUri: Dynamically Added
  // brandColor: Dynamically Added
  properties: {
    // description: Dynamically Added
    // summary: Dynamically Added

    inputs: {
      type: 'object',
      required: ['operations'],
      properties: {
        operations: {
          title: 'Operations',
          description: 'Enter operations of a connector that the agent can perform',
          required: true,
          'x-ms-editor': 'combobox',
          'x-ms-editor-options': {
            // options: Dynamically Added
            multiSelect: true,
            rawValue: true,
          },
        },
      },
    },
    isInputsOptional: false,

    outputs: {
      type: 'object',
      required: ['body'],
      properties: {
        body: {
          type: 'object',
          title: 'Result',
          description: 'The return value of the connector operations',
        },
      },
    },
    isOutputsOptional: false,

    // connector: Dynamically Added

    settings: {
      secureData: {},
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;
