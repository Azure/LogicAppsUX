import type { Connector } from '../../../../utils/src';

export default {
  type: 'ServiceProvider',
  name: 'acasession',
  id: '/serviceProviders/acasession',
  properties: {
    displayName: 'Azure Container App (ACA) Session',
    iconUri: 'https://logicapps.azureedge.net/icons/aioperations/icon.svg',
    brandColor: '#8c6cff',
    description: 'Azure Container App (ACA) Session',
    capabilities: ['actions'],
    connectionParameterSets: {
      uiDefinition: {
        displayName: 'Connection Type',
        description: 'Connection Type',
      },
      values: [
        {
          name: 'ConnectionString',
          parameters: {
            poolManagementEndpoint: {
              type: 'string',
              parameterSource: 'AppConfiguration',
              uiDefinition: {
                displayName: 'Pool Management Endpoint',
                tooltip: 'The Azure Container App (ACA) pool management endpoint',
                constraints: {
                  required: 'true',
                },
                description: 'The Azure Container App (ACA) pool management endpoint.',
              },
            },
          },
          uiDefinition: {
            displayName: 'Pool management connection',
            description: 'The Azure Container App (ACA) pool management connection.',
          },
        },
        {
          name: 'ManagedServiceIdentity',
          parameters: {
            poolManagementEndpoint: {
              type: 'string',
              parameterSource: 'AppConfiguration',
              uiDefinition: {
                displayName: 'Pool Management Endpoint',
                tooltip: 'The Azure Container App (ACA) pool management endpoint',
                constraints: {
                  required: 'true',
                },
                description: 'The Azure Container App (ACA) pool management endpoint.',
              },
            },
            Type: {
              type: 'string',
              parameterSource: 'NotSpecified',
              uiDefinition: {
                displayName: 'Managed identity',
                tooltip: 'Managed identity',
                constraints: {
                  required: 'true',
                  default: 'ManagedServiceIdentity',
                  hideInUI: 'true',
                  propertyPath: ['authProvider'],
                },
                description: 'Managed identity',
              },
            },
            Identity: {
              type: 'string',
              parameterSource: 'NotSpecified',
              uiDefinition: {
                displayName: 'Managed identity',
                tooltip: 'Managed identity',
                constraints: {
                  required: 'false',
                  hideInUI: 'true',
                  propertyPath: ['authProvider'],
                },
                description: 'Managed identity',
              },
            },
          },
          uiDefinition: {
            displayName: 'Managed identity',
            tooltip: 'Managed identity',
            description: 'Managed identity',
          },
        },
      ],
    },
    isSecureByDefault: false,
  },
} as Connector;
