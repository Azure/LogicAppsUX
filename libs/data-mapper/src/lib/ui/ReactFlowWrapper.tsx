import { CanvasControls } from '../components/canvasControls/CanvasControls';
import { ToolboxPanelTabs, CanvasToolbox } from '../components/canvasToolbox/CanvasToolbox';
import { ConnectionEdge } from '../components/edge/ConnectionEdge';
import { FunctionCard } from '../components/nodeCard/FunctionCard';
import { SchemaCard } from '../components/nodeCard/SchemaCard';
import { Notification } from '../components/notification/Notification';
import { SourceSchemaPlaceholder } from '../components/schemaSelection/SourceSchemaPlaceholder';
import {
  checkerboardBackgroundImage,
  defaultCanvasZoom,
  ReactFlowEdgeType,
  ReactFlowNodeType,
  sourcePrefix,
  targetPrefix,
} from '../constants/ReactFlowConstants';
import {
  changeConnection,
  deleteConnection,
  deleteCurrentlySelectedItem,
  hideNotification,
  makeConnection,
  setSelectedItem,
  setSourceNodeConnectionBeingDrawnFromId,
} from '../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../core/state/Store';
import { useLayout } from '../utils/ReactFlow.Util';
import { tokens } from '@fluentui/react-components';
import { useBoolean } from '@fluentui/react-hooks';
import type { KeyboardEventHandler, MouseEvent as ReactMouseEvent } from 'react';
import React, { useCallback, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type {
  Connection as ReactFlowConnection,
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
  OnConnectStartParams,
  Viewport,
} from 'reactflow';
// eslint-disable-next-line import/no-named-as-default
import ReactFlow, { ConnectionLineType } from 'reactflow';

const defaultViewport: Viewport = { x: 0, y: 0, zoom: defaultCanvasZoom };
export const nodeTypes = { [ReactFlowNodeType.SchemaNode]: SchemaCard, [ReactFlowNodeType.FunctionNode]: FunctionCard };
export const edgeTypes = { [ReactFlowEdgeType.ConnectionEdge]: ConnectionEdge };

interface ReactFlowWrapperProps {
  canvasBlockHeight: number;
}

export const ReactFlowWrapper = ({ canvasBlockHeight }: ReactFlowWrapperProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const selectedItemKey = useSelector((state: RootState) => state.dataMap.curDataMapOperation.selectedItemKey);
  const currentTargetSchemaNode = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentTargetSchemaNode);
  const connections = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);
  // NOTE: Includes nodes added from toolbox, and nodes with connection chains to target schema nodes on the current target schema level
  const currentSourceSchemaNodes = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentSourceSchemaNodes);
  const currentFunctionNodes = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentFunctionNodes);
  const flattenedSourceSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedSourceSchema);
  const flattenedTargetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedTargetSchema);
  const notificationData = useSelector((state: RootState) => state.dataMap.notificationData);

  const [toolboxTabToDisplay, setToolboxTabToDisplay] = useState<ToolboxPanelTabs | ''>('');
  const [displayMiniMap, { toggle: toggleDisplayMiniMap }] = useBoolean(false);

  const reactFlowRef = useRef<HTMLDivElement>(null);
  const edgeUpdateSuccessful = useRef(true);

  const onPaneClick = (_event: ReactMouseEvent | MouseEvent | TouchEvent): void => {
    // If user clicks on pane (empty canvas area), "deselect" node
    dispatch(setSelectedItem(undefined));

    setToolboxTabToDisplay('');
  };

  const onNodeSingleClick = (_event: ReactMouseEvent, node: ReactFlowNode): void => {
    dispatch(setSelectedItem(node.id));
  };

  const onConnect = (connection: ReactFlowConnection) => {
    if (connection.target && connection.source) {
      const source = connection.source.startsWith(sourcePrefix)
        ? flattenedSourceSchema[connection.source]
        : currentFunctionNodes[connection.source];
      const destination = connection.target.startsWith(targetPrefix)
        ? flattenedTargetSchema[connection.target]
        : currentFunctionNodes[connection.target];

      dispatch(
        makeConnection({
          source,
          destination,
          reactFlowDestination: connection.target,
          reactFlowSource: connection.source,
        })
      );
    }
  };

  const onConnectStart = (event: React.MouseEvent, { nodeId, handleType }: OnConnectStartParams) => {
    // handleType check prevents other nodes' handles being displayed when attempting to draw from right-to-left (currently not allowed)
    if (!nodeId || !handleType || handleType === 'target') {
      return;
    }

    dispatch(setSourceNodeConnectionBeingDrawnFromId(nodeId));
  };

  const onConnectEnd = () => {
    dispatch(setSourceNodeConnectionBeingDrawnFromId(undefined));
  };

  const onEdgeUpdateStart = useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);

  const onEdgeUpdate = useCallback(
    (oldEdge: ReactFlowEdge, newConnection: ReactFlowConnection) => {
      edgeUpdateSuccessful.current = true;
      if (newConnection.target && newConnection.source && oldEdge.target) {
        const source = newConnection.source.startsWith(sourcePrefix)
          ? flattenedSourceSchema[newConnection.source]
          : currentFunctionNodes[newConnection.source];
        const destination = newConnection.target.startsWith(targetPrefix)
          ? flattenedTargetSchema[newConnection.target]
          : currentFunctionNodes[newConnection.target];

        dispatch(
          changeConnection({
            destination,
            source,
            reactFlowDestination: newConnection.target,
            reactFlowSource: newConnection.source,
            connectionKey: oldEdge.target,
            inputKey: oldEdge.source,
          })
        );
      }
    },
    [dispatch, flattenedSourceSchema, flattenedTargetSchema, currentFunctionNodes]
  );

  const onEdgeUpdateEnd = useCallback(
    (_: any, edge: ReactFlowEdge) => {
      if (!edgeUpdateSuccessful.current) {
        if (edge.target) {
          dispatch(deleteConnection({ connectionKey: edge.target, inputKey: edge.source }));
        }
      }

      edgeUpdateSuccessful.current = true;
    },
    [dispatch]
  );

  const onEdgeClick = (_event: React.MouseEvent, node: ReactFlowEdge) => {
    dispatch(setSelectedItem(node.id));
  };

  const keyDownHandler: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      dispatch(deleteCurrentlySelectedItem());
    }
  };

  const [nodes, edges] = useLayout(
    currentSourceSchemaNodes,
    flattenedSourceSchema,
    currentFunctionNodes,
    currentTargetSchemaNode,
    connections,
    selectedItemKey
  );

  return (
    <ReactFlow
      ref={reactFlowRef}
      onKeyDown={keyDownHandler}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodes={nodes}
      edges={edges}
      onConnect={onConnect}
      onConnectStart={onConnectStart}
      onConnectEnd={onConnectEnd}
      onPaneClick={onPaneClick}
      onNodeClick={onNodeSingleClick}
      defaultViewport={defaultViewport}
      nodesDraggable={false}
      // With custom edge component, only affects appearance when drawing edge
      connectionLineType={ConnectionLineType.SmoothStep}
      proOptions={{
        account: 'paid-sponsor',
        hideAttribution: true,
      }}
      style={{
        backgroundImage: checkerboardBackgroundImage,
        backgroundPosition: '0 0, 11px',
        backgroundSize: '22px 22px',
        borderRadius: tokens.borderRadiusMedium,
      }}
      onEdgeUpdate={onEdgeUpdate}
      onEdgeUpdateStart={onEdgeUpdateStart}
      onEdgeUpdateEnd={onEdgeUpdateEnd}
      onEdgeClick={onEdgeClick}
      fitViewOptions={{ maxZoom: defaultCanvasZoom }}
      fitView
    >
      <CanvasToolbox toolboxTabToDisplay={toolboxTabToDisplay} setToolboxTabToDisplay={setToolboxTabToDisplay} />

      <CanvasControls displayMiniMap={displayMiniMap} toggleDisplayMiniMap={toggleDisplayMiniMap} />

      {notificationData && (
        <Notification
          type={notificationData.type}
          msgParam={notificationData.msgParam}
          msgBody={notificationData.msgBody}
          autoHideDuration={notificationData.autoHideDurationMs}
          onClose={() => dispatch(hideNotification())}
        />
      )}

      {currentSourceSchemaNodes.length === 0 && (
        <SourceSchemaPlaceholder onClickSelectElement={() => setToolboxTabToDisplay(ToolboxPanelTabs.sourceSchemaTree)} />
      )}
    </ReactFlow>
  );
};
