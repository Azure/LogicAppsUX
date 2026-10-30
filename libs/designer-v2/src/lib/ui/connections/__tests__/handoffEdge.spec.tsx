import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { EdgeProps } from '@xyflow/react';
import HandoffEdge from '../handoffEdge';
import { nodeLineStrokes } from '@microsoft/designer-ui-v2';

const state = vi.hoisted(() => ({
  shared: true,
  readOnly: false,
  end: 100,
  panelSelected: false,
  multiSelected: false,
  dispatch: vi.fn(),
}));
vi.mock('react-redux', () => ({ useDispatch: () => state.dispatch }));
vi.mock('../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useReadOnly: () => state.readOnly,
  useSharedNodeUi: () => state.shared,
}));
vi.mock('../../../core/state/workflow/workflowSelectors', () => ({ useNodeMetadata: () => ({ graphId: 'root' }) }));
vi.mock('../../../core/state/panel/panelSelectors', () => ({
  useIsNodeSelectedInOperationPanel: () => state.panelSelected,
  useIsNodeInMultiSelection: () => state.multiSelected,
}));
vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  EdgeLabelRenderer: ({ children }: any) => <foreignObject>{children}</foreignObject>,
}));
vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useGuid: () => 'handoff-cap',
  useEdgeIndex: () => 4,
  useNodeGlobalPosition: () => ({ x: 0, y: 0 }),
  useEdgesData: () => ({ data: { elkEdge: { sections: [{ startPoint: { x: 0, y: 0 }, endPoint: { x: state.end, y: state.end } }] } } }),
}));

describe('actual A2A handoff presentation', () => {
  beforeEach(() => {
    state.shared = true;
    state.readOnly = false;
    state.end = 100;
    state.panelSelected = false;
    state.multiSelected = false;
    state.dispatch.mockClear();
    Object.defineProperty(SVGElement.prototype, 'getTotalLength', { configurable: true, value: () => state.end });
    Object.defineProperty(SVGElement.prototype, 'getPointAtLength', {
      configurable: true,
      value: (length: number) => ({ x: length, y: length }),
    });
  });
  const props = { id: 'handoff', source: 'agent-a', target: 'agent-b' } as EdgeProps;

  it('applies the canonical dashed path and retains the actual handoff menu relation', () => {
    const bubble = vi.fn();
    const { container } = render(
      <div onClick={bubble}>
        <svg>
          <HandoffEdge {...props} />
        </svg>
      </div>
    );
    expect(container.querySelector('#handoff')).toHaveAttribute('data-line', 'dashedNeutral');
    expect(container.querySelector('#handoff')).toHaveStyle({ strokeDasharray: '5 5' });
    expect(container.querySelector('#handoff')).not.toHaveAttribute('stroke-dasharray');
    expect(container.querySelector('#handoff')).not.toHaveClass('react-flow__edge-path');
    const button = screen.getByRole('button', { name: 'Edit handoff' });
    expect(button).toHaveAttribute('tabindex', '4');
    fireEvent.click(button);
    expect(state.dispatch).toHaveBeenCalledTimes(1);
    expect(state.dispatch.mock.calls[0][0].payload).toMatchObject({
      parentId: 'agent-a',
      childId: 'agent-b',
      graphId: 'root',
      isHandoff: true,
    });
    expect(bubble).not.toHaveBeenCalled();
  });

  it('retains a dashed legacy handoff and arrow when the shared flag is off', () => {
    state.shared = false;
    state.panelSelected = true;
    const { container } = render(
      <svg>
        <HandoffEdge {...props} />
      </svg>
    );
    expect(container.querySelector('#handoff')).toHaveClass('react-flow__edge-path', 'handoff');
    expect(container.querySelector('#handoff')).toHaveAttribute('stroke-dasharray', '4 6');
    expect(container.querySelector('#handoff')).toHaveAttribute('marker-end', 'url(#handoff-cap)');
    expect(container.querySelector('#handoff')).toHaveClass('highlighted');
    expect(container.querySelector('#handoff-cap')).toHaveClass('highlighted');
  });

  it.each(['panel', 'multi'])('keeps canonical handoff stroke without dead highlight attributes for %s selection', (selection) => {
    state.panelSelected = selection === 'panel';
    state.multiSelected = selection === 'multi';
    const { container } = render(
      <svg>
        <HandoffEdge {...props} />
      </svg>
    );
    const path = container.querySelector<SVGPathElement>('#handoff');
    expect(path).not.toHaveAttribute('data-highlighted');
    expect(path).not.toHaveClass('highlighted');
    expect(path?.style.stroke).toBe(nodeLineStrokes.dashedNeutral.stroke);
    expect(path?.style.strokeWidth).toBe(nodeLineStrokes.dashedNeutral.strokeWidth);
    expect(path?.style.strokeDasharray).toBe(nodeLineStrokes.dashedNeutral.strokeDasharray);
  });

  it('suppresses handoff mutation controls in read-only without hiding the routed relation', () => {
    state.readOnly = true;
    const { container } = render(
      <svg>
        <HandoffEdge {...props} />
      </svg>
    );
    expect(container.querySelector('#handoff')).toHaveAttribute('data-line', 'dashedNeutral');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('moves the actual handoff control when accepted ELK routing changes', () => {
    const { rerender } = render(
      <svg>
        <HandoffEdge {...props} />
      </svg>
    );
    const wrapper = screen.getByRole('button').closest('foreignObject')?.firstElementChild;
    expect(wrapper).toHaveStyle({ left: '34px', top: '34px' });
    state.end = 200;
    rerender(
      <svg>
        <HandoffEdge {...props} selected />
      </svg>
    );
    expect(wrapper).toHaveStyle({ left: '84px', top: '84px' });
  });
});
