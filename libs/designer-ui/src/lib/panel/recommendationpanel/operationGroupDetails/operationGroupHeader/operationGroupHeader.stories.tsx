import type { OperationGroupHeaderProps } from '.';
import { OperationGroupHeader } from '.';
import { mockOperationApi } from '../mocks';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: OperationGroupHeader,
  title: 'Components/OperationGroupDetails',
} as ComponentMeta<typeof OperationGroupHeader>;
export const Header: ComponentStory<typeof OperationGroupHeader> = (args: OperationGroupHeaderProps) => (
  <div style={{ padding: '16px', width: '560px' }}>
    <OperationGroupHeader {...args} />
  </div>
);

Header.args = {
  id: mockOperationApi.id,
  title: mockOperationApi.displayName,
  description: mockOperationApi.description,
  iconUrl: mockOperationApi.iconUri,
};
