import { Button, mergeClasses, tokens } from '@fluentui/react-components';
import { Flow20Regular, ZoomFitRegular, ZoomInRegular, ZoomOutRegular } from '@fluentui/react-icons';
import {
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import type { Edge, Node, NodeProps, NodeTypes } from '@xyflow/react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useIntl } from 'react-intl';
import { WORKFLOW_PREVIEW_NODE_HEIGHT, WORKFLOW_PREVIEW_NODE_WIDTH } from './types';
import type { WorkflowPreviewNode, WorkflowPreviewProps } from './types';
import { useWorkflowPreviewStyles } from './workflowPreview.styles';
import { useWorkflowPreviewNodeInternals } from './useWorkflowPreviewNodeInternals';
import { GraphContainer } from '../card/graphContainer';
import '@xyflow/react/dist/style.css';

export * from './types';

type PreviewNode = Node<
  Pick<WorkflowPreviewNode, 'label' | 'iconUri' | 'brandColor' | 'height' | 'kind' | 'branchType'>,
  'workflowPreview' | 'workflowPreviewContainer'
>;

const FIT_VIEW_OPTIONS = { padding: 0.2, minZoom: 0.1, maxZoom: 1 };
const EDGE_OPTIONS = {
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, color: tokens.colorNeutralStroke1 },
  style: { stroke: tokens.colorNeutralStroke1, pointerEvents: 'none' as const },
  interactionWidth: 0,
  reconnectable: false,
  selectable: false,
  focusable: false,
};

const PreviewIcon = ({ iconUri, brandColor }: Pick<WorkflowPreviewNode, 'iconUri' | 'brandColor'>) => {
  const styles = useWorkflowPreviewStyles();
  const [iconFailed, setIconFailed] = useState(false);

  return (
    <span
      className={styles.iconTile}
      style={{ backgroundColor: brandColor, color: brandColor ? tokens.colorNeutralForegroundOnBrand : undefined }}
      aria-hidden="true"
    >
      {iconUri && !iconFailed ? <img src={iconUri} alt="" draggable={false} onError={() => setIconFailed(true)} /> : <Flow20Regular />}
    </span>
  );
};

const PreviewCard = ({ data }: NodeProps<PreviewNode>) => {
  const styles = useWorkflowPreviewStyles();
  const scope = data.kind === 'scope';
  const branch = data.kind === 'branch';

  return (
    <div
      className={mergeClasses(
        styles.card,
        scope && styles.scope,
        branch && styles.branch,
        branch && data.branchType === 'true' && styles.trueBranch,
        branch && data.branchType === 'false' && styles.falseBranch
      )}
      style={{ height: data.height, ...(branch && { width: '100%' }), ...(scope && { backgroundColor: data.brandColor }) }}
      title={data.label}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} className={styles.handle} />
      {!branch && <PreviewIcon key={data.iconUri} iconUri={data.iconUri} brandColor={data.brandColor} />}
      <span
        className={mergeClasses(
          styles.label,
          (scope || branch) && styles.scopeLabel,
          data.height === WORKFLOW_PREVIEW_NODE_HEIGHT && styles.singleLine
        )}
      >
        {data.label}
      </span>
      <Handle type="source" position={Position.Bottom} isConnectable={false} className={styles.handle} />
    </div>
  );
};

const PreviewContainer = ({ id, data }: NodeProps<PreviewNode>) => {
  const styles = useWorkflowPreviewStyles();
  return (
    <div className={styles.container} role="group" aria-label={data.label}>
      <Handle type="target" position={Position.Top} isConnectable={false} className={styles.handle} />
      <GraphContainer id={`preview-${id}`} />
      <Handle type="source" position={Position.Bottom} isConnectable={false} className={styles.handle} />
    </div>
  );
};

const NODE_TYPES: NodeTypes = { workflowPreview: PreviewCard, workflowPreviewContainer: PreviewContainer };

const PreviewNavigation = () => {
  const styles = useWorkflowPreviewStyles();
  const intl = useIntl();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const zoomInLabel = intl.formatMessage({
    id: 'LeR+TX',
    defaultMessage: 'Zoom in',
    description: 'Aria label for a button that zooms in on the workflow',
  });
  const zoomOutLabel = intl.formatMessage({
    id: 'JyYLq1',
    defaultMessage: 'Zoom out',
    description: 'Aria label for a button that zooms out on the workflow',
  });
  const fitViewLabel = intl.formatMessage({
    id: 'nAEN7n',
    defaultMessage: 'Zoom view to fit',
    description: 'Aria label for a button that fits the workflow to the window',
  });

  return (
    <Panel position="bottom-left" className={styles.controls}>
      <Button
        className={styles.controlButton}
        appearance="subtle"
        icon={<ZoomInRegular />}
        aria-label={zoomInLabel}
        title={zoomInLabel}
        onClick={() => zoomIn()}
      />
      <Button
        className={styles.controlButton}
        appearance="subtle"
        icon={<ZoomOutRegular />}
        aria-label={zoomOutLabel}
        title={zoomOutLabel}
        onClick={() => zoomOut()}
      />
      <Button
        className={styles.controlButton}
        appearance="subtle"
        icon={<ZoomFitRegular />}
        aria-label={fitViewLabel}
        title={fitViewLabel}
        onClick={() => fitView(FIT_VIEW_OPTIONS)}
      />
    </Panel>
  );
};

