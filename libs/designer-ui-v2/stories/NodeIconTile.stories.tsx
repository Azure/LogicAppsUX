import type { Meta, StoryObj } from '@storybook/react';
import { NodeIconTile } from '@microsoft/designer-ui-v2';
import { categoryControl, Example, requestIcon, selectedRequestIcon } from './storyFixtures';

const meta = {
  title: 'Presentation/NodeIconTile',
  component: NodeIconTile,
  args: {
    category: 'action',
    icon: requestIcon,
    selectedIcon: selectedRequestIcon,
    selected: false,
    bordered: true,
    testData: false,
    size: 'medium',
  },
  argTypes: {
    category: categoryControl,
    size: { control: 'inline-radio', options: ['medium', 'small'] },
    icon: { control: false },
    selectedIcon: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Decorative regular/filled artwork by selection, category border and test-data treatment. The surrounding card supplies an accessible name.',
      },
    },
  },
} satisfies Meta<typeof NodeIconTile>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Categories: Story = {
  render: (args) => (
    <div className="sb-grid">
      {(['trigger', 'action', 'control', 'agent'] as const).map((category) => (
        <Example key={category} label={category}>
          <NodeIconTile {...args} category={category} />
        </Example>
      ))}
    </div>
  ),
};
export const SmallBorderless: Story = { args: { size: 'small', bordered: false } };
export const Selected: Story = { args: { selected: true } };
export const TestData: Story = { args: { testData: true } };
