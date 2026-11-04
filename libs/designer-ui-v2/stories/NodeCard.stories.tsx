import type { Meta, StoryObj } from '@storybook/react';
import { NodeCard, NodeCardBody, NodeCardFooter, NodeIconTile, NodeText } from '@microsoft/designer-ui-v2';
import { axisControl, requestIcon, statusControl } from './storyFixtures';

const meta = {
  title: 'Presentation/NodeCard',
  component: NodeCard,
  args: {
    width: 'standard',
    size: 'medium',
    shape: 'rounded',
    surface: 'neutral',
    appearance: 'default',
    selected: false,
    handleAxis: 'horizontal',
    children: (
      <NodeCardBody>
        <NodeIconTile category="action" icon={requestIcon} />
        <NodeText title="Card anatomy" subtitle="Icon · body · text" />
      </NodeCardBody>
    ),
  },
  argTypes: {
    width: { control: 'select', options: ['compact', 'standard', 'wide', 'fill'] },
    size: { control: 'select', options: ['medium', 'small', 'switch'] },
    shape: { control: 'inline-radio', options: ['rounded', 'pill'] },
    surface: { control: 'inline-radio', options: ['neutral', 'agent'] },
    appearance: { control: 'inline-radio', options: ['default', 'placeholder'] },
    handleAxis: axisControl,
    status: statusControl,
    children: { control: false },
    after: { control: false },
  },
  decorators: [
    (Story) => (
      <div className="sb-bounded">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Low-level shell with a width, inner surface and after slot. Status mock is expressed by compositions through NodeCardBody testData rather than an overhanging badge.',
      },
    },
  },
} satisfies Meta<typeof NodeCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Widths: Story = {
  render: (args) => (
    <div className="sb-stack">
      {(['compact', 'standard', 'wide', 'fill'] as const).map((width) => (
        <div key={width} className="sb-bounded">
          <p className="sb-caption">{width}</p>
          <NodeCard {...args} width={width} />
        </div>
      ))}
    </div>
  ),
};
export const SmallPill: Story = { args: { size: 'small', shape: 'pill' } };
export const AgentSurfaceAndFooter: Story = {
  args: {
    surface: 'agent',
    selected: true,
    status: 'succeeded',
    children: (
      <>
        <NodeCardBody>
          <NodeText title="Agent surface" />
        </NodeCardBody>
        <NodeCardFooter>Model label</NodeCardFooter>
      </>
    ),
    after: <p className="sb-note">Outside the inner surface</p>,
  },
};
export const Placeholder: Story = { args: { appearance: 'placeholder' } };
export const VerticalStatus: Story = { args: { handleAxis: 'vertical', status: 'warning', statusDetail: 'Review' } };
