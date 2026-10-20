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
  useStore,
} from '@xyflow/react';
import type { Edge, Node, NodeProps, NodeTypes } from '@xyflow/react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useIntl } from 'react-intl';
import { WORKFLOW_PREVIEW_NODE_WIDTH } from './types';
import type { WorkflowPreviewGraph, WorkflowPreviewNode, WorkflowPreviewProps } from './types';
import { useWorkflowPreviewStyles } from './workflowPreview.styles';
import { useWorkflowPreviewNodeInternals } from './useWorkflowPreviewNodeInternals';
import '@xyflow/react/dist/style.css';

export * from './types';

const NodeMeasurements = ({ onSizesChange }: { onSizesChange: NonNullable<WorkflowPreviewGraph['onNodeSizesChange']> }) => {
  const sizes = useStore(({ nodeLookup }) =>
    JSON.stringify(
      Object.fromEntries(
        [...nodeLookup.values()]
          .filter((node) => node.measured.width && node.measured.height)
          .map((node) => [node.id, { width: node.measured.width, height: node.measured.height }])
      )
    )
  );
  useEffect(() => {
    if (sizes) {
      onSizesChange(JSON.parse(sizes));
    }
  }, [sizes, onSizesChange]);
  return null;
};

type PreviewNode = Node<Pick<WorkflowPreviewNode, 'label' | 'iconUri' | 'brandColor'>, 'workflowPreview'>;

const FIT_VIEW_OPTIONS = { padding: 0.2, minZoom: 0.1, maxZoom: 1 };
const INERT_NODE_OPTIONS = {
  draggable: false,
  connectable: false,
  selectable: false,
  focusable: false,
  deletable: false,
};
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
  return (
    <div className={styles.card} title={data.label}>
      <Handle type="target" position={Position.Top} isConnectable={false} className={styles.handle} />
      <PreviewIcon key={data.iconUri} iconUri={data.iconUri} brandColor={data.brandColor} />
      <span className={styles.label}>{data.label}</span>
      <Handle type="source" position={Position.Bottom} isConnectable={false} className={styles.handle} />
    </div>
  );
};

const NODE_TYPES: NodeTypes = { workflowPreview: PreviewCard };

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

const PreviewCanvas = (props: WorkflowPreviewProps & { containerRef: RefObject<HTMLDivElement> }) => {
  const { graph, containerRef } = props;
  const styles = useWorkflowPreviewStyles();
  const intl = useIntl();
  const id = useId();
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
  const { nodes: previewNodes, edges: previewEdges } = useMemo<{ nodes: Node[]; edges: Edge[] }>(
    () =>
      props.graph
        ? {
            nodes: props.graph.nodes.map((node) => ({
              id: node.id,
              type: node.type,
              data: node.data,
              zIndex: node.zIndex,
              position: { x: node.position.x, y: node.position.y },
              width: node.width ?? WORKFLOW_PREVIEW_NODE_WIDTH,
              ...(node.height && { height: node.height }),
              ...(node.parentId && { parentId: node.parentId }),
              ...INERT_NODE_OPTIONS,
            })),
            edges: props.graph.edges.map((edge) => ({
              id: edge.id,
              source: edge.source,
              target: edge.target,
              ...EDGE_OPTIONS,
              type: edge.type,
              data: edge.data,
              zIndex: edge.zIndex,
              markerEnd: undefined,
              style: { pointerEvents: 'none' },
            })),
          }
        : {
            nodes: props.nodes.map((node) => ({
              id: node.id,
              type: 'workflowPreview',
              data: { label: node.label, iconUri: node.iconUri, brandColor: node.brandColor },
              position: { x: node.position.x, y: node.position.y },
              width: WORKFLOW_PREVIEW_NODE_WIDTH,
              ...INERT_NODE_OPTIONS,
            })),
            edges: props.edges.map((edge) => ({
              id: edge.id,
              source: edge.source,
              target: edge.target,
              ...EDGE_OPTIONS,
            })),
          },
    [props.graph, props.nodes, props.edges]
  );
  const nodesMeasured = useWorkflowPreviewNodeInternals(containerRef, previewNodes);
  // Only geometry changes should reset the user's viewport, not label updates or new array references.
  const layoutKey = JSON.stringify(
    previewNodes.map(({ id, position, parentId, width, height }) => [id, position.x, position.y, parentId, width, height])
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

  if (!previewNodes.length) {
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
      nodeTypes={graph?.nodeTypes ?? NODE_TYPES}
      edgeTypes={graph?.edgeTypes}
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
      {graph?.onNodeSizesChange ? <NodeMeasurements onSizesChange={graph.onNodeSizesChange} /> : null}
      <PreviewNavigation />
    </ReactFlow>
  );
};

/** A navigation-only, pre-positioned workflow graph with its own isolated viewport. */
export const WorkflowPreview = ({ ariaLabel, className, ...graphProps }: WorkflowPreviewProps) => {
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
        <PreviewCanvas {...graphProps} containerRef={containerRef} />
      </ReactFlowProvider>
    </div>
  );
};
