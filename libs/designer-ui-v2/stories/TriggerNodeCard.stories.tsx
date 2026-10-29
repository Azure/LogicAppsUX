import type { Meta, StoryObj } from '@storybook/react';
import { TriggerNodeCard } from '@microsoft/designer-ui-v2';
import { axisControl, Example, requestIcon, selectedRequestIcon, statuses, statusControl } from './storyFixtures';

const meta = {
  title: 'Node Cards/TriggerNodeCard',
  component: TriggerNodeCard,
  args: { title: 'When a request arrives', subtitle: 'Trigger · Request', handles: true, selected: false, handleAxis: 'horizontal' },
  argTypes: {
    status: statusControl,
    handleAxis: axisControl,
    icon: { control: false },
    selectedIcon: { control: false },
    after: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component: 'Pill-shaped trigger with trailing decorative outputs. Connector metadata and image lifecycles belong to the host.',
      },
    },
  },
} satisfies Meta<typeof TriggerNodeCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const SelectedCustomGlyph: Story = {
  args: { selected: true, icon: requestIcon, selectedIcon: selectedRequestIcon, after: <small>Local trigger annotation</small> },
};
export const Vertical: Story = { args: { handleAxis: 'vertical', status: 'succeeded', statusDetail: '200' } };
export const WithoutHandles: Story = { args: { handles: false } };
export const RunStates: Story = {
  render: (args) => (
    <div className="sb-grid">
      {statuses.map((status) => (
        <Example key={status} label={status}>
          <TriggerNodeCard {...args} status={status} />
        </Example>
      ))}
    </div>
  ),
};
