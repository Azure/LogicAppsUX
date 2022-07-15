import type { CreateConfigurableConnectionProps } from '.';
import { CreateConfigurableConnection } from '.';
import type { Connector } from '@microsoft-logic-apps/utils';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: CreateConfigurableConnection,
  title: 'Components/CreateConnection/CreateConfigurableConnection',
} as ComponentMeta<typeof CreateConfigurableConnection>;

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

const createConnectionCallback = (values: Record<string, string | undefined>) =>
  alert(`Creating Multi Auth connector: ${JSON.stringify(values)}`);

export const MultiAuthExample: ComponentStory<typeof CreateConfigurableConnection> = (args: CreateConfigurableConnectionProps) => (
  <CreateConfigurableConnection {...args} />
);

MultiAuthExample.args = {
  connector: mockMultiAuthConnector,
  isLoading: false,
  createConnectionCallback,
  cancelCallback: () => alert('Cancelled'),
};
