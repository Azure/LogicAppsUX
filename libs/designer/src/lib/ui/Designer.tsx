import { useLayout } from '../core/graphlayout';
import { updateNodeSizes } from '../core/state/workflowSlice';
import GraphNode from './CustomNodes/GraphContainerNode';
import HiddenNode from './CustomNodes/HiddenNode';
import TestNode from './CustomNodes/OperationCardNode';
import ScopeHeaderNode from './CustomNodes/ScopeHeaderNode';
import SubgraphHeaderNode from './CustomNodes/SubgraphHeaderNode';
import { ButtonEdge } from './connections/edge';
// import { OnlyEdge } from './connections/onlyEdge';
import { HiddenEdge } from './connections/hiddenEdge';
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

type NodeTypes = 'testNode' | 'scopeHeader' | 'subgraphHeader' | 'hiddenNode' | 'graphNode';
type NodeTypesObj = {
  [key in NodeTypes]: React.ComponentType<any>;
};
const nodeTypes: NodeTypesObj = {
  testNode: TestNode,
  graphNode: GraphNode,
  scopeHeader: ScopeHeaderNode,
  subgraphHeader: SubgraphHeaderNode,
  hiddenNode: HiddenNode,
};

const edgeTypes = {
  buttonEdge: ButtonEdge,
  // onlyEdge: OnlyEdge,
  hiddenEdge: HiddenEdge,
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
