import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import type { EdgeProps } from '@xyflow/react';
import { getBezierPath, getSmoothStepPath, Position } from '@xyflow/react';
import type { LogicAppsEdgeProps } from '../edge';
import { getNodeLineStroke, nodeLineStrokes } from '@microsoft/designer-ui-v2';

const mockUseReadOnly = vi.fn().mockReturnValue(false);
const mockUseSharedNodeUi = vi.fn().mockReturnValue(false);
const mockUseMonitoringView = vi.fn().mockReturnValue(false);
const mockNodePresentation = vi.hoisted(() => ({
  sourceAccepted: true,
  targetAccepted: true,
  otherAccepted: true,
  positions: {} as Record<string, { x: number; y: number }>,
}));

vi.mock('../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useReadOnly: () => mockUseReadOnly(),
  useSharedNodeUi: () => mockUseSharedNodeUi(),
  useMonitoringView: () => mockUseMonitoringView(),
}));

const mockUseIsNodeSelectedInOperationPanel = vi.fn().mockReturnValue(false);
const mockUseIsNodeInMultiSelection = vi.fn().mockReturnValue(false);

vi.mock('../../../core/state/panel/panelSelectors', () => ({
  useIsNodeSelectedInOperationPanel: (...args: any[]) => mockUseIsNodeSelectedInOperationPanel(...args),
  useIsNodeInMultiSelection: (...args: any[]) => mockUseIsNodeInMultiSelection(...args),
}));

const mockUseActionMetadata = vi.fn().mockReturnValue({ runAfter: {} });
const mockUseNodeEdgeTargets = vi.fn().mockReturnValue([]);
const mockUseNodeMetadata = vi.fn().mockReturnValue({ graphId: 'root' });

vi.mock('../../../core/state/workflow/workflowSelectors', () => ({
  useActionMetadata: (...args: any[]) => mockUseActionMetadata(...args),
  useNodeEdgeTargets: (...args: any[]) => mockUseNodeEdgeTargets(...args),
  useNodeMetadata: (...args: any[]) => mockUseNodeMetadata(...args),
}));

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => ({
  ...((await importOriginal()) as object),
  useEdgeIndex: () => 0,
  useGuid: () => 'test-guid',
}));

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useReactFlow: () => ({
      getNode: vi.fn().mockImplementation((rawId: string) => {
        const id = rawId?.replace(/-#.*$/u, '');
        const shared =
          id === 'sourceNode'
            ? mockNodePresentation.sourceAccepted
            : id === 'targetNode'
              ? mockNodePresentation.targetAccepted
              : id === 'otherSource'
                ? mockNodePresentation.otherAccepted
                : mockUseSharedNodeUi();
        return {
          position: mockNodePresentation.positions[id] ?? { x: 0, y: 0 },
          data: { presentation: { shared } },
        };
      }),
    }),
    EdgeLabelRenderer: ({ children }: any) => <div data-testid="edge-label-renderer">{children}</div>,
  };
});

vi.mock('../dropzone', () => ({
  DropZone: ({ graphId, isRevealed, sharedPresentation }: any) => (
    <div data-testid={`dropzone-${graphId}`} data-revealed={isRevealed} data-shared={sharedPresentation}>
      DropZone
    </div>
  ),
}));

vi.mock('../runAfterIndicator', () => ({
  RunAfterIndicator: () => <div data-testid="run-after-indicator" />,
  CollapsedRunAfterIndicator: () => <div data-testid="collapsed-run-after-indicator" />,
}));

vi.mock('../runAfterIndicator/SharedRunAfterIndicator', () => ({
  SharedRunAfterIndicator: ({ statuses, sourceNodeId }: any) => (
    <div data-testid="shared-run-after-indicator" data-statuses={statuses.join(',')} data-source={sourceNodeId} />
  ),
  SharedCollapsedRunAfterIndicator: ({ runAfterCount }: any) => (
    <div data-testid="shared-collapsed-run-after-indicator" data-count={runAfterCount} />
  ),
}));

import ButtonEdge from '../edge';

