import type { Meta, StoryObj } from '@storybook/react';
import { NodeCard, NodeCardBody, NodeOutputHandles, NodeText } from '@microsoft/designer-ui-v2';
import { Slot } from './storyFixtures';

const meta = {
  title: 'Connections/NodeOutputHandles',
  component: NodeOutputHandles,
  args: { handles: ['success', 'danger'], spacing: 'loose' },
  argTypes: {
    spacing: { control: 'inline-radio', options: ['tight', 'loose'] },
    activeIndex: { control: { type: 'number', min: 0, max: 3 } },
    slots: { control: false },
  },
  decorators: [
    (Story, context) => (
      <NodeCard size="switch" handleAxis={context.parameters.handleAxis === 'vertical' ? 'vertical' : 'horizontal'}>
        <NodeCardBody>
          <NodeText title="Ordered outputs" />
          <Story />
        </NodeCardBody>
      </NodeCard>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Ordered decorative variants and corresponding child slots. activeIndex dims other outputs. Orientation comes from NodeHandleAxisContext, not a component prop.',
      },
    },
  },
} satisfies Meta<typeof NodeOutputHandles>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Horizontal: Story = {};
export const Vertical: Story = { parameters: { handleAxis: 'vertical' } };
export const Tight: Story = { args: { handles: ['neutral', 'neutral', 'neutral', 'neutral'], spacing: 'tight' } };
export const TakenOutputWithSlots: Story = {
  args: { activeIndex: 0, slots: [<Slot key="yes" label="True" />, <Slot key="no" label="False" />] },
};
