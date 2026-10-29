import { useState } from 'react';
import { Button } from '@fluentui/react-components';
import type { Meta, StoryObj } from '@storybook/react';
import { NodeCard, NodeCardBody, NodeCardFooter, NodeText } from '@microsoft/designer-ui-v2';
import type { NodeCardFooterProps } from '@microsoft/designer-ui-v2';
import { requestIcon } from './storyFixtures';

const meta = {
  title: 'Presentation/NodeCardFooter',
  component: NodeCardFooter,
  args: { children: 'Model display label' },
  argTypes: { icon: { control: false }, action: { control: false } },
  decorators: [
    (Story) => (
      <NodeCard width="wide" surface="agent">
        <NodeCardBody>
          <NodeText title="Footer anatomy" />
        </NodeCardBody>
        <Story />
      </NodeCard>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component: 'Optional decorative icon and trailing action slot below the body. Footer controls are supplied by the consumer.',
      },
    },
  },
} satisfies Meta<typeof NodeCardFooter>;
export default meta;
type Story = StoryObj<typeof meta>;
export const TextOnly: Story = {};
export const WithIcon: Story = { args: { icon: requestIcon } };
function FooterAction(args: NodeCardFooterProps) {
  const [inspected, setInspected] = useState(false);
  return (
    <NodeCardFooter
      {...args}
      action={
        <Button size="small" onClick={() => setInspected((value) => !value)}>
          {inspected ? 'Inspected' : 'Inspect'}
        </Button>
      }
    />
  );
}
export const ActionSlot: Story = { render: (args) => <FooterAction {...args} /> };
