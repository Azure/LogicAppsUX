import { liquidGroup } from '../operations';
import type { OperationManifest } from '@microsoft/logic-apps-shared';
import { SettingScope } from '@microsoft/logic-apps-shared';

const iconUri = liquidGroup.properties.iconUri;
const brandColor = liquidGroup.properties.brandColor;

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

const integrationAccount = {
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
                  value: "maptype eq 'liquid'",
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
};

const jsonContent = {
  title: 'Content',
  description: 'The JSON content to transform',
  type: 'object',
};

const xmlContent = {
  title: 'Content',
  description: 'The XML content to transform',
  required: true,
  type: 'string',
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
    iconUri,
    brandColor,
    summary: 'Transform JSON To JSON',
    description: 'Transform JSON to JSON using Liquid map.',

    inputs: {
      type: 'object',
      required: ['content', 'integrationAccount'],
      properties: {
        content: jsonContent,
        integrationAccount,
        transformedContentSchema,
      },
    },
    outputs: objectOutput,

    connector: liquidGroup,
    settings,
  },
} as OperationManifest;

export const liquidJsonToTextManifest = {
  properties: {
    iconUri,
    brandColor,
    summary: 'Transform JSON To TEXT',
    description: 'Transform JSON to TEXT using Liquid map.',

    inputs: {
      type: 'object',
      required: ['content', 'integrationAccount'],
      properties: {
        content: jsonContent,
        integrationAccount,
      },
    },
    outputs: stringOutput,

    connector: liquidGroup,
    settings,
  },
} as OperationManifest;

export const liquidXmlToJsonManifest = {
  properties: {
    iconUri,
    brandColor,
    summary: 'Transform XML To JSON',
    description: 'Transform XML to JSON using Liquid map.',

    inputs: {
      type: 'object',
      required: ['content', 'integrationAccount'],
      properties: {
        content: xmlContent,
        integrationAccount,
        transformedContentSchema,
      },
    },
    outputs: objectOutput,

    connector: liquidGroup,
    settings,
  },
} as OperationManifest;

export const liquidXmlToTextManifest = {
  properties: {
    iconUri,
    brandColor,
    summary: 'Transform XML To TEXT',
    description: 'Transform XML to TEXT using Liquid map.',

    inputs: {
      type: 'object',
      required: ['content', 'integrationAccount'],
      properties: {
        content: xmlContent,
        integrationAccount,
      },
    },
    outputs: stringOutput,

    connector: liquidGroup,
    settings,
  },
} as OperationManifest;
