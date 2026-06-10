import type {
  Node,
  Connection,
  Edge,
  EdgeTypes,
  NodeChange,
  ReactFlowInstance,
  NodeDimensionChange,
  NodePositionChange,
  XYPosition,
  OnSelectionChangeParams,
} from '@xyflow/react';
import { BezierEdge, ReactFlow, SelectionMode } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  agentOperation,
  containsIdTag,
  customLengthGuid,
  guid,
  removeIdTag,
  WORKFLOW_NODE_TYPES,
  type WorkflowNodeType,
} from '@microsoft/logic-apps-shared';
import { useDispatch } from 'react-redux';
import { useDebouncedEffect, useResizeObserver } from '@react-hookz/web';
import { useIntl } from 'react-intl';

import { useAllAgentIds, useDisconnectedNodes, useIsGraphEmpty, useNodesMetadata } from '../core/state/workflow/workflowSelectors';
import { useNodesInitialized } from '../core/state/operation/operationSelector';
import { setFlowErrors, updateNodeSizes } from '../core/state/workflow/workflowSlice';
import { addOperation, type AppDispatch } from '../core';
import { clearPanel, expandDiscoveryPanel, setNodeSelection } from '../core/state/panel/panelSlice';
import { useOperationPanelSelectedNodeIds } from '../core/state/panel/panelSelectors';
import { addOperationRunAfter, removeOperationRunAfter } from '../core/actions/bjsworkflow/runafter';
import { useClampPan, useIsA2AWorkflow } from '../core/state/designerView/designerViewSelectors';
import { DEFAULT_NODE_SIZE, DEFAULT_NOTE_SIZE } from '../core/utils/graph';
import { DraftEdge } from './connections/draftEdge';
import { useIsDarkMode, useReadOnly } from '../core/state/designerOptions/designerOptionsSelectors';
import { useLayout } from '../core/graphlayout';
import { DesignerFlowViewPadding } from '../core/utils/designerLayoutHelpers';
import { addAgentHandoff } from '../core/actions/bjsworkflow/handoff';
import { setNodeContextMenuData } from '../core/state/designerView/designerViewSlice';
import { useNotes } from '../core/state/notes/notesSelectors';
import { updateNote } from '../core/state/notes/notesSlice';

import GraphNode from './CustomNodes/GraphContainerNode';
import HiddenNode from './CustomNodes/HiddenNode';
import OperationNode from './CustomNodes/OperationCardNode';
import PlaceholderNode from './CustomNodes/PlaceholderNode';
import CollapsedNode from './CustomNodes/CollapsedCardNode';
import ScopeCardNode from './CustomNodes/ScopeCardNode';
import SubgraphCardNode from './CustomNodes/SubgraphCardNode';
import NoteNode from './CustomNodes/NoteNode';
import ButtonEdge from './connections/edge';
import HandoffEdge from './connections/handoffEdge';
import HiddenEdge from './connections/hiddenEdge';

