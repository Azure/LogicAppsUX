import { SettingScope } from '@microsoft/utils-logic-apps';
import type { OperationManifest } from '@microsoft/utils-logic-apps';

const connector: any = {
  id: 'connectionProviders/xmlOperations',
  name: 'xmlOperations',
  properties: {
    description: 'XML Operations',
    displayName: 'XML Operations',
  },
};

const settings: any = {
  secureData: {},
  trackedProperties: {
    scopes: [SettingScope.Action],
  },
};

export const xmlTransformManifest = {
  properties: {
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/xml.svg',
    brandColor: '#804998',
    summary: 'Transform XML',
    description: 'Transform XML using XSLT map.',

    inputs: {
      type: 'object',
      required: ['content', 'mapName', 'xsltParameters'],
      properties: {
        containerId: {
          name: 'containerId',
          title: 'Container Id',
          summary: 'Function container',
          description: 'The function container',
          type: 'string',
          hideInUI: true,
          'x-ms-dynamic-values': {
            operationId: 'xslt_get_containers',
            'value-collection': 'value',
            'value-path': 'id',
            'value-title': 'Name',
          },
        },
        functionId: {
          name: 'functionId',
          title: 'Function Id',
          summary: 'Function',
          description: 'The function to use for transform',
          type: 'string',
          hideInUI: true,
          'x-ms-dynamic-values': {
            operationId: 'xslt_get_functions_in_container',
            parameters: {
              containerId: {
                parameter: 'containerId',
              },
            },
            'value-collection': 'value',
            'value-path': 'id',
            'value-title': 'properties/name',
          },
        },
        content: {
          name: 'content',
          title: 'Content',
          summary: 'Content',
          description: 'The XML content to transform',
          required: true,
          type: 'string',
        },
        mapName: {
          name: 'mapName',
          title: 'Map',
          summary: 'Map',
          description: 'The name of the map to use from the associated integration account',
          required: true,
          type: 'string',
          'x-ms-dynamic-values': {
            operationId: 'xslt_get_maps',
            'value-collection': 'value',
            'value-path': 'name',
            'value-title': 'name',
            parameters: {
              $filter: "maptype ne 'liquid'",
            },
          },
        },
        xsltParameters: {
          name: 'xsltParameters',
          title: 'XSLT Parameters',
          summary: 'Map parameters',
          description: 'The map parameters',
          hideInUI: true,
          schema: {
            type: 'object',
            'x-ms-dynamic-schema': {
              operationId: 'xslt_get_map',
              parameters: {
                mapName: {
                  parameter: 'mapName',
                },
              },
              'value-path': 'properties/parametersSchema',
            },
          },
        },
        transformOptions: {
          name: 'transformOptions',
          title: 'Transform Options',
          summary: 'Transform options',
          description: 'The transform options',
          type: 'string',
          visibility: 'advanced',
          'x-ms-editor': 'dropdown',
          'x-ms-editor-options': {
            multiselect: true,
            valueSeparator: ',',
            titleSeparator: ',',
            items: [
              {
                title: 'Disable the byte order mark.',
                value: 'DisableByteOrderMark',
              },
              {
                title: 'Generate text output.',
                value: 'GenerateTextOutput',
              },
              {
                title: 'Apply XSLT output attributes.',
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
          title: 'Body',
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

    connector,
    settings,
  },
} as OperationManifest;

export const xmlValidationManifest = {
  properties: {
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/xml.svg',
    brandColor: '#804998',
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
          required: true,
          type: 'string',
        },
        schemaName: {
          title: 'Schema Name',
          summary: 'Schema Name',
          description: 'The name of the XML schema to use from the associated integration account',
          type: 'string',
          visibility: 'important',
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
        transformedXml: {
          title: 'Transformed XML',
          type: 'string',
        },
      },
    },

    connector,
    settings,
  },
} as OperationManifest;
