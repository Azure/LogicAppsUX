import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { NodeActionAdd } from '@microsoft/designer-ui-v2';
import type { NodeActionAddProps } from '@microsoft/designer-ui-v2';

function LocalActionAdd(args: NodeActionAddProps) {
  const [count, setCount] = useState(0);
  return (
    <div className="sb-stack">
      <NodeActionAdd
        {...args}
        onClick={
          args.onClick
            ? () => {
                args.onClick?.();
                setCount((value) => value + 1);
              }
            : undefined
        }
      />
      <output data-testid="action-add-state">Local additions: {count}</output>
    </div>
  );
}
const meta = {
  title: 'Actions/NodeActionAdd',
  component: NodeActionAdd,
  args: { label: 'Add action', onClick: fn(), disabled: false },
  render: (args) => <LocalActionAdd {...args} />,
  parameters: {
    docs: {
      description: {
        component:
          'Decorative handle/path plus the real NodeAddButton. Host mutation is deliberately absent; activation changes a visible local count.',
      },
    },
  },
} satisfies Meta<typeof NodeActionAdd>;
export default meta;
type Story = StoryObj<typeof meta>;
export const AddLocally: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole('button', { name: 'Add action' }).focus();
    await userEvent.keyboard(' ');
    await expect(canvas.getByTestId('action-add-state')).toHaveTextContent('Local additions: 1');
  },
};
export const MissingCallback: Story = { args: { onClick: undefined } };
export const Disabled: Story = { args: { disabled: true } };
export const CustomLabel: Story = { args: { label: 'Insert operation after branch' } };
