import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { NodeAddButton } from '@microsoft/designer-ui-v2';
import type { NodeAddButtonProps } from '@microsoft/designer-ui-v2';

function LocalAdd(args: NodeAddButtonProps) {
  const [count, setCount] = useState(0);
  return (
    <div className="sb-stack">
      <NodeAddButton
        {...args}
        onClick={
          args.onClick
            ? (event) => {
                args.onClick?.(event);
                setCount((value) => value + 1);
              }
            : undefined
        }
      />
      <output data-testid="add-state">Local additions: {count}</output>
    </div>
  );
}
const meta = {
  title: 'Actions/NodeAddButton',
  component: NodeAddButton,
  args: { label: 'Add action', disabled: false, onClick: fn() },
  render: (args) => <LocalAdd {...args} />,
  parameters: {
    docs: {
      description: {
        component:
          'Standalone add button. Explicitly disabled or absent onClick produces a disabled affordance, not an apparently active no-op. The counter is local only.',
      },
    },
  },
} satisfies Meta<typeof NodeAddButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const AddLocally: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole('button', { name: 'Add action' }).focus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByTestId('add-state')).toHaveTextContent('Local additions: 1');
  },
};
export const MissingCallback: Story = { args: { onClick: undefined } };
export const Disabled: Story = { args: { disabled: true } };
export const CustomLabel: Story = { args: { label: 'Insert next operation' } };
