import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Position, type EdgeProps } from '@xyflow/react';
import { OnlyEdge } from '../onlyEdge';
import HiddenEdge from '../hiddenEdge';

const state = vi.hoisted(() => ({ shared: false }));
vi.mock('../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useSharedNodeUi: () => state.shared,
}));
vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  BezierEdge: () => <path data-testid="registered-legacy-bezier" />,
}));
const props = {
  id: 'plain-edge',
  source: 'a',
  target: 'b',
  sourceX: 20,
  sourceY: 10,
  targetX: 20,
  targetY: 100,
  sourcePosition: Position.Bottom,
  targetPosition: Position.Top,
} as EdgeProps;

describe('registered plain and hidden edge presentation', () => {
  it('delegates flag-off to the formerly registered XYFlow BezierEdge', () => {
    state.shared = false;
    const { getByTestId } = render(
      <svg>
        <OnlyEdge {...props} />
      </svg>
    );
    expect(getByTestId('registered-legacy-bezier')).toBeInTheDocument();
  });
  it('uses an actual shared stroke and interaction path when enabled', () => {
    state.shared = true;
    const { container } = render(
      <svg>
        <OnlyEdge {...props} />
      </svg>
    );
    expect(container.querySelector('#plain-edge')).toHaveAttribute('data-line', 'solid');
    expect(container.querySelector('#plain-edge')?.getAttribute('d')).toMatch(/^M/);
    expect(container.querySelector('[data-edge-hit-target]')).toHaveAttribute('stroke-width', '20');
  });
  it('does not paint or add mutation controls for structural hidden edges', () => {
    state.shared = true;
    const { container } = render(
      <svg>
        <HiddenEdge {...props} />
      </svg>
    );
    expect(container.querySelector('svg')?.children).toHaveLength(0);
  });
});
