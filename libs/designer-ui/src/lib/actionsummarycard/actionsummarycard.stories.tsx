import type { OperationCardProps } from './card';
import { OperationCard } from './card';
import { MockSearchOperations } from '@microsoft-logic-apps/utils';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: OperationCard,
  title: 'Components/ActionSummaryCard',
} as ComponentMeta<typeof OperationCard>;
export const Container: ComponentStory<typeof OperationCard> = (args: OperationCardProps) => <OperationCard {...args} />;

const operation = MockSearchOperations[0];

Container.args = {
  title: operation.title,
  subtitle: operation.subtitle,
  id: operation.id,
  iconUrl: operation.iconUri,
  brandColor: operation.brandColor,
};
