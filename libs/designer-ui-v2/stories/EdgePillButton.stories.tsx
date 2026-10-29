import { useState } from 'react';
import { AddRegular } from '@fluentui/react-icons';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { EdgePillButton } from '@microsoft/designer-ui-v2';
import type { EdgePillButtonProps } from '@microsoft/designer-ui-v2';

function LocalEdgeAction(args: EdgePillButtonProps) {
  const [count, setCount] = useState(0);
  return (
    <div className="sb-stack">
      <EdgePillButton
        {...args}
        onActivate={
          args.onActivate
            ? () => {
                args.onActivate?.();
                setCount((value) => value + 1);
              }
            : undefined
        }
      />
      <output data-testid="edge-state">Activations: {count}</output>
      <p className="sb-note">
        Hidden does not mean disabled: Tab reveals the enabled pill. Host placement and larger hit areas are outside this primitive.
      </p>
    </div>
  );
}
const meta = {
  title: 'Actions/EdgePillButton',
  component: EdgePillButton,
  args: { icon: <AddRegular />, tooltip: 'Insert action', ariaLabel: 'Insert action', isRevealed: true, onActivate: fn(), disabled: false },
  argTypes: { icon: { control: false } },
  render: (args) => <LocalEdgeAction {...args} />,
  parameters: {
    docs: {
      description: {
        component:
          'Hover-reveal pill with native Enter/Space activation. Hidden enabled controls remain focusable and reveal on keyboard focus. Missing callback disables it.',
      },
    },
  },
} satisfies Meta<typeof EdgePillButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Revealed: Story = {};
export const HiddenKeyboardActivation: Story = {
  args: { isRevealed: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Insert action' });
    button.focus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByTestId('edge-state')).toHaveTextContent('Activations: 1');
    await userEvent.keyboard(' ');
    await expect(canvas.getByTestId('edge-state')).toHaveTextContent('Activations: 2');
  },
};
export const MissingCallback: Story = { args: { onActivate: undefined } };
export const Disabled: Story = { args: { disabled: true } };
