import type { OperationSearchCardProps } from '.';
import { OperationSearchCard } from '.';
import { mockOperationActionsData } from '../operationGroupDetails/mocks';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: OperationSearchCard,
  title: 'Components/OperationSearchCard',
} as ComponentMeta<typeof OperationSearchCard>;
export const Card: ComponentStory<typeof OperationSearchCard> = (args: OperationSearchCardProps) => (
  <div style={{ padding: '16px', width: '560px' }}>
    <OperationSearchCard {...args} />
  </div>
);

Card.args = {
  operationActionData: mockOperationActionsData[0],
  onClick: () => null,
};
