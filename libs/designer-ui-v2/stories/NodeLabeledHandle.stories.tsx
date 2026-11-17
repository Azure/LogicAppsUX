import type { Meta, StoryObj } from '@storybook/react';
import { NodeLabeledHandle } from '@microsoft/designer-ui-v2';

const meta = {
  title: 'Connections/NodeLabeledHandle',
  component: NodeLabeledHandle,
  args: { branch: 'true', lineLength: 52 },
  argTypes: {
    branch: { control: 'inline-radio', options: ['true', 'false'] },
    lineLength: { control: { type: 'range', min: 0, max: 160, step: 4 } },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Branch dot, literal label and decorative dashed path. Branch color alone is not the label; supply localized label text as needed.',
      },
    },
  },
} satisfies Meta<typeof NodeLabeledHandle>;
export default meta;
type Story = StoryObj<typeof meta>;
export const TrueBranch: Story = {};
export const FalseBranch: Story = { args: { branch: 'false' } };
export const CustomLabel: Story = { args: { label: 'Approved', lineLength: 100 } };
