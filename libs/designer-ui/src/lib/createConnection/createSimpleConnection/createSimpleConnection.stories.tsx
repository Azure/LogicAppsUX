import type { CreateSimpleConnectionProps } from '.';
import { CreateSimpleConnection } from '.';
import type { Connector } from '@microsoft-logic-apps/utils';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: CreateSimpleConnection,
  title: 'Components/CreateConnection/CreateSimpleConnection',
} as ComponentMeta<typeof CreateSimpleConnection>;

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

export const WeatherExample: ComponentStory<typeof CreateSimpleConnection> = (args: CreateSimpleConnectionProps) => (
  <CreateSimpleConnection {...args} />
);

WeatherExample.args = {
  connector: mockSimpleConnector,
  isLoading: false,
  createConnectionCallback,
};
