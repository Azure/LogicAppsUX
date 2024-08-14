import type { AppDispatch, RootState } from '../core/state/Store';
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
import { ReactFlow, addEdge, applyEdgeChanges, useEdges, useReactFlow } from '@xyflow/react';
import { reactFlowStyle, useStaticStyles, useStyles } from './styles';
import SchemaNode from '../components/common/reactflow/SchemaNode';
import ConnectionLine from '../components/common/reactflow/ConnectionLine';
import ConnectedEdge from '../components/common/reactflow/ConnectedEdge';
import type { ConnectionAction } from '../core/state/DataMapSlice';
import { updateFunctionPosition, makeConnectionFromMap, setSelectedItem, updateEdgePopOverId } from '../core/state/DataMapSlice';
import { FunctionNode } from '../components/common/reactflow/FunctionNode';
import { useDrop } from 'react-dnd';
import useResizeObserver from 'use-resize-observer';
import type { Bounds } from '../core';
import { convertWholeDataMapToLayoutTree } from '../utils/ReactFlow.Util';
import { createEdgeId } from '../utils/Edge.Utils';
import useAutoLayout from './hooks/useAutoLayout';
import cloneDeep from 'lodash/cloneDeep';
import EdgePopOver from '../components/canvas/EdgePopOver';
import { getReactFlowNodeId } from '../utils/Schema.Utils';
interface DMReactFlowProps {
  setIsMapStateDirty?: (isMapStateDirty: boolean) => void;
  updateCanvasBoundsParent: (bounds: Bounds | undefined) => void;
}

export const DMReactFlow = ({ setIsMapStateDirty, updateCanvasBoundsParent }: DMReactFlowProps) => {
  useStaticStyles();
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
  const [functionNodesForDragDrop, setFunctionNodesForDragDrop] = useState<Node[]>([]);
  const { width = undefined, height = undefined } = useResizeObserver<HTMLDivElement>({
    ref,
  });
  const [edgePopoverBounds, setEdgePopoverBounds] = useState<Bounds>();

  const realEdges: Edge[] = useMemo(() => {
    let edges: Edge[] = [];
    if (Object.entries(dataMapConnections).length > 0) {
      const layout = convertWholeDataMapToLayoutTree(flattenedSourceSchema, flattenedTargetSchema, functionNodes, dataMapConnections);
      edges = layout.edges.map((edge) => {
        const newEdge: Edge = {
          id: createEdgeId(edge.sourceId, edge.targetId),
          source: edge.sourceId,
          target: edge.targetId,
          type: 'connectedEdge',
          reconnectable: 'target',
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
            animated: true,
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
    if (ref?.current) {
      const rect = ref.current.getBoundingClientRect();
      updateCanvasBoundsParent({
        x: rect.x,
        y: rect.y,
        height: height,
        width: width,
      });
    }
  }, [ref, updateCanvasBoundsParent, width, height]);

  useEffect(() => {
    setFunctionNodesForDragDrop(
      Object.entries(functionNodes).map((node) => ({
        id: node[0],
        type: 'functionNode',
        data: { functionData: node[1] },
        position: node[1].position || { x: 10, y: 200 },
        draggable: true,
        selectable: false,
        measured: { width: 1, height: 1 },
      }))
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
    <div ref={ref} id="editorView" className={styles.canvasWrapper}>
      <ReactFlow
        id="dm-react-flow"
        ref={drop}
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
        elementsSelectable={false}
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
