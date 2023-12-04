import { useLayout } from '../core/graphlayout';
import { usePreloadOperationsQuery, usePreloadConnectorsQuery } from '../core/queries/browse';
import { useMonitoringView, useReadOnly } from '../core/state/designerOptions/designerOptionsSelectors';
import { useClampPan } from '../core/state/designerView/designerViewSelectors';
import { useIsPanelCollapsed } from '../core/state/panel/panelSelectors';
import { switchToNodeSearchPanel } from '../core/state/panel/panelSlice';
import { useIsGraphEmpty } from '../core/state/workflow/workflowSelectors';
import { buildEdgeIdsBySource, clearFocusNode, updateNodeSizes } from '../core/state/workflow/workflowSlice';
import type { AppDispatch, RootState } from '../core/store';
import { DEFAULT_NODE_SIZE } from '../core/utils/graph';
import Controls from './Controls';
import GraphNode from './CustomNodes/GraphContainerNode';
import HiddenNode from './CustomNodes/HiddenNode';
import OperationNode from './CustomNodes/OperationCardNode';
import PlaceholderNode from './CustomNodes/PlaceholderNode';
import ScopeCardNode from './CustomNodes/ScopeCardNode';
import SubgraphCardNode from './CustomNodes/SubgraphCardNode';
import Minimap from './Minimap';
import { ButtonEdge } from './connections/edge';
import { HiddenEdge } from './connections/hiddenEdge';
import { PanelRoot } from './panel/panelRoot';
import { css, setLayerHostSelector } from '@fluentui/react';
import { PanelLocation } from '@microsoft/designer-ui';
import type { CustomPanelLocation } from '@microsoft/designer-ui';
import type { WorkflowNodeType } from '@microsoft/utils-logic-apps';
import { useWindowDimensions, WORKFLOW_NODE_TYPES, useThrottledEffect } from '@microsoft/utils-logic-apps';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import KeyboardBackendFactory, { isKeyboardDragTrigger } from 'react-dnd-accessible-backend';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider, createTransition, MouseTransition } from 'react-dnd-multi-backend';
import { useHotkeys } from 'react-hotkeys-hook';
import { useDispatch, useSelector } from 'react-redux';
import { Background, ReactFlow, ReactFlowProvider, useNodes, useReactFlow, useStore, BezierEdge } from 'reactflow';
import type { BackgroundProps, NodeChange } from 'reactflow';

export interface DesignerProps {
  backgroundProps?: BackgroundProps;
  panelLocation?: PanelLocation;
  customPanelLocations?: CustomPanelLocation[];
  displayRuntimeInfo?: boolean;
  rightShift?: string; // How much we shift the canvas to the right (due to copilot)
}

type NodeTypesObj = {
  [key in WorkflowNodeType]: React.ComponentType<any>;
};
const nodeTypes: NodeTypesObj = {
  OPERATION_NODE: OperationNode,
  GRAPH_NODE: GraphNode,
  SUBGRAPH_NODE: GraphNode,
  SCOPE_CARD_NODE: ScopeCardNode,
  SUBGRAPH_CARD_NODE: SubgraphCardNode,
  HIDDEN_NODE: HiddenNode,
  PLACEHOLDER_NODE: PlaceholderNode,
};

const edgeTypes = {
  BUTTON_EDGE: ButtonEdge,
  HEADING_EDGE: ButtonEdge, // This is functionally the same as a button edge
  ONLY_EDGE: BezierEdge, // Setting it as default React Flow Edge, can be changed as needed
  HIDDEN_EDGE: HiddenEdge,
};
export interface CanvasFinderProps {
  panelLocation?: PanelLocation;
}
export const CanvasFinder = (props: CanvasFinderProps) => {
  const { panelLocation } = props;
  const focusNode = useSelector((state: RootState) => state.workflow.focusedCanvasNodeId);
  const isEmpty = useIsGraphEmpty();
  const { setCenter, getZoom } = useReactFlow();
  const height = useStore((state) => state.height);

  const isPanelCollapsed = useIsPanelCollapsed();
  const [firstLoad, setFirstLoad] = useState(true);

  // If first load is an empty workflow, set canvas to center
  useEffect(() => {
    if (isEmpty && firstLoad) {
      setCenter(DEFAULT_NODE_SIZE.width / 2, DEFAULT_NODE_SIZE.height, { zoom: 1 });
      setFirstLoad(false);
    }
  }, [setCenter, height, isEmpty, firstLoad]);

  const nodeData = useNodes().find((x) => x.id === focusNode);
  const dispatch = useDispatch<AppDispatch>();
  const handleTransform = useCallback(() => {
    if (!focusNode) return;
    if ((!nodeData?.position?.x && !nodeData?.position?.y) || !nodeData?.width || !nodeData?.height) {
      return;
    }

    let xRawPos = nodeData?.positionAbsolute?.x ?? 0;
    const yRawPos = nodeData?.positionAbsolute?.y ?? 0;

    // If the panel is open, reduce X space
    if (!isPanelCollapsed) {
      // Move center to the right if Panel is located to the left; otherwise move center to the left.
      const directionMultiplier = panelLocation && panelLocation === PanelLocation.Left ? -1 : 1;
      xRawPos += (directionMultiplier * 630) / 2;
    }

    const xTarget = xRawPos + (nodeData?.width ?? DEFAULT_NODE_SIZE.width) / 2; // Center X on node midpoint
    const yTarget = yRawPos + (nodeData?.height ?? DEFAULT_NODE_SIZE.height); // Center Y on bottom edge

    if (firstLoad) {
      const firstNodeYPos = 150;
      setCenter(xTarget, height / 2 - firstNodeYPos, { zoom: 1 });
      setFirstLoad(false);
    } else {
      setCenter(xTarget, yTarget, {
        zoom: getZoom(),
        duration: 500,
      });
    }
    dispatch(clearFocusNode());
  }, [dispatch, firstLoad, focusNode, getZoom, nodeData, setCenter, height, isPanelCollapsed, panelLocation]);

  useEffect(() => {
    handleTransform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeData, focusNode]);
  return null;
};

