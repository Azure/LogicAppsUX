import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { ActionNodeCard, NodeHoverCard, NodeInfoCard } from '@microsoft/designer-ui-v2';
import type { NodeHoverCardProps } from '@microsoft/designer-ui-v2';
import { requestIcon } from './storyFixtures';

const information = (
  <NodeInfoCard category="action" icon={requestIcon} title="Send request details" description="Local information; no request is sent." />
);
const meta = {
  title: 'Information/NodeHoverCard',
  component: NodeHoverCard,
  args: {
    openDelay: 400,
    closeDelay: 200,
    disabled: false,
    card: information,
    children: <ActionNodeCard title="Send request" role="group" tabIndex={0} aria-label="Inspect Send request" />,
  },
  argTypes: {
    children: { control: false },
    card: { control: false },
    externalFocusTarget: { control: false },
    openDelay: { control: { type: 'number', min: 0, max: 2000, step: 50 } },
    closeDelay: { control: { type: 'number', min: 0, max: 1000, step: 50 } },
  },
  decorators: [
    (Story) => (
      <div className="sb-hover-stage">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Delayed hover/focus description, Escape dismissal and render-function close. The preview scope provides the real same-document outlet. Focus stays with the consumer, not a graph host.',
      },
    },
  },
} satisfies Meta<typeof NodeHoverCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Disabled: Story = { args: { disabled: true } };
function LocalHover(args: NodeHoverCardProps) {
  const [dismissed, setDismissed] = useState(0);
  return (
    <div className="sb-stack">
      <NodeHoverCard
        {...args}
        card={(close) => (
          <NodeInfoCard
            category="action"
            icon={requestIcon}
            title="Send request details"
            description="Focus and pointer interaction use the scoped outlet."
            onDismiss={() => {
              close();
              setDismissed((value) => value + 1);
            }}
          />
        )}
      />
      <output data-testid="hover-state">Dismissed: {dismissed}</output>
      <button type="button">Next focus target</button>
    </div>
  );
}
export const FocusEscapeAndDismiss: Story = {
  render: (args) => <LocalHover {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('group', { name: 'Inspect Send request' });
    trigger.focus();
    const focusedClose = await canvas.findByRole('button', { name: 'Close' });
    // Fluent mounts the popup before its enter motion makes descendants visible.
    await waitFor(() => expect(focusedClose).toBeVisible());
    await expect(trigger).toHaveAttribute('aria-describedby');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument());
    await userEvent.hover(trigger);
    const hoveredClose = await canvas.findByRole('button', { name: 'Close' });
    await waitFor(() => expect(hoveredClose).toBeVisible());
    await userEvent.click(hoveredClose);
    await expect(canvas.getByTestId('hover-state')).toHaveTextContent('Dismissed: 1');
    await userEvent.unhover(trigger);
    trigger.blur();
  },
};
export const ExternalFocusTarget: Story = { render: (args) => <ExternalTarget {...args} /> };
function ExternalTarget(args: NodeHoverCardProps) {
  const [target, setTarget] = useState<HTMLButtonElement | null>(null);
  return (
    <div className="sb-stack">
      <button type="button" ref={setTarget}>
        External local focus target
      </button>
      <NodeHoverCard {...args} externalFocusTarget={target}>
        <ActionNodeCard title="Pointer target" />
      </NodeHoverCard>
      <p className="sb-note">Tab to the external button to open the same description; blur or Escape closes it.</p>
    </div>
  );
}
