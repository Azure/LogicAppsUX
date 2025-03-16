import type { Connector } from '../../../../utils/src';

export default {
  type: 'AgentConnection',
  name: 'agent',
  id: 'connectionProviders/agent',
  properties: {
    displayName: 'Agent',
    iconUri: 'https://logicapps.azureedge.net/icons/azureopenai/icon.svg',
    brandColor: '#268bde',
    description: 'Easily integrate cutting-edge artificial intelligence capabilities into your workflows',
    capabilities: ['actions'],
    connectionParameterSets: {
      uiDefinition: {
        displayName: 'Authentication type',
        description: 'Type of authentication to use',
      },
      values: [
        {
          name: 'Key',
          parameters: {
            openAIEndpoint: {
              type: 'string',
              parameterSource: 'AppConfiguration',
              uiDefinition: {
                displayName: 'AI endpoint',
                description: 'The endpoint of the resource that hosts the AI model',
                tooltip: 'Provide the AI endpoint',
                constraints: {
                  clearText: true,
                  required: 'true',
                },
              },
            },
            openAIKey: {
              type: 'securestring',
              parameterSource: 'AppConfiguration',
              uiDefinition: {
                displayName: 'API key',
                description: 'The API key to access the resource that hosts the AI model',
                tooltip: 'Provide the AI API key',
                constraints: {
                  clearText: false,
                  required: 'true',
                },
              },
            },
          },
          uiDefinition: {
            displayName: 'URL and key-based authentication',
            tooltip: 'URL and key-based authentication',
            description: 'URL and key-based authentication',
          },
        },
      ],
    },
  },
} as Connector;
