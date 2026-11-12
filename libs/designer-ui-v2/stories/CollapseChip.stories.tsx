import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { CollapseChip } from '@microsoft/designer-ui-v2';
import type { CollapseChipProps } from '@microsoft/designer-ui-v2';
import { Example } from './storyFixtures';

function LocalCollapse(args: CollapseChipProps) {
  const [collapsed, setCollapsed] = useState(args.collapsed);
  return (
    <div className="sb-stack">
      <CollapseChip
        {...args}
        collapsed={collapsed}
        onToggle={(next) => {
          args.onToggle(next);
          setCollapsed(next);
        }}
      />
      <output data-testid="collapse-state">Content {collapsed ? 'collapsed' : 'expanded'}</output>
      {!collapsed && <p>Local content, not host graph children.</p>}
    </div>
  );
}
const meta = {
  title: 'Actions/CollapseChip',
  component: CollapseChip,
  args: { collapsed: true, count: 3, onToggle: fn() },
  argTypes: { count: { control: { type: 'number', min: 0, max: 200, step: 1 } } },
  render: (args) => <LocalCollapse key={String(args.collapsed)} {...args} />,
  parameters: {
    docs: {
      description: {
        component:
          'Controlled count/chevron chip. The visual count caps at 99+, while the accessible name keeps the exact count. Consumers retain child identity and collapse state.',
      },
    },
  },
} satisfies Meta<typeof CollapseChip>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ToggleLocally: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Show 3 items' });
    button.focus();
    await userEvent.keyboard('{Enter}');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByTestId('collapse-state')).toHaveTextContent('Content expanded');
    await userEvent.keyboard(' ');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  },
};
export const Expanded: Story = { args: { collapsed: false } };
export const CountBoundaries: Story = {
  render: (args) => (
    <div className="sb-grid">
      {[0, 1, 99, 100].map((count) => (
        <Example key={count} label={`${count} items`}>
          <LocalCollapse {...args} count={count} />
        </Example>
      ))}
    </div>
  ),
};
export const CustomNouns: Story = { args: { count: 1, nounSingular: 'operation', nounPlural: 'operations' } };
export const Localized: Story = {
  args: {
    strings: {
      nounSingular: 'elemento',
      nounPlural: 'elementos',
      show: (count, noun) => `Mostrar ${count} ${noun}`,
      hide: (count, noun) => `Ocultar ${count} ${noun}`,
    },
  },
};
