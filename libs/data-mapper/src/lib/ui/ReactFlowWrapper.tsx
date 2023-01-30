import { CanvasControls } from '../components/canvasControls/CanvasControls';
import { CanvasToolbox, ToolboxPanelTabs } from '../components/canvasToolbox/CanvasToolbox';
import { ConnectionEdge } from '../components/edge/ConnectionEdge';
import { SchemaCard } from '../components/nodeCard/SchemaCard';
import { ExpandedFunctionCard } from '../components/nodeCard/functionCard/ExpandedFunctionCard';
import { SimpleFunctionCard } from '../components/nodeCard/functionCard/SimpleFunctionCard';
import { Notification } from '../components/notification/Notification';
import { SchemaNameBadge } from '../components/schemaSelection/SchemaNameBadge';
import { SourceSchemaPlaceholder } from '../components/schemaSelection/SourceSchemaPlaceholder';
import { schemaNodeCardHeight, schemaNodeCardDefaultWidth } from '../constants/NodeConstants';
import {
  checkerboardBackgroundImage,
  defaultCanvasZoom,
  ReactFlowEdgeType,
  reactFlowFitViewOptions,
  ReactFlowNodeType,
  sourcePrefix,
  targetPrefix,
} from '../constants/ReactFlowConstants';
import {
  deleteCurrentlySelectedItem,
  hideNotification,
  makeConnection,
  redoDataMapOperation,
  setCanvasToolboxTabToDisplay,
  setInlineFunctionInputOutputKeys,
  setSelectedItem,
  setSourceNodeConnectionBeingDrawnFromId,
  undoDataMapOperation,
} from '../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../core/state/Store';
import { SchemaType } from '../models';
import { useLayout } from '../utils/ReactFlow.Util';
import { tokens } from '@fluentui/react-components';
import { useBoolean } from '@fluentui/react-hooks';
import type { KeyboardEventHandler, MouseEvent as ReactMouseEvent } from 'react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { Connection as ReactFlowConnection, Edge as ReactFlowEdge, Node as ReactFlowNode, OnConnectStartParams } from 'reactflow';
// eslint-disable-next-line import/no-named-as-default
import ReactFlow, { ConnectionLineType, useKeyPress } from 'reactflow';

type CanvasExtent = [[number, number], [number, number]];

interface ReactFlowWrapperProps {
  canvasBlockHeight: number;
  canvasBlockWidth: number;
  useExpandedFunctionCards: boolean;
}

