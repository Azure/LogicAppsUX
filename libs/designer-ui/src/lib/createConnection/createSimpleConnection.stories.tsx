import type { CreateConnectionProps } from '.';
import { CreateConnection } from '.';
import type { Connector } from '@microsoft-logic-apps/utils';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: CreateConnection,
  title: 'Components/CreateConnection/CreateConnection',
} as ComponentMeta<typeof CreateConnection>;

const mockSimpleConnector: Connector = {
  id: '/providers/Microsoft.PowerApps/apis/arm',
  name: 'arm',
  type: '/providers/Microsoft.PowerApps/apis',
  properties: {
    capabilities: [],
    displayName: 'Weather API',
    environment: '',
    purpose: '',
    iconUri: '',
    runtimeUrls: [],
  },
};

const createConnectionCallback = () => alert('Creating Simple connector');

export const SimpleExample: ComponentStory<typeof CreateConnection> = (args: CreateConnectionProps) => <CreateConnection {...args} />;

SimpleExample.args = {
  connectorDisplayName: mockSimpleConnector.properties.displayName,
  connectionParameters: mockSimpleConnector.properties.connectionParameters,
  connectionParameterSets: mockSimpleConnector.properties.connectionParameterSets,
  isLoading: false,
  createConnectionCallback,
};
