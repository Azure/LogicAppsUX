import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, waitFor, within } from '@storybook/test';
import { AgentToolsPanel, ToolItemCard } from '@microsoft/designer-ui-v2';
import type { AgentToolsPanelProps } from '@microsoft/designer-ui-v2';

const meta = {
  title: 'Agents/AgentToolsPanel',
  component: AgentToolsPanel,
  args: { expanded: true },
  argTypes: { children: { control: false }, surface: { control: 'inline-radio', options: ['opaque', 'transparent'] } },
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
  const [count, setCount] = useState(args.children ? 2 : 0);
  return (
    <div className="sb-stack">
      <AgentToolsPanel
        {...args}
        expanded={expanded}
        onAddTool={
          args.onAddTool
            ? (anchor) => {
                args.onAddTool?.(anchor);
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
    // Reveal keeps the body mounted until its collapse motion settles.
    await waitFor(() => expect(canvas.queryByText('Local tool 1')).not.toBeInTheDocument());
  },
};
export const ControlledReveal: Story = {
  args: { ...MultipleTools.args, onToggleExpanded: fn() },
  render: (args) => <LocalPanel {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Collapse tools' }));
    await expect(canvas.getByRole('button', { name: 'Expand tools' })).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(canvas.queryByText('Local tool 1')).not.toBeInTheDocument());
    await userEvent.click(canvas.getByRole('button', { name: 'Expand tools' }));
    await expect(canvas.getByRole('button', { name: 'Collapse tools' })).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByText('Local tool 1')).toBeInTheDocument();
  },
};
export const TransparentSurface: Story = { args: { ...MultipleTools.args, surface: 'transparent' } };
export const AnchorCallbacks: Story = {
  render: (args) => <PanelAnchors {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Add tools' }));
    await expect(canvas.getByText(/Host-owned anchors:/)).toHaveTextContent('panel SECTION; add button BUTTON');
  },
};
function PanelAnchors(args: AgentToolsPanelProps) {
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  const [anchor, setAnchor] = useState('none');
  return (
    <div className="sb-stack">
      <AgentToolsPanel
        {...args}
        ref={setPanel}
        onAddTool={(element) => {
          args.onAddTool?.(element);
          setAnchor(element?.tagName ?? 'none');
        }}
      >
        {MultipleTools.args?.children}
      </AgentToolsPanel>
      <output>
        Host-owned anchors: panel {panel?.tagName ?? 'mounting'}; add button {anchor}. No graph positioning is computed here.
      </output>
    </div>
  );
}