export const SearchPreloader = () => {
  usePreloadOperationsQuery();
  usePreloadConnectorsQuery();
  return null;
};

export const Designer = (props: DesignerProps) => {
  const { backgroundProps, panelLocation, customPanelLocations, displayRuntimeInfo } = props;

  const [nodes, edges, flowSize] = useLayout();
  const isEmpty = useIsGraphEmpty();
  const isReadOnly = useReadOnly();
  const dispatch = useDispatch();
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      dispatch(updateNodeSizes(changes));
    },
    [dispatch]
  );

  const emptyWorkflowPlaceholderNodes = [
    {
      id: 'newWorkflowTrigger',
      position: { x: 0, y: 0 },
      data: { label: 'newWorkflowTrigger' },
      parentNode: undefined,
      type: WORKFLOW_NODE_TYPES.PLACEHOLDER_NODE,
      style: DEFAULT_NODE_SIZE,
    },
  ];

  const nodesWithPlaceholder = !isEmpty ? nodes : isReadOnly ? [] : emptyWorkflowPlaceholderNodes;

  const graph = useSelector((state: RootState) => state.workflow.graph);
  useThrottledEffect(() => dispatch(buildEdgeIdsBySource()), [graph], 200);

  const clampPan = useClampPan();
  const windowDimensions = useWindowDimensions();

  const [zoom, setZoom] = useState(1);

  const translateExtent = useMemo((): [[number, number], [number, number]] => {
    const padding = 64 + 24;
    const [flowWidth, flowHeight] = flowSize;

    const xVal = windowDimensions.width / zoom - padding - DEFAULT_NODE_SIZE.width;
    const yVal = windowDimensions.height / zoom - padding - DEFAULT_NODE_SIZE.height;

    return [
      [-xVal + 32, -yVal],
      [xVal + flowWidth, yVal + flowHeight - 30],
    ];
  }, [flowSize, windowDimensions, zoom]);

  useEffect(() => setLayerHostSelector('#msla-layer-host'), []);
  const KeyboardTransition = createTransition('keydown', (event) => {
    if (!isKeyboardDragTrigger(event as KeyboardEvent)) return false;
    event.preventDefault();
    return true;
  });

  useHotkeys(['meta+shift+p'], (event) => {
    event.preventDefault();
    dispatch(switchToNodeSearchPanel());
  });

  const isMonitoringView = useMonitoringView();
  const DND_OPTIONS: any = {
    backends: [
      {
        id: 'html5',
        backend: HTML5Backend,
        transition: MouseTransition,
      },
      {
        id: 'keyboard',
        backend: KeyboardBackendFactory,
        context: { window, document },
        preview: true,
        transition: KeyboardTransition,
      },
    ],
  };

  const copilotPadding: CSSProperties = {
    marginLeft: props.rightShift,
  };

  return (
    <DndProvider options={DND_OPTIONS}>
      {isMonitoringView || isReadOnly ? null : <SearchPreloader />}
      <div className="msla-designer-canvas msla-panel-mode" style={copilotPadding}>
        <ReactFlowProvider>
          <ReactFlow
            nodeTypes={nodeTypes}
            nodes={nodesWithPlaceholder}
            edges={edges}
            onNodesChange={onNodesChange}
            nodesDraggable={false}
            nodesFocusable={false}
            edgesFocusable={false}
            edgeTypes={edgeTypes}
            panOnScroll={true}
            deleteKeyCode={['Backspace', 'Delete']}
            zoomActivationKeyCode={['Ctrl', 'Meta', 'Alt', 'Control']}
            translateExtent={clampPan ? translateExtent : undefined}
            onMove={(_e, viewport) => setZoom(viewport.zoom)}
            proOptions={{
              account: 'paid-sponsor',
              hideAttribution: true,
            }}
          >
            <PanelRoot
              panelLocation={panelLocation}
              customPanelLocations={customPanelLocations}
              displayRuntimeInfo={displayRuntimeInfo ?? true}
            />
            {backgroundProps ? <Background {...backgroundProps} /> : null}
          </ReactFlow>
          <div className={css('msla-designer-tools', panelLocation === PanelLocation.Left && 'left-panel')} style={copilotPadding}>
            <Controls />
            <Minimap />
          </div>
          <CanvasFinder panelLocation={panelLocation} />
        </ReactFlowProvider>
        <div
          id={'msla-layer-host'}
          style={{
            position: 'absolute',
            inset: '0px',
            visibility: 'hidden',
          }}
        />
      </div>
    </DndProvider>
  );
};
