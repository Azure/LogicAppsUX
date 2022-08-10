import type { OperationSearchCardProps } from '.';
import { OperationSearchCard } from '.';
import { mockOperationActionsData } from '../operationGroupDetails/mocks';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: OperationSearchCard,
  title: 'Components/OperationGroupDetails',
} as ComponentMeta<typeof OperationSearchCard>;
export const Operation: ComponentStory<typeof OperationSearchCard> = (args: OperationSearchCardProps) => (
  <div style={{ padding: '16px', width: '560px' }}>
    <OperationSearchCard {...args} />
  </div>
);

Operation.args = {
  operationActionData: mockOperationActionsData[0],
  onClick: () => null,
};
