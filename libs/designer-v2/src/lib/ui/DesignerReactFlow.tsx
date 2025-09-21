import type { Connection, Edge, EdgeTypes, NodeChange, NodeDimensionChange, NodePositionChange, ReactFlowInstance, XYPosition } from '@xyflow/react';
import { applyNodeChanges, BezierEdge, ReactFlow, useReactFlow } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { containsIdTag, guid, removeIdTag, WORKFLOW_EDGE_TYPES, WORKFLOW_NODE_TYPES, type WorkflowNodeType } from '@microsoft/logic-apps-shared';
import { useDispatch } from 'react-redux';
import { useDebouncedEffect, useResizeObserver } from '@react-hookz/web';
import { useIntl } from 'react-intl';

import { useAllAgentIds, useDisconnectedNodes, useIsGraphEmpty, useNodesMetadata } from '../core/state/workflow/workflowSelectors';
import { useNodesInitialized } from '../core/state/operation/operationSelector';
import { setFlowErrors, updateNodePositions, updateNodeSizes } from '../core/state/workflow/workflowSlice';
import type { AppDispatch } from '../core';
import { clearPanel, expandDiscoveryPanel } from '../core/state/panel/panelSlice';
import { addOperationRunAfter } from '../core/actions/bjsworkflow/runafter';
import { useIsA2AWorkflow } from '../core/state/designerView/designerViewSelectors';
import { DEFAULT_NODE_ORIGIN, DEFAULT_NODE_SIZE, getNewNodePosition } from '../core/utils/graph';
import { DraftEdge } from './connections/draftEdge';
import { useReadOnly } from '../core/state/designerOptions/designerOptionsSelectors';
import { useUserLayout } from '../core/graphlayout';
import { addAgentHandoff } from '../core/actions/bjsworkflow/handoff';
import { setNodeContextMenuData } from '../core/state/designerView/designerViewSlice';
import { useDiscoveryPanelNewNodePosition, useDiscoveryPanelRelationshipIds } from '../core/state/panel/panelSelectors';

import GraphNode from './CustomNodes/GraphContainerNode';
import HiddenNode from './CustomNodes/HiddenNode';
import OperationNode from './CustomNodes/OperationCardNode';
import PlaceholderNode from './CustomNodes/PlaceholderNode';
import GhostNode from './CustomNodes/GhostNode';
import CollapsedNode from './CustomNodes/CollapsedCardNode';
import ScopeCardNode from './CustomNodes/ScopeCardNode';
import SubgraphCardNode from './CustomNodes/SubgraphCardNode';
import ButtonEdge from './connections/edge';
import HandoffEdge from './connections/handoffEdge';
import HiddenEdge from './connections/hiddenEdge';
import isEqual from 'lodash.isequal';


