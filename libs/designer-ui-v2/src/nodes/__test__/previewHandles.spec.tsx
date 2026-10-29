import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AgentNodeCard, ConditionNodeCard, LoopNodeCard } from '../..';

const cards = [
  { name: 'condition', render: (handles?: boolean) => <ConditionNodeCard kind="if" title="If" handles={handles} /> },
  { name: 'switch', render: (handles?: boolean) => <ConditionNodeCard kind="switch" title="Switch" handles={handles} /> },
  { name: 'loop', render: (handles?: boolean) => <LoopNodeCard title="Loop" bodyPlacement="bottom" handles={handles} /> },
  { name: 'agent', render: (handles?: boolean) => <AgentNodeCard title="Agent" handles={handles} /> },
];

describe.each(cards)('$name preview handles seam', ({ render: card }) => {
  it('preserves the default visible structure for explicit true', () => {
    const { container, rerender } = render(card());
    const original = container.innerHTML;
    expect(container.querySelectorAll('[data-handle]').length).toBeGreaterThan(0);
    rerender(card(true));
    expect(container.innerHTML).toBe(original);
  });

  it('omits decorative ports and the Agent connector for false', () => {
    const { container } = render(card(false));
    expect(container.querySelector('[data-handle], [data-tool-connector]')).toBeNull();
    expect(screen.queryByText('Tools')).toBeNull();
  });
});

it('retains actual supplied tools, footer and after slots when Agent handles are hidden', () => {
  render(
    <AgentNodeCard
      title="Agent"
      model="Actual deployment"
      handles={false}
      tools={<span>Actual tool</span>}
      after={<span>Actual after slot</span>}
    />
  );
  expect(screen.getByText('Actual tool')).toBeInTheDocument();
  expect(screen.getByText('Actual deployment')).toBeInTheDocument();
  expect(screen.getByText('Actual after slot')).toBeInTheDocument();
});
