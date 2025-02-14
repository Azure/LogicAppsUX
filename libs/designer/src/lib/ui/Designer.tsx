import { openPanel, useNodesInitialized } from '../core';
import { useLayout } from '../core/graphlayout';
import { usePreloadOperationsQuery, usePreloadConnectorsQuery } from '../core/queries/browse';
import { useMonitoringView, useReadOnly, useHostOptions, useIsVSCode } from '../core/state/designerOptions/designerOptionsSelectors';
import { useClampPan } from '../core/state/designerView/designerViewSelectors';
import { clearPanel } from '../core/state/panel/panelSlice';
import { useIsGraphEmpty } from '../core/state/workflow/workflowSelectors';
import { buildEdgeIdsBySource, updateNodeSizes } from '../core/state/workflow/workflowSlice';
import type { AppDispatch, RootState } from '../core/store';
import { DEFAULT_NODE_SIZE } from '../core/utils/graph';
import Controls from './Controls';
import GraphNode from './CustomNodes/GraphContainerNode';
import HiddenNode from './CustomNodes/HiddenNode';
import OperationNode from './CustomNodes/OperationCardNode';
import PlaceholderNode from './CustomNodes/PlaceholderNode';
import CollapsedNode from './CustomNodes/CollapsedCardNode';
import ScopeCardNode from './CustomNodes/ScopeCardNode';
import SubgraphCardNode from './CustomNodes/SubgraphCardNode';
import Minimap from './Minimap';
import DeleteModal from './common/DeleteModal/DeleteModal';
import ButtonEdge from './connections/edge';
import HiddenEdge from './connections/hiddenEdge';
import { PanelRoot } from './panel/panelRoot';
import { css, setLayerHostSelector } from '@fluentui/react';
import { PanelLocation } from '@microsoft/designer-ui';
import type { CustomPanelLocation } from '@microsoft/designer-ui';
// import type { WorkflowNodeType } from '@microsoft/logic-apps-shared';
import { WORKFLOW_NODE_TYPES, useThrottledEffect } from '@microsoft/logic-apps-shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import KeyboardBackendFactory, { isKeyboardDragTrigger } from 'react-dnd-accessible-backend';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider, createTransition, MouseTransition } from 'react-dnd-multi-backend';
import { useHotkeys } from 'react-hotkeys-hook';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { Background, ReactFlow, ReactFlowProvider, BezierEdge } from '@xyflow/react';
import type { BackgroundProps, EdgeTypes, NodeChange } from '@xyflow/react';
import { PerformanceDebugTool } from './common/PerformanceDebug/PerformanceDebug';
import { CanvasFinder } from './CanvasFinder';
import { DesignerContextualMenu } from './common/DesignerContextualMenu/DesignerContextualMenu';
import { EdgeContextualMenu } from './common/EdgeContextualMenu/EdgeContextualMenu';
import { DragPanMonitor } from './common/DragPanMonitor/DragPanMonitor';
import { CanvasSizeMonitor } from './CanvasSizeMonitor';
import { useResizeObserver } from '@react-hookz/web';

export interface DesignerProps {
  backgroundProps?: BackgroundProps;
  panelLocation?: PanelLocation;
  customPanelLocations?: CustomPanelLocation[];
  displayRuntimeInfo?: boolean;
}

type NodeTypesObj = any;
const nodeTypes: NodeTypesObj = {
  OPERATION_NODE: OperationNode,
  GRAPH_NODE: GraphNode,
  SUBGRAPH_NODE: GraphNode,
  SCOPE_CARD_NODE: ScopeCardNode,
  SUBGRAPH_CARD_NODE: SubgraphCardNode,
  HIDDEN_NODE: HiddenNode,
  PLACEHOLDER_NODE: PlaceholderNode,
  COLLAPSED_NODE: CollapsedNode,
};

const edgeTypes = {
  BUTTON_EDGE: ButtonEdge,
  HEADING_EDGE: ButtonEdge, // This is functionally the same as a button edge
  ONLY_EDGE: BezierEdge, // Setting it as default React Flow Edge, can be changed as needed
  HIDDEN_EDGE: HiddenEdge,
} as EdgeTypes;

export const SearchPreloader = () => {
  usePreloadOperationsQuery();
  usePreloadConnectorsQuery();
  return null;
};

