import { Button, mergeClasses, tokens } from '@fluentui/react-components';
import { ZoomFitRegular, ZoomInRegular, ZoomOutRegular } from '@fluentui/react-icons';
import { useNodeLineStyles } from '@microsoft/designer-ui-v2';
import {
  Background,
  BackgroundVariant,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  getBezierPath,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type NodeTypes,
} from '@xyflow/react';
import { useEffect, useId, useMemo, useRef, type RefObject } from 'react';
import { useIntl } from 'react-intl';
import type { WorkflowPreviewProps } from '@microsoft/designer-ui';
import { SharedExtractionPreviewCard, type SharedPreviewFlowNode } from './SharedExtractionPreviewNode';
import { useSharedPreviewStyles } from './sharedWorkflowExtractionPreview.styles';
import { useSharedWorkflowExtractionPreviewInternals } from './useSharedWorkflowExtractionPreviewInternals';
import type { SharedExtractionPreviewNode } from './workflowExtractionPreview';

interface SharedPreviewProps {
  nodes: SharedExtractionPreviewNode[];
  edges: WorkflowPreviewProps['edges'];
  ariaLabel: string;
  className?: string;
}

const FIT_OPTIONS = { padding: 0.2, minZoom: 0.1, maxZoom: 1 };
const NODE_TYPES: NodeTypes = { sharedWorkflowPreview: SharedExtractionPreviewCard };
const PreviewEdge = (props: EdgeProps) => {
  const line = useNodeLineStyles();
  const [d] = getBezierPath(props);
  return <path className={mergeClasses('react-flow__edge-path', line.base, line.solid)} d={d} data-line="solid" />;
};
const EDGE_TYPES = { sharedWorkflowPreview: PreviewEdge };

const PreviewNavigation = () => {
  const styles = useSharedPreviewStyles();
  const intl = useIntl();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const controls = [
    {
      label: intl.formatMessage({
        id: 'LeR+TX',
        defaultMessage: 'Zoom in',
        description: 'Aria label for a button that zooms in on the workflow',
      }),
      icon: <ZoomInRegular />,
      activate: () => zoomIn(),
    },
    {
      label: intl.formatMessage({
        id: 'JyYLq1',
        defaultMessage: 'Zoom out',
        description: 'Aria label for a button that zooms out on the workflow',
      }),
      icon: <ZoomOutRegular />,
      activate: () => zoomOut(),
    },
    {
      label: intl.formatMessage({
        id: 'nAEN7n',
        defaultMessage: 'Zoom view to fit',
        description: 'Aria label for a button that fits the workflow to the window',
      }),
      icon: <ZoomFitRegular />,
      activate: () => fitView(FIT_OPTIONS),
    },
  ];
  return (
    <Panel position="bottom-left" className={styles.controls}>
      {controls.map(({ label, icon, activate }) => (
        <Button
          key={label}
          appearance="subtle"
          className={styles.control}
          icon={icon}
          aria-label={label}
          title={label}
          onClick={activate}
        />
      ))}
    </Panel>
  );
};

const PreviewCanvas = ({ nodes, edges, containerRef }: SharedPreviewProps & { containerRef: RefObject<HTMLDivElement> }) => {
  const styles = useSharedPreviewStyles();
  const intl = useIntl();
  const instanceId = useId();
  const { fitView } = useReactFlow();
  const { measurements, ready } = useSharedWorkflowExtractionPreviewInternals(containerRef, nodes);
  const previewNodes = useMemo<SharedPreviewFlowNode[]>(() => {
    let y = 0;
    return nodes.map((node) => {
      const size = measurements.get(node.id);
      const position = ready ? { x: -(size?.width ?? 0) / 2, y } : node.position;
      y += (size?.height ?? 0) + 40;
      return {
        id: node.id,
        type: 'sharedWorkflowPreview',
        position,
        // Controlled projections must retain natural measurements when updating positions.
        measured: size?.width && size.height ? { width: size.width, height: size.height } : undefined,
        data: { node, domId: `${instanceId}-preview-${node.id}` },
        draggable: false,
        connectable: false,
        selectable: false,
        focusable: false,
        deletable: false,
      };
    });
  }, [nodes, measurements, ready, instanceId]);
  const previewEdges = useMemo<Edge[]>(
    () =>
      edges.map((edge) => ({
        ...edge,
        type: 'sharedWorkflowPreview',
        selectable: false,
        focusable: false,
        deletable: false,
        reconnectable: false,
        interactionWidth: 0,
      })),
    [edges]
  );
  const layoutKey = JSON.stringify(previewNodes.map(({ id, position }) => [id, position.x, position.y, measurements.get(id)]));

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !ready) {
      return;
    }
    let frame = requestAnimationFrame(() => fitView(FIT_OPTIONS));
    let { width, height } = container.getBoundingClientRect();
    const observer = new ResizeObserver(([entry]) => {
      const next = entry.contentRect;
      if (next.width <= 0 || next.height <= 0 || (width === next.width && height === next.height)) {
        return;
      }
      width = next.width;
      height = next.height;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => fitView(FIT_OPTIONS));
    });
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [containerRef, fitView, layoutKey, ready]);

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
      id={instanceId}
      className={styles.flow}
      nodes={previewNodes}
      edges={previewEdges}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
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
      fitViewOptions={FIT_OPTIONS}
      proOptions={{ hideAttribution: true }}
    >
      <Background id={`${instanceId}-dots`} variant={BackgroundVariant.Dots} gap={16} size={1} color={tokens.colorNeutralStroke2} />
      <PreviewNavigation />
    </ReactFlow>
  );
};

/** Navigation-only projection, isolated from the editor graph, commands and viewport. */
export const SharedWorkflowExtractionPreview = (props: SharedPreviewProps) => {
  const styles = useSharedPreviewStyles();
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={containerRef} className={mergeClasses(styles.root, props.className)} role="region" aria-label={props.ariaLabel}>
      <ReactFlowProvider>
        <PreviewCanvas {...props} containerRef={containerRef} />
      </ReactFlowProvider>
    </div>
  );
};
