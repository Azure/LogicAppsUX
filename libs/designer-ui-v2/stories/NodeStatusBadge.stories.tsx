import type { Meta, StoryObj } from '@storybook/react';
import { NodeStatusBadge, defaultNodeStrings } from '@microsoft/designer-ui-v2';
import { BrowserPreferences, Example, statuses } from './storyFixtures';

const meta = {
  title: 'Presentation/NodeStatusBadge',
  component: NodeStatusBadge,
  args: { status: 'succeeded' },
  argTypes: { status: { control: 'select', options: statuses } },
  parameters: {
    docs: {
      description: {
        component:
          'Stable role=status label for nine supplied run states, with optional detail. Running animation uses the actual prefers-reduced-motion media query. No fake run or loading lifecycle.',
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
          <NodeStatusBadge {...args} status={status} />
        </Example>
      ))}
    </div>
  ),
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
