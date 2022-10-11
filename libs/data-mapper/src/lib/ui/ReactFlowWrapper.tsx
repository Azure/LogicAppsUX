import type { ButtonContainerProps } from '../components/buttonContainer/ButtonContainer';
import { ButtonContainer } from '../components/buttonContainer/ButtonContainer';
import type { ButtonPivotProps } from '../components/buttonPivot/ButtonPivot';
import { ButtonPivot } from '../components/buttonPivot/ButtonPivot';
import { ConnectionEdge } from '../components/edge/ConnectionEdge';
import type { FloatingPanelProps } from '../components/floatingPanel/FloatingPanel';
import { FloatingPanel } from '../components/floatingPanel/FloatingPanel';
import { FunctionList } from '../components/functionList/FunctionList';
import { FunctionCard } from '../components/nodeCard/FunctionCard';
import { SchemaCard } from '../components/nodeCard/SchemaCard';
import { Notification } from '../components/notification/Notification';
import { SchemaTree } from '../components/tree/SchemaTree';
import {
  checkerboardBackgroundImage,
  defaultCanvasZoom,
  ReactFlowEdgeType,
  ReactFlowNodeType,
  sourcePrefix,
  targetPrefix,
} from '../constants/ReactFlowConstants';
import {
  addFunctionNode,
  addSourceNodes,
  changeConnection,
  deleteConnection,
  deleteCurrentlySelectedItem,
  hideNotification,
  makeConnection,
  removeSourceNodes,
  setCurrentlySelectedEdge,
  setCurrentlySelectedNode,
  unsetSelectedEdges,
} from '../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../core/state/Store';
import type { SchemaExtended, SchemaNodeExtended } from '../models';
import { SchemaTypes } from '../models';
import type { ConnectionUnit } from '../models/Connection';
import type { FunctionData } from '../models/Function';
import type { ViewportCoords } from '../models/ReactFlow';
import type { SelectedNode } from '../models/SelectedNode';
import { NodeType } from '../models/SelectedNode';
import { isCustomValue } from '../utils/DataMap.Utils';
import { useLayout } from '../utils/ReactFlow.Util';
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import { tokens } from '@fluentui/react-components';
import { useBoolean } from '@fluentui/react-hooks';
import {
  CubeTree20Filled,
  CubeTree20Regular,
  Map20Filled,
  Map20Regular,
  MathFormula20Filled,
  MathFormula20Regular,
  PageFit20Filled,
  PageFit20Regular,
  ZoomIn20Filled,
  ZoomIn20Regular,
  ZoomOut20Filled,
  ZoomOut20Regular,
} from '@fluentui/react-icons';
import type { KeyboardEventHandler, MouseEvent as ReactMouseEvent } from 'react';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import type { Connection as ReactFlowConnection, Edge as ReactFlowEdge, Node as ReactFlowNode, Viewport } from 'reactflow';
// eslint-disable-next-line import/no-named-as-default
import ReactFlow, { ConnectionLineType, MiniMap, useReactFlow } from 'reactflow';

export const nodeTypes = { [ReactFlowNodeType.SchemaNode]: SchemaCard, [ReactFlowNodeType.FunctionNode]: FunctionCard };
export const edgeTypes = { [ReactFlowEdgeType.ConnectionEdge]: ConnectionEdge };

const toolboxPanelProps: FloatingPanelProps = {
  xPos: '16px',
  yPos: '76px',
  width: '250px',
  minHeight: '450px',
  maxHeight: '450px',
};

interface ReactFlowWrapperProps {
  sourceSchema: SchemaExtended;
}

