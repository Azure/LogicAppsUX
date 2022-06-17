import { AddSchemaPanelButton, SchemaTypes } from '../components/addSchemaPanelButton';
import { EditorBreadcrumb } from '../components/breadcrumb/EditorBreadcrumb';
import { EditorCommandBar } from '../components/commandBar/EditorCommandBar';
import { updateBreadcrumbForSchema } from '../core/state/BreadcrumbSlice';
import { updateReactFlowForSchema } from '../core/state/ReactFlowSlice';
import { setCurrentInputNode, setCurrentOutputNode, setInputSchema } from '../core/state/SchemaSlice';
import type { AppDispatch, RootState } from '../core/state/Store';
import { store } from '../core/state/Store';
import type { Schema } from '../models';
import { LeftHandPanel } from './LeftHandPanel';
import { LayerHost } from '@fluentui/react';
import type { ILayerProps } from '@fluentui/react';
import { useId } from '@fluentui/react-hooks';
import { useEffect, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
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

  const inputSchema = store.getState().schema.inputSchema;
  const outputSchema = store.getState().schema.outputSchema;
  // const availableSchemas = store.getState().schemaDataLoader.outputSchema;
  const availableSchemas: Schema[] = [];

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
        dispatch(updateReactFlowForSchema({ inputSchema: newCurrentSchemaNode, outputSchema: schemaState.currentOutputNode }));
        // Don't need to update the breadcrumb on input traversal
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
        dispatch(updateReactFlowForSchema({ inputSchema: schemaState.currentInputNode, outputSchema: newCurrentSchemaNode }));
        dispatch(updateBreadcrumbForSchema({ schema: schemaState.outputSchema, currentNode: newCurrentSchemaNode }));
      }
    }
  };

  const onSubmitInput = (inputSchema: Schema) => {
    dispatch(setInputSchema(inputSchema));

    const schemaState = store.getState().schema;
    const currentSchemaNode = schemaState.currentInputNode;

    dispatch(setCurrentInputNode(currentSchemaNode));
    dispatch(updateReactFlowForSchema({ inputSchema: currentSchemaNode, outputSchema: schemaState.currentOutputNode }));
  };

  const onSubmitOutput = (outputSchema: Schema) => {
    dispatch(setInputSchema(outputSchema));

    const schemaState = store.getState().schema;
    const currentSchemaNode = schemaState.currentOutputNode;

    dispatch(setCurrentOutputNode(currentSchemaNode));
    dispatch(updateReactFlowForSchema({ inputSchema: schemaState.currentInputNode, outputSchema: currentSchemaNode }));
  };

  const reactFlowDrawing = (
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
        style={{
          position: 'unset',
        }}
      ></ReactFlow>
    </ReactFlowProvider>
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div>
        <div
          style={{
            // TODO - Remove
            border: '1px solid #ccc',
            height: '100%',
          }}
        >
          <EditorCommandBar />
          <EditorBreadcrumb />

          {/* <div
              className="msla-designer-canvas msla-panel-mode"
              style={{
                // TODO - Remove
                backgroundColor: '#EDEBE9',
              }}
            > */}
          {inputSchema && outputSchema ? (
            <LayerHost
              id={layerHostId}
              style={{
                // TODO - Remove
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                className="msla-designer-canvas msla-panel-mode"
                style={{
                  // TODO - Remove
                  backgroundColor: '#EDEBE9',
                }}
              >
                {reactFlowDrawing}
              </div>
            </LayerHost>
          ) : (
            <div
              className="msla-designer-canvas msla-panel-mode"
              style={{
                display: 'flex',
                flexDirection: 'row',
                backgroundColor: '#EDEBE9',
                height: '500px',
                justifyContent: 'center',
                justifyItems: 'center',
                justifySelf: 'center',
                alignContent: 'center',
                alignItems: 'center',
                alignSelf: 'center',
                margin: 'auto',
                padding: 'auto',
              }}
            >
              <div style={{ width: '50%', display: 'left' }}>
                {inputSchema ? (
                  // reactFlowDrawing
                  <></>
                ) : (
                  <AddSchemaPanelButton schemaType={SchemaTypes.INPUT} onSubmitSchema={onSubmitInput} schemaFilesList={availableSchemas} />
                )}
              </div>
              <div style={{ width: '50%', display: 'right' }}>
                {outputSchema ? (
                  // ? reactFlowDrawing
                  <></>
                ) : (
                  <AddSchemaPanelButton
                    schemaType={SchemaTypes.OUTPUT}
                    onSubmitSchema={onSubmitOutput}
                    schemaFilesList={availableSchemas}
                  />
                )}
              </div>
            </div>
          )}
          <LeftHandPanel layerProps={panelLayerProps} />
          {/* </div> */}
        </div>
      </div>
    </DndProvider>
  );
};

export const useLayout = (): [ReactFlowNode[], ReactFlowEdge[]] => {
  const [reactFlowNodes, setReactFlowNodes] = useState<ReactFlowNode[]>([]);
  const [reactFlowEdges, setReactFlowEdges] = useState<ReactFlowEdge[]>([]);
  const reactFlowGraph = useSelector((state: RootState) => state.reactFlow.graph);

  useEffect(() => {
    if (!reactFlowGraph) {
      return;
    }

    setReactFlowNodes(reactFlowGraph);
    setReactFlowEdges([]);
  }, [reactFlowGraph]);

  return [reactFlowNodes, reactFlowEdges];
};
