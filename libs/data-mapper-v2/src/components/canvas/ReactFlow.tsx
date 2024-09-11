import type { AppDispatch, RootState } from '../../core/state/Store';
import { useEffect, useRef, useCallback, useState, type MouseEvent } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { Connection, Edge, ConnectionLineComponent, NodeTypes, OnNodeDrag, IsValidConnection, XYPosition } from '@xyflow/react';
import { PanOnScrollMode, ReactFlow, addEdge, useEdges, useReactFlow } from '@xyflow/react';
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
  updateFunctionNodesPosition,
} from '../../core/state/DataMapSlice';
import { FunctionNode } from '../common/reactflow/FunctionNode';
import { useDrop } from 'react-dnd';
import useResizeObserver from 'use-resize-observer';
import type { Bounds } from '../../core';
import { splitEdgeId } from '../../utils/Edge.Utils';
import useAutoLayout from '../../ui/hooks/useAutoLayout';
import EdgePopOver from './EdgePopOver';
import { getFunctionNode } from '../../utils/Function.Utils';
import LoopEdge from '../common/reactflow/edges/LoopEdge';
import { emptyCanvasRect } from '@microsoft/logic-apps-shared';
import CanvasNode from '../common/reactflow/CanvasNode';
import IntermediateConnectedEdge from '../common/reactflow/edges/IntermediateConnectedEdge';
import useReactFlowStates from './useReactflowStates';
import { cloneDeep } from 'lodash';
interface DMReactFlowProps {
  setIsMapStateDirty?: (isMapStateDirty: boolean) => void;
}

const nodeTypes = {
  schemaNode: SchemaNode,
  functionNode: FunctionNode,
  canvasNode: CanvasNode,
} as NodeTypes;

const edgeTypes = {
  connectedEdge: ConnectedEdge,
  loopEdge: LoopEdge,
  intermediateConnectedEdge: IntermediateConnectedEdge,
};

export const ReactFlowWrapper = ({ setIsMapStateDirty }: DMReactFlowProps) => {
  const styles = useStyles();
  const reactFlowInstance = useReactFlow();
  const ref = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const reactflowEdges = useEdges();
  const { functionNodes } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);
  const currentCanvasRect = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.loadedMapMetadata?.canvasRect ?? emptyCanvasRect
  );
  const { width: currentWidth, height: currentHeight, x: currentX, y: currentY } = currentCanvasRect;
  const { width: newWidth = undefined, height: newHeight = undefined } = useResizeObserver<HTMLDivElement>({
    ref,
  });
  const [edgePopoverBounds, setEdgePopoverBounds] = useState<Bounds>();

  useAutoLayout();
  const { nodes, edges, setFunctionNodes } = useReactFlowStates({});

  useEffect(() => {
    const functionNodesForDragDrop = Object.entries(functionNodes).map(([key, functionData]) =>
      getFunctionNode(functionData, key, functionData.position)
    );

    if (ref?.current && newWidth !== undefined && newHeight !== undefined) {
      const { x: newX, y: newY, width: newWidth, height: newHeight } = ref.current.getBoundingClientRect();
      if (newWidth !== currentWidth || newHeight !== currentHeight || newX !== currentX || newY !== currentY) {
        dispatch(
          updateCanvasDimensions({
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
          })
        );

        //update function node positions
        if (currentWidth !== 0 && newWidth !== currentWidth) {
          let xChange = 0;
          // Sorta % increase in width so we will increase the x position of the function nodes
          if (newWidth > currentWidth) {
            xChange = (newWidth - currentWidth) / currentWidth + 1;
          } else {
            xChange = 1 - (currentWidth - newWidth) / currentWidth;
          }

          const updatedPositions: Record<string, XYPosition> = {};
          for (const node of functionNodesForDragDrop) {
            updatedPositions[node.id] = {
              x: node.position.x * xChange,
              y: node.position.y,
            };
          }
          dispatch(updateFunctionNodesPosition(updatedPositions));
        }
      }
    }
  }, [functionNodes, newWidth, currentWidth, newHeight, currentHeight, currentX, currentY, dispatch, ref]);

  const isMapStateDirty = useSelector((state: RootState) => state.dataMap.present.isDirty);

  const onEdgeConnect = useCallback(
    (connection: Connection) => {
      addEdge(
        {
          ...connection,
          type: 'connectedEdge',
          reconnectable: 'target',
          focusable: true,
          deletable: true,
          selectable: true,
          zIndex: 150,
          interactionWidth: 10,
        },
        reactflowEdges
      );

      // danielle maybe get the input number from here?

      const connectionAction: ConnectionAction = {
        reactFlowSource: connection.source ?? '',
        reactFlowDestination: connection.target ?? '',
      };
      dispatch(makeConnectionFromMap(connectionAction));
      dispatch(setSelectedItem(connection.target));
    },
    [reactflowEdges, dispatch]
  );

  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      return !reactflowEdges.find((edge) => edge.source === connection.source && edge.target === connection.target);
    },
    [reactflowEdges]
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
      setFunctionNodes((functionNodesForDragDrop) => [
        ...functionNodesForDragDrop.filter((nodeFromState) => nodeFromState.id !== node.id),
        node,
      ]);
    },
    [setFunctionNodes]
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

      let id = '';

      // Delete clicked on intermediate edge created while scrolling
      if (edge.data?.isIntermediate && edge.data?.isDueToScroll) {
        // When componentId is not set, it means the edge is a collapsed version
        const splitIds = splitEdgeId(edge.id);
        if (edge.data?.componentId && splitIds.length >= 2) {
          const directionId1 = edge.data?.componentId as string;
          const directionId2 = splitIds[0];
          const directEdge = reactflowEdges.find(
            (edge) =>
              (edge.source === directionId1 && edge.target === directionId2) ||
              (edge.source === directionId2 && edge.target === directionId1)
          );
          id = directEdge?.id ?? '';
        }
        if (!id) {
          return;
        }
      } else {
        id = edge.id;
      }

      if (id) {
        dispatch(updateEdgePopOverId(id));
        setEdgePopoverBounds({
          x: e.clientX,
          y: e.clientY,
          width: 5,
          height: 5,
        });
      }
    },
    [dispatch, setEdgePopoverBounds, reactflowEdges]
  );

  return (
    <div ref={ref} id="editorView" className={styles.wrapper}>
      {ref?.current?.getBoundingClientRect() ? (
        <ReactFlow
          id="dm-react-flow"
          ref={drop}
          className="nopan nodrag"
          nodes={cloneDeep(nodes)}
          edges={edges}
          nodeDragThreshold={0}
          onlyRenderVisibleElements={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          preventScrolling={false}
          edgesFocusable={true}
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
          nodeExtent={[
            [0, 0],
            [ref.current.getBoundingClientRect().width, ref.current.getBoundingClientRect().height],
          ]}
          translateExtent={[
            [0, 0],
            [ref.current.getBoundingClientRect().width, ref.current.getBoundingClientRect().height],
          ]}
        />
      ) : null}
      {edgePopoverBounds && <EdgePopOver {...edgePopoverBounds} />}
    </div>
  );
};