const DesignerReactFlow = (props: any) => {
  const { canvasRef } = props;

  const dispatch = useDispatch<AppDispatch>();
  const isInitialized = useNodesInitialized();

  type NodeTypesObj = Record<WorkflowNodeType, React.ComponentType<any>>;
  const nodeTypes: NodeTypesObj = {
    OPERATION_NODE: OperationNode,
    GRAPH_NODE: GraphNode,
    SUBGRAPH_NODE: GraphNode,
    SCOPE_CARD_NODE: ScopeCardNode,
    SUBGRAPH_CARD_NODE: SubgraphCardNode,
    HIDDEN_NODE: HiddenNode,
    PLACEHOLDER_NODE: PlaceholderNode,
    GHOST_NODE: GhostNode,
    COLLAPSED_NODE: CollapsedNode,
  };

  const edgeTypes = {
    BUTTON_EDGE: ButtonEdge,
    HEADING_EDGE: ButtonEdge,
    HANDOFF_EDGE: HandoffEdge,
    ONLY_EDGE: BezierEdge, // Setting it as default React Flow Edge, can be changed as needed
    HIDDEN_EDGE: HiddenEdge,
  } as EdgeTypes;

  const { screenToFlowPosition, getNode } = useReactFlow();

  const { nodes, edges } = useUserLayout();

  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [containerDimensions, setContainerDimensions] = useState(canvasRef.current?.getBoundingClientRect() ?? { width: 0, height: 0 });

  const nodesMetadata = useNodesMetadata();

  const onInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
  }, []);

  const hasFitView = useRef(false);

  // Fits view on initialization
  useEffect(() => {
    if (!hasFitView.current && nodes.length > 0 && reactFlowInstance && isInitialized) {
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

        hasFitView.current = true;
      });
    }
  }, [nodes, reactFlowInstance, isInitialized, containerDimensions]);

  const [nodePositions, setNodePositions] = useState<Record<string, XYPosition> | undefined>({});

  const newNodeRelationshipIds = useDiscoveryPanelRelationshipIds();
  const newNodePosition = useDiscoveryPanelNewNodePosition();

  const nodesWithPositions = useMemo(() => nodes.map((n) => ({
    ...n,
    position: {...(
      nodePositions?.[n.id]
      ?? nodesMetadata[n.id]?.actionMetadata?.position
      ?? n.position
      ?? { x: 0, y: 0 }
    )},
    origin: DEFAULT_NODE_ORIGIN,
    data: {
      ...n.data,
      childIds: [
        ...((n?.data as any)?.childIds ?? []),
        ...(newNodeRelationshipIds?.graphId === n.id && newNodePosition ? ['newNodeGhostNode'] : []),
      ],
    },
  })), [nodes, nodePositions, nodesMetadata, newNodeRelationshipIds?.graphId, newNodePosition]);

  const emptyWorkflowPlaceholderNodes = useMemo(() => [
    {
      id: 'newWorkflowTrigger',
      position: { x: 0, y: 0 },
      data: { label: 'newWorkflowTrigger' },
      parentId: undefined,
      type: WORKFLOW_NODE_TYPES.PLACEHOLDER_NODE,
      style: DEFAULT_NODE_SIZE,
    },
  ], []);

  const newNodeGhostNode = useMemo(() => (
    newNodePosition ? {
      id: 'newNodeGhostNode',
      position: getNewNodePosition(newNodePosition),
      data: {
        label: 'newNodeGhostNode',
        childIds: [],
      },
      parentId: newNodeRelationshipIds?.graphId,
      type: WORKFLOW_NODE_TYPES.GHOST_NODE,
      origin: DEFAULT_NODE_ORIGIN,
      expandParent: true,
    } : undefined),
    [newNodePosition, newNodeRelationshipIds?.graphId]
  );

  const newNodeGhostEdge = useMemo(() => newNodePosition ? {
    id: 'newNodeGhostEdge',
    source: newNodeRelationshipIds?.parentId ?? '',
    target: 'newNodeGhostNode',
    type: WORKFLOW_EDGE_TYPES.ONLY_EDGE,
  } : undefined, [newNodePosition, newNodeRelationshipIds?.parentId]);

  const [lastChanges, setLastChanges] = useState<NodeChange[] | null>(null);

  const handleSizeChanges = useCallback((changes: NodeChange[]) => {
    const validChanges = changes.filter(
      (change) =>
        change.type === 'dimensions' &&
        change?.id &&
        change?.dimensions &&
        change?.setAttributes && 
        !Number.isNaN(change?.dimensions.width) &&
        !Number.isNaN(change?.dimensions.height)
    ) as NodeDimensionChange[];
    if (validChanges.length === 0) {
      return;
    }

    dispatch(updateNodeSizes(validChanges));
  }, [dispatch]);

  const handlePositionChanges = useCallback((changes: NodeChange[]) => {
    const validChanges = changes.filter(
      (change) =>
        change.type === 'position' &&
        change?.id &&
        change?.position &&
        !Number.isNaN(change?.position.x) &&
        !Number.isNaN(change?.position.y)
    ) as NodePositionChange[];
    if (validChanges.length === 0) {
      return;
    }

    setNodePositions((positions) => {
      const newPositions = { ...positions };
      validChanges.forEach((change) => {
        if (change?.dragging && change.id.endsWith('-#scope')) {
          const scopeParentId = change.id.replace('-#scope', '');
          const headerCurrentPosition = nodesWithPositions.find((n) => n.id === change.id)?.position;
          const diff = {
            x: change.position!.x - headerCurrentPosition!.x,
            y: change.position!.y - headerCurrentPosition!.y,
          }
          const parentCurrentPosition = nodesWithPositions.find((n) => n.id === scopeParentId)?.position;
          newPositions[scopeParentId] = {
            x: parentCurrentPosition!.x + diff.x,
            y: parentCurrentPosition!.y + diff.y,
          };

          if (nodesMetadata[scopeParentId]?.graphId !== 'root') {
            if (newPositions[scopeParentId].y < 0) {
              newPositions[scopeParentId].y = 0;
            }
          }

        } else {
          newPositions[change.id] = change.position!;

          if (nodesMetadata[change.id]?.graphId !== 'root') {
            if (newPositions[change.id].y < 0) {
              newPositions[change.id].y = 0;
            }
          }
        }
      });
      return newPositions;
    });
  }, [nodesWithPositions, nodesMetadata]);

  // Update redux on debounced node position changes
  useDebouncedEffect(
    () => {
      if (nodePositions && Object.keys(nodePositions).length > 0) {
        dispatch(updateNodePositions({positions: nodePositions}));
        // Clear local positions after dispatching to redux
        setNodePositions({});
      }
    },
    [nodePositions, dispatch],
    500
  );

  const isReadOnly = useReadOnly();
  const isEmpty = useIsGraphEmpty();

  const nodesWithExtras = useMemo(() => {
    if (isEmpty) {
      return isReadOnly ? [] : emptyWorkflowPlaceholderNodes
    }

    const tempNodes = [...nodesWithPositions];
    if (newNodeGhostNode) {
      tempNodes.push(newNodeGhostNode);
    }
    return tempNodes
  }, [isEmpty, nodesWithPositions, newNodeGhostNode, isReadOnly, emptyWorkflowPlaceholderNodes]);

  const edgesWithExtras = useMemo(() => {
    if (isEmpty) {
      return [];
    }
    const tempEdges = [...edges];
    if (newNodeGhostEdge) {
      tempEdges.push(newNodeGhostEdge);
    }
    return tempEdges;
  }, [isEmpty, edges, newNodeGhostEdge]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    if (isEqual(lastChanges, changes)) {
      return;
    }
    setLastChanges(changes);

    handleSizeChanges(changes);
    handlePositionChanges(changes);
  }, [handlePositionChanges, handleSizeChanges, lastChanges]);

  useResizeObserver(canvasRef, (el) => setContainerDimensions(el.contentRect));

  const [_zoom, setZoom] = useState(1);

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

      if (parentId === targetId) {
        // Prevent self-connection
        setIsDraggingConnection(false);
        return;
      }

      const targetIsPane = event.target.classList.contains('react-flow__pane');
      if (targetIsPane && parentId) {
        const newId = guid();
        const relationshipIds = {
          graphId: nodesMetadata[parentId]?.graphId ?? '',
          parentId,
          childId: undefined,
        };
        const clickPos = 'changedTouches' in event ? event.changedTouches[0] : event;
        const flowPosition = screenToFlowPosition({ x: clickPos.clientX, y: clickPos.clientY });
        const parentOffset = getNode(relationshipIds?.graphId)?.position;
        const newNodePosition = parentOffset ? { 
          x: flowPosition.x - parentOffset.x,
          y: flowPosition.y - parentOffset.y
        } : flowPosition;

        dispatch(
          expandDiscoveryPanel({
            nodeId: newId,
            relationshipIds,
            isParallelBranch: true,
            newNodePosition,
          })
        );
      } else {
        setIsDraggingConnection(false);
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
        } else {
          dispatch(
            addOperationRunAfter({
              parentOperationId: parentId,
              childOperationId: targetId,
            })
          );
        }
      }
    },
    [nodesMetadata, screenToFlowPosition, getNode, dispatch, isA2AWorkflow, allAgentIds]
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
      if (edgesWithExtras.some((edge) => edge.source === sourceId && edge.target === targetId)) {
        return false;
      }
      return true;
    },
    [edgesWithExtras]
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
  }, [disconnectedNodeErrorMessage, disconnectedNodes, dispatch]);

  const onPaneClick = useCallback(() => {
    if (isDraggingConnection) {
      setIsDraggingConnection(false);
    } else {
      dispatch(clearPanel());
    }
  }, [isDraggingConnection, dispatch]);

  const onPaneContextMenu = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      e.preventDefault();
      dispatch(
        setNodeContextMenuData({
          location: {
            x: e.clientX,
            y: e.clientY,
          },
        })
      );
    },
    [dispatch]
  );

  return (
    <ReactFlow
      ref={canvasRef}
      onInit={onInit}
      nodeTypes={nodeTypes}
      nodes={nodesWithExtras}
      edges={edgesWithExtras}
      onNodesChange={onNodesChange}
      nodesConnectable={true}
      edgesFocusable={false}
      edgeTypes={edgeTypes}
      elementsSelectable={false}
      panOnScroll={true}
      deleteKeyCode={['Backspace', 'Delete']}
      zoomActivationKeyCode={['Ctrl', 'Meta', 'Alt', 'Control']}
      onMove={(_e, viewport) => setZoom(viewport.zoom)}
      connectionLineComponent={DraftEdge}
      onConnectStart={onConnectStart}
      onConnectEnd={onConnectEnd}
      isValidConnection={isValidConnection}
      connectionRadius={0}
      minZoom={0.05}
      snapGrid={[20, 20]}
      snapToGrid={true}
      onPaneClick={onPaneClick}
      onPaneContextMenu={onPaneContextMenu}
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
