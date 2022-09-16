import type { ButtonContainerProps } from '../components/buttonContainer/ButtonContainer';
import { ButtonContainer } from '../components/buttonContainer/ButtonContainer';
import type { ButtonPivotProps } from '../components/buttonPivot/ButtonPivot';
import { ButtonPivot } from '../components/buttonPivot/ButtonPivot';
import { ExpressionList } from '../components/expressionList/expressionList';
import type { FloatingPanelProps } from '../components/floatingPanel/FloatingPanel';
import { FloatingPanel } from '../components/floatingPanel/FloatingPanel';
import { ExpressionCard } from '../components/nodeCard/ExpressionCard';
import { SchemaCard, type SchemaCardProps } from '../components/nodeCard/SchemaCard';
import { SchemaTree } from '../components/tree/SchemaTree';
import { checkerboardBackgroundImage, defaultCanvasZoom } from '../constants/ReactFlowConstants';
import {
  addExpressionNode,
  addInputNodes,
  changeConnection,
  deleteConnection,
  makeConnection,
  removeInputNodes,
  setCurrentlySelectedNode,
  setCurrentOutputNode,
  toggleInputNode,
} from '../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../core/state/Store';
import { type SchemaExtended, SchemaTypes, type SchemaNodeExtended } from '../models';
import type { Expression } from '../models/Expression';
import type { SelectedExpressionNode, SelectedInputNode, SelectedOutputNode } from '../models/SelectedNode';
import { NodeType } from '../models/SelectedNode';
import { inputPrefix, outputPrefix, ReactFlowNodeType, useLayout } from '../utils/ReactFlow.Util';
import { allChildNodesSelected, hasAConnectionAtCurrentOutputNode, isLeafNode } from '../utils/Schema.Utils';
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';
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
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import ReactFlow, { ConnectionLineType, MiniMap, useReactFlow } from 'react-flow-renderer';
import type { Connection as ReactFlowConnection, Edge as ReactFlowEdge, Node as ReactFlowNode } from 'react-flow-renderer';
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
  inputSchema: SchemaExtended;
}

