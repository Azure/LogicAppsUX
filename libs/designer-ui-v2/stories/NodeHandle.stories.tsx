import type { Meta, StoryObj } from '@storybook/react';
import { NodeHandle } from '@microsoft/designer-ui-v2';
import { Example, Slot } from './storyFixtures';

const meta = {
  title: 'Connections/NodeHandle',
  component: NodeHandle,
  args: { variant: 'neutral', inactive: false },
  argTypes: { variant: { control: 'select', options: ['neutral', 'success', 'danger'] }, children: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Decorative dot, aria-hidden when empty. Child slots preserve host composition but this story supplies only simple nonconnectable DOM, not graph behavior.',
      },
    },
  },
} satisfies Meta<typeof NodeHandle>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Variants: Story = {
  render: (args) => (
    <div className="sb-grid">
      {(['neutral', 'success', 'danger'] as const).map((variant) => (
        <Example key={variant} label={variant}>
          <NodeHandle {...args} variant={variant} />
          <NodeHandle {...args} variant={variant} inactive />
        </Example>
      ))}
    </div>
  ),
};
export const ChildSlot: Story = { args: { children: <Slot label="Illustrative host slot" /> } };
