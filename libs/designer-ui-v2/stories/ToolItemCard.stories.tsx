import type { Meta, StoryObj } from '@storybook/react';
import { ToolItemCard } from '@microsoft/designer-ui-v2';
import { Example, requestIcon, statuses, statusControl } from './storyFixtures';

const meta = {
  title: 'Agents/ToolItemCard',
  component: ToolItemCard,
  args: { title: 'Look up request', kind: 'action', size: 'medium', selected: false },
  argTypes: {
    kind: { control: 'select', options: ['action', 'mcp', 'subWorkflow'] },
    size: { control: 'inline-radio', options: ['medium', 'small'] },
    status: statusControl,
    icon: { control: false },
    selectedIcon: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A tool label, not a tool invocation. Small cards fill their container. MCP uses a public Fluent fallback; optional host artwork goes in icon.',
      },
    },
  },
} satisfies Meta<typeof ToolItemCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const KindsAndSizes: Story = {
  render: (args) => (
    <div className="sb-grid">
      {(['action', 'mcp', 'subWorkflow'] as const).map((kind) => (
        <Example key={kind} label={kind}>
          <div className="sb-stack sb-bounded">
            <ToolItemCard {...args} kind={kind} />
            <ToolItemCard {...args} kind={kind} size="small" selected />
          </div>
        </Example>
      ))}
    </div>
  ),
};
export const CustomMcpIcon: Story = { args: { kind: 'mcp', icon: requestIcon, selected: true } };
export const RunStates: Story = {
  render: (args) => (
    <div className="sb-grid">
      {statuses.map((status) => (
        <Example key={status} label={status}>
          <ToolItemCard {...args} status={status} />
        </Example>
      ))}
    </div>
  ),
};
