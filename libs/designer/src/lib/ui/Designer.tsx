/* eslint-disable @typescript-eslint/no-empty-function */
import KeyboardBackend, { isKeyboardDragTrigger } from 'react-dnd-accessible-backend';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { createTransition, DndProvider } from 'react-dnd-multi-backend';
import ReactFlow, { NodeChange, ReactFlowProvider } from 'react-flow-renderer';
import { CustomEdge } from './connections/edge';
import CustomTestNode from './CustomNodes/CustomTestNode';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useLayout } from '../core/graphlayout';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { updateNodeSizes } from '../core/state/workflowSlice';

export interface DesignerProps {
  graphId?: string;
}

const nodeTypes = {
  testNode: CustomTestNode,
};

const edgeTypes = {
  buttonedge: CustomEdge,
};

const KeyboardTransition = createTransition('keydown', (event) => {
  if (!isKeyboardDragTrigger(event as KeyboardEvent)) return false;
  event.preventDefault();
  return true;
});

const MouseTransition = createTransition('mousedown', (event) => {
  if (event.type.indexOf('touch') !== -1 || event.type.indexOf('mouse') === -1) return false;
  return true;
});

const DND_OPTIONS = {
  backends: [
    {
      id: 'html5',
      backend: HTML5Backend,
      transition: MouseTransition,
    },
    {
      id: 'keyboard',
      backend: KeyboardBackend,
      context: { window, document },
      preview: true,
      transition: KeyboardTransition,
    },
  ],
};

const queryClient = new QueryClient();
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
    <QueryClientProvider client={queryClient}>
      <DndProvider options={DND_OPTIONS as any}>
        <div className="msla-designer-canvas msla-panel-mode">
          <ReactFlowProvider>
            <ReactFlow
              nodeTypes={nodeTypes}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onConnect={() => {}}
              minZoom={0}
              nodesDraggable={false}
              edgeTypes={edgeTypes}
              proOptions={{
                account: 'paid-subscription',
                hideAttribution: true,
              }}
            ></ReactFlow>
          </ReactFlowProvider>
        </div>
      </DndProvider>
    </QueryClientProvider>
  );
};
