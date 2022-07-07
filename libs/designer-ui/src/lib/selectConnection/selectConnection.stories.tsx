import { SelectConnection } from './';
import type { Connection } from '@microsoft-logic-apps/utils';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: SelectConnection,
  title: 'Components/SelectConnection',
} as ComponentMeta<typeof SelectConnection>;

const mockConnections: Connection[] = [
  {
    id: 'connection1',
    name: 'Connection 1',
    type: 'connection',
    properties: {
      displayName: 'Connection 1',
      overallStatus: 'good i guess',
      statuses: [],
      createdTime: '2020-01-01T00:00:00.000Z',
      api: {
        id: 'api1',
        name: 'api1',
        displayName: 'API 1',
        description: 'API 1 description',
        iconUri: 'https://example.com/api1.png',
        brandColor: '#cc3333',
        category: 'api',
        type: 'api',
      },
    },
  },
  {
    id: 'connection2',
    name: 'Connection 2',
    type: 'connection',
    properties: {
      displayName: 'Connection 2',
      overallStatus: 'good i guess',
      statuses: [],
      createdTime: '2020-01-01T00:00:00.000Z',
      api: {
        id: 'api2',
        name: 'api2',
        displayName: 'API 2',
        description: 'API 2 description',
        iconUri: 'https://example.com/api2.png',
        brandColor: '#3333cc',
        category: 'api',
        type: 'api',
      },
    },
  },
  {
    id: 'connection3',
    name: 'Connection 3',
    type: 'connection',
    properties: {
      displayName: 'Connection 3',
      overallStatus: 'good i guess',
      statuses: [
        {
          status: 'error',
          error: {
            code: '0',
            message: 'Invalid connection message ~',
          },
        },
      ],
      createdTime: '2020-01-01T00:00:00.000Z',
      api: {
        id: 'api3',
        name: 'api3',
        displayName: 'API 3',
        description: 'API 3 description',
        iconUri: 'https://example.com/api3.png',
        brandColor: '#33cc33',
        category: 'api',
        type: 'api',
      },
    },
  },
];

export const Standard: ComponentStory<typeof SelectConnection> = () => (
  <SelectConnection
    connections={mockConnections}
    isLoading={false}
    saveSelectionCallback={(id?: string) => alert(`SAVED SELECTION: ${id}`)}
    cancelSelectionCallback={() => alert('Cancel')}
    createNewConnectionCallback={() => alert('Create New')}
  />
);