export const Designer = (props: DesignerProps) => {
  const { backgroundProps, panelLocation = PanelLocation.Right, customPanelLocations } = props;

  const [nodes, edges, flowSize] = useLayout();
  const isEmpty = useIsGraphEmpty();
  const isVSCode = useIsVSCode();
  const isReadOnly = useReadOnly();
  const dispatch = useDispatch<AppDispatch>();
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      dispatch(updateNodeSizes(changes));
    },
    [dispatch]
  );

  const designerContainerRef = useRef<HTMLDivElement>(null);

  const emptyWorkflowPlaceholderNodes = [
    {
      id: 'newWorkflowTrigger',
      position: { x: 0, y: 0 },
      data: { label: 'newWorkflowTrigger' },
      parentId: undefined,
      type: WORKFLOW_NODE_TYPES.PLACEHOLDER_NODE,
      style: DEFAULT_NODE_SIZE,
    },
  ];

  const nodesWithPlaceholder = isEmpty ? (isReadOnly ? [] : emptyWorkflowPlaceholderNodes) : nodes;

  const graph = useSelector((state: RootState) => state.workflow.graph);
  useThrottledEffect(() => dispatch(buildEdgeIdsBySource()), [graph], 200);

  const clampPan = useClampPan();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimentions] = useState(canvasRef.current?.getBoundingClientRect() ?? { width: 0, height: 0 });
  useResizeObserver(canvasRef, (el) => setContainerDimentions(el.contentRect));

  const [zoom, setZoom] = useState(1);

  const translateExtent = useMemo((): [[number, number], [number, number]] => {
    const padding = 64;
    const [flowWidth, flowHeight] = flowSize;

    const xVal = containerDimensions.width / zoom - padding - DEFAULT_NODE_SIZE.width;
    const yVal = containerDimensions.height / zoom - padding - DEFAULT_NODE_SIZE.height;

    return [
      [-xVal, -yVal],
      [xVal + flowWidth, yVal + flowHeight - 30],
    ];
  }, [flowSize, containerDimensions, zoom]);

  useEffect(() => setLayerHostSelector('#msla-layer-host'), []);
  const KeyboardTransition = createTransition('keydown', (event) => {
    if (!isKeyboardDragTrigger(event as KeyboardEvent)) {
      return false;
    }
    event.preventDefault();
    return true;
  });

  useHotkeys(
    ['meta+shift+p', 'ctrl+shift+p'],
    (event) => {
      event.preventDefault();
      dispatch(openPanel({ panelMode: 'NodeSearch' }));
    },
    { enabled: !isVSCode }
  );

  useHotkeys(
    ['meta+alt+p', 'ctrl+alt+p', 'meta+option+p', 'ctrl+option+p'],
    (event) => {
      event.preventDefault();
      dispatch(openPanel({ panelMode: 'NodeSearch' }));
    },
    { enabled: isVSCode }
  );

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

  const isInitialized = useNodesInitialized();
  const preloadSearch = useMemo(() => !(isMonitoringView || isReadOnly) && isInitialized, [isMonitoringView, isReadOnly, isInitialized]);

  // Adding recurrence interval to the query to access outside of functional components
  const recurrenceInterval = useHostOptions().recurrenceInterval;
  useQuery({
    queryKey: ['recurrenceInterval'],
    initialData: recurrenceInterval,
    queryFn: () => {
      return recurrenceInterval ?? null;
    },
  });

  // Adding workflowKind (stateful or stateless) to the query to access outside of functional components
  const workflowKind = useSelector((state: RootState) => state.workflow.workflowKind);
  // This delayes the query until the workflowKind is available
  useQuery({ queryKey: ['workflowKind'], initialData: undefined, enabled: !!workflowKind, queryFn: () => workflowKind });

  // Our "onlyRenderVisibleElements" prop makes offscreen nodes inaccessible to tab navigation.
  // In order to maintain accessibility, we are disabling this prop for tab navigation users
  // We are inferring tab nav users if they press the tab key 5 times within the first 10 seconds
  // This is not exact but should cover most cases
  const [userInferredTabNavigation, setUserInferredTabNavigation] = useState(false);
  useEffect(() => {
    if (!isInitialized) {
      return;
    }
    const tabCountTimeout = 10;
    const tabCountThreshold = 4;
    let tabCount = 0;
    const tabListener = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        tabCount++;
        if (tabCount > tabCountThreshold) {
          document.removeEventListener('keydown', tabListener);
          setUserInferredTabNavigation(true);
        }
      }
    };
    document.addEventListener('keydown', tabListener);
    setTimeout(() => {
      document.removeEventListener('keydown', tabListener);
    }, tabCountTimeout * 1000);
  }, [isInitialized]);

  return (
    <DndProvider options={DND_OPTIONS}>
      {preloadSearch ? <SearchPreloader /> : null}
      <div className="msla-designer-canvas msla-panel-mode" ref={designerContainerRef}>
        <ReactFlowProvider>
          <div style={{ flexGrow: 1 }}>
            <ReactFlow
              ref={canvasRef}
              nodeTypes={nodeTypes}
              nodes={nodesWithPlaceholder}
              edges={edges}
              onNodesChange={onNodesChange}
              nodesConnectable={false}
              nodesDraggable={false}
              nodesFocusable={false}
              edgesFocusable={false}
              edgeTypes={edgeTypes}
              panOnScroll={true}
              deleteKeyCode={['Backspace', 'Delete']}
              zoomActivationKeyCode={['Ctrl', 'Meta', 'Alt', 'Control']}
              translateExtent={clampPan ? translateExtent : undefined}
              onMove={(_e, viewport) => setZoom(viewport.zoom)}
              minZoom={0.05}
              onPaneClick={() => dispatch(clearPanel())}
              disableKeyboardA11y={true}
              onlyRenderVisibleElements={!userInferredTabNavigation}
              proOptions={{
                account: 'paid-sponsor',
                hideAttribution: true,
              }}
            >
              {backgroundProps ? <Background {...backgroundProps} /> : null}
              <DeleteModal />
              <DesignerContextualMenu />
              <EdgeContextualMenu />
            </ReactFlow>
          </div>
          <PanelRoot
            panelContainerRef={designerContainerRef}
            panelLocation={panelLocation}
            customPanelLocations={customPanelLocations}
            isResizeable={true}
          />
          <div className={css('msla-designer-tools', panelLocation === PanelLocation.Left && 'left-panel')}>
            <Controls />
            <Minimap />
          </div>
          <PerformanceDebugTool />
          <CanvasFinder />
          <CanvasSizeMonitor canvasRef={canvasRef} />
          <DragPanMonitor canvasRef={canvasRef} />
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
