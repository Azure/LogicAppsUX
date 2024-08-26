import type { AppDispatch, RootState } from '../../core/state/Store';
import { useEffect, useMemo, useRef, useCallback, useState, useLayoutEffect, type MouseEvent } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type {
  Connection,
  Node,
  Edge,
  ConnectionLineComponent,
  NodeProps,
  NodeTypes,
  OnNodeDrag,
  IsValidConnection,
  EdgeChange,
} from '@xyflow/react';
import { PanOnScrollMode, ReactFlow, addEdge, applyEdgeChanges, useEdges, useReactFlow } from '@xyflow/react';
import { reactFlowStyle, useStyles } from './styles';
import SchemaNode from '../common/reactflow/SchemaNode';
import ConnectionLine from '../common/reactflow/edges/ConnectionLine';
import ConnectedEdge from '../common/reactflow/edges/ConnectedEdge';
import type { ConnectionAction } from '../../core/state/DataMapSlice';
import {
  updateFunctionPosition,
  makeConnectionFromMap,
  setSelectedItem,
  updateEdgePopOverId,
  updateCanvasDimensions,
} from '../../core/state/DataMapSlice';
import { FunctionNode } from '../common/reactflow/FunctionNode';
import { useDrop } from 'react-dnd';
import useResizeObserver from 'use-resize-observer';
import type { Bounds } from '../../core';
import { convertWholeDataMapToLayoutTree } from '../../utils/ReactFlow.Util';
import { createEdgeId } from '../../utils/Edge.Utils';
import useAutoLayout from '../../ui/hooks/useAutoLayout';
import cloneDeep from 'lodash/cloneDeep';
import EdgePopOver from './EdgePopOver';
import { getReactFlowNodeId } from '../../utils/Schema.Utils';
import { getFunctionNode } from '../../utils/Function.Utils';
import LoopEdge from '../common/reactflow/edges/LoopEdge';
import { emptyCanvasRect } from '@microsoft/logic-apps-shared';
interface DMReactFlowProps {
  setIsMapStateDirty?: (isMapStateDirty: boolean) => void;
}

