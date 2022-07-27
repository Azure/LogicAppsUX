import { checkerboardBackgroundImage } from '../Constants';
import { convertToReactFlowNode } from '../ReactFlow.Util';
import { EditorBreadcrumb } from '../components/breadcrumb/EditorBreadcrumb';
import type { ButtonContainerProps } from '../components/buttonContainer/ButtonContainer';
import { ButtonContainer } from '../components/buttonContainer/ButtonContainer';
import { EditorCommandBar } from '../components/commandBar/EditorCommandBar';
import { EditorConfigPanel } from '../components/configPanel/EditorConfigPanel';
import type { FloatingPanelProps } from '../components/floatingPanel/FloatingPanel';
import { FloatingPanel } from '../components/floatingPanel/FloatingPanel';
import { MapOverview } from '../components/mapOverview/MapOverview';
import { SchemaCard } from '../components/nodeCard/SchemaCard';
import { SchemaTree } from '../components/tree/SchemaTree';
import { WarningModal } from '../components/warningModal/WarningModal';
import type { DataMapOperationState } from '../core/state/DataMapSlice';
import {
  changeInputSchemaOperation,
  changeOutputSchemaOperation,
  redoDataMapOperation,
  saveDataMap,
  undoDataMapOperation,
} from '../core/state/DataMapSlice';
import { setCurrentInputNode, setCurrentOutputNode, setInputSchema, setOutputSchema } from '../core/state/SchemaSlice';
import type { AppDispatch, RootState } from '../core/state/Store';
import { store } from '../core/state/Store';
import type { Schema } from '../models';
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
import { useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { Edge as ReactFlowEdge, Node as ReactFlowNode } from 'react-flow-renderer';
import ReactFlow, { MiniMap, ReactFlowProvider, useReactFlow } from 'react-flow-renderer';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export interface DataMapperDesignerProps {
  saveStateCall: () => void;
}

export const DataMapperDesigner: React.FC<DataMapperDesignerProps> = ({ saveStateCall }) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const inputSchema = useSelector((state: RootState) => state.schema.inputSchema);
  const outputSchema = useSelector((state: RootState) => state.schema.outputSchema);
  const curDataMapOperation = useSelector((state: RootState) => state.dataMap.curDataMapOperation);
  const [displayMiniMap, { toggle: toggleDisplayMiniMap }] = useBoolean(false);
  const [displayToolbox, { toggle: toggleDisplayToolbox, setFalse: setDisplayToolboxFalse }] = useBoolean(false);
  const [displayExpressions, { toggle: toggleDisplayExpressions, setFalse: setDisplayExpressionsFalse }] = useBoolean(false);
  const [nodes, edges] = useLayout();

  const onNodeDoubleClick = (_event: ReactMouseEvent, node: ReactFlowNode): void => {
    const schemaState = store.getState().schema;
    if (node.data.schemaType === 'input') {
      const currentSchemaNode = schemaState.currentInputNode;
      if (currentSchemaNode) {
        const newCurrentSchemaNode =
          currentSchemaNode.key === node.id
            ? currentSchemaNode
            : currentSchemaNode.children.find((schemaNode) => schemaNode.key === node.id);
        dispatch(setCurrentInputNode(newCurrentSchemaNode));
      }
    } else {
      const currentSchemaNode = schemaState.currentOutputNode;
      if (currentSchemaNode) {
        const trimmedNodeId = node.id.substring(7);
        const newCurrentSchemaNode =
          currentSchemaNode.key === trimmedNodeId
            ? currentSchemaNode
            : currentSchemaNode.children.find((schemaNode) => schemaNode.key === trimmedNodeId);
        dispatch(setCurrentOutputNode(newCurrentSchemaNode));
      }
    }
  };

  const onSubmitInput = (inputSchema: Schema) => {
    dispatch(setInputSchema(inputSchema));

    const schemaState = store.getState().schema;
    const currentSchemaNode = schemaState.currentInputNode;

    dispatch(setCurrentInputNode(currentSchemaNode));

    if (outputSchema) {
      const dataMapOperationState: DataMapOperationState = {
        curDataMap: {
          srcSchemaName: inputSchema.name,
          dstSchemaName: outputSchema.name,
          mappings: { targetNodeKey: `ns0:${outputSchema.name}` },
        },
        currentInputNode: currentSchemaNode,
        currentOutputNode: schemaState.currentOutputNode,
      };
      dispatch(changeInputSchemaOperation(dataMapOperationState));
    }
  };

  const onSubmitOutput = (outputSchema: Schema) => {
    dispatch(setOutputSchema(outputSchema));

    const schemaState = store.getState().schema;
    const currentSchemaNode = schemaState.currentOutputNode;

    dispatch(setCurrentOutputNode(currentSchemaNode));
    if (inputSchema) {
      const dataMapOperationState: DataMapOperationState = {
        curDataMap: {
          srcSchemaName: inputSchema.name,
          dstSchemaName: outputSchema.name,
          mappings: { targetNodeKey: `ns0:${outputSchema.name}` },
        },
        currentInputNode: schemaState.currentInputNode,
        currentOutputNode: currentSchemaNode,
      };
      dispatch(changeOutputSchemaOperation(dataMapOperationState));
    }
  };

  const onSaveClick = () => {
    saveStateCall(); // TODO: do the next call only when this is successful
    dispatch(
      saveDataMap({
        inputSchemaExtended: inputSchema,
        outputSchemaExtended: outputSchema,
      })
    );
  };

  const onUndoClick = () => {
    dispatch(undoDataMapOperation());
    dispatch(setCurrentInputNode(curDataMapOperation?.currentInputNode));
    dispatch(setCurrentOutputNode(curDataMapOperation?.currentOutputNode));
  };

  const onRedoClick = () => {
    dispatch(redoDataMapOperation());
    dispatch(setCurrentInputNode(curDataMapOperation?.currentInputNode));
    dispatch(setCurrentOutputNode(curDataMapOperation?.currentOutputNode));
  };

  const toolboxLoc = intl.formatMessage({
    defaultMessage: 'Toolbox',
    description: 'Label to open the input toolbox card',
  });

  const functionLoc = intl.formatMessage({
    defaultMessage: 'Function',
    description: 'Label to open the Function card',
  });

  const toolboxButtonContainerProps: ButtonContainerProps = {
    buttons: [
      {
        tooltip: toolboxLoc,
        regularIcon: CubeTree20Regular,
        filledIcon: CubeTree20Filled,
        filled: displayToolbox,
        onClick: () => {
          setDisplayExpressionsFalse();
          toggleDisplayToolbox();
        },
      },
      {
        tooltip: functionLoc,
        regularIcon: MathFormula20Regular,
        filledIcon: MathFormula20Filled,
        filled: displayExpressions,
        onClick: () => {
          setDisplayToolboxFalse();
          toggleDisplayExpressions();
        },
      },
    ],
    horizontal: true,
    xPos: '16px',
    yPos: '16px',
  };

  const toolboxPanelProps: FloatingPanelProps = {
    xPos: '16px',
    yPos: '56px',
    width: '300px',
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
        onNodeDoubleClick={onNodeDoubleClick}
        minZoom={0}
        nodesDraggable={false}
        fitView
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

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="data-mapper-shell">
        <EditorCommandBar onSaveClick={onSaveClick} onUndoClick={onUndoClick} onRedoClick={onRedoClick} />
        <WarningModal />
        <EditorConfigPanel onSubmitInputSchema={onSubmitInput} onSubmitOutputSchema={onSubmitOutput} />
        <EditorBreadcrumb />
        {inputSchema && outputSchema ? (
          <>
            <ButtonContainer {...toolboxButtonContainerProps} />
            {displayToolbox ? (
              <FloatingPanel {...toolboxPanelProps}>
                <SchemaTree schema={inputSchema} />
              </FloatingPanel>
            ) : null}
            <div className="msla-designer-canvas msla-panel-mode">
              <ReactFlowProvider>
                <ReactFlowWrapper />
              </ReactFlowProvider>
            </div>
          </>
        ) : (
          <MapOverview inputSchema={inputSchema} outputSchema={outputSchema} />
        )}
      </div>
    </DndProvider>
  );
};

export const useLayout = (): [ReactFlowNode[], ReactFlowEdge[]] => {
  const reactFlowEdges: ReactFlowEdge[] = [];
  const inputSchemaNode = useSelector((state: RootState) => state.schema.currentInputNode);
  const outputSchemaNode = useSelector((state: RootState) => state.schema.currentOutputNode);

  const reactFlowNodes = useMemo(() => {
    return convertToReactFlowNode(inputSchemaNode, outputSchemaNode);
  }, [inputSchemaNode, outputSchemaNode]);

  return [reactFlowNodes, reactFlowEdges];
};
