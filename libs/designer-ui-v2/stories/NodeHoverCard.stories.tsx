import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import {
  ActionNodeCard,
  NodeHoverCard,
  NodeInfoCard,
  NODE_HOVER_CARD_IGNORE_ATTRIBUTE,
  nodeHoverCardTiming,
} from '@microsoft/designer-ui-v2';
import type { NodeHoverCardProps } from '@microsoft/designer-ui-v2';
import { requestIcon } from './storyFixtures';

const information = (
  <NodeInfoCard category="action" icon={requestIcon} title="Send request details" description="Local information; no request is sent." />
);
const meta = {
  title: 'Information/NodeHoverCard',
  component: NodeHoverCard,
  args: {
    openDelay: nodeHoverCardTiming.openDelay,
    closeDelay: nodeHoverCardTiming.closeDelay,
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
          '600ms hover or keyboard-visible focus opening, 200ms close grace, Escape dismissal and render-function close. Each preview scope coordinates its own cards and provides the same-document outlet. Programmatic focus does not open; focus stays with the consumer.',
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
    // Start at the following control, then use real keyboard navigation so Fluent marks the node's focus.
    canvas.getByRole('button', { name: 'Next focus target' }).focus();
    await userEvent.tab({ shift: true });
    await expect(trigger).toHaveFocus();
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
export const DefaultDelay: Story = { args: { openDelay: undefined } };
export const KeyboardVisibleFocus: Story = {
  ...FocusEscapeAndDismiss,
  args: { openDelay: 0, closeDelay: 0 },
};
export const IgnoredInteractiveDescendant: Story = {
  args: {
    openDelay: 0,
    closeDelay: 0,
    children: (
      <div role="group" tabIndex={0} aria-label="Node with an interactive descendant">
        Node owner
        <button type="button" {...{ [NODE_HOVER_CARD_IGNORE_ATTRIBUTE]: 'true' }}>
          Ignored action
        </button>
      </div>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const ignored = canvas.getByRole('button', { name: 'Ignored action' });
    await userEvent.hover(ignored);
    await expect(canvas.queryByText('Send request details')).not.toBeInTheDocument();
    await userEvent.click(ignored);
    await expect(canvas.queryByText('Send request details')).not.toBeInTheDocument();
    await userEvent.unhover(ignored);
    // Keyboard focus on the marked descendant is ignored as well as click-driven focus.
    await userEvent.tab();
    await userEvent.tab({ shift: true });
    await expect(ignored).toHaveFocus();
    await expect(canvas.queryByText('Send request details')).not.toBeInTheDocument();
  },
};
