import { xmlGroup, xmlValidationOperation } from '../operations';
import type { OperationManifest } from '@microsoft/logic-apps-shared';
import { SettingScope } from '@microsoft/logic-apps-shared';

const settings: any = {
  secureData: {},
  trackedProperties: {
    scopes: [SettingScope.Action],
  },
};

export const xmlTransformManifest = {
  properties: {
    iconUri: xmlValidationOperation.properties.iconUri,
    brandColor: xmlValidationOperation.properties.brandColor,
    summary: 'Transform XML',
    description: 'Transform XML using XSLT map.',

    inputs: {
      type: 'object',
      required: ['content', 'integrationAccount'],
      properties: {
        content: {
          title: 'Content',
          description: 'The XML content to transform',
          type: 'string',
        },
        integrationAccount: {
          type: 'object',
          properties: {
            map: {
              type: 'object',
              properties: {
                name: {
                  title: 'Map Name',
                  type: 'string',
                  description: 'The name of the map to use from the associated integration account',
                  'x-ms-dynamic-list': {
                    dynamicState: {
                      operationId: 'getMapArtifacts',
                      parameters: {
                        $filter: {
                          value: "maptype ne 'liquid'",
                        },
                      },
                    },
                    parameters: {},
                  },
                },
              },
              required: ['name'],
            },
          },
          required: ['map'],
        },
        xsltParameters: {
          title: 'Map Parameters',
          description: 'The map parameters',
          type: 'object',
          'x-ms-dynamic-properties': {
            dynamicState: {
              extension: { operationId: 'getMapSchema' },
              parameters: {},
              isInput: true,
            },
            parameters: {
              mapName: {
                parameterReference: 'integrationAccount.map.name',
                required: true,
              },
            },
          },
        },
        transformOptions: {
          title: 'Transform Options',
          description: 'The transform options',
          type: 'string',
          visibility: 'advanced',
          'x-ms-editor': 'combobox',
          'x-ms-editor-options': {
            multiSelect: true,
            titleSeparator: ',',
            options: [
              {
                displayName: 'Disable the byte order mark.',
                value: 'DisableByteOrderMark',
              },
              {
                displayName: 'Generate text output.',
                value: 'GenerateTextOutput',
              },
              {
                displayName: 'Apply XSLT output attributes.',
                value: 'ApplyXsltOutputAttributes',
              },
            ],
          },
        },
      },
    },

    outputs: {
      type: 'object',
      properties: {
        body: {
          title: 'Transformed XML',
          type: 'string',
          format: 'binary',
        },
      },
    },
    isOutputsOptional: false,

    connector: xmlGroup,
    settings,
  },
} as OperationManifest;

export const xmlValidationManifest = {
  properties: {
    iconUri: xmlValidationOperation.properties.iconUri,
    brandColor: xmlValidationOperation.properties.brandColor,
    summary: 'XML Validation',
    description: 'Validate XML using schema.',

    inputs: {
      type: 'object',
      required: ['content'],
      properties: {
        content: {
          title: 'Content',
          summary: 'Message Content',
          description: 'The XML content to validate',
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
                  description: 'The name of the XML schema to use from the associated integration account',
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
      },
    },

    outputs: {
      type: 'object',
      properties: {
        body: {
          title: 'Body',
        },
      },
    },
    isOutputsOptional: false,

    connector: xmlGroup,
    settings,
  },
} as OperationManifest;