export const ReactFlowWrapper = ({ canvasBlockHeight, canvasBlockWidth, useExpandedFunctionCards }: ReactFlowWrapperProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const reactFlowRef = useRef<HTMLDivElement>(null);

  const selectedItemKey = useSelector((state: RootState) => state.dataMap.curDataMapOperation.selectedItemKey);
  const currentTargetSchemaNode = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentTargetSchemaNode);
  const connections = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);
  // NOTE: Includes nodes added from toolbox, and nodes with connection chains to target schema nodes on the current target schema level
  const currentSourceSchemaNodes = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentSourceSchemaNodes);
  const currentFunctionNodes = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentFunctionNodes);
  const sourceSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.targetSchema);
  const flattenedSourceSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedSourceSchema);
  const sourceSchemaOrdering = useSelector((state: RootState) => state.dataMap.curDataMapOperation.sourceSchemaOrdering);
  const flattenedTargetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedTargetSchema);
  const notificationData = useSelector((state: RootState) => state.dataMap.notificationData);

  const [canvasZoom, setCanvasZoom] = useState(defaultCanvasZoom);
  const [displayMiniMap, { toggle: toggleDisplayMiniMap }] = useBoolean(false);

  const nodeTypes = useMemo(
    () => ({
      [ReactFlowNodeType.SchemaNode]: SchemaCard,
      [ReactFlowNodeType.FunctionNode]: useExpandedFunctionCards ? ExpandedFunctionCard : SimpleFunctionCard,
    }),
    [useExpandedFunctionCards]
  );
  const edgeTypes = useMemo(() => ({ [ReactFlowEdgeType.ConnectionEdge]: ConnectionEdge }), []);

  const onPaneClick = (_event: ReactMouseEvent | MouseEvent | TouchEvent): void => {
    // If user clicks on pane (empty canvas area), "deselect" node
    dispatch(setSelectedItem(undefined));

    // Cancel adding inline function
    dispatch(setInlineFunctionInputOutputKeys(undefined));

    dispatch(setCanvasToolboxTabToDisplay(''));
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

  const onConnectStart = (_event: React.MouseEvent, { nodeId, handleType }: OnConnectStartParams) => {
    // handleType check prevents other nodes' handles being displayed when attempting to draw from right-to-left (currently not allowed)
    if (!nodeId || !handleType || handleType === SchemaType.Target) {
      return;
    }

    dispatch(setSourceNodeConnectionBeingDrawnFromId(nodeId));
  };

  const onConnectEnd = () => {
    dispatch(setSourceNodeConnectionBeingDrawnFromId(undefined));
  };

  const onEdgeClick = (_event: React.MouseEvent, node: ReactFlowEdge) => {
    dispatch(setSelectedItem(node.id));
  };

  const keyDownHandler: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      dispatch(deleteCurrentlySelectedItem());
    }
  };

  const ctrlZPressed = useKeyPress(['Meta+z', 'ctrl+z']);
  useEffect(() => {
    if (ctrlZPressed) {
      dispatch(undoDataMapOperation());
    }
  }, [ctrlZPressed, dispatch]);

  const ctrlYPressed = useKeyPress(['Meta+y', 'ctrl+y']);
  useEffect(() => {
    if (ctrlYPressed) {
      dispatch(redoDataMapOperation());
    }
  }, [ctrlYPressed, dispatch]);

  const [nodes, edges, diagramSize] = useLayout(
    currentSourceSchemaNodes,
    currentFunctionNodes,
    currentTargetSchemaNode,
    connections,
    selectedItemKey,
    sourceSchemaOrdering
  );

  // Find first schema node (should be schemaTreeRoot) for source and target to use its xPos for schema name badge
  const srcSchemaTreeRootXPos = useMemo(
    () =>
      nodes.find((reactFlowNode) => reactFlowNode.data?.schemaType && reactFlowNode.data.schemaType === SchemaType.Source)?.position.x ?? 0,
    [nodes]
  );

  const tgtSchemaTreeRootXPos = useMemo(
    () =>
      nodes.find((reactFlowNode) => reactFlowNode.data?.schemaType && reactFlowNode.data.schemaType === SchemaType.Target)?.position.x ?? 0,
    [nodes]
  );

  // Restrict canvas panning to certain bounds
  const translateExtent = useMemo<CanvasExtent>(() => {
    const xOffset = schemaNodeCardDefaultWidth * 2;
    const yOffset = schemaNodeCardHeight * 2;

    const xPos = canvasBlockWidth / canvasZoom - xOffset;
    const yPos = canvasBlockHeight / canvasZoom - yOffset;

    return [
      [-xPos, -yPos],
      [xPos + diagramSize.width, yPos + diagramSize.height],
    ];
  }, [diagramSize, canvasBlockHeight, canvasBlockWidth, canvasZoom]);

  return (
    <ReactFlow
      ref={reactFlowRef}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodes={nodes}
      edges={edges}
      onPaneClick={onPaneClick}
      // Not ideal, but it's this or useViewport that re-renders 3000 (due to x/y changes)
      onMove={(_e, viewport) => setCanvasZoom(viewport.zoom)}
      onKeyDown={keyDownHandler}
      onConnect={onConnect}
      onConnectStart={onConnectStart}
      onConnectEnd={onConnectEnd}
      onEdgeClick={onEdgeClick}
      onNodeClick={onNodeSingleClick}
      nodesDraggable={false}
      // When using custom edge component, only affects appearance when drawing edge
      connectionLineType={ConnectionLineType.SmoothStep}
      proOptions={{
        account: 'paid-sponsor',
        hideAttribution: true,
      }}
      style={{
        backgroundImage: checkerboardBackgroundImage,
        backgroundPosition: '0 0, 11px 11px',
        backgroundSize: '22px 22px',
        borderRadius: tokens.borderRadiusMedium,
      }}
      translateExtent={translateExtent}
      fitViewOptions={reactFlowFitViewOptions}
      fitView
    >
      <CanvasToolbox canvasBlockHeight={canvasBlockHeight} />

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
        <SourceSchemaPlaceholder onClickSelectElement={() => dispatch(setCanvasToolboxTabToDisplay(ToolboxPanelTabs.sourceSchemaTree))} />
      )}

      {sourceSchema && <SchemaNameBadge schemaName={sourceSchema.name} schemaTreeRootXPos={srcSchemaTreeRootXPos} />}
      {targetSchema && <SchemaNameBadge schemaName={targetSchema.name} schemaTreeRootXPos={tgtSchemaTreeRootXPos} />}
    </ReactFlow>
  );
};
