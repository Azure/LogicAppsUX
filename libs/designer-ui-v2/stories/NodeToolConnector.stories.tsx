import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { NodeToolConnector, ToolItemCard } from '@microsoft/designer-ui-v2';
import type { NodeToolConnectorProps } from '@microsoft/designer-ui-v2';

const meta = {
  title: 'Connections/NodeToolConnector',
  component: NodeToolConnector,
  args: { hasTools: false },
  parameters: {
    docs: {
      description: {
        component:
          'Tool attachment presentation. No tools plus a callback shows add; missing callback ends in a dot; existing tools end in an attached dot. This does not connect real graph nodes.',
      },
    },
  },
} satisfies Meta<typeof NodeToolConnector>;
export default meta;
type Story = StoryObj<typeof meta>;
export const NoCallback: Story = {};
export const Attached: Story = { args: { hasTools: true } };
export const CustomLabels: Story = { args: { label: 'Herramientas', addToolLabel: 'Agregar herramienta' } };
function LocalConnector(args: NodeToolConnectorProps) {
  const [added, setAdded] = useState(false);
  return (
    <div className="sb-stack">
      <NodeToolConnector
        {...args}
        hasTools={added || args.hasTools}
        onAddTool={
          args.onAddTool
            ? () => {
                args.onAddTool?.();
                setAdded(true);
              }
            : undefined
        }
      />
      {added && <ToolItemCard title="New local tool" />}
      <output data-testid="connector-state">{added ? 'Added one tool locally' : 'No tool added'}</output>
    </div>
  );
}
export const AddTool: Story = {
  args: { onAddTool: fn() },
  render: (args) => <LocalConnector {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole('button', { name: 'Add tool' }).focus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByTestId('connector-state')).toHaveTextContent('Added one tool locally');
    await expect(canvas.queryByRole('button', { name: 'Add tool' })).not.toBeInTheDocument();
  },
};
