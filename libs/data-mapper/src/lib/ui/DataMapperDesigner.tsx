import { EditorBreadcrumb } from '../components/breadcrumb/EditorBreadcrumb';
import { EditorCommandBar } from '../components/commandBar/EditorCommandBar';
import { updateBreadcrumbForSchema } from '../core/state/BreadcrumbSlice';
import { updateReactFlowForSchema } from '../core/state/ReactFlowSlice';
import { setCurrentInputNode, setCurrentOutputNode } from '../core/state/SchemaSlice';
import type { AppDispatch, RootState } from '../core/state/Store';
import { store } from '../core/state/Store';
import { LeftHandPanel } from './LeftHandPanel';
import type { ILayerProps } from '@fluentui/react';
import { LayerHost } from '@fluentui/react';
import { useId } from '@fluentui/react-hooks';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useEffect, useState } from 'react';
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

  return (
    <DndProvider backend={HTML5Backend}>
      <div>
        <div
          style={{
            // TODO - Remove
            border: '1px solid #ccc',
          }}
        >
          <EditorCommandBar />
          <EditorBreadcrumb />
          <LayerHost
            id={layerHostId}
            style={{
              // TODO - Remove
              position: 'relative',
              overflow: 'hidden',
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
                  style={{
                    position: 'unset',
                  }}
                ></ReactFlow>
              </ReactFlowProvider>
              <LeftHandPanel layerProps={panelLayerProps} />
            </div>
          </LayerHost>
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
