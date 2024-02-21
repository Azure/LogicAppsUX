import { integrationAccountGroup } from '../operations/operationgroups';
import type { OperationManifest } from '@microsoft/logic-apps-shared';
import { SettingScope } from '@microsoft/logic-apps-shared';

export const integrationAccountArtifactLookupManifest = {
  properties: {
    iconUri: integrationAccountGroup.properties.iconUri,
    brandColor: integrationAccountGroup.properties.brandColor,
    description: `Integration Account Operation Lookup`,
    summary: 'Integration Account Operation Lookup',

    inputs: {
      type: 'object',
      required: ['artifactType', 'artifactName'],
      properties: {
        artifactType: {
          name: 'artifactType',
          summary: 'Artifact Type',
          description: 'Type of the artifact to be fetched',
          type: 'string',
          enum: ['Schema', 'Map', 'Partner', 'Agreement'],
          default: 'Schema',
        },
        artifactName: {
          name: 'artifactName',
          type: 'string',
          summary: 'Artifact Name',
          description: 'Name of the artifact to be fetched',
          'x-ms-visibility': 'important',
        },
      },
    },

    outputs: {
      type: 'object',
      required: [],
      properties: {
        name: {
          title: 'Name',
          type: 'string',
        },
        body: {
          title: 'Body',
        },
        properties: {
          title: 'Properties',
          type: 'object',
        },
      },
    },

    connector: integrationAccountGroup,

    settings: {
      secureData: {},
      trackedProperties: {
        scopes: [SettingScope.Action],
      },
    },
  },
} as OperationManifest;
