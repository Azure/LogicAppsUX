import type { OperationGroupActionProps } from '.';
import { OperationGroupAction } from '.';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: OperationGroupAction,
  title: 'Components/OperationGroupDetails',
} as ComponentMeta<typeof OperationGroupAction>;
export const Action: ComponentStory<typeof OperationGroupAction> = (args: OperationGroupActionProps) => (
  <div style={{ padding: '16px', width: '560px' }}>
    <OperationGroupAction {...args} />
  </div>
);

Action.args = {
  id: 'id',
  brandColor: '#770BD6',
  title: 'Increment variable',
  subtitle: 'Increment variable by 1',
  connectorName: 'TestConnector',
};
