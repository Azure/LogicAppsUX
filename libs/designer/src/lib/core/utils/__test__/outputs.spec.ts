import { getUpdatedManifestForSpiltOn } from '../outputs';
import type { OperationManifest } from '@microsoft/utils-logic-apps';
import { ConnectionReferenceKeyFormat } from '@microsoft/utils-logic-apps';

describe('Outputs Utilities', () => {
  describe('getUpdatedManifestForSpiltOn', () => {
    it('properly deserializes OpenAPI property aliases', () => {
      const sampleManifest: OperationManifest = {
        properties: {
          iconUri: 'https://example.com/icon.png',
          brandColor: '#4B53BC',
          summary: 'When a new channel message is added',
          inputs: {
            type: 'object',
            properties: {
              groupId: {
                type: 'string',
                title: 'Team',
                'x-ms-dynamic-list': {
                  itemValuePath: 'id',
                  dynamicState: {
                    operationId: 'GetAllTeams',
                    parameters: {},
                    itemsPath: 'value',
                    itemValuePath: 'id',
                    itemTitlePath: 'displayName',
                  },
                  parameters: {},
                },
                description: 'Add team ID',
                minLength: 1,
                'x-ms-property-name-alias': 'groupId',
              },
            },
            required: ['channelId', 'groupId'],
          },
          outputs: {
            type: 'object',
            properties: {
              body: {
                type: 'array',
                title: 'Message List',
                items: {
                  type: 'object',
                  title: 'Message',
                  properties: {
                    importance: {
                      type: 'string',
                      title: 'importance',
                      description: 'importance',
                      'x-ms-visibility': 'advanced',
                      'x-ms-property-name-alias': 'importance',
                    },
                  },
                  required: [],
                  description: 'Properties associated with a single message.',
                },
                description: 'List of one or more messages for a specific channel in a Team.',
                'x-ms-visibility': 'advanced',
                'x-ms-property-name-alias': 'body',
              },
            },
          },
          connectionReference: {
            referenceKeyFormat: ConnectionReferenceKeyFormat.OpenApi,
          },
        },
      };
      const splitOn = "@triggerOutputs()?['body']";

      const result = getUpdatedManifestForSpiltOn(sampleManifest, splitOn);

      // Ensure the original is not modified.
      expect(sampleManifest.properties.outputs.properties.body.items.properties.importance['x-ms-property-name-alias']).toBe('importance');

      // Ensure the result has the correct format for alias.
      expect(result.properties.outputs.properties.body.properties.importance['x-ms-property-name-alias']).toBe('body/importance');
    });
  });
});
