import type { OperationManifest } from '../../../../utils/src';
import mcpclientconnector from './mcpclientconnector';

export default {
  properties: {
    iconUri: mcpclientconnector.properties.iconUri,
    brandColor: '#000000',
    description: 'Uses an MCP server',
    inputsBindingMode: 'untyped',
    inputs: {
      type: 'object',
      properties: {
        headers: {
          type: 'object',
          title: 'Headers',
          description: 'Enter JSON object of request headers',
          'x-ms-editor': 'dictionary',
          'x-ms-editor-options': {
            valueType: 'string',
          },
        },
        allowedTools: {
          type: 'array',
          items: {
            type: 'string',
          },
          title: 'Allowed tools',
          'x-ms-editor': 'combobox',
          'x-ms-editor-options': {
            multiSelect: true,
            titleSeparator: ',',
            serialization: {
              valueType: 'array',
            },
          },
          'x-ms-dynamic-list': {
            dynamicState: {
              apiType: 'mcp',
              operationId: 'listMcpTools',
            },
          },
        },
      },
    },
    outputsBindingMode: 'untyped',
    outputs: {
      type: 'object',
      properties: {},
    },
    isOutputsOptional: false,
    inputsLocation: ['inputs', 'parameters'],
    isInputsOptional: false,

    runAfter: {
      type: 'notsupported',
    },

    connection: {
      required: true,
      type: 'mcp',
      disableAutoSelection: true,
    },
    connectionReference: {
      referenceKeyFormat: 'mcpconnection',
    },

    connector: mcpclientconnector,
  },
} as OperationManifest;
