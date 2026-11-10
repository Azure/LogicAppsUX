import type { Meta, StoryObj } from '@storybook/react';
import { NodeMergePoint } from '@microsoft/designer-ui-v2';
import { Slot } from './storyFixtures';

const meta = {
  title: 'Connections/NodeMergePoint',
  component: NodeMergePoint,
  args: { label: 'Approval branches', inactive: false },
  argTypes: { children: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Named role=img junction. Children can preserve host ports, but these examples contain only illustrative DOM. No routing or execution semantics.',
      },
    },
  },
} satisfies Meta<typeof NodeMergePoint>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Inactive: Story = { args: { inactive: true } };
export const ChildSlot: Story = { args: { children: <Slot label="Merge" /> } };
export const Localized: Story = { args: { strings: { label: (name) => `Punto de unión: ${name}` } } };
