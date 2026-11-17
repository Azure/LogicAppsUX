import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LoopNodeCard, CollapseChip, defaultNodeStrings } from '@microsoft/designer-ui-v2';
import type { LoopNodeCardProps } from '@microsoft/designer-ui-v2';
import { axisControl, Example, Slot, statusControl } from './storyFixtures';

const meta = {
  title: 'Node Cards/LoopNodeCard',
  component: LoopNodeCard,
  args: { title: 'Process each item', bodyPlacement: 'end', handles: true, selected: false, handleAxis: 'horizontal' },
  argTypes: {
    bodyPlacement: { control: 'select', options: ['end', 'bottom', 'none'] },
    handleAxis: axisControl,
    status: statusControl,
    bodySlot: { control: false },
    bodyToggle: { control: false },
    inputSlot: { control: false },
    outputSlots: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Loop shell only: body paging, topology and execution are host responsibilities. end gives [body, done]; bottom/none give [next]. A supplied bodyToggle replaces the bottom dot.',
      },
    },
  },
} satisfies Meta<typeof LoopNodeCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Placements: Story = {
  render: (args) => (
    <div className="sb-grid">
      {(['end', 'bottom', 'none'] as const).map((bodyPlacement) => (
        <Example key={bodyPlacement} label={bodyPlacement}>
          <LoopNodeCard {...args} bodyPlacement={bodyPlacement} />
        </Example>
      ))}
    </div>
  ),
};
export const Slots: Story = {
  args: {
    bodyPlacement: 'bottom',
    inputSlot: <Slot label="Input" />,
    outputSlots: [<Slot key="next" label="Next" />],
    bodySlot: <Slot label="Body" />,
    selected: true,
  },
};
export const NavigationOnlyLocalized: Story = {
  args: { handles: false, status: 'mock', strings: { ...defaultNodeStrings, loop: { foreach: 'Para cada elemento' } } },
};
function LocalBody(args: LoopNodeCardProps) {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <div className="sb-stack">
      <LoopNodeCard {...args} bodyToggle={<CollapseChip collapsed={collapsed} count={3} onToggle={setCollapsed} />} />
      <output>Loop body: {collapsed ? 'collapsed' : 'expanded'} (local presentation only)</output>
    </div>
  );
}
export const BodyToggle: Story = { render: (args) => <LocalBody {...args} /> };
