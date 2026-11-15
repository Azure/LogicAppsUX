import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { NodeIterationPager } from '@microsoft/designer-ui-v2';
import type { NodeIterationPagerProps } from '@microsoft/designer-ui-v2';

function LocalPager(args: NodeIterationPagerProps) {
  const [current, setCurrent] = useState(args.current);
  return (
    <NodeIterationPager
      {...args}
      current={current}
      onChange={(next) => {
        args.onChange(next);
        setCurrent(next);
      }}
    />
  );
}
const meta = {
  title: 'Monitoring/NodeIterationPager',
  component: NodeIterationPager,
  args: { current: 0, count: 10, onChange: fn() },
  render: (args) => <LocalPager key={`${args.current}-${args.count}`} {...args} />,
  parameters: {
    docs: {
      description: {
        component:
          'Controlled loop iteration pager. The API is zero-based while every label is one-based. The host owns run state and decides whether jumps target action or tool runs.',
      },
    },
  },
} satisfies Meta<typeof NodeIterationPager>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Next iteration' }));
    await expect(canvas.getByText('2 of 10')).toBeInTheDocument();
  },
};
export const FailedIterations: Story = { args: { current: 4, failed: [1, 7, 8] } };
export const Editable: Story = { args: { editable: true, current: 2, failed: [5] } };
export const Localized: Story = {
  args: {
    strings: {
      label: 'Iteraciones',
      previous: 'Iteración anterior',
      next: 'Iteración siguiente',
      previousFailed: 'Iteración con error anterior',
      nextFailed: 'Iteración con error siguiente',
      input: (count) => `Número de iteración, 1 a ${count}`,
      position: (current, count) => `${current} de ${count}`,
    },
  },
};
export const BoundsAndInvalidInput: Story = {
  args: { current: 0, count: 4, editable: true, failed: [1, 3] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Previous iteration' })).toBeDisabled();
    const input = canvas.getByRole('textbox', { name: 'Iteration number, 1 to 4' });
    await userEvent.clear(input);
    await userEvent.type(input, '4{Enter}');
    await expect(canvas.getByRole('button', { name: 'Next iteration' })).toBeDisabled();
    await userEvent.clear(input);
    await userEvent.type(input, 'invalid{Enter}');
    await expect(input).toHaveValue('4');
    await userEvent.click(canvas.getByRole('button', { name: 'Previous failed iteration' }));
    await expect(input).toHaveValue('2');
    await userEvent.click(canvas.getByRole('button', { name: 'Next failed iteration' }));
    await expect(input).toHaveValue('4');
  },
};