describe('ButtonEdge', () => {
  const defaultProps: EdgeProps<LogicAppsEdgeProps> = {
    id: 'edge-1',
    source: 'sourceNode',
    target: 'targetNode',
    sourceX: 100,
    sourceY: 50,
    targetX: 100,
    targetY: 200,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    data: { id: 'edge-1', source: 'sourceNode', target: 'targetNode' },
    selected: false,
    type: 'buttonedge',
    sourceHandleId: null,
    targetHandleId: null,
    interactionWidth: 20,
    markerStart: undefined,
    markerEnd: undefined,
    pathOptions: undefined,
    style: undefined,
    label: undefined,
    labelStyle: undefined,
    labelShowBg: undefined,
    labelBgStyle: undefined,
    labelBgPadding: undefined,
    labelBgBorderRadius: undefined,
    animated: false,
    selectable: true,
    deletable: true,
    focusable: true,
    hidden: false,
    reconnectable: undefined,
    zIndex: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReadOnly.mockReturnValue(false);
    mockUseSharedNodeUi.mockReturnValue(false);
    mockUseMonitoringView.mockReturnValue(false);
    mockNodePresentation.sourceAccepted = true;
    mockNodePresentation.targetAccepted = true;
    mockNodePresentation.otherAccepted = true;
    mockNodePresentation.positions = {};
    mockUseIsNodeSelectedInOperationPanel.mockReturnValue(false);
    mockUseIsNodeInMultiSelection.mockReturnValue(false);
    mockUseActionMetadata.mockReturnValue({ runAfter: {} });
    mockUseNodeEdgeTargets.mockReturnValue(['targetNode']);
    mockUseNodeMetadata.mockReturnValue({ graphId: 'root' });
  });

  it('should render without crashing', () => {
    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    expect(container).toBeTruthy();
  });

  it('should render edge path', () => {
    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const path = container.querySelector(`#${defaultProps.id}`);
    expect(path).toBeTruthy();
    expect(path?.getAttribute('class')).toBe('react-flow__edge-path');
  });

  it('should render arrow marker', () => {
    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const marker = container.querySelector('marker#test-guid');
    expect(marker).toBeTruthy();
  });

  it('should apply highlighted class to path when source node is selected', () => {
    mockUseIsNodeSelectedInOperationPanel.mockImplementation((nodeId: string) => nodeId === 'sourceNode');

    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const path = container.querySelector(`#${defaultProps.id}`);
    expect(path?.getAttribute('class')).toContain('highlighted');
  });

  it('should apply highlighted class to path when target node is selected', () => {
    mockUseIsNodeSelectedInOperationPanel.mockImplementation((nodeId: string) => nodeId === 'targetNode');

    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const path = container.querySelector(`#${defaultProps.id}`);
    expect(path?.getAttribute('class')).toContain('highlighted');
  });

  it('should apply highlighted class to marker when source node is selected', () => {
    mockUseIsNodeSelectedInOperationPanel.mockImplementation((nodeId: string) => nodeId === 'sourceNode');

    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const marker = container.querySelector('marker#test-guid');
    expect(marker?.getAttribute('class')).toContain('highlighted');
  });

  it('should not apply highlighted class when no node is selected', () => {
    mockUseIsNodeSelectedInOperationPanel.mockReturnValue(false);

    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const path = container.querySelector(`#${defaultProps.id}`);
    expect(path?.getAttribute('class')).not.toContain('highlighted');

    const marker = container.querySelector('marker#test-guid');
    expect(marker?.getAttribute('class')).not.toContain('highlighted');
  });

  it('should strip id tags from source and target for selection check', () => {
    const propsWithIdTags = {
      ...defaultProps,
      source: 'sourceNode-#scope',
      target: 'targetNode-#scope',
    };

    render(
      <svg>
        <ButtonEdge {...propsWithIdTags} />
      </svg>
    );

    // useIsNodeSelectedInOperationPanel should be called with cleaned IDs
    expect(mockUseIsNodeSelectedInOperationPanel).toHaveBeenCalled();
  });

  it('should show drop zones when not in read-only mode with single edge', () => {
    mockUseReadOnly.mockReturnValue(false);
    mockUseNodeEdgeTargets.mockReturnValue(['targetNode']);
    mockUseActionMetadata.mockReturnValue({ runAfter: { sourceNode: ['Succeeded'] } });

    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    // Middle button should be visible for a single edge
    const edgeLabelRenderers = container.querySelectorAll('[data-testid="edge-label-renderer"]');
    expect(edgeLabelRenderers.length).toBeGreaterThan(0);
  });

  it('should hide drop zones in read-only mode', () => {
    mockUseReadOnly.mockReturnValue(true);

    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const dropzones = container.querySelectorAll('[data-testid^="dropzone-"]');
    expect(dropzones.length).toBe(0);
  });

  it('should show run after indicator when non-succeeded run afters exist and count is less than 6', () => {
    mockUseActionMetadata.mockReturnValue({
      runAfter: { sourceNode: ['Failed'] },
    });

    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const path = container.querySelector(`#${defaultProps.id}`);
    // Dashed stroke indicates run-after
    expect(path?.getAttribute('stroke-dasharray')).toBe('4 6');
  });

  it('should render solid line when all run afters are succeeded', () => {
    mockUseActionMetadata.mockReturnValue({
      runAfter: { sourceNode: ['Succeeded'] },
    });

    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const path = container.querySelector(`#${defaultProps.id}`);
    expect(path?.getAttribute('stroke-dasharray')).toBe('0');
  });

  it('uses the canonical solid stroke on the actual flagged path without legacy important-width rules', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const path = container.querySelector<SVGPathElement>('#edge-1');
    expect(path).toHaveAttribute('data-line', 'solid');
    expect(path).not.toHaveClass('react-flow__edge-path');
    expect(path?.style.stroke).toBe(nodeLineStrokes.solid.stroke);
    expect(path?.style.strokeWidth).toBe(nodeLineStrokes.solid.strokeWidth);
    expect(path).not.toHaveAttribute('stroke-dasharray');
    expect(path).not.toHaveAttribute('stroke-width');
    // The shared cap is a stroke-owned marker so hiding/restoring the stroke repaints both atomically.
    expect(path).toHaveAttribute('marker-end', 'url(#test-guid)');
    const capMarker = container.querySelector('marker#test-guid')!;
    expect(capMarker).toHaveAttribute('markerUnits', 'userSpaceOnUse');
    expect(capMarker).toHaveAttribute('orient', '0');
    expect(capMarker.querySelector('.msla-shared-edge-cap')).toHaveAttribute('data-line-cap', 'solid');
    expect(container.querySelector('[data-edge-hit-target]')).toHaveAttribute('stroke-width', '20');
  });

  it('retains failed run-after semantics while using the shared dashed stroke', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseActionMetadata.mockReturnValue({ runAfter: { sourceNode: ['Failed', 'Skipped'] } });
    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    expect(container.querySelector('#edge-1')).toHaveAttribute('data-line', 'dashedNeutral');
    expect(container.querySelector('#edge-1')).toHaveStyle({ strokeDasharray: '5 5' });
    expect(container.querySelector('#edge-1')).not.toHaveAttribute('stroke-dasharray');
    expect(container.querySelector('#edge-1')).not.toHaveAttribute('stroke-width');
    expect(container.querySelectorAll('.msla-shared-edge-path')).toHaveLength(1);
    const cap = container.querySelector<SVGPathElement>('.msla-shared-edge-cap')!;
    expect(cap).toHaveAttribute('data-line-cap', 'dashedNeutral');
    expect(cap).not.toHaveAttribute('data-line');
    expect(cap.style.strokeDasharray).toBe('none');
    const indicator = container.querySelector('[data-testid="shared-run-after-indicator"]');
    expect(indicator).toHaveAttribute('data-statuses', 'Failed,Skipped');
    expect(indicator).toHaveAttribute('data-source', 'sourceNode');
    expect(container.querySelector('[data-testid="run-after-indicator"]')).not.toBeInTheDocument();
  });

  it('keeps the legacy run-after indicators when the shared flag is off', () => {
    mockUseActionMetadata.mockReturnValue({ runAfter: { sourceNode: ['Failed'] } });
    const single = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    expect(single.container.querySelector('[data-testid="run-after-indicator"]')).toBeInTheDocument();
    expect(single.container.querySelector('[data-testid^="shared-"]')).not.toBeInTheDocument();
    single.unmount();

    mockUseActionMetadata.mockReturnValue({
      runAfter: { sourceNode: ['Failed'], a: ['Failed'], b: ['Failed'], c: ['Failed'], d: ['Failed'], e: ['Failed'] },
    });
    const collapsed = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    expect(collapsed.container.querySelector('[data-testid="collapsed-run-after-indicator"]')).toBeInTheDocument();
    expect(collapsed.container.querySelector('[data-testid^="shared-"]')).not.toBeInTheDocument();
  });

  it.each(['panel', 'multi'].flatMap((selection) => ['sourceNode', 'targetNode'].map((node) => ({ selection, node }))))(
    'highlights both shared paths for $selection selection of $node without changing the branch dash',
    ({ selection, node }) => {
      mockUseSharedNodeUi.mockReturnValue(true);
      mockUseIsNodeSelectedInOperationPanel.mockImplementation((id: string) => selection === 'panel' && id === node);
      mockUseIsNodeInMultiSelection.mockImplementation((id: string) => selection === 'multi' && id === node);
      mockUseNodeMetadata.mockReturnValue({ graphId: 'root', subgraphType: 'CONDITIONAL_TRUE' });
      const { container } = render(
        <svg>
          <ButtonEdge {...defaultProps} />
        </svg>
      );
      expect(container.querySelectorAll('.msla-shared-edge-path')).toHaveLength(1);
      const paths = [...container.querySelectorAll<SVGPathElement>('.msla-shared-edge-path, .msla-shared-edge-cap')];
      expect(paths).toHaveLength(2);
      const stroke = getNodeLineStroke('dashedSuccess', { state: 'highlighted' });
      expect(paths[0]).toHaveAttribute('data-line', 'dashedSuccess');
      expect(paths[1]).toHaveAttribute('data-line-cap', 'dashedSuccess');
      for (const path of paths) {
        expect(path.style.stroke).toBe(stroke.stroke);
        expect(path.style.strokeWidth).toBe(stroke.strokeWidth);
      }
      expect(paths[0].style.strokeDasharray).toBe('5 5');
      expect(paths[1].style.strokeDasharray).toBe('none');
    }
  );

  it.each([
    { variant: 'solid', branch: undefined, statuses: ['Succeeded'], selected: false },
    { variant: 'dashedSuccess', branch: 'CONDITIONAL_TRUE', statuses: ['Succeeded'], selected: false },
    { variant: 'dashedDanger', branch: 'CONDITIONAL_FALSE', statuses: ['Succeeded'], selected: false },
    { variant: 'dashedNeutral', branch: undefined, statuses: ['Failed', 'Skipped'], selected: false },
    { variant: 'solid', branch: undefined, statuses: ['Succeeded'], selected: true },
  ] as const)(
    'keeps legacy monitoring parity for $variant (selected=$selected) without mutation controls',
    ({ variant, branch, statuses, selected }) => {
      mockUseSharedNodeUi.mockReturnValue(true);
      mockUseMonitoringView.mockReturnValue(true);
      mockUseReadOnly.mockReturnValue(true);
      mockUseIsNodeSelectedInOperationPanel.mockImplementation((id: string) => selected && id === 'targetNode');
      mockUseNodeMetadata.mockReturnValue({ graphId: 'root', subgraphType: branch });
      mockUseActionMetadata.mockReturnValue({ runAfter: { sourceNode: [...statuses] } });
      const { container } = render(
        <svg>
          <ButtonEdge {...defaultProps} style={{ opacity: 0.4 }} />
        </svg>
      );
      expect(container.querySelectorAll('.msla-shared-edge-path')).toHaveLength(1);
      const paths = [...container.querySelectorAll<SVGPathElement>('.msla-shared-edge-path, .msla-shared-edge-cap')];
      expect(paths).toHaveLength(2);
      const stroke = getNodeLineStroke(variant, { state: selected ? 'highlighted' : 'default' });
      expect(paths[0]).toHaveAttribute('data-line', variant);
      expect(paths[1]).toHaveAttribute('data-line-cap', variant);
      for (const path of paths) {
        expect(path.style.stroke).toBe(stroke.stroke);
        expect(path.style.strokeWidth).toBe(stroke.strokeWidth);
        expect(path).not.toHaveAttribute('data-state');
      }
      // The stroke owns opacity and composites its marker cap; the cap must not repeat it.
      expect(paths[0].style.opacity).toBe('0.4');
      expect(paths[1].style.opacity).toBe('');
      expect(paths[1].style.strokeDasharray).toBe('none');
      expect(container.querySelector('[data-testid^="dropzone-"]')).toBeNull();
      expect(container.querySelector('button')).toBeNull();
      if (statuses.some((status) => status === 'Failed')) {
        expect(container.querySelector('[data-testid="shared-run-after-indicator"]')).toHaveAttribute('data-statuses', 'Failed,Skipped');
      }
    }
  );

  it('retains the legacy multi-selected emphasis and stroke presentation attributes', () => {
    mockUseIsNodeInMultiSelection.mockReturnValue(true);
    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    expect(container.querySelector('#edge-1')).toHaveClass('highlighted');
    expect(container.querySelector('#edge-1')).toHaveAttribute('stroke-width', '2');
    expect(container.querySelector('#edge-1')).toHaveAttribute('stroke-dasharray', '0');
    expect(container.querySelector('#test-guid')).toHaveClass('highlighted');
  });

  it('keeps canonical dashed stroke beyond the collapsed run-after threshold', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseActionMetadata.mockReturnValue({
      runAfter: { sourceNode: ['Failed'], a: ['Failed'], b: ['Failed'], c: ['Failed'], d: ['Failed'], e: ['Failed'] },
    });
    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    expect(container.querySelector('#edge-1')).toHaveAttribute('data-line', 'dashedNeutral');
    expect(container.querySelector('[data-testid="shared-collapsed-run-after-indicator"]')).toHaveAttribute('data-count', '6');
    expect(container.querySelector('[data-testid="collapsed-run-after-indicator"]')).not.toBeInTheDocument();
  });

  it.each(
    [
      { side: Position.Left, sourceSide: Position.Right, endpointX: 256, endpointY: 200, boxX: 256, boxY: 192 },
      { side: Position.Right, sourceSide: Position.Left, endpointX: 344, endpointY: 200, boxX: 300, boxY: 192 },
      { side: Position.Top, sourceSide: Position.Bottom, endpointX: 300, endpointY: 184, boxX: 278, boxY: 184 },
      { side: Position.Bottom, sourceSide: Position.Top, endpointX: 300, endpointY: 216, boxX: 278, boxY: 200 },
    ].flatMap((geometry) => [1, 6].map((count) => ({ ...geometry, count })))
  )(
    'ends the real shared path outside the upright $side indicator ($count failed dependencies)',
    ({ side, sourceSide, endpointX, endpointY, boxX, boxY, count }) => {
      mockUseSharedNodeUi.mockReturnValue(true);
      mockUseActionMetadata.mockReturnValue({
        runAfter: Object.fromEntries(
          Array.from({ length: count }, (_, index) => [index === 0 ? 'sourceNode' : `dependency-${index}`, ['Failed']])
        ),
      });
      const { container } = render(
        <svg>
          <ButtonEdge {...defaultProps} sourcePosition={sourceSide} targetPosition={side} targetX={300} />
        </svg>
      );
      const [expectedPath] = getBezierPath({
        sourceX: 100,
        sourceY: 50,
        sourcePosition: sourceSide,
        targetX: endpointX,
        targetY: endpointY,
        targetPosition: side,
      });
      expect(container.querySelector('#edge-1')).toHaveAttribute('d', expectedPath);
      const indicator = container.querySelector('foreignObject')!;
      expect(indicator).toHaveAttribute('x', String(boxX));
      expect(indicator).toHaveAttribute('y', String(boxY));
      expect(indicator).toHaveAttribute('width', '44');
      expect(indicator).toHaveAttribute('height', '16');
      expect(indicator).not.toHaveAttribute('transform');
      expect(indicator.querySelector('[data-testid="shared-collapsed-run-after-indicator"]') !== null).toBe(count === 6);
    }
  );

  it.each([Position.Left, Position.Top])('distributes multiple upright indicators across the %s target face without overlap', (side) => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseActionMetadata.mockReturnValue({ runAfter: { sourceNode: ['Failed'], otherSource: ['Failed'] } });
    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} targetPosition={side} targetX={300} />
        <ButtonEdge {...defaultProps} id="edge-2" source="otherSource" targetPosition={side} targetX={300} />
      </svg>
    );
    const boxes = Array.from(container.querySelectorAll('foreignObject'), (element) => ({
      x: Number(element.getAttribute('x')),
      y: Number(element.getAttribute('y')),
      width: Number(element.getAttribute('width')),
      height: Number(element.getAttribute('height')),
    }));
    expect(boxes).toHaveLength(2);
    expect(boxes.map(({ width, height }) => [width, height])).toEqual([
      [44, 16],
      [44, 16],
    ]);
    if (side === Position.Left) {
      expect(boxes.map(({ x }) => x)).toEqual([256, 256]);
      expect(Math.abs(boxes[0].y - boxes[1].y)).toBeGreaterThanOrEqual(16);
      expect((boxes[0].y + boxes[1].y) / 2 + 8).toBe(200);
    } else {
      expect(boxes.map(({ y }) => y)).toEqual([184, 184]);
      expect(Math.abs(boxes[0].x - boxes[1].x)).toBeGreaterThanOrEqual(44);
      expect((boxes[0].x + boxes[1].x) / 2 + 22).toBe(300);
    }
  });

  it.each([
    { status: 'Succeeded', endpointY: 198 },
    { status: 'Failed', endpointY: 186 },
  ])('preserves the legacy Top border offset with $status run-after', ({ status, endpointY }) => {
    mockUseActionMetadata.mockReturnValue({ runAfter: { sourceNode: [status] } });
    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const [path] = getSmoothStepPath({
      sourceX: 100,
      sourceY: 50,
      sourcePosition: Position.Bottom,
      targetX: 100,
      targetY: endpointY,
      targetPosition: Position.Top,
      borderRadius: 8,
      centerY: 125,
    });
    expect(container.querySelector('#edge-1')).toHaveAttribute('d', path);
    expect(container.querySelector('#edge-1')).toHaveClass('react-flow__edge-path');
  });

  it('uses the canonical Bezier presentation on the real host endpoints only when enabled', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} targetX={300} />
      </svg>
    );
    const [path] = getBezierPath({
      sourceX: 100,
      sourceY: 50,
      sourcePosition: Position.Bottom,
      targetX: 300,
      targetY: 200,
      targetPosition: Position.Top,
    });
    expect(container.querySelector('#edge-1')).toHaveAttribute('d', path);
  });

  it.each([
    ['CONDITIONAL_TRUE', 'dashedSuccess'],
    ['CONDITIONAL_FALSE', 'dashedDanger'],
    ['SWITCH_DEFAULT', 'dashedNeutral'],
  ])('uses %s branch metadata from the actual source handle, never its caption', (subgraphType, variant) => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseNodeMetadata.mockImplementation((id) => (id === 'lane-id' ? { subgraphType, graphId: 'root' } : { graphId: 'root' }));
    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} sourceHandleId="lane-id" />
      </svg>
    );
    expect(container.querySelector('#edge-1')).toHaveAttribute('data-line', variant);
    expect(mockUseNodeMetadata).toHaveBeenCalledWith('lane-id');
  });

  it('keeps accepted legacy edge geometry and styling during a pending flag-on layout', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} data={{ ...defaultProps.data, presentation: { shared: false } }} />
      </svg>
    );
    expect(container.querySelector('#edge-1')).toHaveClass('react-flow__edge-path');
    expect(container.querySelector('#edge-1')).not.toHaveAttribute('data-line');
  });

  it('keeps shared edge chrome when the flag is off but accepted edge and endpoint presentation are still shared', () => {
    mockUseSharedNodeUi.mockReturnValue(false);
    mockNodePresentation.sourceAccepted = true;
    mockNodePresentation.targetAccepted = true;
    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} data={{ ...defaultProps.data, presentation: { shared: true } }} />
      </svg>
    );
    expect(container.querySelector('#edge-1')).toHaveAttribute('data-line', 'solid');
    expect(container.querySelector('#edge-1')).toHaveAttribute('marker-end', 'url(#test-guid)');
    expect(container.querySelector('marker#test-guid .msla-shared-edge-cap')).not.toBeNull();
  });

  it('keeps legacy edge chrome when the shared flag is on but neither endpoint has accepted shared presentation', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockNodePresentation.sourceAccepted = false;
    mockNodePresentation.targetAccepted = false;
    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    expect(container.querySelector('#edge-1')).toHaveClass('react-flow__edge-path');
    expect(container.querySelector('#edge-1')).toHaveAttribute('marker-end', 'url(#test-guid)');
    expect(container.querySelector('.msla-shared-edge-path')).toBeNull();
  });

  it('keeps legacy edge chrome when only one endpoint has accepted shared presentation', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockNodePresentation.sourceAccepted = true;
    mockNodePresentation.otherAccepted = true;
    mockNodePresentation.targetAccepted = false;
    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    expect(container.querySelector('#edge-1')).toHaveClass('react-flow__edge-path');
    expect(container.querySelector('#edge-1')).toHaveAttribute('marker-end', 'url(#test-guid)');
    expect(container.querySelector('.msla-shared-edge-path')).toBeNull();
  });

  it('honors accepted shared=false as an explicit legacy veto', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockNodePresentation.sourceAccepted = true;
    mockNodePresentation.targetAccepted = true;
    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} data={{ ...defaultProps.data, presentation: { shared: false } }} />
      </svg>
    );
    expect(container.querySelector('#edge-1')).toHaveClass('react-flow__edge-path');
    expect(container.querySelector('#edge-1')).toHaveAttribute('marker-end', 'url(#test-guid)');
    expect(container.querySelector('.msla-shared-edge-path')).toBeNull();
  });

  it.each([
    { side: Position.Top, sourceSide: Position.Bottom, axis: 'x' as const, targetCoordinate: 300, expectedOffsets: [-22, 22] },
    { side: Position.Bottom, sourceSide: Position.Top, axis: 'x' as const, targetCoordinate: 300, expectedOffsets: [-22, 22] },
    { side: Position.Left, sourceSide: Position.Right, axis: 'y' as const, targetCoordinate: 200, expectedOffsets: [-10, 10] },
    { side: Position.Right, sourceSide: Position.Left, axis: 'y' as const, targetCoordinate: 200, expectedOffsets: [-10, 10] },
  ])('keeps legacy 2-dependency run-after offsets for $side targets', ({ side, sourceSide, axis, targetCoordinate, expectedOffsets }) => {
    mockUseSharedNodeUi.mockReturnValue(false);
    mockUseActionMetadata.mockReturnValue({ runAfter: { sourceNode: ['Failed'], otherSource: ['Failed'] } });
    mockNodePresentation.positions = {
      sourceNode: { x: 0, y: 0 },
      otherSource: { x: 100, y: 100 },
    };
    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} targetX={300} targetY={200} targetPosition={side} sourcePosition={sourceSide} />
        <ButtonEdge
          {...defaultProps}
          id="edge-2"
          source="otherSource"
          targetX={300}
          targetY={200}
          targetPosition={side}
          sourcePosition={sourceSide}
        />
      </svg>
    );
    const boxes = Array.from(container.querySelectorAll('foreignObject')).map((box) => ({
      x: Number(box.getAttribute('x')),
      y: Number(box.getAttribute('y')),
      width: Number(box.getAttribute('width')),
      height: Number(box.getAttribute('height')),
    }));
    expect(boxes).toHaveLength(2);
    expect(boxes.map(({ width, height }) => [width, height])).toEqual([
      [36, 12],
      [36, 12],
    ]);
    const centers = boxes.map((box) => (axis === 'x' ? box.x + box.width / 2 : box.y + box.height / 2));
    const offsets = centers.map((center) => center - targetCoordinate).sort((a, b) => a - b);
    expect(offsets).toEqual(expectedOffsets);
  });

  it('reveals from the real enlarged edge hit path and centers the canonical hit surface at the actual midpoint', () => {
    mockUseSharedNodeUi.mockReturnValue(true);
    const { container, getByTestId } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const hit = container.querySelector('[data-edge-hit-target]')!;
    const control = getByTestId('dropzone-root');
    expect(control).toHaveAttribute('data-revealed', 'false');
    expect(control).toHaveAttribute('data-shared', 'true');
    expect(control.parentElement).toHaveStyle({ width: '32px', height: '32px', left: '84px', top: '109px' });
    fireEvent.mouseEnter(hit);
    expect(control).toHaveAttribute('data-revealed', 'true');
    fireEvent.mouseLeave(hit);
    expect(control).toHaveAttribute('data-revealed', 'false');
  });
});
