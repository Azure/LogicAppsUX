import type { Meta, StoryObj } from '@storybook/react';
import { PlaceholderTriggerCard } from '@microsoft/designer-ui-v2';
import { axisControl } from './storyFixtures';

const meta = {
  title: 'Node Cards/PlaceholderTriggerCard',
  component: PlaceholderTriggerCard,
  args: { selected: false, handleAxis: 'horizontal' },
  argTypes: { handleAxis: axisControl },
  parameters: {
    docs: {
      description: {
        component:
          'Empty-trigger presentation uses PLACEHOLDER_TRIGGER_TITLE through defaultNodeStrings. The dashed SVG outline measures the real element with ResizeObserver; it is not a loading state.',
      },
    },
  },
} satisfies Meta<typeof PlaceholderTriggerCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Selected: Story = { args: { selected: true } };
export const CustomTitle: Story = { args: { title: 'Choose how this workflow starts', handleAxis: 'vertical' } };
export const Localized: Story = { args: { strings: { title: 'Agrega un desencadenador' } } };
