import type { ConnectorSummaryCardProps } from './connectorsummarycard';
import { ConnectorSummaryCard } from './connectorsummarycard';
import { ConnectorsMock } from '@microsoft-logic-apps/utils';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: ConnectorSummaryCard,
  title: 'Components/ConnectorSummaryCard',
} as ComponentMeta<typeof ConnectorSummaryCard>;
export const Container: ComponentStory<typeof ConnectorSummaryCard> = (args: ConnectorSummaryCardProps) => (
  <ConnectorSummaryCard {...args} />
);

const connector = ConnectorsMock[0];

Container.args = {
  connectorName: connector.properties.displayName,
  description: connector.properties.swagger ? connector.properties.swagger['info']['description'] : '',
  id: connector.id,
  iconUrl: connector.properties.iconUri,
  brandColor: connector.properties.brandColor,
};
