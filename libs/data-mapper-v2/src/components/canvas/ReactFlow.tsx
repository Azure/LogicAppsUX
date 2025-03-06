import type { AppDispatch, RootState } from '../../core/state/Store';
import { useEffect, useRef, useCallback, useState, type MouseEvent, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { Connection, Edge, ConnectionLineComponent, NodeTypes, OnNodeDrag, IsValidConnection } from '@xyflow/react';
import { PanOnScrollMode, ReactFlow, useReactFlow } from '@xyflow/react';
import { reactFlowStyle, useStyles } from './styles';
import SchemaPanelNode from '../common/reactflow/nodes/SchemaPanelNode';
import ConnectionLine from '../common/reactflow/edges/ConnectionLine';
import ConnectedEdge from '../common/reactflow/edges/ConnectedEdge';
import type { ConnectionAction } from '../../core/state/DataMapSlice';
import { updateFunctionPosition, makeConnectionFromMap, setSelectedItem, updateEdgePopOverId } from '../../core/state/DataMapSlice';
import { FunctionNode } from '../common/reactflow/FunctionNode';
import { useDrop } from 'react-dnd';
import useResizeObserver from 'use-resize-observer';
import type { Bounds } from '../../core';
import { splitEdgeId } from '../../utils/Edge.Utils';
import useAutoLayout from '../../ui/hooks/useAutoLayout';
import EdgePopOver from './EdgePopOver';
import CanvasNode from '../common/reactflow/CanvasNode';
import { isFunctionNode, panelWidth } from '../../utils/ReactFlow.Util';
import useReactFlowStates from './useReactflowStates';
import mapPlaceholder from '../../images/map-placeholder.svg';
import { useSchemasButNoConnections } from '../../core/state/selectors/selectors';
import { useIntl } from 'react-intl';
interface DMReactFlowProps {
  setIsMapStateDirty?: (isMapStateDirty: boolean) => void;
}

const nodeTypes = {
  functionNode: FunctionNode,
  canvasNode: CanvasNode,
  schemaPanel: SchemaPanelNode,
} as NodeTypes;

const edgeTypes = {
  connectedEdge: ConnectedEdge,
};

export const ReactFlowWrapper = ({ setIsMapStateDirty }: DMReactFlowProps) => {
  const styles = useStyles();
  const reactFlowInstance = useReactFlow();
  const showPlaceholder = useSchemasButNoConnections();
  const ref = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { width: newWidth = undefined, height: newHeight = undefined } = useResizeObserver<HTMLDivElement>({
    ref,
  });
  const { nodes, edges } = useReactFlowStates({
    newWidth,
    newHeight,
    newX: ref.current?.getBoundingClientRect().x,
    newY: ref.current?.getBoundingClientRect().y,
  });
  const [edgePopoverBounds, setEdgePopoverBounds] = useState<Bounds>();

  useAutoLayout();

  const isMapStateDirty = useSelector((state: RootState) => state.dataMap.present.isDirty);

  const stringResources = useMemo(
    () => ({
      DEFAULT_PLACEHOLDER: intl.formatMessage({
        defaultMessage: 'Drag and connect nodes to transform',
        id: 'ms40774a9e6299',
        description: 'default placeholder text',
      }),
    }),
    [intl]
  );

  const onEdgeConnect = useCallback(
    (connection: Connection) => {
      let source = '';
      let target = '';

      if (connection.source && isFunctionNode(connection.source)) {
        source = connection.source;
      } else {
        source = connection.sourceHandle ?? '';
      }

      if (connection.target && isFunctionNode(connection.target)) {
        target = connection.target;
      } else {
        target = connection.targetHandle ?? '';
      }

      if (source && target) {
        const connectionAction: ConnectionAction = {
          reactFlowSource: source,
          reactFlowDestination: target,
        };

        dispatch(makeConnectionFromMap(connectionAction));
        dispatch(setSelectedItem(target));
      }
    },
    [dispatch]
  );

  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      return !edges.find((edge) => {
        const {
          source: currentConnectionSource,
          target: currentConnectionTarget,
          sourceHandle: currentConnectionSourceHandle,
          targetHandle: currentConnectionTargetHandle,
        } = edge;
        const {
          source: newConnectionSource,
          target: newConnectionTarget,
          sourceHandle: newConnectionSourceHandle,
          targetHandle: newConnectionTargetHandle,
        } = connection;
        return (
          currentConnectionSource === newConnectionSource &&
          currentConnectionTarget === newConnectionTarget &&
          (isFunctionNode(currentConnectionSource) || currentConnectionSourceHandle === newConnectionSourceHandle) &&
          (isFunctionNode(currentConnectionTarget) || currentConnectionTargetHandle === newConnectionTargetHandle)
        );
      });
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

  const onNodeDrag: OnNodeDrag = useCallback(
    (_event, node, _updatedNodes) => {
      const xPosition = node.position.x;
      const nodeWidth = reactFlowInstance.getInternalNode(node.id)?.measured.width;

      dispatch(
        updateFunctionPosition({
          id: node.id,
          position: {
            x:
              xPosition < panelWidth
                ? panelWidth
                : newWidth !== undefined && nodeWidth !== undefined && xPosition + nodeWidth > newWidth - panelWidth
                  ? newWidth - panelWidth - nodeWidth
                  : xPosition,
            y: node.position.y,
          },
        })
      );
    },
    [dispatch, newWidth, reactFlowInstance]
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
          const directEdge = edges.find(
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
    [dispatch, setEdgePopoverBounds, edges]
  );

  return (
    <div ref={ref} id="editorView" className={styles.wrapper}>
      {ref?.current?.getBoundingClientRect() ? (
        <ReactFlow
          id="dm-react-flow"
          ref={drop}
          edges={edges}
          nodes={nodes}
          className="nopan nodrag"
          nodeDragThreshold={0}
          onlyRenderVisibleElements={true}
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
          onNodeDragStop={onNodeDrag}
          onNodeDrag={onNodeDrag}
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
        >
          {showPlaceholder && (
            <div className={styles.background}>
              <div className={styles.placeholderContainer}>
                <div className={styles.placeholderText}>{stringResources.DEFAULT_PLACEHOLDER}</div>
                <img src={mapPlaceholder} alt="placeholder" className={styles.placeholderImage} />
              </div>
            </div>
          )}
        </ReactFlow>
      ) : null}
      {edgePopoverBounds && <EdgePopOver {...edgePopoverBounds} />}
    </div>
  );
};
