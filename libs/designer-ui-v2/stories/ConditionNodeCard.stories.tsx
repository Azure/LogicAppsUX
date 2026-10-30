import type { Meta, StoryObj } from '@storybook/react';
import { ConditionNodeCard, defaultNodeStrings } from '@microsoft/designer-ui-v2';
import { axisControl, Example, Slot, statusControl } from './storyFixtures';

const meta = {
  title: 'Node Cards/ConditionNodeCard',
  component: ConditionNodeCard,
  args: { kind: 'if', title: 'Is approved?', handles: true, caseCount: 4, handleAxis: 'horizontal', selected: false },
  argTypes: {
    kind: { control: 'inline-radio', options: ['if', 'switch'] },
    caseCount: { control: { type: 'number', min: 1, max: 8, step: 1 } },
    takenOutput: { control: { type: 'number', min: 0, max: 7 } },
    handleAxis: axisControl,
    status: statusControl,
    inputSlot: { control: false },
    outputSlots: { control: false },
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
