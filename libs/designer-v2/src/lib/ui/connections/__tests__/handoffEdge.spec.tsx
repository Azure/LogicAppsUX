import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { EdgeProps } from '@xyflow/react';
import HandoffEdge from '../handoffEdge';
import { getNodeLineStroke } from '@microsoft/designer-ui-v2';

const state = vi.hoisted(() => ({
  shared: true,
  edgeAccepted: undefined as boolean | undefined,
  sourceAccepted: true,
  targetAccepted: true,
  readOnly: false,
  end: 100,
  panelSelected: false,
  multiSelected: false,
  selectedNode: undefined as string | undefined,
  dispatch: vi.fn(),
}));
vi.mock('react-redux', () => ({ useDispatch: () => state.dispatch }));
vi.mock('../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useReadOnly: () => state.readOnly,
  useSharedNodeUi: () => state.shared,
}));
vi.mock('../../../core/state/workflow/workflowSelectors', () => ({ useNodeMetadata: () => ({ graphId: 'root' }) }));
vi.mock('../../../core/state/panel/panelSelectors', () => ({
  useIsNodeSelectedInOperationPanel: (id: string) => state.panelSelected && (!state.selectedNode || state.selectedNode === id),
  useIsNodeInMultiSelection: (id: string) => state.multiSelected && (!state.selectedNode || state.selectedNode === id),
}));
vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useReactFlow: () => ({
    getNode: (id: string) => ({
      data: {
        presentation: {
          shared: id === 'agent-a' ? state.sourceAccepted : state.targetAccepted,
        },
      },
    }),
  }),
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
    state.edgeAccepted = undefined;
    state.sourceAccepted = true;
    state.targetAccepted = true;
    state.readOnly = false;
    state.end = 100;
    state.panelSelected = false;
    state.multiSelected = false;
    state.selectedNode = undefined;
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
    expect(container.querySelectorAll('.msla-shared-edge-path')).toHaveLength(1);
    const capPath = container.querySelector<SVGPathElement>('.msla-shared-edge-cap')!;
    expect(capPath).toHaveAttribute('data-line-cap', 'dashedNeutral');
    expect(capPath.style.strokeDasharray).toBe('none');
    expect(container.querySelector('[data-edge-hit-target]')).not.toBeNull();
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
    expect(container.querySelector('.msla-shared-edge-path')).toBeNull();
    expect(container.querySelector('[data-edge-hit-target]')).toBeNull();
  });

  it('keeps shared handoff chrome when the live flag is off but accepted edge and endpoints are still shared', () => {
    state.shared = false;
    state.edgeAccepted = true;
    state.sourceAccepted = true;
    state.targetAccepted = true;
    const { container } = render(
      <svg>
        <HandoffEdge {...props} data={{ presentation: { shared: state.edgeAccepted } }} />
      </svg>
    );
    expect(container.querySelector('#handoff')).toHaveAttribute('data-line', 'dashedNeutral');
    expect(container.querySelectorAll('.msla-shared-edge-path')).toHaveLength(1);
    expect(container.querySelectorAll('.msla-shared-edge-cap')).toHaveLength(1);
    expect(container.querySelector('#handoff')).not.toHaveAttribute('marker-end');
  });

  it('keeps legacy handoff chrome when the live flag is on but endpoints are not accepted', () => {
    state.shared = true;
    state.sourceAccepted = false;
    state.targetAccepted = false;
    const { container } = render(
      <svg>
        <HandoffEdge {...props} />
      </svg>
    );
    expect(container.querySelector('#handoff')).toHaveClass('react-flow__edge-path', 'handoff');
    expect(container.querySelector('#handoff')).toHaveAttribute('marker-end', 'url(#handoff-cap)');
    expect(container.querySelector('.msla-shared-edge-path')).toBeNull();
  });

  it('keeps legacy handoff chrome when one endpoint is still legacy', () => {
    state.shared = true;
    state.sourceAccepted = true;
    state.targetAccepted = false;
    const { container } = render(
      <svg>
        <HandoffEdge {...props} />
      </svg>
    );
    expect(container.querySelector('#handoff')).toHaveClass('react-flow__edge-path', 'handoff');
    expect(container.querySelector('#handoff')).toHaveAttribute('marker-end', 'url(#handoff-cap)');
    expect(container.querySelector('.msla-shared-edge-path')).toBeNull();
  });

  it('honors accepted shared=false as an explicit legacy veto', () => {
    state.shared = true;
    state.sourceAccepted = true;
    state.targetAccepted = true;
    const { container } = render(
      <svg>
        <HandoffEdge {...props} data={{ presentation: { shared: false } }} />
      </svg>
    );
    expect(container.querySelector('#handoff')).toHaveClass('react-flow__edge-path', 'handoff');
    expect(container.querySelector('#handoff')).toHaveAttribute('marker-end', 'url(#handoff-cap)');
    expect(container.querySelector('.msla-shared-edge-path')).toBeNull();
  });

  it.each(['panel', 'multi'].flatMap((selection) => ['agent-a', 'agent-b'].map((node) => ({ selection, node }))))(
    'highlights the handoff shaft and cap for $selection selection of $node while retaining the dash',
    ({ selection, node }) => {
      state.panelSelected = selection === 'panel';
      state.multiSelected = selection === 'multi';
      state.selectedNode = node;
      const { container } = render(
        <svg>
          <HandoffEdge {...props} />
        </svg>
      );
      expect(container.querySelectorAll('.msla-shared-edge-path')).toHaveLength(1);
      const paths = [...container.querySelectorAll<SVGPathElement>('.msla-shared-edge-path, .msla-shared-edge-cap')];
      expect(paths).toHaveLength(2);
      const stroke = getNodeLineStroke('dashedNeutral', { state: 'highlighted' });
      for (const path of paths) {
        expect(path.style.stroke).toBe(stroke.stroke);
        expect(path.style.strokeWidth).toBe(stroke.strokeWidth);
      }
      expect(paths[0].style.strokeDasharray).toBe('5 5');
      expect(paths[1].style.strokeDasharray).toBe('none');
    }
  );

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
