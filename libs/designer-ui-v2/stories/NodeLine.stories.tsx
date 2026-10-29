import type { Meta, StoryObj } from '@storybook/react';
import { NodeLine } from '@microsoft/designer-ui-v2';
import { Example } from './storyFixtures';

const meta = {
  title: 'Connections/NodeLine',
  component: NodeLine,
  args: { variant: 'solid', orientation: 'horizontal', length: 85 },
  argTypes: {
    variant: { control: 'select', options: ['solid', 'dashedNeutral', 'dashedSuccess', 'dashedDanger'] },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    length: { control: { type: 'range', min: 4, max: 240, step: 4 } },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Decorative straight SVG path, not an edge router. Forced colors use the real browser media query and CanvasText stroke.',
      },
    },
  },
} satisfies Meta<typeof NodeLine>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Variants: Story = {
  render: (args) => (
    <div className="sb-grid">
      {(['solid', 'dashedNeutral', 'dashedSuccess', 'dashedDanger'] as const).map((variant) => (
        <Example key={variant} label={variant}>
          <NodeLine {...args} variant={variant} />
        </Example>
      ))}
    </div>
  ),
};
export const Vertical: Story = { args: { orientation: 'vertical', length: 120 } };
