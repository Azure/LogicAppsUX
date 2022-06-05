import { useLayout } from '../core/graphlayout';
import { updateNodeSizes } from '../core/state/workflowSlice';
import CustomTestNode from './CustomNodes/CustomTestNode';
import GraphNode from './CustomNodes/GraphNode';
import { CustomEdge } from './connections/edge';
import { PanelRoot } from './panel/panelroot';
import { useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { NodeChange } from 'react-flow-renderer';
import ReactFlow, { ReactFlowProvider } from 'react-flow-renderer';
import { useDispatch } from 'react-redux';

export interface DesignerProps {
  graphId?: string;
}

const nodeTypes = {
  testNode: CustomTestNode,
  graphNode: GraphNode,
};

const edgeTypes = {
  buttonedge: CustomEdge,
};

export const Designer = () => {
  const [nodes, edges] = useLayout();
  const dispatch = useDispatch();

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      dispatch(updateNodeSizes(changes));
    },
    [dispatch]
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="msla-designer-canvas msla-panel-mode">
        <ReactFlowProvider>
          <ReactFlow
            nodeTypes={nodeTypes}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            minZoom={0}
            nodesDraggable={false}
            edgeTypes={edgeTypes}
            proOptions={{
              account: 'paid-sponsor',
              hideAttribution: true,
            }}
          >
            <PanelRoot />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </DndProvider>
  );
};
