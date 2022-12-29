import type { OperationManifest } from '@microsoft/utils-logic-apps';
import { SettingScope } from '@microsoft/utils-logic-apps';

const connector: any = {
  id: 'connectionProviders/liquidOperations',
  name: 'liquidOperations',
  properties: {
    description: 'Liquid Operations',
    displayName: 'Liquid Operations',
  },
};

const settings: any = {
  secureData: {},
  trackedProperties: {
    scopes: [SettingScope.Action],
  },
};

const stringOutput = {
  type: 'object',
  properties: {
    body: {
      title: 'Transformed content',
      type: 'string',
    },
  },
};

const objectOutput = {
  type: 'object',
  properties: {
    body: {
      title: 'Transformed content',
      type: 'object',
    },
  },
};

const jsonContent = {
  title: 'Content',
  description: 'The JSON content to transform',
  required: true,
  type: 'object',
};

const xmlContent = {
  title: 'Content',
  description: 'The XML content to transform',
  required: true,
  type: 'object',
};

const mapName = {
  title: 'Map',
  description: 'The name of the map to use from the associated integration account',
  required: true,
  type: 'string',
  'x-ms-dynamic-values': {
    operationId: 'xslt_get_maps',
    'value-collection': 'value',
    'value-path': 'name',
    'value-title': 'name',
    parameters: {
      $filter: "maptype eq 'liquid'",
    },
  },
};

const transformedContentSchema = {
  title: 'Schema',
  description: 'The JSON schema of the transformed content.',
  'x-ms-visibility': 'advanced',
  'x-ms-editor': 'schema',
  type: 'object',
};

export const liquidJsonToJsonManifest = {
  properties: {
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/liquid.svg',
    brandColor: '#804998',
    summary: 'Transform JSON To JSON',
    description: 'Transform JSON to JSON using Liquid map.',

    inputs: {
      type: 'object',
      required: ['content', 'mapName'],
      properties: {
        content: jsonContent,
        mapName,
        transformedContentSchema,
      },
    },
    outputs: objectOutput,

    connector,
    settings,
  },
} as OperationManifest;

export const liquidJsonToTextManifest = {
  properties: {
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/liquid.svg',
    brandColor: '#804998',
    summary: 'Transform JSON To TEXT',
    description: 'Transform JSON to TEXT using Liquid map.',

    inputs: {
      type: 'object',
      required: ['content', 'mapName'],
      properties: {
        content: jsonContent,
        mapName,
      },
    },
    outputs: stringOutput,

    connector,
    settings,
  },
} as OperationManifest;

export const liquidXmlToJsonManifest = {
  properties: {
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/liquid.svg',
    brandColor: '#804998',
    summary: 'Transform XML To JSON',
    description: 'Transform XML to JSON using Liquid map.',

    inputs: {
      type: 'object',
      required: ['content', 'mapName'],
      properties: {
        content: xmlContent,
        mapName,
        transformedContentSchema,
      },
    },
    outputs: objectOutput,

    connector,
    settings,
  },
} as OperationManifest;

export const liquidXmlToTextManifest = {
  properties: {
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/liquid.svg',
    brandColor: '#804998',
    summary: 'Transform XML To TEXT',
    description: 'Transform XML to TEXT using Liquid map.',

    inputs: {
      type: 'object',
      required: ['content', 'mapName'],
      properties: {
        content: xmlContent,
        mapName,
      },
    },
    outputs: stringOutput,

    connector,
    settings,
  },
} as OperationManifest;
