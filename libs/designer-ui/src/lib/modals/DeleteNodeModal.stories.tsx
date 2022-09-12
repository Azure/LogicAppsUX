import type { DeleteNodeModalProps } from './DeleteNodeModal';
import { DeleteNodeModal } from './DeleteNodeModal';
import { WORKFLOW_NODE_TYPES } from '@microsoft-logic-apps/utils';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: DeleteNodeModal,
  title: 'Components/Modals',
} as ComponentMeta<typeof DeleteNodeModal>;
const Component: ComponentStory<typeof DeleteNodeModal> = (args: DeleteNodeModalProps) => <DeleteNodeModal {...args} />;

export const DeleteNode = Component.bind({});
DeleteNode.args = {
  nodeId: 'TestNode',
  nodeType: WORKFLOW_NODE_TYPES['OPERATION_NODE'],
  isOpen: true,
  onDismiss: () => alert('Dismissing modal'),
  onConfirm: () => alert('Deleted TestNode'),
};
