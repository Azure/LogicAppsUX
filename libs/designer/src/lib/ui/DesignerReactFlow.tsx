import type { Connection, Edge, EdgeTypes, NodeChange, ReactFlowInstance } from '@xyflow/react';
import { BezierEdge, ReactFlow } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  agentOperation,
  containsIdTag,
  customLengthGuid,
  guid,
  removeIdTag,
  WORKFLOW_NODE_TYPES,
  SUBGRAPH_TYPES,
  type WorkflowNodeType,
} from '@microsoft/logic-apps-shared';
import { useDispatch } from 'react-redux';
import { useResizeObserver } from '@react-hookz/web';
import { useIntl } from 'react-intl';

import { useAllAgentIds, useDisconnectedNodes, useIsGraphEmpty, useNodesMetadata } from '../core/state/workflow/workflowSelectors';
import { useNodesInitialized } from '../core/state/operation/operationSelector';
import { setFlowErrors, updateNodeSizes } from '../core/state/workflow/workflowSlice';
import { addOperation, type AppDispatch } from '../core';
import { clearPanel, expandDiscoveryPanel } from '../core/state/panel/panelSlice';
import { addOperationRunAfter, removeOperationRunAfter } from '../core/actions/bjsworkflow/runafter';
import { useClampPan, useIsA2AWorkflow } from '../core/state/designerView/designerViewSelectors';
import { DEFAULT_NODE_SIZE } from '../core/utils/graph';
import { DraftEdge } from './connections/draftEdge';
import { useReadOnly } from '../core/state/designerOptions/designerOptionsSelectors';
import { useLayout } from '../core/graphlayout';
import { DesignerFlowViewPadding } from '../core/utils/designerLayoutHelpers';
import { addAgentHandoff } from '../core/actions/bjsworkflow/handoff';

import GraphNode from './CustomNodes/GraphContainerNode';
import HiddenNode from './CustomNodes/HiddenNode';
import OperationNode from './CustomNodes/OperationCardNode';
import PlaceholderNode from './CustomNodes/PlaceholderNode';
import CollapsedNode from './CustomNodes/CollapsedCardNode';
import ScopeCardNode from './CustomNodes/ScopeCardNode';
import SubgraphCardNode from './CustomNodes/SubgraphCardNode';
import ButtonEdge from './connections/edge';
import HandoffEdge from './connections/handoffEdge';
import HiddenEdge from './connections/hiddenEdge';

