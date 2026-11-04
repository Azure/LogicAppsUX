import type { Meta, StoryObj } from '@storybook/react';
import { IfIconFilled } from '@microsoft/designer-ui-v2';

const meta = {
  title: 'Icons/IfIconFilled',
  component: IfIconFilled,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          'Filled condition glyph for selected presentation. No declared props and no invented variants. See IfIconRegular for the paired comparison and finite public glyph vocabulary.',
      },
    },
  },
} satisfies Meta<typeof IfIconFilled>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Filled: Story = {
  render: () => (
    <span className="sb-glyph" role="img" aria-label="Selected If condition">
      <IfIconFilled />
    </span>
  ),
};
