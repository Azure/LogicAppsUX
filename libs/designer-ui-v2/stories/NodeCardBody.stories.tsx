import type { Meta, StoryObj } from '@storybook/react';
import { NodeCard, NodeCardBody, NodeIconTile, NodeText } from '@microsoft/designer-ui-v2';
import { requestIcon } from './storyFixtures';

const meta = {
  title: 'Presentation/NodeCardBody',
  component: NodeCardBody,
  args: {
    density: 'default',
    testData: false,
    children: (
      <>
        <NodeIconTile category="action" icon={requestIcon} />
        <NodeText title="Transform request" subtitle="Built-in · Compose" />
      </>
    ),
  },
  argTypes: { density: { control: 'inline-radio', options: ['default', 'small'] }, children: { control: false } },
  decorators: [
    (Story) => (
      <NodeCard>
        <Story />
      </NodeCard>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Flex body reserves end space for the test-data indicator. Pair small density with a small shell/icon when composing a compact tool.',
      },
    },
  },
} satisfies Meta<typeof NodeCardBody>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Small: Story = {
  args: {
    density: 'small',
    children: (
      <>
        <NodeIconTile category="action" icon={requestIcon} size="small" />
        <NodeText title="Compact content" />
      </>
    ),
  },
};
export const TestData: Story = { args: { testData: true, testDataLabel: 'Using local sample data' } };
