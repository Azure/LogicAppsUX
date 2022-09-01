import { checkerboardBackgroundImage } from '../Constants';
import { EditorBreadcrumb } from '../components/breadcrumb/EditorBreadcrumb';
import type { ButtonContainerProps } from '../components/buttonContainer/ButtonContainer';
import { ButtonContainer } from '../components/buttonContainer/ButtonContainer';
import type { ButtonPivotProps } from '../components/buttonPivot/ButtonPivot';
import { ButtonPivot } from '../components/buttonPivot/ButtonPivot';
import { EditorCommandBar } from '../components/commandBar/EditorCommandBar';
import type { SchemaFile } from '../components/configPanel/ChangeSchemaView';
import { EditorConfigPanel } from '../components/configPanel/EditorConfigPanel';
import type { FloatingPanelProps } from '../components/floatingPanel/FloatingPanel';
import { FloatingPanel } from '../components/floatingPanel/FloatingPanel';
import { MapOverview } from '../components/mapOverview/MapOverview';
import type { SchemaCardProps } from '../components/nodeCard/SchemaCard';
import { SchemaCard } from '../components/nodeCard/SchemaCard';
import { PropertiesPane } from '../components/propertiesPane/PropertiesPane';
import { SchemaTree } from '../components/tree/SchemaTree';
import { WarningModal } from '../components/warningModal/WarningModal';
import {
  makeConnection,
  redoDataMapOperation,
  saveDataMap,
  setCurrentlySelectedNode,
  setCurrentOutputNode,
  toggleInputNode,
  undoDataMapOperation,
} from '../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../core/state/Store';
import type { SchemaNodeExtended, SelectedNode } from '../models';
import { NodeType, SchemaTypes } from '../models';
import { convertToMapDefinition } from '../utils/DataMap.Utils';
import { convertToReactFlowEdges, convertToReactFlowNodes, ReactFlowNodeType } from '../utils/ReactFlow.Util';
import './ReactFlowStyleOverrides.css';
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
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { Connection as ReactFlowConnection, Edge as ReactFlowEdge, Node as ReactFlowNode } from 'react-flow-renderer';
import ReactFlow, { ConnectionLineType, MiniMap, ReactFlowProvider, useReactFlow } from 'react-flow-renderer';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export interface DataMapperDesignerProps {
  saveStateCall: (dataMapDefinition: string) => void;
  addSchemaFromFile?: (selectedSchemaFile: SchemaFile) => void;
  readCurrentSchemaOptions?: () => void;
}

