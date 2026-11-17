import { useState } from 'react';
import { Button } from '@fluentui/react-components';
import type { Meta, StoryObj } from '@storybook/react';
import { NodeFrame, NodeText, ActionNodeCard } from '@microsoft/designer-ui-v2';
import type { NodeFrameProps } from '@microsoft/designer-ui-v2';
import { axisControl, Example, Slot, statuses, statusControl } from './storyFixtures';

const meta = {
  title: 'Presentation/NodeFrame',
  component: NodeFrame,
  args: {
    kind: 'scope',
    title: 'Review group',
    subtitle: 'Local content',
    handles: false,
    selected: false,
    handleAxis: 'horizontal',
    children: (
      <div className="sb-frame-body">
        <NodeText title="Frame content slot" subtitle="Bounds and topology belong to the host" />
      </div>
    ),
  },
  argTypes: {
    kind: { control: 'select', options: ['scope', 'loop', 'condition', 'switch', 'branch'] },
    tone: { control: 'inline-radio', options: ['neutral', 'success', 'danger'] },
    collapsed: { control: 'boolean' },
    subtitlePlacement: { control: 'inline-radio', options: ['inline', 'below'] },
    headerAppearance: { control: 'inline-radio', options: ['default', 'plain'] },
    motion: { control: 'inline-radio', options: ['none', 'reveal'] },
    handleAxis: axisControl,
    status: statusControl,
    children: { control: false },
    action: { control: false },
    inputSlot: { control: false },
    outputSlot: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Translucent group frame, not a layout engine. A nonempty title enables the header. Slots imply handles even with handles=false. handleTop positions horizontal ports; handleLeft positions vertical ports. Branch kind is glyphless and supports neutral/success/danger tones plus header-only collapsed rendering.',
      },
    },
  },
} satisfies Meta<typeof NodeFrame>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Kinds: Story = {
  render: (args) => (
    <div className="sb-grid">
      {(['scope', 'loop', 'condition', 'switch'] as const).map((kind) => (
        <Example key={kind} label={kind}>
          <NodeFrame {...args} kind={kind} />
        </Example>
      ))}
    </div>
  ),
};
export const Headerless: Story = { args: { title: undefined } };
export const TitleOnly: Story = { args: { subtitle: undefined } };
export const HorizontalPorts: Story = { args: { handles: true, handleTop: 89, selected: true } };
export const VerticalSlotsImplyHandles: Story = {
  args: { handleAxis: 'vertical', handleLeft: 140, inputSlot: <Slot label="Input" />, outputSlot: <Slot label="Output" /> },
};
export const HeaderActionCount: Story = { args: { kind: 'loop', title: 'For each', actionCount: 0 } };
export const PlainHeader: Story = { args: { kind: 'loop', headerAppearance: 'plain', title: 'For each', subtitle: 'Collapsed body' } };
export const RevealMotion: Story = {
  args: { kind: 'branch', title: 'False', motion: 'reveal', collapsed: true, actionCount: 2 },
  render: (args) => <RevealFrame {...args} />,
};
function RevealFrame(args: NodeFrameProps) {
  const [collapsed, setCollapsed] = useState(args.collapsed ?? false);
  return (
    <div className="sb-grid">
      <NodeFrame
        {...args}
        collapsed={collapsed}
        action={<Button onClick={() => setCollapsed((value) => !value)}>{collapsed ? 'Expand' : 'Collapse'}</Button>}
      />
      <div data-reduce-motion="true">
        <p className="sb-note">Same controlled state with scoped reduced motion.</p>
        <NodeFrame {...args} collapsed={collapsed} />
      </div>
    </div>
  );
}
export const ActionCounts: Story = {
  args: { handles: true },
  render: (args) => (
    <div className="sb-grid">
      {[0, 1, 3].map((actionCount) => (
        <Example key={actionCount} label={`Host-supplied count: ${actionCount}`}>
          <NodeFrame {...args} actionCount={actionCount} />
        </Example>
      ))}
    </div>
  ),
};
export const InputAndHeaderVariants: Story = {
  render: (args) => (
    <div className="sb-grid">
      <Example label="Hidden input; host-supplied vertical offset 140">
        <NodeFrame {...args} handles handleAxis="vertical" handleLeft={140} showInputHandle={false} />
      </Example>
      <Example label="Neutral input; host-supplied horizontal offset 89">
        <NodeFrame {...args} handles handleTop={89} inputVariant="neutral" />
      </Example>
      <Example label="Colored input; plain header">
        <NodeFrame {...args} handles inputVariant="success" headerAppearance="plain" />
      </Example>
      <Example label="Branch header with host-supplied action count">
        <NodeFrame {...args} kind="branch" title="True" handles actionCount={3} />
      </Example>
    </div>
  ),
};
export const MappedStatusAndInactive: Story = {
  args: {
    status: 'failed',
    statusLabel: 'Timed out',
    statusAriaLabel: 'Scope timed out',
    inactive: true,
    'aria-label': 'Review group, Timed out',
    children: <ActionNodeCard title="Nested inactive action" inactive />,
  },
};
export const RunStates: Story = {
  render: (args) => (
    <div className="sb-grid">
      {statuses.map((status) => (
        <Example key={status} label={status}>
          <NodeFrame {...args} status={status} />
        </Example>
      ))}
    </div>
  ),
};
function LocalFrame(args: NodeFrameProps) {
  const [inspected, setInspected] = useState(false);
  return (
    <div className="sb-stack">
      <NodeFrame
        {...args}
        action={
          <Button size="small" onClick={() => setInspected((value) => !value)}>
            Inspect group
          </Button>
        }
      />
      <output>{inspected ? 'Group inspected locally' : 'Not inspected'}</output>
    </div>
  );
}
export const HeaderAction: Story = { render: (args) => <LocalFrame {...args} /> };
export const BranchTones: Story = {
  args: { kind: 'branch', title: 'True', subtitle: '3 actions' },
  render: (args) => (
    <div className="sb-grid">
      {(['neutral', 'success', 'danger'] as const).map((tone) => (
        <Example key={tone} label={tone}>
          <NodeFrame {...args} tone={tone} />
        </Example>
      ))}
    </div>
  ),
};
export const BranchCollapsed: Story = {
  args: {
    kind: 'branch',
    title: 'False',
    subtitle: 'Did not run',
    action: <Button size="small">Expand</Button>,
    collapsed: true,
  },
};
export const BranchSubtitlePlacement: Story = {
  args: { kind: 'branch', title: 'True', subtitle: '3 actions', action: <Button size="small">Inspect</Button> },
  render: (args) => (
    <div className="sb-grid">
      <Example label="inline">
        <NodeFrame {...args} subtitlePlacement="inline" />
      </Example>
      <Example label="below">
        <NodeFrame {...args} subtitlePlacement="below" />
      </Example>
    </div>
  ),
};
