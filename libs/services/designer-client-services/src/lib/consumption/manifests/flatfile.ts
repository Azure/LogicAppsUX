import { SettingScope } from '@microsoft/utils-logic-apps';
import type { OperationManifest } from '@microsoft/utils-logic-apps';

export const flatFileDecodingManifest = {
  properties: {
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/flatfiledecoding.svg',
    brandColor: '#e68a00',
    summary: 'Flat File Decoding',
    description: 'Decodes incoming flat file.',

    inputs: {
      type: 'object',
      required: ['content'],
      properties: {
        content: {
          title: 'Content',
          type: 'string',
          required: true,
          'x-ms-summary': 'Content',
          description: 'The Flat File content to decode',
        },
        schemaName: {
          title: 'Schema Name',
          type: 'string',
          'x-ms-visibility': 'important',
          'x-ms-summary': 'Schema Name',
          description: 'The name of the Flat File schema to use from the associated integration account',
          'x-ms-dynamic-values': {
            operationId: 'content_and_schema_operation_get_schemas',
            'value-collection': 'value',
            'value-path': 'name',
            'value-title': 'name',
          },
        },
      },
    },

    outputs: {
      type: 'object',
      properties: {
        body: {
          title: 'Body',
          type: 'string',
        },
      },
    },
    outputsSchema: {
      outputPaths: [
        {
          outputLocation: ['properties', 'body'],
          name: 'schema',
          schema: 'Value',
        },
      ],
    },
    isOutputsOptional: false,

    connector: {
      id: 'connectionProviders/flatFileOperations',
      name: 'flatFileOperations',
      properties: {
        description: 'Flat File',
        displayName: 'Flat File',
      },
    } as any,

    settings: {
      secureData: {},
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;

export const flatFileEncodingManifest = {
  properties: {
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/flatfileencoding.svg',
    brandColor: '#e68a00',
    summary: 'Flat File Encoding',
    description: 'Encodes incoming XML file.',

    inputs: {
      type: 'object',
      required: ['content'],
      properties: {
        content: {
          title: 'Content',
          required: true,
          type: 'string',
          'x-ms-summary': 'Content',
          description: 'The XML content to encode',
        },
        shemaName: {
          title: 'Shema Name',
          type: 'string',
          'x-ms-visibility': 'important',
          'x-ms-summary': 'Schema Name',
          description: 'The name of the Flat File schema to use from the associated integration account',
          'x-ms-dynamic-values': {
            operationId: 'content_and_schema_operation_get_schemas',
            'value-collection': 'value',
            'value-path': 'name',
            'value-title': 'name',
          },
        },
        emptyNodeGenerationMode: {
          title: 'Empty Node Generation Mode',
          type: 'string',
          enum: ['ForcedDisabled', 'HonorSchemaNodeProperty', 'ForcedEnabled'],
          'x-ms-summary': 'Mode of empty node generation',
          description: 'The mode of empty node generation for Flat File encoding',
          'x-ms-visibility': 'advanced',
        },
        xmlNormalization: {
          title: 'XML Normalization',
          type: 'boolean',
          default: true,
          'x-ms-summary': 'Xml Normalization',
          description: 'The setting to enable or disable XML normalization for Flat File encoding',
          'x-ms-visibility': 'advanced',
        },
      },
    },

    outputs: {
      type: 'object',
      properties: {
        body: {
          title: 'Body',
          type: 'string',
        },
      },
    },
    outputsSchema: {
      outputPaths: [
        {
          outputLocation: ['properties', 'body'],
          name: 'schema',
          schema: 'Value',
        },
      ],
    },
    isOutputsOptional: false,

    connector: {
      id: 'connectionProviders/flatFileOperations',
      name: 'flatFileOperations',
      properties: {
        description: 'Flat File',
        displayName: 'Flat File',
      },
    } as any,

    settings: {
      secureData: {},
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;
