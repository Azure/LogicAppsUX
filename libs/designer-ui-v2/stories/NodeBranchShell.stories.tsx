import { NodeBranchShell } from '@microsoft/designer-ui-v2';
import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Frames/NodeBranchShell',
  component: NodeBranchShell,
  args: { tone: 'neutral', children: 'Default', style: { width: 220, height: 36 } },
  parameters: {
    docs: {
      description: { component: 'Branch header paint and space for controls. Hosts supply lane identity, layout, and commands.' },
    },
  },
} satisfies Meta<typeof NodeBranchShell>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
export const Selected: StoryObj<typeof meta> = { args: { selected: true } };
export const Inactive: StoryObj<typeof meta> = { args: { inactive: true } };
