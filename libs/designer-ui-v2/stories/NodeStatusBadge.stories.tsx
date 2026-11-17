import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { NodeStatusBadge, defaultNodeStrings } from '@microsoft/designer-ui-v2';
import { BrowserPreferences, Example, statuses } from './storyFixtures';

const meta = {
  title: 'Presentation/NodeStatusBadge',
  component: NodeStatusBadge,
  args: { status: 'succeeded', live: true },
  argTypes: { status: { control: 'select', options: statuses }, live: { control: 'boolean' } },
  parameters: {
    docs: {
      description: {
        component:
          'Nine supplied tones with optional mapped label/detail. Standalone use defaults to one polite status region; canvas composites use live=false. An explicit role wins. Running animation uses the actual prefers-reduced-motion media query.',
      },
    },
  },
} satisfies Meta<typeof NodeStatusBadge>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const AllStatuses: Story = {
  render: (args) => (
    <div className="sb-grid">
      {statuses.map((status) => (
        <Example key={status} label={status}>
          <NodeStatusBadge {...args} status={status} live={false} />
        </Example>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('status')).not.toBeInTheDocument();
  },
};
export const MappedServiceLabel: Story = {
  args: {
    status: 'failed',
    label: 'Timed out',
    detail: 'after 30 seconds',
    'aria-label': 'Send request timed out after 30 seconds',
  },
};
export const LiveRegionOptIn: Story = {
  args: { status: 'running', live: true },
  play: async ({ canvasElement }) => {
    const region = within(canvasElement).getByRole('status');
    // role=status supplies implicit polite live semantics; the component does not add aria-live.
    await expect(region).toHaveAttribute('role', 'status');
    await expect(within(canvasElement).getAllByRole('status')).toHaveLength(1);
  },
};
export const WithDetail: Story = { args: { status: 'failed', detail: '502 · upstream response' } };
export const Localized: Story = { args: { strings: { ...defaultNodeStrings.status, succeeded: 'Correcto' } } };
export const BrowserMotionPreference: Story = {
  args: { status: 'running' },
  render: (args) => (
    <div className="sb-stack">
      <NodeStatusBadge {...args} />
      <BrowserPreferences />
    </div>
  ),
};