// ReactFlow must be wrapped if we want to access the internal state of ReactFlow
export const ReactFlowWrapper = ({ sourceSchema }: ReactFlowWrapperProps) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { fitView, zoomIn, zoomOut, project } = useReactFlow();

  const functionData = useSelector((state: RootState) => state.function.availableFunctions);
  const addedFunctionNodes = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentFunctionNodes);
  const currentlySelectedNode = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentlySelectedNode);
  const currentlyAddedSourceNodes = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentSourceNodes);
  const flattenedSourceSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedSourceSchema);
  const flattenedTargetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedTargetSchema);
  const currentTargetNode = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentTargetNode);
  const notificationData = useSelector((state: RootState) => state.dataMap.notificationData);
  const connections = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);

  const [canvasViewportCoords, setCanvasViewportCoords] = useState<ViewportCoords>({ startX: 0, endX: 0, startY: 0, endY: 0 });
  const [displayToolboxItem, setDisplayToolboxItem] = useState<string>('');
  const [displayMiniMap, { toggle: toggleDisplayMiniMap }] = useBoolean(false);

  const reactFlowRef = useRef<HTMLDivElement>(null);
  const edgeUpdateSuccessful = useRef(true);

  // TODO update to support input nodes connected to an function, connected to an output node
  const connectedSourceNodes = useMemo(() => {
    if (currentTargetNode) {
      const connectionValues = Object.values(connections);
      const outputFilteredConnections = currentTargetNode.children.flatMap((childNode) => {
        const foundConnection = connectionValues.find((connection) => connection.destination.node.key === childNode.key);
        return foundConnection ? [foundConnection] : [];
      });

      return outputFilteredConnections
        .flatMap((connection) => {
          const potentialSourceSchemaNodes = connection.inputs.filter((input) => !!input && !isCustomValue(input)) as ConnectionUnit[];
          return potentialSourceSchemaNodes.map((input) => flattenedSourceSchema[input.node.key]);
        })
        .filter((connection) => connection !== undefined);
    } else {
      return [];
    }
  }, [flattenedSourceSchema, currentTargetNode, connections]);

  const onTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    if (data.value === displayToolboxItem) {
      setDisplayToolboxItem('');
    } else {
      setDisplayToolboxItem(data.value as string);
    }
  };

  const onPaneClick = (_event: ReactMouseEvent | MouseEvent | TouchEvent): void => {
    // If user clicks on pane (empty canvas area), "deselect" node
    if (currentlySelectedNode) {
      dispatch(setCurrentlySelectedNode(undefined));
    }

    // Unselect all edges/lines
    dispatch(unsetSelectedEdges());

    setDisplayToolboxItem('');
  };

  const onFunctionItemClick = (selectedFunction: FunctionData) => {
    dispatch(addFunctionNode(selectedFunction));
  };

  const onToolboxItemClick = (selectedNode: SchemaNodeExtended) => {
    if (
      currentlyAddedSourceNodes.some((node) => {
        return node.key === selectedNode.key;
      })
    ) {
      dispatch(removeSourceNodes([selectedNode]));
    } else {
      dispatch(addSourceNodes([selectedNode]));
    }
  };

  const onNodeSingleClick = (_event: ReactMouseEvent, node: ReactFlowNode): void => {
    const newSelectedNode: SelectedNode = {
      id: node.id,
      type: NodeType.Function,
    };

    if (node.type === ReactFlowNodeType.SchemaNode) {
      newSelectedNode.type = node.data.schemaType === SchemaTypes.Source ? NodeType.Source : NodeType.Target;
    }

    dispatch(setCurrentlySelectedNode(newSelectedNode));
  };

  const onConnect = (connection: ReactFlowConnection) => {
    if (connection.target && connection.source) {
      const source = connection.source.startsWith(sourcePrefix)
        ? flattenedSourceSchema[connection.source]
        : addedFunctionNodes[connection.source];
      const destination = connection.target.startsWith(targetPrefix)
        ? flattenedTargetSchema[connection.target]
        : addedFunctionNodes[connection.target];

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

  const onEdgeUpdateStart = useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);

  const onEdgeUpdate = useCallback(
    (oldEdge: ReactFlowEdge, newConnection: ReactFlowConnection) => {
      edgeUpdateSuccessful.current = true;
      if (newConnection.target && newConnection.source && oldEdge.target) {
        const source = newConnection.source.startsWith(sourcePrefix)
          ? flattenedSourceSchema[newConnection.source]
          : addedFunctionNodes[newConnection.source];
        const destination = newConnection.target.startsWith(targetPrefix)
          ? flattenedTargetSchema[newConnection.target]
          : addedFunctionNodes[newConnection.target];

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
    [dispatch, flattenedSourceSchema, flattenedTargetSchema, addedFunctionNodes]
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
    if (node) {
      dispatch(setCurrentlySelectedEdge(node.target));
    }
  };

  const keyDownHandler: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      dispatch(deleteCurrentlySelectedItem());
    }
  };

  const toolboxLoc = intl.formatMessage({
    defaultMessage: 'Toolbox',
    description: 'Label to open the input toolbox card',
  });

  const functionLoc = intl.formatMessage({
    defaultMessage: 'Function',
    description: 'Label to open the Function card',
  });

  const zoomOutLoc = intl.formatMessage({
    defaultMessage: 'Zoom out',
    description: 'Label to zoom the canvas out',
  });

  const zoomInLoc = intl.formatMessage({
    defaultMessage: 'Zoom in',
    description: 'Label to zoom the canvas in',
  });

  const fitViewLoc = intl.formatMessage({
    defaultMessage: 'Page fit',
    description: 'Label to fit the whole canvas in view',
  });

  const displayMiniMapLoc = intl.formatMessage({
    defaultMessage: 'Display mini map',
    description: 'Label to toggle the mini map',
  });

  const mapControlsButtonContainerProps: ButtonContainerProps = {
    buttons: [
      {
        tooltip: zoomOutLoc,
        regularIcon: ZoomOut20Regular,
        filledIcon: ZoomOut20Filled,
        onClick: zoomOut,
      },
      {
        tooltip: zoomInLoc,
        regularIcon: ZoomIn20Regular,
        filledIcon: ZoomIn20Filled,
        onClick: zoomIn,
      },
      {
        tooltip: fitViewLoc,
        regularIcon: PageFit20Regular,
        filledIcon: PageFit20Filled,
        onClick: fitView,
      },
      {
        tooltip: displayMiniMapLoc,
        regularIcon: Map20Regular,
        filledIcon: Map20Filled,
        filled: displayMiniMap,
        onClick: toggleDisplayMiniMap,
      },
    ],
    horizontal: true,
    xPos: '16px',
    yPos: '16px',
    anchorToBottom: true,
  };

  const toolboxButtonPivotProps: ButtonPivotProps = {
    buttons: [
      {
        tooltip: toolboxLoc,
        regularIcon: CubeTree20Regular,
        filledIcon: CubeTree20Filled,
        value: 'sourceSchemaTreePanel',
      },
      {
        tooltip: functionLoc,
        regularIcon: MathFormula20Regular,
        filledIcon: MathFormula20Filled,
        value: 'functionsPanel',
      },
    ],
    horizontal: true,
    xPos: '16px',
    yPos: '16px',
    selectedValue: displayToolboxItem,
    onTabSelect: onTabSelect,
  };

  useLayoutEffect(() => {
    const handleCanvasViewportCoords = () => {
      if (reactFlowRef.current) {
        const bounds = reactFlowRef.current.getBoundingClientRect();

        const startProjection = project({
          x: bounds.left,
          y: bounds.top,
        });

        const endProjection = project({
          x: bounds.left + Math.max(bounds.width, 1000), // Min canvas width of 1000px
          y: bounds.top + bounds.height,
        });

        setCanvasViewportCoords({
          startX: startProjection.x,
          endX: endProjection.x,
          startY: startProjection.y,
          endY: endProjection.y,
        });
      }
    };

    window.addEventListener('resize', handleCanvasViewportCoords);

    handleCanvasViewportCoords();

    return () => window.removeEventListener('resize', handleCanvasViewportCoords);
  }, [project]);

  const [nodes, edges] = useLayout(
    canvasViewportCoords,
    currentlyAddedSourceNodes,
    connectedSourceNodes,
    flattenedSourceSchema,
    addedFunctionNodes,
    currentTargetNode,
    connections
  );

  const defaultViewport: Viewport = { x: 0, y: 0, zoom: defaultCanvasZoom };
  return (
    <ReactFlow
      ref={reactFlowRef}
      onKeyDown={keyDownHandler}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodes={nodes}
      edges={edges}
      onConnect={onConnect}
      onPaneClick={onPaneClick}
      onNodeClick={onNodeSingleClick}
      defaultViewport={defaultViewport}
      nodesDraggable={false}
      fitView={false}
      // With custom edge component, only affects appearance when drawing edge
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
      onEdgeUpdate={onEdgeUpdate}
      onEdgeUpdateStart={onEdgeUpdateStart}
      onEdgeUpdateEnd={onEdgeUpdateEnd}
      onEdgeClick={onEdgeClick}
    >
      <ButtonPivot {...toolboxButtonPivotProps} />

      {displayToolboxItem === 'sourceSchemaTreePanel' && (
        <FloatingPanel {...toolboxPanelProps}>
          {sourceSchema && (
            <SchemaTree
              schema={sourceSchema}
              toggledNodes={[...currentlyAddedSourceNodes, ...connectedSourceNodes]}
              onNodeClick={onToolboxItemClick}
            />
          )}
        </FloatingPanel>
      )}

      {displayToolboxItem === 'functionsPanel' && (
        <FloatingPanel {...toolboxPanelProps}>
          <FunctionList functionData={functionData} onFunctionClick={onFunctionItemClick}></FunctionList>
        </FloatingPanel>
      )}

      <ButtonContainer {...mapControlsButtonContainerProps} />

      {displayMiniMap && (
        <MiniMap
          nodeStrokeColor={(node) => {
            if (node.style?.backgroundColor) {
              return node.style.backgroundColor;
            }
            return '#F3F2F1';
          }}
          nodeColor={(node) => {
            if (node.style?.backgroundColor) {
              return node.style.backgroundColor;
            }
            return '#F3F2F1';
          }}
          style={{
            left: '16px',
            bottom: '56px',
            // TODO resize smaller to match the width of the buttons (128px wide)
          }}
        />
      )}

      {notificationData && (
        <Notification
          type={notificationData.type}
          msgParam={notificationData.msgParam}
          msgBody={notificationData.msgBody}
          onClose={() => dispatch(hideNotification())}
        />
      )}
    </ReactFlow>
  );
};