const PreviewCanvas = ({
  nodes,
  edges,
  containerRef,
}: Pick<WorkflowPreviewProps, 'nodes' | 'edges'> & { containerRef: RefObject<HTMLDivElement> }) => {
  const styles = useWorkflowPreviewStyles();
  const intl = useIntl();
  const id = useId();
  // React Flow raises nested parents by depth. Keep every connector above those backgrounds and below cards.
  const containerCount = nodes.filter(({ kind }) => kind === 'container').length;
  const { fitView, getViewport, setViewport } = useReactFlow();
  const panWithKeyboard = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      const offsets: Record<string, { x: number; y: number }> = {
        ArrowLeft: { x: 40, y: 0 },
        ArrowRight: { x: -40, y: 0 },
        ArrowUp: { x: 0, y: 40 },
        ArrowDown: { x: 0, y: -40 },
      };
      const offset = offsets[event.key];
      if (offset) {
        event.preventDefault();
        const viewport = getViewport();
        setViewport({ ...viewport, x: viewport.x + offset.x, y: viewport.y + offset.y });
      }
    },
    [getViewport, setViewport]
  );
  const nodesMeasured = useWorkflowPreviewNodeInternals(containerRef, nodes);
  const previewNodes = useMemo<PreviewNode[]>(
    () =>
      nodes.map(({ id, label, position, iconUri, brandColor, parentId, width, height, kind, branchType }) => ({
        id,
        type: kind === 'container' ? 'workflowPreviewContainer' : 'workflowPreview',
        position: { x: position.x, y: position.y },
        data: { label, iconUri, brandColor, ...(kind && { kind }), ...(branchType && { branchType }), ...(height && { height }) },
        width: width ?? WORKFLOW_PREVIEW_NODE_WIDTH,
        ...(height && { height }),
        ...(parentId && { parentId }),
        ...(containerCount && { zIndex: kind === 'container' ? 0 : containerCount + 2 }),
        draggable: false,
        connectable: false,
        selectable: false,
        focusable: false,
        deletable: false,
      })),
    [nodes, containerCount]
  );
  const previewEdges = useMemo<Edge[]>(
    () =>
      edges.map(({ id, source, target }) => ({
        id,
        source,
        target,
        ...EDGE_OPTIONS,
        ...(containerCount && { zIndex: containerCount + 1 }),
      })),
    [edges, containerCount]
  );
  // Only geometry changes should reset the user's viewport, not label updates or new array references.
  const layoutKey = JSON.stringify(
    nodes.map(({ id, position, parentId, width, height }) => [id, position.x, position.y, parentId, width, height])
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !nodesMeasured || layoutKey === '[]') {
      return;
    }

    let frame = requestAnimationFrame(() => fitView(FIT_VIEW_OPTIONS));
    let { width, height } = container.getBoundingClientRect();
    const observer = new ResizeObserver(([entry]) => {
      const nextSize = entry.contentRect;
      if (nextSize.width <= 0 || nextSize.height <= 0 || (width === nextSize.width && height === nextSize.height)) {
        return;
      }
      width = nextSize.width;
      height = nextSize.height;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => fitView(FIT_VIEW_OPTIONS));
    });
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [containerRef, fitView, layoutKey, nodesMeasured]);

  if (!nodes.length) {
    return (
      <div className={styles.empty}>
        {intl.formatMessage({
          id: 'tno80k',
          defaultMessage: 'No workflow actions to preview.',
          description: 'Empty state shown when a workflow preview has no nodes',
        })}
      </div>
    );
  }

  return (
    <ReactFlow
      id={id}
      className={mergeClasses(styles.flow, styles.keyboardNavigation)}
      role="group"
      tabIndex={0}
      aria-label={intl.formatMessage({
        defaultMessage: 'Workflow preview navigation. Use arrow keys to pan.',
        id: 'xik+HE',
        description: 'Accessible instructions for keyboard panning in the read-only workflow preview',
      })}
      onKeyDown={panWithKeyboard}
      nodes={previewNodes}
      edges={previewEdges}
      nodeTypes={NODE_TYPES}
      defaultEdgeOptions={EDGE_OPTIONS}
      nodesDraggable={false}
      nodesConnectable={false}
      nodesFocusable={false}
      edgesReconnectable={false}
      edgesFocusable={false}
      elementsSelectable={false}
      selectionOnDrag={false}
      deleteKeyCode={null}
      selectionKeyCode={null}
      multiSelectionKeyCode={null}
      panActivationKeyCode={null}
      disableKeyboardA11y
      panOnDrag
      zoomOnScroll
      zoomOnPinch
      zoomOnDoubleClick={false}
      minZoom={0.1}
      maxZoom={2}
      fitView
      fitViewOptions={FIT_VIEW_OPTIONS}
      proOptions={{ hideAttribution: true }}
    >
      <Background id={`${id}-dots`} variant={BackgroundVariant.Dots} gap={16} size={1} color={tokens.colorNeutralStroke2} />
      <PreviewNavigation />
    </ReactFlow>
  );
};

/** A navigation-only, pre-positioned workflow graph with its own isolated viewport. */
export const WorkflowPreview = ({ nodes, edges, ariaLabel, className }: WorkflowPreviewProps) => {
  const styles = useWorkflowPreviewStyles();
  const intl = useIntl();
  const containerRef = useRef<HTMLDivElement>(null);
  const label =
    ariaLabel ??
    intl.formatMessage({
      id: 'kTelYy',
      defaultMessage: 'Workflow preview',
      description: 'Accessible name of a navigation-only workflow preview',
    });

  return (
    <div ref={containerRef} className={mergeClasses(styles.root, className)} role="region" aria-label={label}>
      <ReactFlowProvider>
        <PreviewCanvas nodes={nodes} edges={edges} containerRef={containerRef} />
      </ReactFlowProvider>
    </div>
  );
};
