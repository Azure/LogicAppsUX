import type { Meta, StoryObj } from '@storybook/react';
import { NodeIconTile } from '@microsoft/designer-ui-v2';
import type { NodeIconTone } from '@microsoft/designer-ui-v2';
import { categoryControl, Example, requestIcon, selectedRequestIcon } from './storyFixtures';

const tones = ['teal', 'green', 'purple', 'violet', 'red', 'blue', 'pink', 'neutral'] as const satisfies readonly NodeIconTone[];
// Inline full-color mark so the artwork story renders offline, like a resolved connector iconUri.
const connectorArt = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#0078d4"/><path d="M8 10h16v12H8z" fill="#fff"/><path d="M8 10l8 7 8-7" fill="none" stroke="#0078d4" stroke-width="2"/></svg>'
)}`;

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
    tone: { control: 'select', options: [undefined, ...tones] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Decorative regular/filled artwork by selection, category border and test-data treatment. Hosts may opt into a family `tone` for fallback glyphs or mark resolved connector art with `artwork` so it renders untinted. The surrounding card supplies an accessible name.',
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
export const Tones: Story = {
  render: (args) => (
    <div className="sb-grid">
      {tones.map((tone) => (
        <Example key={tone} label={tone}>
          <NodeIconTile {...args} tone={tone} />
        </Example>
      ))}
    </div>
  ),
};
export const Artwork: Story = { args: { artwork: true, icon: <img alt="" src={connectorArt} />, selectedIcon: undefined } };
