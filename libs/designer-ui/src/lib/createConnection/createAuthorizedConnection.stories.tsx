import type { CreateConnectionProps } from '.';
import { CreateConnection } from '.';
import type { Connector } from '@microsoft-logic-apps/utils';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: CreateConnection,
  title: 'Components/CreateConnection',
} as ComponentMeta<typeof CreateConnection>;

const mockOAuthConnector: Connector = {
  id: '/providers/Microsoft.PowerApps/apis/arm',
  name: 'arm',
  type: '/providers/Microsoft.PowerApps/apis',
  properties: {
    capabilities: [],
    displayName: 'Single Auth Connector',
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

const authClickCallback = () => alert(`Attempting connection to OAuth connector`);

export const OAuthExample: ComponentStory<typeof CreateConnection> = (args: CreateConnectionProps) => <CreateConnection {...args} />;

OAuthExample.args = {
  connectorDisplayName: mockOAuthConnector.properties.displayName,
  connectionParameters: mockOAuthConnector.properties.connectionParameters,
  connectionParameterSets: mockOAuthConnector.properties.connectionParameterSets,
  isLoading: false,
  authClickCallback,
  needsAuth: true,
  cancelCallback: () => alert('Cancelled'),
};
