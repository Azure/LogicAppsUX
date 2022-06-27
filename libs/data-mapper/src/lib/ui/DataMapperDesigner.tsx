import { checkerboardBackgroundImage } from '../Constants';
import { convertToReactFlowNode } from '../ReactFlow.Util';
import { EditorBreadcrumb } from '../components/breadcrumb/EditorBreadcrumb';
import { EditorCommandBar } from '../components/commandBar/EditorCommandBar';
import { AddSchemaPanelButton, SchemaTypes } from '../components/schemaSelection/addSchemaPanelButton';
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

export const DataMapperDesigner = () => {
  const layerHostId = useId('layerHost');
  const panelLayerProps: ILayerProps = {
    hostId: layerHostId,
  };

  const inputSchema = useSelector((state: RootState) => state.schema.inputSchema);
  const outputSchema = useSelector((state: RootState) => state.schema.outputSchema);
  const availableSchemas = useSelector((state: RootState) => state.schema.availableSchemas);

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
  };

  const onSubmitOutput = (outputSchema: Schema) => {
    dispatch(setOutputSchema(outputSchema));

    const schemaState = store.getState().schema;
    const currentSchemaNode = schemaState.currentOutputNode;

    dispatch(setCurrentOutputNode(currentSchemaNode));
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
        <EditorCommandBar />
        <EditorBreadcrumb />

        {inputSchema && outputSchema ? (
          layeredReactFlow
        ) : (
          <div className="msla-designer-canvas msla-panel-mode not-loaded">
            <div className="left">
              {inputSchema ? (
                layeredReactFlow
              ) : (
                <AddSchemaPanelButton
                  schemaType={SchemaTypes.Input}
                  onSubmitSchema={onSubmitInput}
                  schemaFilesList={availableSchemas ?? []}
                />
              )}
            </div>
            <div className="right">
              {outputSchema ? (
                layeredReactFlow
              ) : (
                <AddSchemaPanelButton
                  schemaType={SchemaTypes.Output}
                  onSubmitSchema={onSubmitOutput}
                  schemaFilesList={availableSchemas ?? []}
                />
              )}
            </div>
          </div>
        )}
        <LeftHandPanel layerProps={panelLayerProps} />
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
