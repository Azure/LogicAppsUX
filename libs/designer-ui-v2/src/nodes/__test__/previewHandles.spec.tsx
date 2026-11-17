import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AgentNodeCard, ConditionNodeCard, LoopNodeCard, NodeFrame, NodeMergePoint } from '../..';

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

it.each(
  (['horizontal', 'vertical'] as const).flatMap((handleAxis) =>
    ([{ kind: 'if' }, { kind: 'switch', mode: 'multiOutput' }, { kind: 'switch', mode: 'trunk' }] as const).map((condition) => ({
      handleAxis,
      ...condition,
    }))
  )
)('retains real input/output slot children without decorative $kind/$mode ports on $handleAxis', (props) => {
  const { container } = render(
    <ConditionNodeCard
      {...props}
      title="Condition"
      handles={false}
      inputSlot={<button type="button">Input connection</button>}
      outputSlots={[
        <button key="0" type="button">
          First output connection
        </button>,
        <button key="1" type="button">
          Second output connection
        </button>,
      ]}
    />
  );
  expect(container.querySelector('[data-handle], [data-branch], [data-testid="node-output-handles"]')).toBeNull();
  expect(screen.getByRole('button', { name: 'Input connection' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'First output connection' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Second output connection' })).toBeInTheDocument();
});

it.each(['horizontal', 'vertical'] as const)(
  'keeps convergence ports outside a collapsed %s body when the frame input is hidden',
  (handleAxis) => {
    const { container } = render(
      <NodeFrame
        kind="loop"
        title="Loop"
        handleAxis={handleAxis}
        collapsed
        showInputHandle={false}
        outputSlot={
          <NodeMergePoint label="Loop" showCircle={false}>
            <button type="button">Convergence input</button>
            <button type="button">Convergence output</button>
          </NodeMergePoint>
        }
      >
        <button type="button">Hidden body action</button>
      </NodeFrame>
    );
    expect(container.querySelectorAll('[data-node-card="loop-frame"] > [data-handle]')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Convergence input' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Convergence output' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hidden body action' })).toBeNull();
  }
);
