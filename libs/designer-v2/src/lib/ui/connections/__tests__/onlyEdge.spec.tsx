import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Position, type EdgeProps } from '@xyflow/react';
import { OnlyEdge } from '../onlyEdge';
import HiddenEdge from '../hiddenEdge';

const state = vi.hoisted(() => ({
  shared: false,
  sourceAccepted: true,
  targetAccepted: true,
}));
vi.mock('../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useSharedNodeUi: () => state.shared,
}));
vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  BezierEdge: () => <path data-testid="registered-legacy-bezier" />,
  useReactFlow: () => ({
    getNode: (id: string) => ({
      data: {
        presentation: {
          shared: id === 'a' ? state.sourceAccepted : state.targetAccepted,
        },
      },
    }),
  }),
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
    state.sourceAccepted = true;
    state.targetAccepted = true;
    const { container } = render(
      <svg>
        <OnlyEdge {...props} />
      </svg>
    );
    expect(container.querySelector('#plain-edge')).toHaveAttribute('data-line', 'solid');
    expect(container.querySelector('#plain-edge')?.getAttribute('d')).toMatch(/^M/);
    expect(container.querySelector('[data-edge-hit-target]')).toHaveAttribute('stroke-width', '20');
  });
  it('keeps shared plain-edge chrome when the live flag is off but accepted edge and endpoints are shared', () => {
    state.shared = false;
    state.sourceAccepted = true;
    state.targetAccepted = true;
    const { container } = render(
      <svg>
        <OnlyEdge {...props} data={{ presentation: { shared: true } }} />
      </svg>
    );
    expect(container.querySelector('#plain-edge')).toHaveAttribute('data-line', 'solid');
    expect(container.querySelector('[data-testid="registered-legacy-bezier"]')).toBeNull();
  });
  it('keeps legacy plain-edge chrome when endpoints are not accepted', () => {
    state.shared = true;
    state.sourceAccepted = false;
    state.targetAccepted = false;
    const { getByTestId } = render(
      <svg>
        <OnlyEdge {...props} />
      </svg>
    );
    expect(getByTestId('registered-legacy-bezier')).toBeInTheDocument();
  });
  it('keeps legacy plain-edge chrome when only one endpoint is accepted', () => {
    state.shared = true;
    state.sourceAccepted = true;
    state.targetAccepted = false;
    const { getByTestId } = render(
      <svg>
        <OnlyEdge {...props} />
      </svg>
    );
    expect(getByTestId('registered-legacy-bezier')).toBeInTheDocument();
  });
  it('honors accepted shared=false as a legacy veto for plain edges', () => {
    state.shared = true;
    state.sourceAccepted = true;
    state.targetAccepted = true;
    const { getByTestId } = render(
      <svg>
        <OnlyEdge {...props} data={{ presentation: { shared: false } }} />
      </svg>
    );
    expect(getByTestId('registered-legacy-bezier')).toBeInTheDocument();
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
