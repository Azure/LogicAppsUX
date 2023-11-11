import { getUpdatedManifestForSplitOn } from '../outputs';
import { onNewEmail } from '@microsoft/logic-apps-designer';
import type { OperationManifest } from '@microsoft/logic-apps-designer';
import { ConnectionReferenceKeyFormat } from '@microsoft/logic-apps-designer';

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

      const triggerOutputsSplitOn = "@triggerOutputs()?['body']";
      const triggerOutputsSplitOnResult = getUpdatedManifestForSplitOn(sampleManifest, triggerOutputsSplitOn);
      // Ensure the original is not modified.
      expect(sampleManifest.properties.outputs.properties.body.items.properties.importance['x-ms-property-name-alias']).toBe('importance');
      // Ensure non-OpenAPI manifest has the correct format for alias.
      expect(triggerOutputsSplitOnResult.properties.outputs.properties.body.properties.importance['x-ms-property-name-alias']).toBe(
        'body/importance'
      );

      const triggerBodySplitOn = "@triggerBody()?['value']";
      const triggerBodySplitOnResult = getUpdatedManifestForSplitOn(onNewEmail, triggerBodySplitOn);
      // Ensure the original is not modified.
      expect(onNewEmail.properties.outputs.properties.body.properties.value.items.properties.From['x-ms-property-name-alias']).toBe('From');
      // Ensure OpenAPI manifest has the correct format for alias when using SplitOn string starting with triggerBody
      expect(triggerBodySplitOnResult.properties.outputs.properties.body.properties.From['x-ms-property-name-alias']).toBe('body/From');

      const aliasPathSplitOn = "@triggerOutputs()?['body/value']";
      const aliasPathSplitOnResult = getUpdatedManifestForSplitOn(onNewEmail, aliasPathSplitOn);
      // Ensure the original is not modified.
      expect(onNewEmail.properties.outputs.properties.body.properties.value.items.properties.From['x-ms-property-name-alias']).toBe('From');
      // Ensure OpenAPI manifest has the correct alias format when using SplitOn with an alias path format.
      expect(aliasPathSplitOnResult.properties.outputs.properties.body.properties.From['x-ms-property-name-alias']).toBe('body/From');
    });
  });
});
