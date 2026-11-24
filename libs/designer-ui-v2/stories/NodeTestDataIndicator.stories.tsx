import type { Meta, StoryObj } from '@storybook/react';
import { NodeTestDataIndicator } from '@microsoft/designer-ui-v2';

const meta = {
  title: 'Presentation/NodeTestDataIndicator',
  component: NodeTestDataIndicator,
  parameters: {
    docs: {
      description: {
        component:
          'Named role=img test-data affordance, independent of the run-status badge. The caller supplies localized labels; it does not fetch or generate data.',
      },
    },
  },
} satisfies Meta<typeof NodeTestDataIndicator>;
export default meta;
type Story = StoryObj<typeof meta>;
export const DefaultLabel: Story = {};
export const CustomLabel: Story = { args: { label: 'Using the supplied sample response' } };
