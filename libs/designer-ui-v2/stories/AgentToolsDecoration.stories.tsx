import type { Meta, StoryObj } from '@storybook/react';
import { AgentToolsDecoration } from '@microsoft/designer-ui-v2';

const meta = {
  title: 'Agents/AgentToolsDecoration',
  component: AgentToolsDecoration,
  parameters: {
    docs: {
      description: {
        component:
          'Opaque visual backdrop for the agent tools region. Hosts render it on a lower canvas layer than the interactive AgentToolsPanel so edges can pass between them.',
      },
    },
  },
} satisfies Meta<typeof AgentToolsDecoration>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { style: { width: 240, height: 120 }, 'aria-hidden': true } };
