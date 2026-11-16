import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { createIntl, IntlProvider } from 'react-intl';
import { getBezierPath, Position, type EdgeProps } from '@xyflow/react';
import { AgentsFilled, AgentsRegular } from '@fluentui/react-icons';
import { designerUiTokens, getNodeLineArrowPath } from '@microsoft/designer-ui-v2';
import { nodeMetrics } from '@microsoft/designer-ui-v2/metrics';
import type { LogicAppsEdgeProps } from '../edge';
import ButtonEdge from '../edge';
import { DropZone } from '../dropzone';
import { OnlyEdge } from '../onlyEdge';
import { DraftEdge } from '../draftEdge';
import { getOperationNodeGlyph, getOperationNodeVisualKind } from '../../CustomNodes/components/card/operationNodeGlyphs';
import { getOperationNodeSubtitle } from '../../CustomNodes/components/card/nodeUiStrings';

const state = vi.hoisted(() => ({
  shared: true,
  readOnly: false,
  sourceAccepted: true,
  targetAccepted: true,
  edgeTargets: ['targetNode'] as string[],
  runAfter: { sourceNode: ['Failed'] } as Record<string, string[]>,
}));
const dispatch = vi.hoisted(() => vi.fn());

vi.mock('@microsoft/designer-ui-v2', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    EdgePillButton: ({ onActivate, onContextMenu, ariaLabel, maskColor, isRevealed, disabled, tabIndex, id }: any) => (
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        data-testid="edge-pill-button"
        data-mask-color={maskColor ?? ''}
        data-revealed={String(!!isRevealed)}
        disabled={!!disabled}
        tabIndex={tabIndex}
        onClick={(event) => {
          event.preventDefault();
          onActivate?.();
        }}
        onContextMenu={(event) => onContextMenu?.(event)}
      />
    ),
  };
});

vi.mock('../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useReadOnly: () => state.readOnly,
  useSharedNodeUi: () => state.shared,
  useIsDarkMode: () => false,
}));
vi.mock('react-redux', () => ({ useDispatch: () => dispatch }));
vi.mock('react-hotkeys-hook', () => ({ useHotkeys: () => ({ current: null }) }));

vi.mock('../../../core/state/panel/panelSelectors', () => ({
  useIsNodeSelectedInOperationPanel: () => false,
  useIsNodeInMultiSelection: () => false,
}));

vi.mock('../../../core/state/workflow/workflowSelectors', () => ({
  useActionMetadata: () => ({ runAfter: state.runAfter }),
  useNodeEdgeTargets: () => state.edgeTargets,
  useNodeMetadata: () => ({ graphId: 'root' }),
  useNodeDisplayName: (id: string) => id || '',
  useHasUpstreamAgenticLoop: () => false,
  useIsWithinAgenticLoop: () => false,
}));

vi.mock('../../../core/state/designerView/designerViewSelectors', () => ({ useIsA2AWorkflow: () => false }));
vi.mock('../../../core/state/tokens/tokenSelectors', () => ({ useUpstreamNodes: () => new Set(['sourceNode']) }));
vi.mock('../../../core/hooks/useIsDraggingNode', () => ({ useIsDraggingNode: () => false }));
vi.mock('../../../core/utils/clipboard', () => ({ retrieveClipboardData: async () => undefined }));
vi.mock('../../../core/actions/bjsworkflow/copypaste', () => ({
  pasteOperation: () => ({ type: 'pasteOperation' }),
  pasteScopeOperation: () => ({ type: 'pasteScopeOperation' }),
}));

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    BezierEdge: () => <path data-testid="legacy-bezier-edge" />,
    useReactFlow: () => ({
      getNode: (id: string) => ({
        data: {
          presentation: {
            shared: id.startsWith('sourceNode') ? state.sourceAccepted : state.targetAccepted,
          },
        },
        position: { x: 0, y: 0 },
      }),
    }),
    EdgeLabelRenderer: ({ children }: any) => <div data-testid="edge-label-renderer">{children}</div>,
  };
});

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => ({
  ...((await importOriginal()) as object),
  useEdgeIndex: () => 1,
  useGuid: () => 'edge-guid',
}));

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

const renderWithIntl = (node: JSX.Element) => render(<IntlProvider locale="en">{node}</IntlProvider>);

