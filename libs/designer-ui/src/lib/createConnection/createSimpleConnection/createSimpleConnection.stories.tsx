import { CreateSimpleConnection } from '.';
import type { Connection } from '@microsoft-logic-apps/utils';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: CreateSimpleConnection,
  title: 'Components/CreateConnection/CreateSimpleConnection',
} as ComponentMeta<typeof CreateSimpleConnection>;

const mockSimpleConnection: Connection = {
  id: 'weather_connection',
  name: 'WeatherConnection',
  type: 'connection',
  properties: {
    displayName: 'Weather Connection',
    overallStatus: 'good i guess',
    statuses: [],
    createdTime: '2020-01-01T00:00:00.000Z',
    api: {
      id: 'weather_api',
      name: 'weather_api',
      displayName: 'Weather API',
      description: 'Weather API description',
      iconUri: 'https://example.com/api.png',
      brandColor: '#3333cc',
      category: 'api',
      type: 'api',
    },
  },
};

export const WeatherExample: ComponentStory<typeof CreateSimpleConnection> = () => (
  <CreateSimpleConnection
    connection={mockSimpleConnection}
    isLoading={false}
    createConnectionCallback={() => alert('Creating simple connector')}
  />
);
