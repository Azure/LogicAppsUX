import { Button } from '@fluentui/react-components';
import { CheckmarkRegular, DismissRegular } from '@fluentui/react-icons';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { NodeBranchLabel, NodeFrame } from '@microsoft/designer-ui-v2';
import { Example } from './storyFixtures';

const meta = {
  title: 'Connections/NodeBranchLabel',
  component: NodeBranchLabel,
  args: {
    label: 'True',
    tone: 'neutral',
  },
  argTypes: {
    tone: { control: 'inline-radio', options: ['neutral', 'success', 'danger'] },
    state: { control: 'inline-radio', options: [undefined, 'taken', 'notTaken'] },
    action: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Branch caption chip used by hosts near branch paths. It renders only local presentation and never owns path offsets or commands.',
      },
    },
  },
} satisfies Meta<typeof NodeBranchLabel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const ExplicitBranches: Story = {
  render: () => (
    <div className="sb-stack">
      <NodeBranchLabel label="True" tone="success" icon={<CheckmarkRegular />} />
      <NodeBranchLabel label="False" tone="danger" icon={<DismissRegular />} />
    </div>
  ),
};

export const States: Story = {
  render: (args) => (
    <div className="sb-grid">
      {([undefined, 'taken', 'notTaken'] as const).map((state) => (
        <Example key={String(state)} label={state ?? 'default'}>
          <NodeBranchLabel {...args} state={state} />
        </Example>
      ))}
    </div>
  ),
};

export const Tones: Story = {
  render: (args) => (
    <div className="sb-grid">
      {(['neutral', 'success', 'danger'] as const).map((tone) => (
        <Example key={tone} label={tone}>
          <NodeBranchLabel {...args} tone={tone} />
        </Example>
      ))}
    </div>
  ),
};

export const WithAction: Story = {
  args: {
    state: 'taken',
    action: <Button size="small">Inspect</Button>,
  },
};
export const TonesAndStates: Story = {
  render: (args) => (
    <div className="sb-grid">
      {(['neutral', 'success', 'danger'] as const).flatMap((tone) =>
        ([undefined, 'taken', 'notTaken'] as const).map((state) => (
          <Example key={`${tone}-${state}`} label={`${tone}; host-supplied ${state ?? 'no evidence'}`}>
            <NodeBranchLabel {...args} tone={tone} state={state} />
          </Example>
        ))
      )}
      <Example label="Inactive ancestor applies opacity once">
        <NodeFrame kind="branch" title="Inactive parent" inactive>
          <NodeBranchLabel {...args} state="notTaken" />
        </NodeFrame>
      </Example>
    </div>
  ),
};
export const LocalizedTakenWithAction: Story = {
  args: {
    label: 'Verdadero',
    state: 'taken',
    strings: { taken: (label) => `${label}, rama ejecutada` },
    action: (
      <Button size="small" onClick={fn()}>
        Inspeccionar rama
      </Button>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Verdadero, rama ejecutada')).toBeInTheDocument();
    canvas.getByRole('button', { name: 'Inspeccionar rama' }).focus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('button', { name: 'Inspeccionar rama' })).toHaveFocus();
  },
};
