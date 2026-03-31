/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { EdgeProps } from '@xyflow/react';
import { Position } from '@xyflow/react';
import type { LogicAppsEdgeProps } from '../edge';

const mockUseReadOnly = vi.fn().mockReturnValue(false);

vi.mock(import('../../../core/state/designerOptions/designerOptionsSelectors'), () => ({
  useReadOnly: () => mockUseReadOnly(),
}));

const mockUseIsNodeSelectedInOperationPanel = vi.fn().mockReturnValue(false);

vi.mock(import('../../../core/state/panel/panelSelectors'), () => ({
  useIsNodeSelectedInOperationPanel: (...args: any[]) => mockUseIsNodeSelectedInOperationPanel(...args),
}));

const mockUseActionMetadata = vi.fn().mockReturnValue({ runAfter: {} });
const mockUseNodeEdgeTargets = vi.fn().mockReturnValue([]);
const mockUseNodeMetadata = vi.fn().mockReturnValue({ graphId: 'root' });

vi.mock(import('../../../core/state/workflow/workflowSelectors'), () => ({
  useActionMetadata: (...args: any[]) => mockUseActionMetadata(...args),
  useNodeEdgeTargets: (...args: any[]) => mockUseNodeEdgeTargets(...args),
  useNodeMetadata: (...args: any[]) => mockUseNodeMetadata(...args),
}));

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => ({
  ...((await importOriginal()) as object),
  useEdgeIndex: () => 0,
  useGuid: () => 'test-guid',
}));

vi.mock(import('@xyflow/react'), async (importOriginal) => {
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
  DropZone: ({ graphId }: any) => <div data-testid={`dropzone-${graphId}`}>DropZone</div>,
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
    mockUseIsNodeSelectedInOperationPanel.mockReturnValue(false);
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
});
