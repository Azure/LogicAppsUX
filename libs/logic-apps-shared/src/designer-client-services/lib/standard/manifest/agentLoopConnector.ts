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
    operationParameterSets: {
      agentModelType: {
        name: 'agentModelType',
        uiDefinition: {
          displayName: 'Agent model type',
          description: 'Type of agent model to use',
          constraints: {
            required: 'true',
            notSupportedConnectionParameters: {
              FoundryAgentService: ['Key'],
            },
          },
        },
      },
    },
    connectionParameterSets: {
      uiDefinition: {
        displayName: 'Authentication type',
        description: 'Type of authentication to use',
      },
      values: [
        {
          name: 'Key',
          parameters: {
            cognitiveServiceAccountId: {
              type: 'string',
              uiDefinition: {
                displayName: 'Azure Cognitive Service Account',
                description: 'Select the Azure Cognitive Service Account to use for this connection',
                tooltip: 'Select the Azure Cognitive Service Account to use for this connection',
                constraints: {
                  clearText: true,
                  required: 'true',
                },
              },
            },
            openAIEndpoint: {
              type: 'string',
              parameterSource: 'AppConfiguration',
              uiDefinition: {
                displayName: 'API endpoint',
                description: 'Endpoint will be filled automatically.',
                tooltip: 'The endpoint of the resource that hosts the AI model',
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
                description: 'Key will be filled automatically.',
                tooltip: 'The API key to access the resource that hosts the AI model',
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
        {
          name: 'ManagedServiceIdentity',
          parameters: {
            cognitiveServiceAccountId: {
              type: 'string',
              managedIdentitySettings: {
                requiredRoles: ['Azure AI Administrator', 'Cognitive Services Contributor'],
              },
              uiDefinition: {
                displayName: 'Azure Cognitive Service Account',
                description: 'Select the Azure Cognitive Service Account to use for this connection',
                tooltip: 'Select the Azure Cognitive Service Account to use for this connection',
                constraints: {
                  clearText: true,
                  required: 'true',
                },
              },
            },
            openAIEndpoint: {
              type: 'string',
              parameterSource: 'AppConfiguration',
              uiDefinition: {
                displayName: 'API endpoint',
                description: 'Endpoint will be filled automatically.',
                tooltip: 'The endpoint of the resource that hosts the AI model',
                constraints: {
                  clearText: true,
                  required: 'true',
                },
              },
            },
          },
          uiDefinition: {
            displayName: 'Managed Service Identity',
            tooltip: 'Managed Service Identity',
            description: 'Managed Service Identity',
          },
        },
      ],
    },
  },
} as Connector;
