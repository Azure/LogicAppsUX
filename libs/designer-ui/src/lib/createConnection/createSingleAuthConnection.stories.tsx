import type { CreateConnectionProps } from '.';
import { CreateConnection } from '.';
import type { ConnectionParameterSet, Connector } from '@microsoft/utils-logic-apps';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: CreateConnection,
  title: 'Components/CreateConnection',
} as ComponentMeta<typeof CreateConnection>;

const mockSingleAuthConnector: Connector = {
  id: '/providers/Microsoft.PowerApps/apis/arm',
  name: 'arm',
  type: '/providers/Microsoft.PowerApps/apis',
  properties: {
    capabilities: [],
    displayName: 'Some External Service',
    environment: '',
    purpose: '',
    iconUri: '',
    runtimeUrls: [],
    connectionParameters: {
      token: {
        type: 'oauthSetting',
        uiDefinition: {
          displayName: 'Param 1',
          description: 'First parameter',
          tooltip: 'Param 1 tooltip',
          constraints: {
            required: 'true',
            location: 'logicapp',
          },
        },
        oAuthSettings: {
          clientId: 'clientId',
          identityProvider: 'aadcertificate',
          properties: {
            IsFirstParty: 'true',
            AzureActiveDirectoryResourceId: 'https://management.core.windows.net/',
          },
          redirectUrl: 'https://global-test.consent.azure-apim.net/redirect',
          scopes: [],
        },
      },
    },
  },
};

const createConnectionCallback = (newName: string, selectedParameterSet?: ConnectionParameterSet, values?: Record<string, any>) =>
  alert(`Creating Single Auth connector: ${JSON.stringify(values)}`);

export const SingleAuthExample: ComponentStory<typeof CreateConnection> = (args: CreateConnectionProps) => <CreateConnection {...args} />;

SingleAuthExample.args = {
  connectorDisplayName: mockSingleAuthConnector.properties.displayName,
  connectionParameters: mockSingleAuthConnector.properties.connectionParameters,
  connectionParameterSets: mockSingleAuthConnector.properties.connectionParameterSets,
  isLoading: false,
  createConnectionCallback,
  checkOAuthCallback: () => false,
  cancelCallback: () => alert('Cancelled'),
};
