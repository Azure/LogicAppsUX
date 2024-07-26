import type { AppDispatch, RootState } from '../core/state/Store';
import { useEffect, useMemo, useRef, useCallback, useState, useLayoutEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { Connection, Node, Edge, ConnectionLineComponent, NodeProps, NodeTypes, OnNodeDrag, IsValidConnection } from '@xyflow/react';
import { ReactFlow, addEdge, useReactFlow } from '@xyflow/react';
import { reactFlowStyle, useStaticStyles, useStyles } from './styles';
import SchemaNode from '../components/common/reactflow/SchemaNode';
import ConnectionLine from '../components/common/reactflow/ConnectionLine';
import ConnectedEdge from '../components/common/reactflow/ConnectedEdge';
import type { ConnectionAction } from '../core/state/DataMapSlice';
import { makeConnection, updateFunctionPosition, updateReactFlowEdges } from '../core/state/DataMapSlice';
import { FunctionNode } from '../components/common/reactflow/FunctionNode';
import { useDrop } from 'react-dnd';
import useResizeObserver from 'use-resize-observer';
import type { Bounds } from '../core';

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
  const { sourceNodesMap, targetNodesMap, edges, functionNodes } = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation
  );
  const [functionNodesForDragDrop, setFunctionNodesForDragDrop] = useState<Node[]>([]);

  const { width = undefined, height = undefined } = useResizeObserver<HTMLDivElement>({
    ref,
  });

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
      }))
    );
  }, [functionNodes]);

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

  // const dispatchEdgesAndNodes = useCallback(
  //   (updatedEdges: Edge[], updatedNodes: Node[]) => {
  //     const allNodeIds = [...updatedEdges.map((edge) => edge.source), ...updatedEdges.map((edge) => edge.target)];

  //     const newNodes = [
  //       ...updatedNodes.map((node) => ({
  //         ...node,
  //         data: { ...node.data, isConnected: allNodeIds.indexOf(node.id) > -1 },
  //       })),
  //     ];

  //     dispatch(updateReactFlowEdges(updatedEdges));

  //     dispatch(updateReactFlowNodes(newNodes));
  //   },
  //   [dispatch]
  // );

  const dispatchMakeConnection = useCallback(
    (connection: Connection) => {
      const connectionAction: ConnectionAction = {
        reactFlowSource: connection.source ?? '',
        reactFlowDestination: connection.target ?? '',
      };
      dispatch(makeConnection(connectionAction));
    },
    [dispatch]
  );

  const onEdgeConnect = useCallback(
    (connection: Connection) => {
      const newEdges = addEdge(
        {
          ...connection,
          type: 'connectedEdge',
          reconnectable: 'target',
          focusable: true,
          deletable: true,
        },
        edges
      );

      dispatchMakeConnection(connection);
      dispatch(updateReactFlowEdges(newEdges));
    },
    [edges, dispatchMakeConnection, dispatch]
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      const newEdges = addEdge(
        {
          ...newConnection,
          type: 'connectedEdge',
          reconnectable: 'target',
          focusable: true,
          deletable: true,
        },
        edges.filter((edge) => edge.id !== oldEdge.id)
      );

      dispatch(updateReactFlowEdges(newEdges));
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

  return (
    <div ref={ref} id="editorView" className={styles.canvasWrapper}>
      <ReactFlow
        id="dm-react-flow"
        ref={drop}
        nodes={[...Object.values(sourceNodesMap), ...Object.values(targetNodesMap), ...functionNodesForDragDrop]}
        edges={edges}
        selectNodesOnDrag={false}
        onlyRenderVisibleElements={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        nodesConnectable={true}
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
        onConnect={onEdgeConnect}
        onReconnect={onReconnect}
        connectionLineComponent={ConnectionLine as ConnectionLineComponent | undefined}
        translateExtent={
          ref?.current?.getBoundingClientRect()
            ? [
                [0, 0],
                [ref.current.getBoundingClientRect()?.right, ref.current.getBoundingClientRect()?.bottom],
              ]
            : undefined
        }
      />
    </div>
  );
};
