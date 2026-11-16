import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { ConditionNodeCard, NodeBranchLabel, defaultNodeStrings } from '@microsoft/designer-ui-v2';
import { Button } from '@fluentui/react-components';
import { axisControl, Example, Slot, statusControl } from './storyFixtures';

const meta = {
  title: 'Node Cards/ConditionNodeCard',
  component: ConditionNodeCard,
  args: {
    kind: 'if',
    title: 'Is approved?',
    handles: true,
    caseCount: 4,
    mode: 'multiOutput',
    handleAxis: 'horizontal',
    selected: false,
  },
  argTypes: {
    kind: { control: 'inline-radio', options: ['if', 'switch'] },
    mode: { control: 'inline-radio', options: ['multiOutput', 'trunk'] },
    caseCount: { control: { type: 'number', min: 1, max: 8, step: 1 } },
    takenOutput: { control: { type: 'number', min: 0, max: 7 } },
    handleAxis: axisControl,
    status: statusControl,
    inputSlot: { control: false },
    outputSlots: { control: false },
    action: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'If has success/danger outputs. Switch floors finite caseCount to at least one; nonfinite values normalize to one. Ordered slots are illustrative DOM, not executable branches.',
      },
    },
  },
} satisfies Meta<typeof ConditionNodeCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Switch: Story = { args: { kind: 'switch', title: 'Route by region', takenOutput: 1 } };
export const SwitchTrunk: Story = {
  args: {
    kind: 'switch',
    mode: 'trunk',
    title: 'Route by region',
    caseCount: 20,
    outputSlots: [<Slot key="trunk" label="Shared trunk slot" />, <Slot key="case-2" label="Hidden case slot" />],
  },
};
export const VerticalSlots: Story = {
  args: {
    handleAxis: 'vertical',
    inputSlot: <Slot label="Input" />,
    outputSlots: [<Slot key="yes" label="True" />, <Slot key="no" label="False" />],
    takenOutput: 0,
    selected: true,
  },
};
export const NormalizedCaseCounts: Story = {
  render: (args) => (
    <div className="sb-grid">
      {[2.8, 0, Number.NaN, Number.POSITIVE_INFINITY].map((caseCount) => (
        <Example key={String(caseCount)} label={`caseCount: ${caseCount}`}>
          <ConditionNodeCard {...args} kind="switch" caseCount={caseCount} />
        </Example>
      ))}
    </div>
  ),
};
export const LocalizedTestData: Story = {
  args: {
    status: 'mock',
    handles: false,
    strings: {
      ...defaultNodeStrings,
      condition: { if: 'Si', switch: 'Según' },
      status: { ...defaultNodeStrings.status, mock: 'Datos de prueba' },
    },
  },
};
export const CornerAction: Story = {
  args: {
    kind: 'switch',
    title: 'Route by region',
    subtitle: 'Action reserve',
    mode: 'trunk',
    action: <Button size="small">Add case</Button>,
  },
};
export const IfMultiOutput: Story = {
  args: {
    kind: 'if',
    takenOutput: 0,
    outputSlots: [<Slot key="true" label="Host True port" />, <Slot key="false" label="Host False port" />],
  },
};
export const SwitchMultiOutputDefault: Story = {
  args: {
    kind: 'switch',
    title: 'Route by region',
    mode: undefined,
    caseCount: 4,
    outputSlots: Array.from({ length: 4 }, (_, index) => <Slot key={index} label={`Host port ${index + 1}`} />),
  },
};
export const SwitchTrunkOptIn: Story = {
  ...SwitchTrunk,
  render: (args) => (
    <div className="sb-stack">
      <ConditionNodeCard {...args} />
      <p className="sb-note">Host-supplied lane labels and positions; the card does not route these branches.</p>
      <NodeBranchLabel label="Europe" />
      <NodeBranchLabel label="Default" />
    </div>
  ),
};
export const CornerActionAndInputVariant: Story = {
  args: {
    inputVariant: 'success',
    action: (
      <Button size="small" onClick={fn()}>
        Inspect branches
      </Button>
    ),
  },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Inspect branches' });
    button.focus();
    await userEvent.keyboard('{Enter}');
    await expect(button).toHaveFocus();
  },
};
