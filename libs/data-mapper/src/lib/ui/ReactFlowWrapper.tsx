import type { ButtonContainerProps } from '../components/buttonContainer/ButtonContainer';
import { ButtonContainer } from '../components/buttonContainer/ButtonContainer';
import type { ButtonPivotProps } from '../components/buttonPivot/ButtonPivot';
import { ButtonPivot } from '../components/buttonPivot/ButtonPivot';
import type { FloatingPanelProps } from '../components/floatingPanel/FloatingPanel';
import { FloatingPanel } from '../components/floatingPanel/FloatingPanel';
import { FunctionList } from '../components/functionList/FunctionList';
import { FunctionCard } from '../components/nodeCard/FunctionCard';
import { SchemaCard } from '../components/nodeCard/SchemaCard';
import { SchemaTree } from '../components/tree/SchemaTree';
import { checkerboardBackgroundImage, defaultCanvasZoom } from '../constants/ReactFlowConstants';
import {
  addFunctionNode,
  addSourceNodes,
  changeConnection,
  deleteConnection,
  makeConnection,
  removeSourceNodes,
  setCurrentlySelectedEdge,
  setCurrentlySelectedNode,
  toggleSourceNode,
} from '../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../core/state/Store';
import type { SchemaExtended, SchemaNodeExtended } from '../models';
import { SchemaTypes } from '../models';
import type { FunctionData } from '../models/Function';
import type { SelectedFunctionNode, SelectedSourceNode, SelectedTargetNode } from '../models/SelectedNode';
import { NodeType } from '../models/SelectedNode';
import { inputPrefix, outputPrefix, ReactFlowNodeType, useLayout } from '../utils/ReactFlow.Util';
import { allChildNodesSelected, hasAConnectionAtCurrentTargetNode, isLeafNode } from '../utils/Schema.Utils';
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
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { Connection as ReactFlowConnection, Edge as ReactFlowEdge, Node as ReactFlowNode } from 'react-flow-renderer';
import ReactFlow, { ConnectionLineType, MiniMap, useReactFlow } from 'react-flow-renderer';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

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
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const currentlySelectedSourceNodes = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentSourceNodes);
  const allFunctionNodes = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentFunctionNodes);
  const flattenedSourceSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedSourceSchema);
  const currentTargetNode = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentTargetNode);
  const connections = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);
  const currentConnections = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);
  const [displayToolboxItem, setDisplayToolboxItem] = useState<string | undefined>();
  const [displayMiniMap, { toggle: toggleDisplayMiniMap }] = useBoolean(false);

  const edgeUpdateSuccessful = useRef(true);
  const nodeTypes = useMemo(() => ({ schemaNode: SchemaCard, functionNode: FunctionCard }), []);

  // TODO update to support input nodes connected to an function, connected to an output node
  const connectedSourceNodes = useMemo(() => {
    if (currentTargetNode) {
      const connectionValues = Object.values(connections);
      const outputFilteredConnections = currentTargetNode.children.flatMap((childNode) => {
        const foundConnection = connectionValues.find((connection) => connection.destination === childNode.key);
        return foundConnection ? [foundConnection] : [];
      });

      return outputFilteredConnections
        .map((connection) => {
          return flattenedSourceSchema[connection.reactFlowSource];
        })
        .filter((connection) => connection !== undefined);
    } else {
      return [];
    }
  }, [flattenedSourceSchema, currentTargetNode, connections]);

  const onTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    if (data.value === displayToolboxItem) {
      setDisplayToolboxItem(undefined);
    } else {
      setDisplayToolboxItem(data.value as string);
    }
  };

  const onPaneClick = (_event: ReactMouseEvent | MouseEvent | TouchEvent): void => {
    // If user clicks on pane (empty canvas area), "deselect" node
    dispatch(setCurrentlySelectedNode(undefined));
    setDisplayToolboxItem(undefined);
  };

  const onFunctionItemClick = (selectedFunction: FunctionData) => {
    dispatch(addFunctionNode(selectedFunction));
  };

  const onToolboxItemClick = (selectedNode: SchemaNodeExtended) => {
    if (isLeafNode(selectedNode)) {
      if (currentTargetNode && !hasAConnectionAtCurrentTargetNode(selectedNode, currentTargetNode, currentConnections)) {
        dispatch(toggleSourceNode(selectedNode));
      }
    } else {
      if (allChildNodesSelected(selectedNode, currentlySelectedSourceNodes)) {
        // TODO reconfirm this works for loops and conditionals
        const nodesToRemove = selectedNode.children.filter((childNodes) =>
          Object.values(currentConnections).some((currentConnection) => childNodes.key !== currentConnection.sourceValue)
        );
        dispatch(removeSourceNodes(nodesToRemove));
      } else {
        dispatch(addSourceNodes(selectedNode.children));
      }
    }
  };

  const onNodeSingleClick = (_event: ReactMouseEvent, node: ReactFlowNode): void => {
    if (node.type === ReactFlowNodeType.SchemaNode) {
      if (node.data.schemaType === SchemaTypes.Source) {
        const selectedSourceNode: SelectedSourceNode = {
          nodeType: NodeType.Source,
          name: node.data.schemaNode.name,
          path: node.id.replace(inputPrefix, ''),
          dataType: node.data.schemaNode.schemaNodeDataType,
        };

        dispatch(setCurrentlySelectedNode(selectedSourceNode));
      } else if (node.data.schemaType === SchemaTypes.Target) {
        const selectedTargetNode: SelectedTargetNode = {
          nodeType: NodeType.Target,
          name: node.data.schemaNode.name,
          path: node.id.replace(outputPrefix, ''),
          dataType: node.data.schemaNode.schemaNodeDataType,
          defaultValue: '', // TODO: this property and below
          doNotGenerateIfNoValue: true,
          nullable: true,
          inputIds: [],
        };

        dispatch(setCurrentlySelectedNode(selectedTargetNode));
      }
    } else if (node.type === ReactFlowNodeType.FunctionNode) {
      const selectedFunctionNode: SelectedFunctionNode = {
        nodeType: NodeType.Function,
        id: node.id,
        name: node.data.functionName,
        inputs: node.data.inputs,
        branding: node.data.functionBranding,
        description: '', // TODO: this property and below
        codeEx: '',
        outputId: '',
      };

      dispatch(setCurrentlySelectedNode(selectedFunctionNode));
    }
  };

  const onConnect = (connection: ReactFlowConnection) => {
    if (connection.target && connection.source) {
      dispatch(makeConnection({ targetNodeKey: connection.target, value: connection.source }));
    }
  };

  const onEdgeUpdateStart = useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);

  const onEdgeUpdate = useCallback(
    (oldEdge: ReactFlowEdge, newConnection: ReactFlowConnection) => {
      edgeUpdateSuccessful.current = true;
      if (newConnection.target && newConnection.source && oldEdge.target) {
        dispatch(changeConnection({ targetNodeKey: newConnection.target, value: newConnection.source, oldConnectionKey: oldEdge.id }));
      }
    },
    [dispatch]
  );

  const onEdgeUpdateEnd = useCallback(
    (_: any, edge: ReactFlowEdge) => {
      if (!edgeUpdateSuccessful.current) {
        if (edge.target) {
          dispatch(deleteConnection(edge.id));
        }
      }

      edgeUpdateSuccessful.current = true;
    },
    [dispatch]
  );

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

  const [nodes, edges] = useLayout(
    currentlySelectedSourceNodes,
    connectedSourceNodes,
    flattenedSourceSchema,
    allFunctionNodes,
    currentTargetNode,
    connections
  );

  const onEdgeClick = (_event: React.MouseEvent, node: ReactFlowEdge) => {
    const selectedNode = edges.find((edge) => edge.id === node.id);
    if (selectedNode) {
      selectedNode.selected = !selectedNode.selected;
    }
    dispatch(setCurrentlySelectedEdge(node.id));
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onConnect={onConnect}
      onPaneClick={onPaneClick}
      onNodeClick={onNodeSingleClick}
      defaultZoom={defaultCanvasZoom}
      nodesDraggable={false}
      fitView={false}
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
      nodeTypes={nodeTypes}
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
              currentlySelectedNodes={currentlySelectedSourceNodes}
              visibleConnectedNodes={connectedSourceNodes}
              onNodeClick={onToolboxItemClick}
            />
          )}
        </FloatingPanel>
      )}
      {displayToolboxItem === 'functionsPanel' && (
        <FloatingPanel {...toolboxPanelProps}>
          <FunctionList sample="sample" onFunctionClick={onFunctionItemClick}></FunctionList>
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
    </ReactFlow>
  );
};
