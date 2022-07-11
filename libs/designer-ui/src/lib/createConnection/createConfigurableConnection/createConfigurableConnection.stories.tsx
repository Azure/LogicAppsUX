import { CreateConfigurableConnection } from '.';
import type { Connection } from '@microsoft-logic-apps/utils';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: CreateConfigurableConnection,
  title: 'Components/CreateConnection/CreateConfigurableConnection',
} as ComponentMeta<typeof CreateConfigurableConnection>;

const mockSimpleConnection: Connection = {
  id: 'message_connection',
  name: 'MessageConnection',
  type: 'connection',
  properties: {
    connectionParameters: {
      'connection-string': {
        type: 'idk',
        uiDefinition: {
          displayName: 'Connection String',
          tooltip: 'Provide Azure Service Bus Connection String. Parameter value will be saved in App Settings.',
          description: 'Azure Service Bus Connection String',
          constraints: {
            required: 'true',
            hidden: 'false',
          },
        },
      },
      'optional-param': {
        type: 'idk',
        uiDefinition: {
          displayName: 'Optional Parameter',
          tooltip: 'An optional parameter for testing',
          description: 'An optional parameter for testing',
          constraints: {
            required: 'false',
            hidden: 'false',
          },
        },
      },
    },
    displayName: 'Send Message',
    overallStatus: 'good i guess',
    statuses: [],
    createdTime: '2020-01-01T00:00:00.000Z',
    api: {
      id: 'message_api',
      name: 'message_api',
      displayName: 'Message API',
      description: 'Message API description',
      iconUri: 'https://example.com/api.png',
      brandColor: '#33cc33',
      category: 'api',
      type: 'api',
    },
  },
};

export const SendMessageExample: ComponentStory<typeof CreateConfigurableConnection> = () => (
  <CreateConfigurableConnection
    connection={mockSimpleConnection}
    isLoading={false}
    createConnectionCallback={(values: Record<string, string | undefined>) =>
      alert(`Creating Configurable connector: ${JSON.stringify(values)}`)
    }
  />
);
