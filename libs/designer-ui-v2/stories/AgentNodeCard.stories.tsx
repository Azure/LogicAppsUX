import { Children, useState } from 'react';
import { Button } from '@fluentui/react-components';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { AgentNodeCard, ToolItemCard } from '@microsoft/designer-ui-v2';
import type { AgentNodeCardProps } from '@microsoft/designer-ui-v2';
import { axisControl, Slot, statusControl } from './storyFixtures';

const meta = {
  title: 'Agents/AgentNodeCard',
  component: AgentNodeCard,
  args: {
    title: 'Triage assistant',
    subtitle: 'Agent',
    model: 'Local model label',
    handles: true,
    toolsExpanded: true,
    selected: false,
    handleAxis: 'horizontal',
  },
  argTypes: {
    handleAxis: axisControl,
    status: statusControl,
    toolsPlacement: { control: 'inline-radio', options: ['below', 'side'] },
    tools: { control: false },
    toolsPanelSlot: { control: false },
    footerAction: { control: false },
    inputSlot: { control: false },
    outputSlot: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Model is a display label, not a model connection. The built-in panel accepts ToolItemCard children directly. No nested AgentToolsPanel or backend.',
      },
    },
  },
} satisfies Meta<typeof AgentNodeCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const EmptyModelFallback: Story = { args: { model: undefined } };
export const WithTools: Story = {
  args: {
    tools: [
      <ToolItemCard key="request" title="Look up request" kind="action" size="small" />,
      <ToolItemCard key="workflow" title="Escalate" kind="subWorkflow" size="small" />,
    ],
  },
};
export const ReplacementPanel: Story = {
  args: {
    toolsPanelSlot: <p className="sb-note">Host-supplied panel slot; external tool identities remain host-owned.</p>,
    inputSlot: <Slot label="Input" />,
    outputSlot: <Slot label="Output" />,
    handleAxis: 'vertical',
    status: 'mock',
  },
};
export const WithoutHandles: Story = {
  args: { handles: false, selected: true, tools: <ToolItemCard title="Inspect item" size="small" /> },
};

function LocalAgent(args: AgentNodeCardProps) {
  const [count, setCount] = useState(args.tools ? Children.count(args.tools) : 1);
  const [expanded, setExpanded] = useState(args.toolsExpanded ?? true);
  const [inspected, setInspected] = useState(false);
  return (
    <div className="sb-stack">
      <AgentNodeCard
        {...args}
        toolsExpanded={expanded}
        onToggleTools={
          args.onToggleTools
            ? () => {
                args.onToggleTools?.();
                setExpanded((value) => !value);
              }
            : undefined
        }
        onAddTool={
          args.onAddTool
            ? (anchor) => {
                args.onAddTool?.(anchor);
                setCount((value) => value + 1);
              }
            : undefined
        }
        tools={Array.from({ length: count }, (_, index) => <ToolItemCard key={index} title={`Local tool ${index + 1}`} size="small" />)}
        footerAction={
          <Button size="small" onClick={() => setInspected((value) => !value)}>
            Inspect label
          </Button>
        }
      />
      <output data-testid="agent-state">
        Tools: {count}; panel {expanded ? 'expanded' : 'collapsed'}; label {inspected ? 'inspected' : 'not inspected'}
      </output>
    </div>
  );
}
export const AddAndCollapse: Story = {
  args: { onAddTool: fn(), onToggleTools: fn() },
  render: (args) => <LocalAgent key={String(args.toolsExpanded)} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const add = canvas.getByRole('button', { name: 'Add tools' });
    add.focus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByTestId('agent-state')).toHaveTextContent('Tools: 2; panel expanded');
    const collapse = canvas.getByRole('button', { name: 'Collapse tools' });
    collapse.focus();
    await userEvent.keyboard(' ');
    await expect(collapse).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.getByTestId('agent-state')).toHaveTextContent('panel collapsed');
  },
};
export const EmptyAddTool: Story = {
  args: { onAddTool: fn() },
  render: (args) => <EmptyAgent {...args} />,
};
function EmptyAgent(args: AgentNodeCardProps) {
  const [added, setAdded] = useState(false);
  return (
    <div className="sb-stack">
      <AgentNodeCard
        {...args}
        onAddTool={(anchor) => {
          args.onAddTool?.(anchor);
          setAdded(true);
        }}
        tools={added ? <ToolItemCard title="New local tool" size="small" /> : undefined}
      />
      <output>{added ? 'Added one local tool' : 'No tools yet'}</output>
    </div>
  );
}
export const BelowToolsDefault: Story = {
  args: { ...WithTools.args, toolsPlacement: 'below', onAddTool: fn(), onToggleTools: fn() },
  render: (args) => <LocalAgent {...args} />,
};
export const SideToolsVertical: Story = {
  args: { ...WithTools.args, handleAxis: 'vertical', toolsPlacement: 'side' },
  render: (args) => <AnchoredAgent {...args} />,
};
function AnchoredAgent(args: AgentNodeCardProps) {
  const [anchor, setAnchor] = useState('No add anchor received');
  return (
    <div className="sb-stack">
      <AgentNodeCard
        {...args}
        onAddTool={(element) => {
          args.onAddTool?.(element);
          setAnchor(element?.tagName ?? 'No element');
        }}
      />
      <output>Host receives an Add tool button anchor: {anchor}. Graph coordinates remain host-owned.</output>
    </div>
  );
}
export const SideRequestFallsBackHorizontal: Story = {
  args: { ...WithTools.args, handleAxis: 'horizontal', toolsPlacement: 'side' },
  parameters: {
    docs: { description: { story: 'Horizontal cards fall back to below tools; side placement requires a vertical main flow.' } },
  },
};
export const ReadOnlyEmptyTools: Story = {
  args: { tools: undefined, onAddTool: undefined },
  parameters: {
    docs: {
      description: { story: 'Empty read-only Agents omit the connector and panel; there is no empty-state copy or dead Add button.' },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: /Add tool/ })).not.toBeInTheDocument();
  },
};
export const AddableEmptyTools: Story = {
  ...EmptyAddTool,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Add tool' }));
    await expect(canvas.getByText('New local tool')).toBeInTheDocument();
  },
};