// ReactFlow must be wrapped if we want to access the internal state of ReactFlow
export const ReactFlowWrapper = ({ inputSchema }: ReactFlowWrapperProps) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const currentlySelectedInputNodes = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentInputNodes);
  const flattenedOutputSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedOutputSchema);
  const allExpressionNodes = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentExpressionNodes);
  const flattenedInputSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedInputSchema);
  const currentOutputNode = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentOutputNode);
  const connections = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);
  const currentConnections = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);
  const [displayToolboxItem, setDisplayToolboxItem] = useState<string | undefined>();
  const [displayMiniMap, { toggle: toggleDisplayMiniMap }] = useBoolean(false);

  const clickTimerRef: { current: ReturnType<typeof setTimeout> | null } = useRef(null); // NOTE: ReturnType to support NodeJS & window Timeouts
  const edgeUpdateSuccessful = useRef(true);
  const nodeTypes = useMemo(() => ({ schemaNode: SchemaCard, expressionNode: ExpressionCard }), []);

  // TODO update to support input nodes connected to an expression, connected to an output node
  const connectedInputNodes = useMemo(() => {
    if (currentOutputNode) {
      const connectionValues = Object.values(connections);
      const outputFilteredConnections = currentOutputNode.children.flatMap((childNode) => {
        const foundConnection = connectionValues.find((connection) => connection.destination === childNode.key);
        return foundConnection ? [foundConnection] : [];
      });

      return outputFilteredConnections
        .map((connection) => {
          return flattenedInputSchema[connection.reactFlowSource];
        })
        .filter((connection) => connection !== undefined);
    } else {
      return [];
    }
  }, [flattenedInputSchema, currentOutputNode, connections]);

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

  const handleNodeClicks = (_event: ReactMouseEvent, node: ReactFlowNode) => {
    if (clickTimerRef.current !== null) {
      // Double click
      onNodeDoubleClick(node);

      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    } else {
      // Single click
      clickTimerRef.current = setTimeout(() => {
        onNodeSingleClick(node);

        clearTimeout(clickTimerRef.current as unknown as number);
        clickTimerRef.current = null;
      }, 200); // ms to wait for potential second click
    }
  };

  const onExpressionItemClick = (selectedExpression: Expression) => {
    dispatch(addExpressionNode(selectedExpression));
  };

  const onToolboxItemClick = (selectedNode: SchemaNodeExtended) => {
    if (isLeafNode(selectedNode)) {
      if (currentOutputNode && !hasAConnectionAtCurrentOutputNode(selectedNode, currentOutputNode, currentConnections)) {
        dispatch(toggleInputNode(selectedNode));
      }
    } else {
      if (allChildNodesSelected(selectedNode, currentlySelectedInputNodes)) {
        // TODO reconfirm this works for loops and conditionals
        const nodesToRemove = selectedNode.children.filter((childNodes) =>
          Object.values(currentConnections).some((currentConnection) => childNodes.key !== currentConnection.sourceValue)
        );
        dispatch(removeInputNodes(nodesToRemove));
      } else {
        dispatch(addInputNodes(selectedNode.children));
      }
    }
  };

  const onNodeSingleClick = (node: ReactFlowNode): void => {
    console.log(node);
    if (node.type === ReactFlowNodeType.SchemaNode) {
      if (node.data.schemaType === SchemaTypes.Input) {
        const selectedInputNode: SelectedInputNode = {
          nodeType: NodeType.Input,
          name: node.data.label,
          path: node.id.replace(inputPrefix, ''),
          dataType: node.data.nodeDataType,
        };

        dispatch(setCurrentlySelectedNode(selectedInputNode));
      } else if (node.data.schemaType === SchemaTypes.Output) {
        const selectedOutputNode: SelectedOutputNode = {
          nodeType: NodeType.Output,
          name: node.data.label,
          path: node.id.replace(outputPrefix, ''),
          dataType: node.data.nodeDataType,
          defaultValue: '', // TODO: this property and below
          doNotGenerateIfNoValue: true,
          nullable: true,
          inputIds: [],
        };

        dispatch(setCurrentlySelectedNode(selectedOutputNode));
      }
    } else if (node.type === ReactFlowNodeType.ExpressionNode) {
      const selectedExpressionNode: SelectedExpressionNode = {
        nodeType: NodeType.Expression,
        name: node.data.expressionName,
        inputs: node.data.inputs,
        branding: node.data.expressionBranding,
        description: '', // TODO: this property and below
        codeEx: '',
        definition: '',
        outputId: '',
      };

      dispatch(setCurrentlySelectedNode(selectedExpressionNode));
    }
  };

  const onNodeDoubleClick = (node: ReactFlowNode<SchemaCardProps>): void => {
    if (node.data.schemaType === SchemaTypes.Output && !node.data.isLeaf) {
      const newCurrentSchemaNode = flattenedOutputSchema[node.id];
      if (currentOutputNode && newCurrentSchemaNode) {
        dispatch(setCurrentOutputNode({ schemaNode: newCurrentSchemaNode, resetSelectedInputNodes: true }));
      }
    }
  };

  const onConnect = (connection: ReactFlowConnection) => {
    if (connection.target && connection.source) {
      dispatch(makeConnection({ outputNodeKey: connection.target, value: connection.source }));
    }
  };

  const onEdgeUpdateStart = useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);

  const onEdgeUpdate = useCallback(
    (oldEdge: ReactFlowEdge, newConnection: ReactFlowConnection) => {
      edgeUpdateSuccessful.current = true;
      if (newConnection.target && newConnection.source && oldEdge.target) {
        dispatch(changeConnection({ outputNodeKey: newConnection.target, value: newConnection.source, oldConnectionKey: oldEdge.id }));
      }
    },
    [dispatch]
  );

  const onEdgeUpdateEnd = useCallback(
    (_: any, edge: ReactFlowEdge) => {
      if (!edgeUpdateSuccessful.current) {
        if (edge.target) {
          dispatch(deleteConnection({ oldConnectionKey: edge.id }));
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
        value: 'inputSchemaTreePanel',
      },
      {
        tooltip: functionLoc,
        regularIcon: MathFormula20Regular,
        filledIcon: MathFormula20Filled,
        value: 'expressionsPanel',
      },
    ],
    horizontal: true,
    xPos: '16px',
    yPos: '16px',
    selectedValue: displayToolboxItem,
    onTabSelect: onTabSelect,
  };

  useEffect(() => {
    return () => clearTimeout(clickTimerRef.current as unknown as number); // Make sure we clean up the timeout
  }, []);

  const [nodes, edges] = useLayout(currentlySelectedInputNodes, connectedInputNodes, allExpressionNodes, currentOutputNode, connections);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onConnect={onConnect}
      onPaneClick={onPaneClick}
      onNodeClick={handleNodeClicks}
      onNodeDoubleClick={handleNodeClicks}
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
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      }}
      nodeTypes={nodeTypes}
      onEdgeUpdate={onEdgeUpdate}
      onEdgeUpdateStart={onEdgeUpdateStart}
      onEdgeUpdateEnd={onEdgeUpdateEnd}
    >
      <ButtonPivot {...toolboxButtonPivotProps} />
      {displayToolboxItem === 'inputSchemaTreePanel' && (
        <FloatingPanel {...toolboxPanelProps}>
          {inputSchema && (
            <SchemaTree
              schema={inputSchema}
              currentlySelectedNodes={currentlySelectedInputNodes}
              visibleConnectedNodes={connectedInputNodes}
              onNodeClick={onToolboxItemClick}
            />
          )}
        </FloatingPanel>
      )}
      {displayToolboxItem === 'expressionsPanel' && (
        <FloatingPanel {...toolboxPanelProps}>
          <ExpressionList sample="sample" onExpressionClick={onExpressionItemClick}></ExpressionList>
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
