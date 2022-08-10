import type { ConnectorSummaryCardProps } from '.';
import { ConnectorSummaryCard } from '.';
import { ConnectorsMock, isBuiltInConnector } from '@microsoft-logic-apps/utils';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: ConnectorSummaryCard,
  title: 'Components/ConnectorSummaryCard',
} as ComponentMeta<typeof ConnectorSummaryCard>;

export const Card: ComponentStory<typeof ConnectorSummaryCard> = (args: ConnectorSummaryCardProps) => (
  <div style={{ padding: '16px', width: '300px' }}>
    <ConnectorSummaryCard {...args} />
  </div>
);

const connector = ConnectorsMock[0];

Card.args = {
  id: connector.id,
  connectorName: connector.properties.displayName,
  description: connector.properties['description'],
  iconUrl: connector.properties.iconUri,
  brandColor: connector.properties.brandColor,
  category: isBuiltInConnector(connector.id) ? 'Built-in' : 'Azure',
  onClick: () => alert('Clicked :' + connector.id),
};

export const NoCard: ComponentStory<typeof ConnectorSummaryCard> = (args: ConnectorSummaryCardProps) => (
  <div style={{ padding: '16px', width: '300px' }}>
    <ConnectorSummaryCard {...args} />
  </div>
);

NoCard.args = {
  ...Card.args,
  isCard: false,
};
