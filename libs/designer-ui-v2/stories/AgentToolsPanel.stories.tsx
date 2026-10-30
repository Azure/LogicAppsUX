import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { AgentToolsPanel, ToolItemCard } from '@microsoft/designer-ui-v2';
import type { AgentToolsPanelProps } from '@microsoft/designer-ui-v2';

const meta = {
  title: 'Agents/AgentToolsPanel',
  component: AgentToolsPanel,
  args: { expanded: true },
  argTypes: { children: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          'Props-only tools section. Missing add/toggle callbacks omit their controls entirely. expanded is controlled by the consumer.',
      },
    },
  },
} satisfies Meta<typeof AgentToolsPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const OneTool: Story = { args: { children: <ToolItemCard title="Get request" size="small" /> } };
export const MultipleTools: Story = {
  args: {
    children: [
      <ToolItemCard key="one" title="Get request" size="small" />,
      <ToolItemCard key="two" title="Notify reviewer" kind="subWorkflow" size="small" />,
    ],
  },
};
export const CollapsedWithoutToggle: Story = { args: { expanded: false, children: <ToolItemCard title="Get request" size="small" /> } };
function LocalPanel(args: AgentToolsPanelProps) {
  const [expanded, setExpanded] = useState(args.expanded ?? true);
  const [count, setCount] = useState(0);
  return (
    <div className="sb-stack">
      <AgentToolsPanel
        {...args}
        expanded={expanded}
        onAddTool={
          args.onAddTool
            ? () => {
                args.onAddTool?.();
                setCount((value) => value + 1);
              }
            : undefined
        }
        onToggleExpanded={
          args.onToggleExpanded
            ? () => {
                args.onToggleExpanded?.();
                setExpanded((value) => !value);
              }
            : undefined
        }
      >
        {Array.from({ length: count }, (_, index) => (
          <ToolItemCard key={index} title={`Local tool ${index + 1}`} size="small" />
        ))}
      </AgentToolsPanel>
      <output data-testid="panel-state">
        {count} local tools; {expanded ? 'expanded' : 'collapsed'}
      </output>
    </div>
  );
}
export const AddAndToggle: Story = {
  args: { onAddTool: fn(), onToggleExpanded: fn() },
  render: (args) => <LocalPanel key={String(args.expanded)} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole('button', { name: 'Add tools' }).focus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByTestId('panel-state')).toHaveTextContent('1 local tools; expanded');
    const toggle = canvas.getByRole('button', { name: 'Collapse tools' });
    await expect(toggle.getAttribute('aria-controls')).toBeTruthy();
    toggle.focus();
    await userEvent.keyboard(' ');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.queryByText('Local tool 1')).not.toBeInTheDocument();
  },
};