export const ReactFlowWrapper = ({ setIsMapStateDirty }: DMReactFlowProps) => {
  const styles = useStyles();
  const reactFlowInstance = useReactFlow();
  const ref = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const edges = useEdges();
  const {
    sourceNodesMap,
    targetNodesMap,
    functionNodes,
    flattenedSourceSchema,
    flattenedTargetSchema,
    dataMapConnections,
    sourceStateConnections,
  } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);
  const currentCanvasRect = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.loadedMapMetadata?.canvasRect ?? emptyCanvasRect
  );
  const { width: currentWidth, height: currentHeight, x: currentX, y: currentY } = currentCanvasRect;
  const [functionNodesForDragDrop, setFunctionNodesForDragDrop] = useState<Node[]>([]);
  const { width: newWidth = undefined, height: newHeight = undefined } = useResizeObserver<HTMLDivElement>({
    ref,
  });
  const [edgePopoverBounds, setEdgePopoverBounds] = useState<Bounds>();
  const { x: newX, y: newY } = useMemo(
    () =>
      ref?.current?.getBoundingClientRect() ?? {
        x: -1,
        y: -1,
        left: -1,
        right: -1,
        width: 0,
        height: 0,
        top: -1,
        bottom: -1,
      },
    [ref]
  );

  const realEdges: Edge[] = useMemo(() => {
    let edges: Edge[] = [];
    if (Object.entries(dataMapConnections).length > 0) {
      const layout = convertWholeDataMapToLayoutTree(flattenedSourceSchema, flattenedTargetSchema, functionNodes, dataMapConnections);
      edges = layout.edges.map((edge) => {
        const newEdge: Edge = {
          id: createEdgeId(edge.sourceId, edge.targetId),
          source: edge.sourceId,
          target: edge.targetId,
          type: edge.isRepeating ? 'loopEdge' : 'connectedEdge',
          reconnectable: 'target',
          data: { isRepeating: edge.isRepeating },
          focusable: true,
          deletable: true,
        };
        return newEdge;
      });
    }

    return edges;
  }, [dataMapConnections, flattenedSourceSchema, flattenedTargetSchema, functionNodes]);

  // Edges created when node is expanded/Collapsed
  const temporaryEdgesMap: Record<string, Edge> = useMemo(() => {
    const newEdgesMap: Record<string, Edge> = {};
    const sourceStateConnectionsEntries = Object.entries(sourceStateConnections);

    if (sourceStateConnectionsEntries.length > 0) {
      for (const entry of sourceStateConnectionsEntries) {
        const sourceNodeId = getReactFlowNodeId(entry[0], true);
        const targetIds = Object.keys(entry[1]);
        for (const targetId of targetIds) {
          const targetNodeId = getReactFlowNodeId(targetId, false);
          const id = createEdgeId(sourceNodeId, targetNodeId);
          const edge: Edge = {
            id: id,
            source: sourceNodeId,
            target: targetNodeId,
            type: 'connectedEdge',
            reconnectable: 'target',
            focusable: true,
            deletable: true,
            data: {
              isTemporary: true,
            },
          };
          newEdgesMap[id] = edge;
        }
      }
    }

    return newEdgesMap;
  }, [sourceStateConnections]);

  useAutoLayout();

  useLayoutEffect(() => {
    if (
      newWidth !== undefined &&
      newHeight !== undefined &&
      (newWidth !== currentWidth || newHeight !== currentHeight || newX !== currentX || newY !== currentY)
    ) {
      dispatch(
        updateCanvasDimensions({
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        })
      );
    }
  }, [newWidth, currentWidth, newHeight, currentHeight, newX, newY, currentX, currentY, dispatch]);

  useEffect(() => {
    setFunctionNodesForDragDrop(
      Object.entries(functionNodes).map(([key, functionData]) => getFunctionNode(functionData, key, functionData.position))
    );
  }, [functionNodes]);

  useLayoutEffect(() => {
    const edgeChanges: Record<string, EdgeChange> = {};

    for (const [id, edge] of Object.entries(temporaryEdgesMap)) {
      edgeChanges[id] = {
        type: 'add',
        item: edge,
      };
    }

    for (const edge of edges) {
      if (edge.data?.isTemporary) {
        const id = edge.id;
        if (temporaryEdgesMap[id]) {
          delete edgeChanges[id];
        } else {
          edgeChanges[id] = {
            type: 'remove',
            id: id,
          };
        }
      }
    }

    if (Object.entries(edgeChanges).length > 0) {
      applyEdgeChanges(Object.values(edgeChanges), edges);
    }
  }, [edges, temporaryEdgesMap]);

  const isMapStateDirty = useSelector((state: RootState) => state.dataMap.present.isDirty);

  const nodeTypes: Record<string, React.ComponentType<NodeProps>> = useMemo(
    () =>
      ({
        schemaNode: SchemaNode,
        functionNode: FunctionNode,
      }) as NodeTypes,
    []
  );

  const edgeTypes = useMemo(
    () => ({
      connectedEdge: ConnectedEdge,
      loopEdge: LoopEdge,
    }),
    []
  );

  const onEdgeConnect = useCallback(
    (connection: Connection) => {
      addEdge(
        {
          ...connection,
          type: 'connectedEdge',
          reconnectable: 'target',
          focusable: true,
          deletable: true,
        },
        edges
      );

      // danielle maybe get the input number from here?

      const connectionAction: ConnectionAction = {
        reactFlowSource: connection.source ?? '',
        reactFlowDestination: connection.target ?? '',
      };
      dispatch(makeConnectionFromMap(connectionAction));
      dispatch(setSelectedItem(connection.target));
    },
    [edges, dispatch]
  );

  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      return !edges.find((edge) => edge.source === connection.source && edge.target === connection.target);
    },
    [edges]
  );

  // NOTE: Putting this useEffect here for vis next to onSave
  useEffect(() => {
    if (setIsMapStateDirty) {
      setIsMapStateDirty(isMapStateDirty);
    }
  }, [isMapStateDirty, setIsMapStateDirty]);

  const [, drop] = useDrop(
    () => ({
      accept: 'function',
      drop: (_item, monitor) => {
        const xyPosition = monitor.getClientOffset();
        if (xyPosition) {
          if (reactFlowInstance) {
            const position = reactFlowInstance.screenToFlowPosition({
              x: xyPosition.x,
              y: xyPosition.y,
            });
            // middle of node is placed where pointer is
            position.x -= 20;
            position.y -= 20;
            return { position };
          }
          return { position: xyPosition };
        }
        return { position: { x: 0, y: 0 } };
      },
    }),
    [reactFlowInstance]
  );

  const onFunctionNodeDrag: OnNodeDrag = useCallback(
    (_event, node, _nodes) => {
      setFunctionNodesForDragDrop((functionNodesForDragDrop) => [
        ...functionNodesForDragDrop.filter((nodeFromState) => nodeFromState.id !== node.id),
        node,
      ]);
    },
    [setFunctionNodesForDragDrop]
  );

  const onFunctionNodeDragStop: OnNodeDrag = useCallback(
    (_event, node, _nodes) => {
      dispatch(updateFunctionPosition({ id: node.id, position: node.position }));
    },
    [dispatch]
  );

  const onEdgeContextMenu = useCallback(
    (e: MouseEvent, edge: Edge) => {
      e.preventDefault();
      e.stopPropagation();

      dispatch(updateEdgePopOverId(edge.id));
      setEdgePopoverBounds({
        x: e.clientX,
        y: e.clientY,
        width: 5,
        height: 5,
      });
    },
    [dispatch, setEdgePopoverBounds]
  );

  const nodes = useMemo(
    () => [...Object.values(sourceNodesMap), ...Object.values(targetNodesMap), ...functionNodesForDragDrop],
    [sourceNodesMap, targetNodesMap, functionNodesForDragDrop]
  );

  return (
    <div ref={ref} id="editorView" className={styles.wrapper}>
      <ReactFlow
        id="dm-react-flow"
        ref={drop}
        className="nopan nodrag"
        nodes={cloneDeep(nodes)}
        edges={[...realEdges, ...Object.values(temporaryEdgesMap)]}
        nodeDragThreshold={1}
        onlyRenderVisibleElements={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        preventScrolling={false}
        minZoom={1}
        elementsSelectable={true}
        maxZoom={1}
        autoPanOnConnect={false}
        snapToGrid={true}
        panOnScroll={false}
        panOnDrag={false}
        style={reactFlowStyle}
        proOptions={{
          account: 'paid-sponsor',
          hideAttribution: true,
        }}
        panOnScrollMode={PanOnScrollMode.Vertical}
        onNodeDrag={onFunctionNodeDrag}
        onNodeDragStop={onFunctionNodeDragStop}
        isValidConnection={isValidConnection}
        onEdgeContextMenu={onEdgeContextMenu}
        onConnect={onEdgeConnect}
        connectionLineComponent={ConnectionLine as ConnectionLineComponent | undefined}
        elevateEdgesOnSelect={true}
        nodeExtent={
          ref?.current?.getBoundingClientRect()
            ? [
                [0, 0],
                [ref.current.getBoundingClientRect()?.right, ref.current.getBoundingClientRect()?.bottom],
              ]
            : undefined
        }
        translateExtent={
          ref?.current?.getBoundingClientRect()
            ? [
                [0, 0],
                [ref.current.getBoundingClientRect()?.right, ref.current.getBoundingClientRect()?.bottom],
              ]
            : undefined
        }
      />
      {edgePopoverBounds && <EdgePopOver {...edgePopoverBounds} />}
    </div>
  );
};
