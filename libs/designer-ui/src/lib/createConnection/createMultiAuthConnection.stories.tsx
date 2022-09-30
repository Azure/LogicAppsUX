import type { CreateConnectionProps } from '.';
import { CreateConnection } from '.';
import type { ConnectionParameterSet, Connector } from '@microsoft-logic-apps/utils';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: CreateConnection,
  title: 'Components/CreateConnection',
} as ComponentMeta<typeof CreateConnection>;

const mockMultiAuthConnector: Connector = {
  id: '/providers/Microsoft.PowerApps/apis/sql',
  name: 'sql',
  type: '/providers/Microsoft.PowerApps/apis',
  properties: {
    capabilities: [],
    displayName: 'Multi Auth Connector',
    environment: '',
    purpose: '',
    iconUri: '',
    runtimeUrls: [],
    connectionParameterSets: {
      uiDefinition: {
        displayName: 'Authentication Type',
        description: 'Sample description',
      },
      values: [
        {
          name: 'Managed identity',
          uiDefinition: {
            displayName: 'Managed identity',
            description: 'Managed identity Type',
          },
          parameters: {
            token: {
              type: 'managedIdentity',
              uiDefinition: {
                displayName: 'Managed Identity',
                description: 'Managed identity description',
                tooltip: 'Managed identity tooltip',
                constraints: {
                  required: 'true',
                  location: 'logicapp',
                },
              },
              managedIdentitySettings: {
                resourceUri: 'https://management.core.windows.net/',
              },
            },
          },
        },
        {
          name: 'Second Option',
          uiDefinition: {
            displayName: 'Second Option',
            description: 'Second Option Type',
          },
          parameters: {
            param1: {
              type: 'AuthParam',
              uiDefinition: {
                displayName: 'Auth Param 1',
                description: 'Auth Param 1 description',
                tooltip: 'Auth Param 1 tooltip',
                constraints: {
                  required: 'true',
                  location: 'logicapp',
                },
              },
            },
            param2: {
              type: 'AuthParam',
              uiDefinition: {
                displayName: 'Auth Param 2',
                description: 'Auth Param 2 description',
                tooltip: 'Auth Param 2 tooltip',
                constraints: {
                  required: 'false',
                  location: 'logicapp',
                },
              },
            },
          },
        },
      ],
    },
  },
};

const createConnectionCallback = (newName: string, selectedParameterSet?: ConnectionParameterSet, values?: Record<string, any>) =>
  alert(`Creating Multi Auth connector: ${JSON.stringify(values)}`);

export const MultiAuthExample: ComponentStory<typeof CreateConnection> = (args: CreateConnectionProps) => <CreateConnection {...args} />;

MultiAuthExample.args = {
  connectorDisplayName: mockMultiAuthConnector.properties.displayName,
  connectionParameters: mockMultiAuthConnector.properties.connectionParameters,
  connectionParameterSets: mockMultiAuthConnector.properties.connectionParameterSets,
  isLoading: false,
  createConnectionCallback,
  cancelCallback: () => alert('Cancelled'),
};
