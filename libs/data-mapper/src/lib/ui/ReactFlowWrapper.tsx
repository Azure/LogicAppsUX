/* eslint-disable no-param-reassign */
import { AddedFunctionPlaceholder } from '../components/addedFunctionBox/addedFunctionBox';
import { CanvasControls } from '../components/canvasControls/CanvasControls';
import { CanvasToolbox, ToolboxPanelTabs } from '../components/canvasToolbox/CanvasToolbox';
import { ConnectionEdge } from '../components/edge/ConnectionEdge';
import { SchemaCard } from '../components/nodeCard/SchemaCard';
import { ExpandedFunctionCard } from '../components/nodeCard/functionCard/ExpandedFunctionCard';
import { SimpleFunctionCard } from '../components/nodeCard/functionCard/SimpleFunctionCard';
import { Notification } from '../components/notification/Notification';
import { SchemaNameBadge } from '../components/schemaSelection/SchemaNameBadge';
import { SourceSchemaPlaceholder } from '../components/schemaSelection/SourceSchemaPlaceholder';
import { schemaNodeCardDefaultWidth, schemaNodeCardHeight } from '../constants/NodeConstants';
import {
  ReactFlowEdgeType,
  ReactFlowNodeType,
  checkerboardBackgroundImage,
  defaultCanvasZoom,
  reactFlowFitViewOptions,
  sourcePrefix,
  targetPrefix,
} from '../constants/ReactFlowConstants';
import {
  deleteCurrentlySelectedItem,
  hideNotification,
  makeConnection,
  setCanvasToolboxTabToDisplay,
  setInlineFunctionInputOutputKeys,
  setSelectedItem,
  setSourceNodeConnectionBeingDrawnFromId,
  updateFunctionPosition,
} from '../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../core/state/Store';
import type { FunctionPositionMetadata } from '../models';
import { SchemaType } from '../models';
import { inputFromHandleId } from '../utils/Connection.Utils';
import { isFunctionData } from '../utils/Function.Utils';
import { useLayout } from '../utils/ReactFlow.Util';
import { tokens } from '@fluentui/react-components';
import { useBoolean } from '@fluentui/react-hooks';
import type { MouseEvent as ReactMouseEvent } from 'react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type {
  NodeDragHandler,
  OnConnectStartParams,
  Connection as ReactFlowConnection,
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
} from 'reactflow';
import { ReactFlow, ConnectionLineType, useKeyPress, useNodesState } from 'reactflow';
import { ActionCreators } from 'redux-undo';

type CanvasExtent = [[number, number], [number, number]];

interface ReactFlowWrapperProps {
  canvasBlockHeight: number;
  canvasBlockWidth: number;
  useExpandedFunctionCards: boolean;
  openMapChecker: () => void;
}

export const ReactFlowWrapper = ({
  canvasBlockHeight,
  canvasBlockWidth,
  useExpandedFunctionCards,
  openMapChecker,
}: ReactFlowWrapperProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const reactFlowRef = useRef<HTMLDivElement>(null);

  const selectedItemKey = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemKey);
  const currentTargetSchemaNode = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.currentTargetSchemaNode);
  const connections = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);
  // NOTE: Includes nodes added from toolbox, and nodes with connection chains to target schema nodes on the current target schema level
  const currentSourceSchemaNodes = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.currentSourceSchemaNodes);
  const functionNodes = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.functionNodes);
  const sourceSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchema);
  const flattenedSourceSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedSourceSchema);
  const sourceSchemaOrdering = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.sourceSchemaOrdering);
  const flattenedTargetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedTargetSchema);
  const notificationData = useSelector((state: RootState) => state.dataMap.present.notificationData);

  const [canvasZoom, setCanvasZoom] = useState(defaultCanvasZoom);
  const [displayMiniMap, { toggle: toggleDisplayMiniMap }] = useBoolean(false);

  const nodeTypes = useMemo(
    () => ({
      [ReactFlowNodeType.SchemaNode]: SchemaCard,
      [ReactFlowNodeType.FunctionNode]: useExpandedFunctionCards ? ExpandedFunctionCard : SimpleFunctionCard,
      [ReactFlowNodeType.FunctionPlaceholder]: AddedFunctionPlaceholder,
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
        : functionNodes[connection.source].functionData;
      const destination = connection.target.startsWith(targetPrefix)
        ? flattenedTargetSchema[connection.target]
        : functionNodes[connection.target].functionData;

      dispatch(
        makeConnection({
          source,
          destination,
          reactFlowDestination: connection.target,
          reactFlowSource: connection.source,
          specificInput:
            connection.targetHandle && isFunctionData(destination) ? inputFromHandleId(connection.targetHandle, destination) : undefined,
        })
      );
    }
  };

  const onConnectStart = (_event: React.MouseEvent | React.TouchEvent, { nodeId, handleType }: OnConnectStartParams) => {
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

  const deletePressed = useKeyPress(['Delete', 'Backspace']);
  useEffect(() => {
    if (deletePressed) {
      dispatch(deleteCurrentlySelectedItem());
    }
  }, [deletePressed, dispatch]);

  const ctrlZPressed = useKeyPress(['Meta+z', 'Control+z']);
  useEffect(() => {
    if (ctrlZPressed) {
      dispatch(ActionCreators.undo());
    }
  }, [ctrlZPressed, dispatch]);

  const ctrlYPressed = useKeyPress(['Meta+y', 'Control+y']);
  useEffect(() => {
    if (ctrlYPressed) {
      dispatch(ActionCreators.redo());
    }
  }, [ctrlYPressed, dispatch]);

  const [nodesState, setNodes, onNodesChange] = useNodesState([]);

  // eslint-disable-next-line prefer-const
  let [nodes, edges, diagramSize] = useLayout(
    currentSourceSchemaNodes,
    functionNodes,
    currentTargetSchemaNode,
    connections,
    selectedItemKey,
    sourceSchemaOrdering,
    useExpandedFunctionCards
  );

  if (nodesState.length !== nodes.length) {
    setNodes(nodes);
  }

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

  const onFunctionNodeDrag: NodeDragHandler = (_event, node, _nodes) => {
    const unaffectedNodes = nodesState.filter((nodeFromState) => nodeFromState.id !== node.id);
    nodes = [...unaffectedNodes, node];
    setNodes(nodes);
  };

  const onFunctionNodeDragStop: NodeDragHandler = (event, node, _nodes) => {
    const positionMetadata: FunctionPositionMetadata = {
      targetKey: currentTargetSchemaNode?.key || '',
      position: node.position,
    };
    dispatch(updateFunctionPosition({ id: node.id, positionMetadata }));
  };

  return (
    <ReactFlow
      ref={reactFlowRef}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeDragStop={onFunctionNodeDragStop}
      nodes={nodesState}
      edges={edges}
      onPaneClick={onPaneClick}
      nodesFocusable={false} // we handle keyboard focus from within the node
      // Not ideal, but it's this or useViewport that re-renders 3000 (due to x/y changes)
      onMove={(_e, viewport) => setCanvasZoom(viewport.zoom)}
      onConnect={onConnect}
      onNodeDrag={onFunctionNodeDrag}
      onConnectStart={onConnectStart}
      onConnectEnd={onConnectEnd}
      onNodesChange={onNodesChange}
      onEdgeClick={onEdgeClick}
      onNodeClick={onNodeSingleClick}
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
          openMapChecker={openMapChecker}
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