const DesignerReactFlow = (props: any) => {
  const { canvasRef } = props;

  const dispatch = useDispatch<AppDispatch>();
  const isInitialized = useNodesInitialized();

  const nodesMetadata = useNodesMetadata();

  // Dynamic node type mapping that considers both node type and subgraph type
  const getNodeComponent = useCallback((nodeType: WorkflowNodeType, nodeId?: string) => {
    // For SUBGRAPH_NODE, check the subgraph type to determine component
    if (nodeType === 'SUBGRAPH_NODE' && nodeId) {
      const nodeMetadata = nodesMetadata[nodeId];
      const subgraphType = nodeMetadata?.subgraphType;
      
      // Use different components based on subgraph type
      switch (subgraphType) {
        case SUBGRAPH_TYPES.MCP_CLIENT:
          return OperationNode;
        case SUBGRAPH_TYPES.AGENT_CONDITION:
        default:
          return GraphNode; // Default subgraph rendering
      }
    }
    
    // Default static mapping for non-subgraph nodes
    const staticMapping: Partial<Record<WorkflowNodeType, React.ComponentType<any>>> = {
      OPERATION_NODE: OperationNode,
      GRAPH_NODE: GraphNode,
      SUBGRAPH_NODE: GraphNode, // Fallback, should be handled above
      SCOPE_CARD_NODE: ScopeCardNode,
      SUBGRAPH_CARD_NODE: SubgraphCardNode,
      HIDDEN_NODE: HiddenNode,
      PLACEHOLDER_NODE: PlaceholderNode,
      COLLAPSED_NODE: CollapsedNode,
    };
    
    return staticMapping[nodeType];
  }, [nodesMetadata]);

  // Create nodeTypes object for ReactFlow
  type NodeTypesObj = Partial<Record<WorkflowNodeType, React.ComponentType<any>>>;
  const nodeTypes: NodeTypesObj = useMemo(() => {
    return {
      OPERATION_NODE: OperationNode,
      GRAPH_NODE: GraphNode,
      SUBGRAPH_NODE: (props: any) => {
        const Component = getNodeComponent('SUBGRAPH_NODE', props.id);
        return Component ? <Component {...props} /> : <GraphNode {...props} />;
      },
      SCOPE_CARD_NODE: ScopeCardNode,
      SUBGRAPH_CARD_NODE: SubgraphCardNode,
      HIDDEN_NODE: HiddenNode,
      PLACEHOLDER_NODE: PlaceholderNode,
      COLLAPSED_NODE: CollapsedNode,
    };
  }, [getNodeComponent]);

  const edgeTypes = {
    BUTTON_EDGE: ButtonEdge,
    HEADING_EDGE: ButtonEdge,
    HANDOFF_EDGE: HandoffEdge,
    ONLY_EDGE: BezierEdge, // Setting it as default React Flow Edge, can be changed as needed
    HIDDEN_EDGE: HiddenEdge,
  } as EdgeTypes;

  const [nodes, edges, flowSize] = useLayout();

  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [containerDimensions, setContainerDimensions] = useState(canvasRef.current?.getBoundingClientRect() ?? { width: 0, height: 0 });

  // Ensure the container dimensions are set
  useEffect(() => {
    setContainerDimensions(canvasRef.current?.getBoundingClientRect() ?? { width: 0, height: 0 });
  }, [canvasRef]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
  }, []);

  const hasFitViewRun = useRef(false);

  // Fit view to nodes on initial load
  useEffect(() => {
    if (containerDimensions.width === 0 || containerDimensions.height === 0) {
      return;
    }

    if (!hasFitViewRun.current && nodes.length > 0 && reactFlowInstance && isInitialized) {
      requestAnimationFrame(() => {
        const defaultZoom = 1.0;
        const topNode = nodes.reduce((top, node) => (node.position.y < top.position.y ? node : top));

        const centerX = containerDimensions.width / 2;
        const topPadding = 120;

        reactFlowInstance.setViewport({
          x: centerX - (topNode.position.x + (topNode.width || DEFAULT_NODE_SIZE.width) / 2) * defaultZoom,
          y: topPadding - topNode.position.y * defaultZoom,
          zoom: defaultZoom,
        });

        hasFitViewRun.current = true;
      });
    }
  }, [nodes, reactFlowInstance, isInitialized, containerDimensions]);

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
      parentId: undefined,
      type: WORKFLOW_NODE_TYPES.PLACEHOLDER_NODE,
      style: DEFAULT_NODE_SIZE,
    },
  ];

  const isReadOnly = useReadOnly();
  const isEmpty = useIsGraphEmpty();

  const nodesWithPlaceholder = isEmpty ? (isReadOnly ? [] : emptyWorkflowPlaceholderNodes) : nodes;

  const clampPan = useClampPan();

  useResizeObserver(canvasRef, (el) => setContainerDimensions(el.contentRect));

  const [zoom, setZoom] = useState(1);

  const translateExtent = useMemo((): [[number, number], [number, number]] => {
    if (containerDimensions.width === 0 || containerDimensions.height === 0) {
      return [
        [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
        [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
      ];
    }

    const padding = DesignerFlowViewPadding;
    const [flowWidth, flowHeight] = flowSize;

    const xVal = containerDimensions.width / zoom - padding - DEFAULT_NODE_SIZE.width;
    const yVal = containerDimensions.height / zoom - padding - DEFAULT_NODE_SIZE.height;

    return [
      [-xVal, -yVal],
      [xVal + flowWidth, yVal + flowHeight - 30],
    ];
  }, [flowSize, containerDimensions, zoom]);

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

  const isA2AWorkflow = useIsA2AWorkflow();
  const allAgentIds = useAllAgentIds();

  const [isDraggingConnection, setIsDraggingConnection] = useState(false);

  const onConnectStart = useCallback(() => setIsDraggingConnection(true), []);

  const onConnectEnd = useCallback(
    (event: any, connectionState: any) => {
      const { isValid, fromNode, toNode } = connectionState;
      const parentId = containsIdTag(fromNode?.id) ? removeIdTag(fromNode?.id) : fromNode?.id;
      const targetId = containsIdTag(toNode?.id) ? removeIdTag(toNode?.id) : toNode?.id;

      setIsDraggingConnection(false);

      if (parentId === targetId) {
        // Prevent self-connection
        return;
      }

      if (isValid && parentId && targetId) {
        // In A2A, create a handoff edge if both nodes are agents
        if (isA2AWorkflow && allAgentIds.includes(parentId) && allAgentIds.includes(targetId)) {
          dispatch(
            addAgentHandoff({
              sourceId: parentId,
              targetId,
            })
          );
          return;
        }
        // Not in A2A, create a run-after edge
        dispatch(
          addOperationRunAfter({
            parentOperationId: parentId,
            childOperationId: targetId,
          })
        );
        return;
      }

      const targetIsPane = event.target.classList.contains('react-flow__pane');
      // Dropping onto pane
      if (targetIsPane && parentId) {
        setIsDraggingConnection(true); // Prevent clicks on the pane from clearing the panel
        const newId = guid();
        const relationshipIds = {
          graphId: nodesMetadata[parentId]?.graphId ?? '',
          parentId,
          childId: undefined,
        };

        // Add an agent if connecting from an agent in A2A
        if (isA2AWorkflow && allAgentIds.includes(parentId)) {
          const newAgentId = `Agent_${customLengthGuid(4)}`;
          dispatch(addOperation({ nodeId: newAgentId, relationshipIds, operation: agentOperation }));
          // Remove the connecting edge and replace it with a handoff
          dispatch(
            removeOperationRunAfter({
              parentOperationId: parentId,
              childOperationId: newAgentId,
            })
          );
          dispatch(
            addAgentHandoff({
              sourceId: parentId,
              targetId: newAgentId,
            })
          );
        } else {
          dispatch(
            expandDiscoveryPanel({
              nodeId: newId,
              relationshipIds,
              isParallelBranch: true,
            })
          );
        }
      }
    },
    [nodesMetadata, dispatch, isA2AWorkflow, allAgentIds]
  );

  const isValidConnection = useCallback(
    (connection: Edge | Connection): boolean => {
      if (!connection.source || !connection.target) {
        return false;
      }

      const sourceId = containsIdTag(connection.source) ? removeIdTag(connection.source) : connection.source;
      const targetId = containsIdTag(connection.target) ? removeIdTag(connection.target) : connection.target;
      // Prevent self-connection
      if (sourceId === targetId) {
        return false;
      }
      // Edge already exists
      if (edges.some((edge) => edge.source === sourceId && edge.target === targetId)) {
        return false;
      }
      return true;
    },
    [edges]
  );

  const intl = useIntl();
  const disconnectedNodeErrorMessage = intl.formatMessage({
    defaultMessage: 'Action is unreachable in flow structure',
    id: 'KmW31k',
    description: 'Error message for disconnected nodes',
  });
  const disconnectedNodes = useDisconnectedNodes();

  useEffect(() => {
    const errors: Record<string, string[]> = {};
    if (disconnectedNodes.length > 0) {
      for (const nodeId of disconnectedNodes) {
        errors[nodeId] = [disconnectedNodeErrorMessage];
      }
    }
    dispatch(setFlowErrors({ flowErrors: errors }));
  }, [disconnectedNodes, dispatch]);

  const onPaneClick = useCallback(() => {
    if (isDraggingConnection) {
      setIsDraggingConnection(false);
    } else {
      dispatch(clearPanel());
    }
  }, [isDraggingConnection, dispatch]);

  return (
    <ReactFlow
      ref={canvasRef}
      onInit={onInit}
      nodeTypes={nodeTypes}
      nodes={nodesWithPlaceholder}
      edges={edges}
      onNodesChange={onNodesChange}
      nodesConnectable={true}
      nodesDraggable={false}
      nodesFocusable={false}
      edgesFocusable={false}
      edgeTypes={edgeTypes}
      elementsSelectable={false}
      panOnScroll={true}
      deleteKeyCode={['Backspace', 'Delete']}
      zoomActivationKeyCode={['Ctrl', 'Meta', 'Alt', 'Control']}
      translateExtent={clampPan ? translateExtent : undefined}
      onMove={(_e, viewport) => setZoom(viewport.zoom)}
      connectionLineComponent={DraftEdge}
      onConnectStart={onConnectStart}
      onConnectEnd={onConnectEnd}
      isValidConnection={isValidConnection}
      connectionRadius={0}
      minZoom={0.05}
      onPaneClick={onPaneClick}
      disableKeyboardA11y={true}
      onlyRenderVisibleElements={!userInferredTabNavigation}
      proOptions={{
        account: 'paid-sponsor',
        hideAttribution: true,
      }}
    >
      {props.children}
    </ReactFlow>
  );
};

export default DesignerReactFlow;