export const DataMapperDesigner: React.FC<DataMapperDesignerProps> = ({ saveStateCall, addSchemaFromFile, readCurrentSchemaOptions }) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const clickTimerRef: { current: ReturnType<typeof setTimeout> | null } = useRef(null); // NOTE: ReturnType to support NodeJS & window Timeouts

  const inputSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.inputSchema);
  const currentlySelectedInputNodes = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentInputNodes);
  const outputSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.outputSchema);
  const flattenedOutputSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedOutputSchema);
  const currentConnections = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);
  const currentlySelectedNode = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentlySelectedNode);
  const currentOutputNode = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentOutputNode);

  const [displayMiniMap, { toggle: toggleDisplayMiniMap }] = useBoolean(false);
  const [displayToolboxItem, setDisplayToolboxItem] = useState<string | undefined>();
  const [nodes, edges] = useLayout();

  const dataMapDefinition = useMemo((): string => {
    if (inputSchema && outputSchema) {
      return convertToMapDefinition(currentConnections, inputSchema, outputSchema);
    }

    return '';
  }, [currentConnections, inputSchema, outputSchema]);

  const onToolboxLeafItemClick = (selectedNode: SchemaNodeExtended) => {
    dispatch(toggleInputNode(selectedNode));
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

  const onPaneClick = (_event: ReactMouseEvent): void => {
    // If user clicks on pane (empty canvas area), "deselect" node
    dispatch(setCurrentlySelectedNode(undefined));
    setDisplayToolboxItem(undefined);
  };

  const onNodeSingleClick = (node: ReactFlowNode): void => {
    const newCurrentlySelectedNode: SelectedNode = {
      type: node.type === ReactFlowNodeType.SchemaNode ? node.data.schemaType : NodeType.Expression,
      name: node.data.label,
      path: node.id,
    };
    dispatch(setCurrentlySelectedNode(newCurrentlySelectedNode));
  };

  const onNodeDoubleClick = (node: ReactFlowNode<SchemaCardProps>): void => {
    if (node.data.schemaType === SchemaTypes.Output && !node.data.isLeaf) {
      const newCurrentSchemaNode = flattenedOutputSchema[node.id];
      if (currentOutputNode && newCurrentSchemaNode) {
        dispatch(setCurrentOutputNode(newCurrentSchemaNode));
      }
    }
  };

  const onConnect = (connection: ReactFlowConnection) => {
    if (connection.target && connection.source) {
      dispatch(makeConnection({ outputNodeKey: connection.target, value: connection.source }));
    }
  };

  const onSubmitSchemaFileSelection = (schemaFile: SchemaFile) => {
    if (addSchemaFromFile) {
      // Will cause DM to ping VS Code to check schema file is in appropriate folder, then we will make getSchema API call
      addSchemaFromFile(schemaFile);
    }
  };

  const onSaveClick = () => {
    saveStateCall(dataMapDefinition); // TODO: do the next call only when this is successful
    dispatch(
      saveDataMap({
        inputSchemaExtended: inputSchema,
        outputSchemaExtended: outputSchema,
      })
    );
    console.log(dataMapDefinition);
  };

  const onUndoClick = () => {
    dispatch(undoDataMapOperation());
  };

  const onRedoClick = () => {
    dispatch(redoDataMapOperation());
  };

  const toolboxLoc = intl.formatMessage({
    defaultMessage: 'Toolbox',
    description: 'Label to open the input toolbox card',
  });

  const functionLoc = intl.formatMessage({
    defaultMessage: 'Function',
    description: 'Label to open the Function card',
  });

  useEffect(() => {
    return () => clearTimeout(clickTimerRef.current as unknown as number); // Make sure we clean up the timeout
  }, []);

  const onTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    if (data.value === displayToolboxItem) {
      setDisplayToolboxItem(undefined);
    } else {
      setDisplayToolboxItem(data.value as string);
    }
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

  const toolboxPanelProps: FloatingPanelProps = {
    xPos: '16px',
    yPos: '76px',
    width: '250px',
    minHeight: '300px',
    maxHeight: '450px',
  };

  // ReactFlow must be wrapped if we want to access the internal state of ReactFlow
  const ReactFlowWrapper = () => {
    const { fitView, zoomIn, zoomOut } = useReactFlow();

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
      yPos: '556px',
    };

    return (
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onNodeClick={handleNodeClicks}
        onNodeDoubleClick={handleNodeClicks}
        defaultZoom={2}
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
          height: '600px',
        }}
        nodeTypes={nodeTypes}
      >
        <ButtonContainer {...mapControlsButtonContainerProps} />
        {displayMiniMap ? (
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
        ) : null}
      </ReactFlow>
    );
  };

  const nodeTypes = useMemo(() => ({ schemaNode: SchemaCard }), []);
  const placeholderFunc = () => {
    return;
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="data-mapper-shell">
        <EditorCommandBar onSaveClick={onSaveClick} onUndoClick={onUndoClick} onRedoClick={onRedoClick} />
        <WarningModal />
        <EditorConfigPanel
          onSubmitSchemaFileSelection={onSubmitSchemaFileSelection}
          readCurrentSchemaOptions={readCurrentSchemaOptions ?? placeholderFunc}
        />
        <EditorBreadcrumb />
        {inputSchema && outputSchema ? (
          <>
            <ButtonPivot {...toolboxButtonPivotProps} />
            {displayToolboxItem === 'inputSchemaTreePanel' && (
              <FloatingPanel {...toolboxPanelProps}>
                <SchemaTree
                  schema={inputSchema}
                  currentlySelectedNodes={currentlySelectedInputNodes}
                  onLeafNodeClick={onToolboxLeafItemClick}
                />
              </FloatingPanel>
            )}
            {displayToolboxItem === 'expressionsPanel' && (
              <FloatingPanel {...toolboxPanelProps}>
                <span>Test</span>
              </FloatingPanel>
            )}
            <div className="msla-designer-canvas msla-panel-mode">
              <ReactFlowProvider>
                <ReactFlowWrapper />
              </ReactFlowProvider>
            </div>
          </>
        ) : (
          <MapOverview inputSchema={inputSchema} outputSchema={outputSchema} />
        )}
        <PropertiesPane currentNode={currentlySelectedNode} />
      </div>
    </DndProvider>
  );
};

export const useLayout = (): [ReactFlowNode[], ReactFlowEdge[]] => {
  const inputSchemaNodes = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentInputNodes);
  const outputSchemaNode = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentOutputNode);
  const connections = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);

  const reactFlowNodes = useMemo(() => {
    if (outputSchemaNode) {
      return convertToReactFlowNodes(Array.from(inputSchemaNodes), outputSchemaNode);
    } else {
      return [];
    }
  }, [inputSchemaNodes, outputSchemaNode]);

  const reactFlowEdges = useMemo(() => {
    return convertToReactFlowEdges(connections);
  }, [connections]);

  return [reactFlowNodes, reactFlowEdges];
};
