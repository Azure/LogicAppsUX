import type { Meta, StoryObj } from '@storybook/react';
import { NodeText, NodeHoverCardActiveContext } from '@microsoft/designer-ui-v2';

const meta = {
  title: 'Presentation/NodeText',
  component: NodeText,
  args: { title: 'Send request', subtitle: 'Built-in · HTTP' },
  decorators: [
    (Story) => (
      <div className="sb-bounded">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Single-line title/subtitle with ellipsis inside a constrained container. Native title tooltips are omitted when NodeHoverCardActiveContext is true to avoid competing descriptions.',
      },
    },
  },
} satisfies Meta<typeof NodeText>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const TitleOnly: Story = { args: { subtitle: undefined } };
export const LongContent: Story = {
  args: {
    title: 'A deliberately long operation title that cannot fit in a bounded card',
    subtitle: 'Built-in · HTTP · Additional descriptive context that is also truncated',
  },
};
export const ActiveHoverContext: Story = {
  decorators: [
    (Story) => (
      <NodeHoverCardActiveContext.Provider value>
        <Story />
      </NodeHoverCardActiveContext.Provider>
    ),
  ],
};
