import type { Meta, StoryObj } from '@storybook/react';
import { NodeCard, NodeCardBody, NodeInputHandle, NodeText } from '@microsoft/designer-ui-v2';
import { Slot } from './storyFixtures';

const meta = {
  title: 'Connections/NodeInputHandle',
  component: NodeInputHandle,
  args: { variant: 'neutral', inactive: false },
  argTypes: { variant: { control: 'select', options: ['neutral', 'success', 'danger'] }, children: { control: false } },
  decorators: [
    (Story, context) => (
      <NodeCard handleAxis={context.parameters.handleAxis === 'vertical' ? 'vertical' : 'horizontal'}>
        <NodeCardBody>
          <Story />
          <NodeText title="Input positioning" subtitle="Axis inherited from NodeCard" />
        </NodeCardBody>
      </NodeCard>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Positioned handle reads NodeHandleAxisContext from the enclosing card. It does not expose a handleAxis prop or create a graph connection.',
      },
    },
  },
} satisfies Meta<typeof NodeInputHandle>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Horizontal: Story = {};
export const Vertical: Story = { parameters: { handleAxis: 'vertical' } };
export const ChildSlot: Story = { args: { children: <Slot label="Input" /> } };
export const Inactive: Story = { args: { inactive: true } };
