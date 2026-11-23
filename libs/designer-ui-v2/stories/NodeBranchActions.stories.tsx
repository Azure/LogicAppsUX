import { EditRegular, MoreHorizontalRegular } from '@fluentui/react-icons';
import { NodeBranchActions, NodeBranchShell } from '@microsoft/designer-ui-v2';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

const meta = {
  title: 'Actions/NodeBranchActions',
  component: NodeBranchActions,
  args: {
    items: [
      { key: 'rename', ariaLabel: 'Rename case', icon: <EditRegular />, onInvoke: fn() },
      { key: 'more', ariaLabel: 'More case actions', icon: <MoreHorizontalRegular />, hasPopup: true, onInvoke: fn() },
    ],
  },
  render: (args) => (
    <NodeBranchShell tone="neutral" hasActions style={{ width: 260, height: 36 }}>
      Case
      <NodeBranchActions {...args} />
    </NodeBranchShell>
  ),
  parameters: {
    docs: {
      description: { component: 'Renders branch action buttons. The host controls which commands exist and opens menus or dialogs.' },
    },
  },
} satisfies Meta<typeof NodeBranchActions>;
export default meta;

export const Default: StoryObj<typeof meta> = {
  play: async ({ args, canvasElement }) => {
    const rename = within(canvasElement).getByRole('button', { name: 'Rename case' });
    rename.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.items[0].onInvoke).toHaveBeenCalledWith(rename);
  },
};
