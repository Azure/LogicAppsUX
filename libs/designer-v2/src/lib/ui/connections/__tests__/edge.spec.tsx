import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import type { EdgeProps } from '@xyflow/react';
import { getBezierPath, Position } from '@xyflow/react';
import type { LogicAppsEdgeProps } from '../edge';
import { nodeLineStrokes } from '@microsoft/designer-ui-v2';

const mockUseReadOnly = vi.fn().mockReturnValue(false);
const mockUseSharedNodeUi = vi.fn().mockReturnValue(false);

vi.mock('../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useReadOnly: () => mockUseReadOnly(),
  useSharedNodeUi: () => mockUseSharedNodeUi(),
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
      getNode: vi.fn().mockReturnValue({ position: { x: 0, y: 0 } }),
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
    expect(path).not.toHaveAttribute('marker-end');
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
    expect(container.querySelector('[data-testid="run-after-indicator"]')).toBeInTheDocument();
  });

  it.each(['panel', 'multi'])('keeps canonical shared strokes without dead highlight attributes for %s selection', (selection) => {
    mockUseSharedNodeUi.mockReturnValue(true);
    mockUseIsNodeSelectedInOperationPanel.mockReturnValue(selection === 'panel');
    mockUseIsNodeInMultiSelection.mockReturnValue(selection === 'multi');
    const { container } = render(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const path = container.querySelector<SVGPathElement>('#edge-1');
    expect(path).not.toHaveAttribute('data-highlighted');
    expect(path).not.toHaveClass('highlighted');
    expect(path?.style.stroke).toBe(nodeLineStrokes.solid.stroke);
    expect(path?.style.strokeWidth).toBe(nodeLineStrokes.solid.strokeWidth);
  });

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
    expect(container.querySelector('[data-testid="collapsed-run-after-indicator"]')).toBeInTheDocument();
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
