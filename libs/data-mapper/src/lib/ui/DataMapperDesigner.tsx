import { checkerboardBackgroundImage } from '../Constants';
import { convertToReactFlowNode } from '../ReactFlow.Util';
import { EditorBreadcrumb } from '../components/breadcrumb/EditorBreadcrumb';
import { EditorCommandBar } from '../components/commandBar/EditorCommandBar';
import { EditorConfigPanel, SchemaTypes } from '../components/configPanel/EditorConfigPanel';
import { SelectSchemaCard } from '../components/schemaSelection/selectSchemaCard';
import { WarningModal } from '../components/warningModal/warningModal';
import type { DataMapOperationState } from '../core/state/DataMapSlice';
import { saveDataMap } from '../core/state/DataMapSlice';
import {
  redoDataMapOperation,
  undoDataMapOperation,
  removeCurDataMap,
  changeInputSchemaOperation,
  changeOutputSchemaOperation,
} from '../core/state/DataMapSlice';
import { openInputSchemaPanel, openOutputSchemaPanel } from '../core/state/PanelSlice';
import { setCurrentInputNode, setCurrentOutputNode, setInputSchema, setOutputSchema } from '../core/state/SchemaSlice';
import type { AppDispatch, RootState } from '../core/state/Store';
import { store } from '../core/state/Store';
import type { Schema } from '../models';
import { LeftHandPanel } from './LeftHandPanel';
import type { ILayerProps } from '@fluentui/react';
import { LayerHost } from '@fluentui/react';
import { useId } from '@fluentui/react-hooks';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { Edge as ReactFlowEdge, Node as ReactFlowNode } from 'react-flow-renderer';
import ReactFlow, { ReactFlowProvider } from 'react-flow-renderer';
import { useDispatch, useSelector } from 'react-redux';

export interface DataMapperDesignerProps {
  saveStateCall: () => void;
}

export const DataMapperDesigner: React.FC<DataMapperDesignerProps> = ({ saveStateCall }) => {
  const layerHostId = useId('layerHost');
  const panelLayerProps: ILayerProps = {
    hostId: layerHostId,
  };

  const inputSchema = useSelector((state: RootState) => state.schema.inputSchema);
  const outputSchema = useSelector((state: RootState) => state.schema.outputSchema);

  const [nodes, edges] = useLayout();
  const dispatch = useDispatch<AppDispatch>();

  const onNodeDoubleClick = (_event: ReactMouseEvent, node: ReactFlowNode): void => {
    const schemaState = store.getState().schema;
    if (node.type === 'input') {
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
    dispatch(saveDataMap());
  };

  const onUndoClick = () => {
    dispatch(undoDataMapOperation());
  };

  const onRedoClick = () => {
    dispatch(redoDataMapOperation());
  };

  const onInputSchemaClick = () => {
    dispatch(openInputSchemaPanel());
  };
  const onOutputSchemaClick = () => {
    dispatch(openOutputSchemaPanel());
  };

  const reactFlowStyle = {
    backgroundImage: checkerboardBackgroundImage,
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
    height: '600px',
  };

  const layeredReactFlow = (
    <LayerHost
      id={layerHostId}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <div className="msla-designer-canvas msla-panel-mode">
        <ReactFlowProvider>
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
            style={reactFlowStyle}
          ></ReactFlow>
        </ReactFlowProvider>
      </div>
    </LayerHost>
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="data-mapper-shell">
        <EditorCommandBar onSaveClick={onSaveClick} onUndoClick={onUndoClick} onRedoClick={onRedoClick} />
        <WarningModal
          onOkClick={() => {
            //
          }}
        />
        <EditorConfigPanel onSubmitInputSchema={onSubmitInput} onSubmitOutputSchema={onSubmitOutput} />
        <EditorBreadcrumb />

        <button onClick={() => dispatch(removeCurDataMap)}>Remove cur data map</button>

        {inputSchema && outputSchema ? (
          <div>
            {layeredReactFlow}
            <LeftHandPanel layerProps={panelLayerProps} />
          </div>
        ) : (
          <div className="msla-designer-canvas msla-panel-mode not-loaded" style={reactFlowStyle}>
            <div className="left">
              {inputSchema ? layeredReactFlow : <SelectSchemaCard schemaType={SchemaTypes.Input} onClick={onInputSchemaClick} />}
            </div>
            <div className="right">
              {outputSchema ? layeredReactFlow : <SelectSchemaCard schemaType={SchemaTypes.Output} onClick={onOutputSchemaClick} />}
            </div>
          </div>
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