describe('shared presentation contracts', () => {
  beforeEach(() => {
    state.shared = true;
    state.readOnly = false;
    state.sourceAccepted = true;
    state.targetAccepted = true;
    state.edgeTargets = ['targetNode'];
    state.runAfter = { sourceNode: ['Failed'] };
  });

  it('uses the shared run-after slot size and clips indicator overflow without rotating the slot', () => {
    const { container } = renderWithIntl(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const foreignObject = container.querySelector('foreignObject')!;
    expect(foreignObject).toHaveAttribute('width', String(nodeMetrics.runAfter.sharedWidth));
    expect(foreignObject).toHaveAttribute('height', String(nodeMetrics.runAfter.sharedHeight));
    expect(foreignObject).not.toHaveAttribute('transform');
    expect((foreignObject.firstElementChild as HTMLElement).style.overflow).toBe('hidden');
    expect(container.querySelectorAll('.msla-shared-edge-path')).toHaveLength(1);
    expect(container.querySelectorAll('.msla-shared-edge-cap')).toHaveLength(1);
    expect(container.querySelector('[data-edge-hit-target]')).not.toBeNull();
  });

  it('keeps legacy run-after slot geometry and marker path when shared presentation is off', () => {
    state.shared = false;
    state.sourceAccepted = false;
    state.targetAccepted = false;
    const { container } = renderWithIntl(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const foreignObject = container.querySelector('foreignObject')!;
    expect(foreignObject).toHaveAttribute('width', String(nodeMetrics.runAfter.legacyWidth));
    expect(foreignObject).toHaveAttribute('height', String(nodeMetrics.runAfter.legacyHeight));
    expect(container.querySelector('.msla-shared-edge-path')).toBeNull();
    expect(container.querySelector('#edge-1')).toHaveAttribute('marker-end', 'url(#edge-guid)');
  });

  it('requires both endpoints to accept shared presentation before switching ButtonEdge to shared chrome', () => {
    state.shared = true;
    state.sourceAccepted = true;
    state.targetAccepted = false;
    const { container } = renderWithIntl(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const foreignObject = container.querySelector('foreignObject')!;
    expect(foreignObject).toHaveAttribute('width', String(nodeMetrics.runAfter.legacyWidth));
    expect(foreignObject).toHaveAttribute('height', String(nodeMetrics.runAfter.legacyHeight));
    expect(container.querySelector('.msla-shared-edge-path')).toBeNull();
    expect(container.querySelector('#edge-1')).toHaveAttribute('marker-end', 'url(#edge-guid)');
  });

  it('wires useEdgeActiveState hit-path hover and keyboard focus-visible state to the shared EdgePillButton', () => {
    state.runAfter = { sourceNode: ['Succeeded'] };
    const { container, getByTestId } = renderWithIntl(
      <svg>
        <ButtonEdge {...defaultProps} />
      </svg>
    );
    const hitTarget = container.querySelector('[data-edge-hit-target]')!;
    const pillButton = getByTestId('edge-pill-button');
    expect(pillButton).toHaveAttribute('data-revealed', 'false');

    fireEvent.mouseEnter(hitTarget);
    expect(pillButton).toHaveAttribute('data-revealed', 'true');

    fireEvent.mouseLeave(hitTarget);
    expect(pillButton).toHaveAttribute('data-revealed', 'false');

    pillButton.setAttribute('data-fui-focus-visible', '');
    fireEvent.focus(pillButton);
    expect(pillButton).toHaveAttribute('data-revealed', 'true');

    fireEvent.blur(pillButton, { relatedTarget: document.body });
    expect(pillButton).toHaveAttribute('data-revealed', 'false');
  });

  it('renders getNodeLineArrowPath on OnlyEdge and DraftEdge only when accepted shared presentation admits it', () => {
    const expectedArrow = getNodeLineArrowPath(defaultProps.targetX, defaultProps.targetY, 'down');
    const sharedOnly = renderWithIntl(
      <svg>
        <OnlyEdge {...defaultProps} />
      </svg>
    );
    expect(sharedOnly.container.querySelectorAll('.msla-shared-edge-path')).toHaveLength(1);
    expect(sharedOnly.container.querySelector('.msla-shared-edge-cap')).toHaveAttribute('d', expectedArrow);
    const onlyCapMarker = sharedOnly.container.querySelector('.msla-shared-edge-cap')!.closest('marker')!;
    expect(sharedOnly.container.querySelector('.msla-shared-edge-path')).toHaveAttribute('marker-end', `url(#${onlyCapMarker.id})`);
    sharedOnly.unmount();

    const draftProps = {
      fromX: defaultProps.sourceX,
      fromY: defaultProps.sourceY,
      fromPosition: defaultProps.sourcePosition,
      toX: defaultProps.targetX,
      toY: defaultProps.targetY,
      toPosition: defaultProps.targetPosition,
      toNode: { id: 'targetNode' } as any,
      connectionLineType: 'default' as any,
      connectionStatus: null,
      fromNode: { id: 'sourceNode' } as any,
      fromHandle: {} as any,
      pointer: { x: defaultProps.targetX, y: defaultProps.targetY },
    };
    const sharedDraft = renderWithIntl(
      <svg>
        <DraftEdge {...draftProps} />
      </svg>
    );
    const draftPaths = sharedDraft.container.querySelectorAll('path.react-flow__edge-path.highlighted');
    expect(draftPaths).toHaveLength(2);
    expect(draftPaths[1]).toHaveAttribute('d', expectedArrow);
    expect(sharedDraft.container.querySelector('marker#arrow-end-draft')).toBeNull();
    expect(sharedDraft.container.querySelector('#draft-connection-path')).toHaveAttribute('marker-end', 'url("#arrow-end-draft-shared")');
    expect(draftPaths[1].closest('marker#arrow-end-draft-shared')).not.toBeNull();
    sharedDraft.unmount();

    state.targetAccepted = false;
    const rejectedDraft = renderWithIntl(
      <svg>
        <DraftEdge {...draftProps} />
      </svg>
    );
    expect(rejectedDraft.container.querySelectorAll('path.react-flow__edge-path.highlighted')).toHaveLength(1);
    expect(rejectedDraft.container.querySelector('marker#arrow-end-draft')).not.toBeNull();
    rejectedDraft.unmount();

    const freePointerDraft = renderWithIntl(
      <svg>
        <DraftEdge {...{ ...draftProps, toNode: undefined }} />
      </svg>
    );
    expect(freePointerDraft.container.querySelectorAll('path.react-flow__edge-path.highlighted')).toHaveLength(2);
    expect(freePointerDraft.container.querySelector('marker#arrow-end-draft')).toBeNull();
    freePointerDraft.unmount();

    state.sourceAccepted = false;
    const rejectedSourceDraft = renderWithIntl(
      <svg>
        <DraftEdge {...{ ...draftProps, toNode: undefined }} />
      </svg>
    );
    expect(rejectedSourceDraft.container.querySelectorAll('path.react-flow__edge-path.highlighted')).toHaveLength(1);
    expect(rejectedSourceDraft.container.querySelector('marker#arrow-end-draft')).not.toBeNull();
    rejectedSourceDraft.unmount();

    state.sourceAccepted = true;
    state.targetAccepted = true;
    state.shared = false;
    const legacyOnly = renderWithIntl(
      <svg>
        <OnlyEdge {...defaultProps} />
      </svg>
    );
    expect(legacyOnly.getByTestId('legacy-bezier-edge')).toBeInTheDocument();
    expect(legacyOnly.container.querySelector('.msla-shared-edge-path')).toBeNull();
    legacyOnly.unmount();

    const legacyDraft = renderWithIntl(
      <svg>
        <DraftEdge {...draftProps} />
      </svg>
    );
    expect(legacyDraft.container.querySelectorAll('path.react-flow__edge-path.highlighted')).toHaveLength(1);
    expect(legacyDraft.container.querySelector('marker#arrow-end-draft')).not.toBeNull();
    expect(legacyDraft.container.querySelector('#draft-connection-path')).toHaveAttribute('marker-end', 'url("#arrow-end-draft")');
  });

  it('keeps terminal add controls centered at 32x32 and applies shared mask color only in shared insertion mode', () => {
    const insertion = renderWithIntl(<DropZone graphId="root" parentId="sourceNode" childId="targetNode" isRevealed />);
    const insertionButton = insertion.getByTestId('edge-pill-button');
    expect(insertionButton).toHaveAttribute('data-mask-color', designerUiTokens.canvasBackground);
    insertion.unmount();

    const terminal = renderWithIntl(<DropZone graphId="root" parentId="sourceNode" isLeaf axis="horizontal" />);
    const terminalControl = terminal.container.querySelector('[data-edge-control="terminal"]') as HTMLElement;
    expect(terminalControl).toHaveStyle({
      width: `${Math.max(nodeMetrics.actionAdd.buttonWidth, nodeMetrics.actionAdd.buttonHeight)}px`,
      height: `${Math.max(nodeMetrics.actionAdd.buttonWidth, nodeMetrics.actionAdd.buttonHeight)}px`,
    });

    expect(terminal.container.querySelector('[data-testid="edge-pill-button"]')).toBeNull();
    terminal.unmount();

    const expectedTerminalCenterOffset = nodeMetrics.actionAdd.buttonHeight / 2 + nodeMetrics.terminalConnectionLength;
    const downAxis = renderWithIntl(<DropZone graphId="root" parentId="sourceNode" isLeaf axis="vertical" />);
    const downControl = downAxis.container.querySelector('[data-edge-control="terminal"]') as HTMLElement;
    const downLine = downAxis.container.querySelector('[data-line="dashedNeutral"]') as HTMLElement;
    const downControlHeight = Number.parseFloat(downControl.style.height);
    const downLineTop = Number.parseFloat(globalThis.getComputedStyle(downLine).top);
    expect(downControlHeight / 2 - downLineTop).toBe(expectedTerminalCenterOffset);
    downAxis.unmount();

    const rightAxis = renderWithIntl(<DropZone graphId="root" parentId="sourceNode" isLeaf axis="horizontal" />);
    const rightControl = rightAxis.container.querySelector('[data-edge-control="terminal"]') as HTMLElement;
    const rightLine = rightAxis.container.querySelector('[data-line="dashedNeutral"]') as HTMLElement;
    const rightControlWidth = Number.parseFloat(rightControl.style.width);
    const rightLineLeft = Number.parseFloat(globalThis.getComputedStyle(rightLine).left);
    expect(rightControlWidth / 2 - rightLineLeft).toBe(expectedTerminalCenterOffset);
    rightAxis.unmount();

    state.shared = false;
    const legacy = renderWithIntl(<DropZone graphId="root" parentId="sourceNode" childId="targetNode" isRevealed />);
    expect(legacy.container.querySelector('[data-testid="edge-pill-button"]')).toBeNull();
    expect(legacy.container.querySelector('.msla-drop-zone-viewmanager')).not.toBeNull();
  });

  it.each([
    { targetPosition: Position.Top, direction: 'down' },
    { targetPosition: Position.Bottom, direction: 'up' },
    { targetPosition: Position.Left, direction: 'right' },
    { targetPosition: Position.Right, direction: 'left' },
  ] as const)(
    'joins the DraftEdge shaft and $direction cap at the $targetPosition face, with legacy fallback intact',
    ({ targetPosition, direction }) => {
      const draftProps = {
        fromX: 100,
        fromY: 50,
        fromPosition: Position.Bottom,
        toX: 300,
        toY: 200,
        toPosition: targetPosition,
        fromNode: { id: 'sourceNode' } as any,
        toNode: { id: 'targetNode' } as any,
        fromHandle: {} as any,
        pointer: { x: 300, y: 200 },
        connectionLineType: 'default' as any,
        connectionStatus: null,
      };
      const { container, rerender } = renderWithIntl(
        <svg>
          <DraftEdge {...draftProps} />
        </svg>
      );
      const paths = container.querySelectorAll('path.react-flow__edge-path.highlighted');
      expect(paths).toHaveLength(2);
      expect(paths[0]).toHaveAttribute(
        'd',
        getBezierPath({
          sourceX: 100,
          sourceY: 50,
          sourcePosition: Position.Bottom,
          targetX: 300,
          targetY: 200,
          targetPosition,
        })[0]
      );
      expect(paths[0].getAttribute('d')).toMatch(/300,200$/);
      expect(paths[1]).toHaveAttribute('d', getNodeLineArrowPath(300, 200, direction));
      expect(paths[1].getAttribute('d')).toContain('L 300 200 L');
      // Shared mode owns the cap as its own marker; the legacy arrow marker is not rendered.
      expect(container.querySelectorAll('marker')).toHaveLength(1);
      expect(container.querySelector('marker#arrow-end-draft')).toBeNull();
      expect(container.querySelector('#draft-connection-path')).toHaveAttribute('marker-end', 'url("#arrow-end-draft-shared")');
      const sharedShaftPath = paths[0].getAttribute('d') ?? '';
      state.shared = false;
      rerender(
        <IntlProvider locale="en">
          <svg>
            <DraftEdge {...draftProps} />
          </svg>
        </IntlProvider>
      );
      expect(container.querySelectorAll('path.react-flow__edge-path.highlighted')).toHaveLength(1);
      expect(container.querySelectorAll('marker')).toHaveLength(1);
      expect(container.querySelector('#draft-connection-path')).toHaveAttribute('d', sharedShaftPath);
      expect(container.querySelector('#draft-connection-path')).toHaveAttribute('marker-end', 'url("#arrow-end-draft")');
    }
  );

  it('maps NestedAgent to the built-in Agent glyph and localized subtitle without widening NodeVisualKind', () => {
    const intl = createIntl({ locale: 'en', messages: {} });
    expect(getOperationNodeVisualKind('NestedAgent')).toBeNull();
    expect(getOperationNodeGlyph('NestedAgent')).toMatchObject({
      icon: { type: AgentsRegular },
      selectedIcon: { type: AgentsFilled },
    });
    expect(getOperationNodeSubtitle(intl, 'NestedAgent', undefined, undefined, false, false)).toBe('Built-in · Nested agent');
  });
});