const DesignerReactFlow = (props: any) => {
  const { canvasRef } = props;

  const dispatch = useDispatch<AppDispatch>();
  const isInitialized = useNodesInitialized();

  const isReadOnly = useReadOnly();
  const isEmpty = useIsGraphEmpty();

  type NodeTypesObj = Record<WorkflowNodeType, React.ComponentType<any>>;
  const nodeTypes: NodeTypesObj = {
    OPERATION_NODE: OperationNode,
    GRAPH_NODE: GraphNode,
    SUBGRAPH_NODE: GraphNode,
    SCOPE_CARD_NODE: ScopeCardNode,
    SUBGRAPH_CARD_NODE: SubgraphCardNode,
    HIDDEN_NODE: HiddenNode,
    PLACEHOLDER_NODE: PlaceholderNode,
    COLLAPSED_NODE: CollapsedNode,
    NOTE_NODE: NoteNode,
  };

  const edgeTypes = {
    BUTTON_EDGE: ButtonEdge,
    HEADING_EDGE: ButtonEdge,
    HANDOFF_EDGE: HandoffEdge,
    ONLY_EDGE: BezierEdge, // Setting it as default React Flow Edge, can be changed as needed
    HIDDEN_EDGE: HiddenEdge,
  } as EdgeTypes;

  const [actionNodes, edges, flowSize] = useLayout();

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
    if (!hasFitViewRun.current && actionNodes.length > 0 && reactFlowInstance && isInitialized) {
      requestAnimationFrame(() => {
        const defaultZoom = 1.0;
        const topNode = actionNodes.reduce((top, node) => (node.position.y < top.position.y ? node : top));

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
  }, [actionNodes, reactFlowInstance, isInitialized, containerDimensions]);

  const emptyWorkflowPlaceholderNodes = useMemo(
    () => [
      {
        id: 'newWorkflowTrigger',
        position: { x: 0, y: 0 },
        data: { label: 'newWorkflowTrigger' },
        parentId: undefined,
        type: WORKFLOW_NODE_TYPES.PLACEHOLDER_NODE,
        style: DEFAULT_NODE_SIZE,
      } as Node,
    ],
    []
  );

  /// Position dispatch debounce (Only applicable for notes currently)

  const [nodePositions, setNodePositions] = useState<Record<string, XYPosition> | undefined>(undefined);
  useDebouncedEffect(
    () => {
      if (nodePositions && Object.keys(nodePositions).length > 0) {
        for (const [id, position] of Object.entries(nodePositions)) {
          dispatch(
            updateNote({
              id,
              note: {
                metadata: {
                  position,
                },
              },
            })
          );
        }
        setNodePositions(undefined);
      }
    },
    [dispatch, nodePositions],
    500
  );

  /// Notes as nodes

  const notes = useNotes();
  const noteNodes: Node[] = useMemo(() => {
    return Object.entries(notes).map(
      ([id, note]) =>
        ({
          id,
          type: WORKFLOW_NODE_TYPES.NOTE_NODE,
          position: nodePositions?.[id] ?? note.metadata.position,
          draggable: !isReadOnly,
          dragHandle: '.note-drag-handle',
          measured: {
            width: note.metadata.width ?? DEFAULT_NOTE_SIZE.width,
            height: note.metadata.height ?? DEFAULT_NOTE_SIZE.height,
          },
        }) as Node
    );
  }, [notes, nodePositions, isReadOnly]);

  ///

  // Stamp `selected: true` on nodes that are in the Redux selection so React Flow renders them with
  // their selected visual. Without this, starting a new marquee clears React Flow's internal
  // selection state and the previously-selected nodes lose their highlight.
  const panelSelectedNodeIds = useOperationPanelSelectedNodeIds();
  const allNodes = useMemo(() => {
    const nodesWithPlaceholder = isEmpty ? (isReadOnly ? [] : emptyWorkflowPlaceholderNodes) : actionNodes;
    const selectedSet = new Set(panelSelectedNodeIds);
    return [...nodesWithPlaceholder, ...noteNodes].map((node) => {
      // Only operation and scope card nodes participate in selection (both marquee and click).
      // All other node types (containers, subgraph cards, placeholders, hidden, etc.) must be
      // marked selectable:false so React Flow excludes them from the selection bounding box.
      const isSelectable = node.type === WORKFLOW_NODE_TYPES.OPERATION_NODE || node.type === WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE;
      if (!isSelectable) {
        return node.selected || node.selectable !== false ? { ...node, selected: false, selectable: false } : node;
      }
      return selectedSet.has(node.id) ? { ...node, selected: true } : node.selected ? { ...node, selected: false } : node;
    });
  }, [isEmpty, isReadOnly, emptyWorkflowPlaceholderNodes, actionNodes, noteNodes, panelSelectedNodeIds]);

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

  const nodesMetadata = useNodesMetadata();

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
  }, [disconnectedNodeErrorMessage, disconnectedNodes, dispatch]);

  // Track modifier keys ourselves so we can toggle selectionOnDrag / panOnDrag reliably.
  // React Flow's built-in selectionKeyCode uses key-up/down listeners that can miss events
  // (e.g. key released while window is blurred), causing "sticky" marquee mode.
  const [isSelectionKeyHeld, setIsSelectionKeyHeld] = useState(false);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' || e.key === 'Control') {
        setIsSelectionKeyHeld(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift' || e.key === 'Control') {
        setIsSelectionKeyHeld(false);
      }
    };
    // If the window loses focus while a modifier is held, reset to avoid sticky state.
    const onBlur = () => setIsSelectionKeyHeld(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const onPaneClick = useCallback(() => {
    if (isDraggingConnection) {
      setIsDraggingConnection(false);
    } else {
      dispatch(clearPanel());
    }
  }, [isDraggingConnection, dispatch]);

  // Only action and scope cards participate in box selection; notes, containers, and placeholders
  // are ignored.
  const toSelectableNodeIds = useCallback(
    (nodes: { id: string; type?: string; selected?: boolean }[]): string[] =>
      nodes
        .filter((node) => node.type === WORKFLOW_NODE_TYPES.OPERATION_NODE || node.type === WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE)
        .map((node) => (containsIdTag(node.id) ? removeIdTag(node.id) : node.id)),
    []
  );

  // Marquee selection is committed to redux only when the drag is released — committing on every
  // change is jarring because the panel re-renders continuously while the box is still being drawn.
  //
  // The tricky part is a timing race. react-flow runs here in *controlled* mode (`nodes={allNodes}`)
  // and our `onNodesChange` intentionally ignores `select` changes, so the marquee selection never
  // reaches the `nodes` array (`reactFlowInstance.getNodes()` stays unselected). It only lives in
  // react-flow's internal `nodeLookup`, which is surfaced to us exclusively through
  // `onSelectionChange` (`params.nodes`). That callback is delivered via a deferred store
  // subscription, so on a quick release it can fire *after* `onSelectionEnd`.
  //
  // To be robust we commit from whichever of the two fires last:
  //   - slow release: the final `onSelectionChange` arrives during the drag, then `onSelectionEnd`
  //     commits from the ref.
  //   - quick release: `onSelectionEnd` runs first (ref possibly stale/empty), then the deferred
  //     `onSelectionChange` arrives after the drag has ended and commits the final set.
  const pendingBoxSelectionRef = useRef<string[]>([]);
  const isBoxSelectingRef = useRef(false);
  const lastCommittedSelectionRef = useRef('');

  // Additive marquee: track the current redux selection and snapshot it when a marquee begins.
  const currentSelectionRef = useRef<string[]>([]);
  useEffect(() => {
    currentSelectionRef.current = panelSelectedNodeIds;
  }, [panelSelectedNodeIds]);
  const selectionAtMarqueeStartRef = useRef<string[] | null>(null);

  const commitBoxSelection = useCallback(
    (ids: string[]) => {
      const snapshot = selectionAtMarqueeStartRef.current;
      let finalIds: string[];
      if (snapshot !== null) {
        selectionAtMarqueeStartRef.current = null;
        if (ids.length === 0) {
          // Shift-click on empty space with nothing marquee'd: clear the selection.
          lastCommittedSelectionRef.current = '';
          dispatch(clearPanel());
          return;
        }
        // Toggle: if ALL marquee'd nodes were already selected, deselect them; otherwise add all.
        const allAlreadySelected = ids.every((id) => snapshot.includes(id));
        if (allAlreadySelected) {
          finalIds = snapshot.filter((id) => !ids.includes(id));
        } else {
          finalIds = [...new Set([...snapshot, ...ids])];
        }
      } else {
        finalIds = ids;
      }

      if (finalIds.length === 0) {
        lastCommittedSelectionRef.current = '';
        dispatch(clearPanel());
        return;
      }
      const key = [...finalIds].sort().join('|');
      if (key === lastCommittedSelectionRef.current) {
        return;
      }
      lastCommittedSelectionRef.current = key;
      dispatch(setNodeSelection(finalIds));
    },
    [dispatch]
  );

  // Track whether a box-selection gesture has occurred so we can ignore spurious
  // onSelectionChange calls caused by single-click node selection.  Without this guard,
  // clicking a node whose type is not in `toSelectableNodeIds` (e.g. SUBGRAPH_CARD_NODE)
  // produces an empty id list which races with the node's own `changePanelNode` dispatch
  // and clears the panel.
  const hasBoxSelectedRef = useRef(false);

  const onSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      const ids = toSelectableNodeIds(params?.nodes ?? []);
      pendingBoxSelectionRef.current = ids;

      // Only commit if a box-selection gesture is active or has just ended.  Single-click
      // selections also fire onSelectionChange but should be handled by the individual node
      // click handlers, not the box-selection pipeline.
      if (!hasBoxSelectedRef.current) {
        return;
      }

      // If the marquee has already ended, this is the deferred final flush — commit it now. During
      // the drag we hold off so the panel doesn't thrash while the box is still being drawn.
      if (!isBoxSelectingRef.current) {
        commitBoxSelection(ids);
      }
    },
    [toSelectableNodeIds, commitBoxSelection]
  );

  // Reset tracking when a new marquee begins. Without clearing the ref, a fresh marquee that selects
  // nothing won't fire onSelectionChange, leaving the ref holding the previous marquee's ids — which
  // would then be wrongly re-committed.
  const onSelectionStart = useCallback(() => {
    isBoxSelectingRef.current = true;
    hasBoxSelectedRef.current = true;
    pendingBoxSelectionRef.current = [];
    lastCommittedSelectionRef.current = '';
    selectionAtMarqueeStartRef.current = [...currentSelectionRef.current];
  }, []);

  const onSelectionEnd = useCallback(() => {
    isBoxSelectingRef.current = false;
    // Commit what we have. If the final onSelectionChange hasn't flushed yet (quick release), the
    // ref may be stale/empty here — the deferred onSelectionChange will then commit the final set.
    commitBoxSelection(pendingBoxSelectionRef.current);
    // Allow one more deferred onSelectionChange flush, then stop listening until the next marquee.
    requestAnimationFrame(() => {
      hasBoxSelectedRef.current = false;
    });
  }, [commitBoxSelection]);

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

  // Handle node changes (position, size)

  const handSizeChanges = useCallback(
    (changes: NodeChange[]) => {
      const validChanges = changes.filter(
        (change) =>
          change.type === 'dimensions' &&
          change?.id &&
          change?.dimensions &&
          !Number.isNaN(change.dimensions.width) &&
          !Number.isNaN(change.dimensions.height)
      ) as NodeDimensionChange[];
      if (validChanges.length === 0) {
        return;
      }
      const actionChanges = [];
      for (const change of validChanges) {
        const note = notes?.[change.id];
        if (note) {
          dispatch(
            updateNote({
              id: change.id,
              note: {
                metadata: change.dimensions,
              },
            })
          );
        } else {
          actionChanges.push(change);
        }
      }
      if (actionChanges.length > 0) {
        dispatch(updateNodeSizes(actionChanges));
      }
    },
    [dispatch, notes]
  );

  const handlePositionChanges = useCallback(
    (changes: NodeChange[]) => {
      const validChanges = changes.filter(
        (change) =>
          change.type === 'position' &&
          change?.id &&
          change?.position &&
          !Number.isNaN(change.position.x) &&
          !Number.isNaN(change.position.y)
      ) as NodePositionChange[];
      if (validChanges.length === 0) {
        return;
      }
      for (const change of validChanges) {
        const note = notes?.[change.id];
        if (note) {
          setNodePositions((prev) => ({
            ...prev,
            [change.id]: change.position!,
          }));
        } else {
          // Non-note nodes position changes are not handled currently
        }
      }
    },
    [notes]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      handSizeChanges(changes);
      handlePositionChanges(changes);
    },
    [handSizeChanges, handlePositionChanges]
  );

  const isDarkMode = useIsDarkMode();

  return (
    <ReactFlow
      colorMode={isDarkMode ? 'dark' : 'light'}
      ref={canvasRef}
      onInit={onInit}
      nodeTypes={nodeTypes}
      nodes={allNodes}
      edges={edges}
      onNodesChange={onNodesChange}
      nodesConnectable={true}
      nodesDraggable={false}
      nodesFocusable={false}
      edgesFocusable={false}
      edgeTypes={edgeTypes}
      elementsSelectable={true}
      selectionOnDrag={isSelectionKeyHeld}
      selectionMode={SelectionMode.Full}
      selectionKeyCode={null}
      multiSelectionKeyCode={['Meta', 'Control', 'Shift']}
      panOnDrag={!isSelectionKeyHeld}
      onSelectionChange={onSelectionChange}
      onSelectionStart={onSelectionStart}
      onSelectionEnd={onSelectionEnd}
      panOnScroll={true}
      deleteKeyCode={null}
      zoomActivationKeyCode={['Ctrl', 'Meta', 'Alt', 'Control']}
      translateExtent={clampPan ? translateExtent : undefined}
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
