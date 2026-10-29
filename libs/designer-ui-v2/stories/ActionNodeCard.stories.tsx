import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { ActionNodeCard } from '@microsoft/designer-ui-v2';
import type { ActionNodeCardProps } from '@microsoft/designer-ui-v2';
import { axisControl, Example, requestIcon, selectedRequestIcon, statuses, statusControl } from './storyFixtures';

const meta = {
  title: 'Node Cards/ActionNodeCard',
  component: ActionNodeCard,
  args: { title: 'Send request', subtitle: 'Built-in · HTTP', selected: false, handles: true, handleAxis: 'horizontal' },
  argTypes: {
    status: statusControl,
    handleAxis: axisControl,
    icon: { control: false },
    selectedIcon: { control: false },
    after: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component: 'Ordinary action presentation. Decorative handles are not graph ports. The host owns selection and keyboard semantics.',
      },
    },
  },
} satisfies Meta<typeof ActionNodeCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const RunStates: Story = {
  render: (args) => (
    <div className="sb-grid">
      {statuses.map((status) => (
        <Example key={status} label={status}>
          <ActionNodeCard {...args} status={status} statusDetail={status === 'failed' ? '502' : undefined} />
        </Example>
      ))}
    </div>
  ),
};
export const CustomGlyphAndSlot: Story = {
  args: { icon: requestIcon, selectedIcon: selectedRequestIcon, selected: true, after: <p className="sb-note">Local annotation slot</p> },
};
export const NavigationOnly: Story = { args: { handles: false, handleAxis: 'vertical', status: 'mock' } };

function SelectableAction(args: ActionNodeCardProps) {
  const [selected, setSelected] = useState(args.selected ?? false);
  return (
    <div className="sb-stack">
      <ActionNodeCard
        {...args}
        selected={selected}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onClick={() => setSelected((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setSelected((value) => !value);
          }
        }}
      />
      <output data-testid="selection-state">Selection: {selected ? 'selected' : 'not selected'}</output>
    </div>
  );
}
export const KeyboardSelection: Story = {
  render: (args) => <SelectableAction key={String(args.selected)} {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole('button', { name: [args.title, args.subtitle].filter(Boolean).join(' ') });
    card.focus();
    await userEvent.keyboard('{Enter}');
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.getByTestId('selection-state')).toHaveTextContent('Selection: selected');
    await userEvent.keyboard(' ');
    await expect(card).toHaveAttribute('aria-pressed', 'false');
  },
};
