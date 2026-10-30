import type { Meta, StoryObj } from '@storybook/react';
import { NodeBranchOutputs, NodeCard, NodeCardBody, NodeText } from '@microsoft/designer-ui-v2';
import { Slot } from './storyFixtures';

const meta = {
  title: 'Connections/NodeBranchOutputs',
  component: NodeBranchOutputs,
  args: { branches: ['true', 'false'] },
  argTypes: {
    activeIndex: { control: { type: 'number', min: 0, max: 3 } },
    labels: { control: false },
    slots: { control: false },
  },
  decorators: [
    (Story, context) =>
      context.parameters.cardWrapper === false ? (
        <Story />
      ) : (
        <NodeCard size="switch" handleAxis={context.parameters.handleAxis === 'vertical' ? 'vertical' : 'horizontal'}>
          <NodeCardBody>
            <NodeText title="If" subtitle="Host-owned ports remain outside this primitive" />
            <Story />
          </NodeCardBody>
        </NodeCard>
      ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Public opt-in If output presentation: tick → literal caption → slot. Layout comes from NodeHandleAxisContext. This primitive does not create graph handles.',
      },
    },
  },
} satisfies Meta<typeof NodeBranchOutputs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {};

export const Vertical: Story = { parameters: { handleAxis: 'vertical' } };

export const LiteralLabelsAndSlots: Story = {
  args: {
    labels: ['', 'Otherwise'],
    slots: [<Slot key="true" label="True source" />, <Slot key="false" label="False source" />],
  },
};

export const ActiveBranch: Story = {
  parameters: { cardWrapper: false },
  render: (args) => (
    <div className="sb-grid">
      <figure className="sb-example">
        <figcaption className="sb-caption">Active index 0</figcaption>
        <NodeCard size="switch">
          <NodeCardBody>
            <NodeText title="If" />
            <NodeBranchOutputs {...args} activeIndex={0} />
          </NodeCardBody>
        </NodeCard>
      </figure>
      <figure className="sb-example">
        <figcaption className="sb-caption">Active index 1</figcaption>
        <NodeCard size="switch">
          <NodeCardBody>
            <NodeText title="If" />
            <NodeBranchOutputs {...args} activeIndex={1} />
          </NodeCardBody>
        </NodeCard>
      </figure>
      <figure className="sb-example">
        <figcaption className="sb-caption">No active index</figcaption>
        <NodeCard size="switch">
          <NodeCardBody>
            <NodeText title="If" />
            <NodeBranchOutputs {...args} />
          </NodeCardBody>
        </NodeCard>
      </figure>
    </div>
  ),
};
