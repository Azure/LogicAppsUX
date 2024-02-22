import { flatFileGroup } from '../operations';
import { flatFileDecodingOperations, flatFileEncodingOperations } from '../operations/flatfile';
import type { OperationManifest } from '@microsoft/logic-apps-shared';
import { SettingScope } from '@microsoft/logic-apps-shared';

export const flatFileDecodingManifest = {
  properties: {
    iconUri: flatFileDecodingOperations.properties.iconUri,
    brandColor: flatFileDecodingOperations.properties.brandColor,
    summary: 'Flat File Decoding',
    description: 'Decodes incoming flat file.',

    inputs: {
      type: 'object',
      required: ['content'],
      properties: {
        content: {
          title: 'Content',
          description: 'The Flat File content to decode',
          type: 'string',
        },
        schema: {
          type: 'object',
          properties: {
            name: {
              title: 'Schema Name',
              type: 'string',
              'x-ms-visibility': 'important',
              description: 'The name of the Flat File schema to use from the associated integration account',
              'x-ms-dynamic-list': {
                dynamicState: {
                  operationId: 'getSchemaArtifacts',
                  parameters: {},
                },
                parameters: {},
              },
            },
          },
          required: ['name'],
        },
      },
    },

    outputs: {
      type: 'object',
      properties: {
        body: {
          title: 'Body',
          description: 'The decoded flatfile.',
          type: 'string',
          format: 'binary',
        },
      },
    },
    isOutputsOptional: false,

    connector: flatFileGroup,

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
    iconUri: flatFileEncodingOperations.properties.iconUri,
    brandColor: flatFileEncodingOperations.properties.brandColor,
    summary: 'Flat File Encoding',
    description: 'Encodes incoming XML file.',

    inputs: {
      type: 'object',
      required: ['content'],
      properties: {
        content: {
          title: 'Content',
          description: 'The XML content to encode',
          type: 'string',
        },
        integrationAccount: {
          type: 'object',
          properties: {
            schema: {
              type: 'object',
              properties: {
                name: {
                  title: 'Schema Name',
                  type: 'string',
                  'x-ms-visibility': 'important',
                  description: 'The name of the Flat File schema to use from the associated integration account',
                  'x-ms-dynamic-list': {
                    dynamicState: {
                      operationId: 'getSchemaArtifacts',
                      parameters: {},
                    },
                    parameters: {},
                  },
                },
              },
              required: ['name'],
            },
          },
          required: ['schema'],
        },
        emptyNodeGenerationMode: {
          title: 'Mode of empty node generation',
          type: 'string',
          enum: ['ForcedDisabled', 'HonorSchemaNodeProperty', 'ForcedEnabled'],
          description: 'The mode of empty node generation for Flat File encoding',
          'x-ms-visibility': 'advanced',
        },
        xmlNormalization: {
          title: 'XML Normalization',
          type: 'boolean',
          default: true,
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
          description: 'The encoded flatfile.',
        },
      },
    },
    isOutputsOptional: false,

    connector: flatFileGroup,

    settings: {
      secureData: {},
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;
