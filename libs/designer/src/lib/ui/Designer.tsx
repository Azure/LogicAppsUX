import { useLayout } from '../core/graphlayout';
import type { WorkflowNodeType } from '../core/parsers/models/workflowNode';
import { updateNodeSizes } from '../core/state/workflow/workflowSlice';
import GraphNode from './CustomNodes/GraphContainerNode';
import HiddenNode from './CustomNodes/HiddenNode';
import OperationNode from './CustomNodes/OperationCardNode';
import ScopeCardNode from './CustomNodes/ScopeCardNode';
import SubgraphCardNode from './CustomNodes/SubgraphCardNode';
import { ButtonEdge } from './connections/edge';
// import { OnlyEdge } from './connections/onlyEdge';
import { HiddenEdge } from './connections/hiddenEdge';
import { PanelRoot } from './panel/panelroot';
import { useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { NodeChange } from 'react-flow-renderer';
import ReactFlow, { Controls, ReactFlowProvider } from 'react-flow-renderer';
import { useDispatch } from 'react-redux';

export interface DesignerProps {
  graphId?: string;
}

type NodeTypesObj = {
  [key in WorkflowNodeType]: React.ComponentType<any>;
};
const nodeTypes: NodeTypesObj = {
  OPERATION_NODE: OperationNode,
  GRAPH_NODE: GraphNode,
  SCOPE_NODE: ScopeCardNode,
  SUBGRAPH_NODE: SubgraphCardNode,
  HIDDEN_NODE: HiddenNode,
};

const edgeTypes = {
  BUTTON_EDGE: ButtonEdge,
  HEADING_EDGE: ButtonEdge, // This is functionally the same as a button edge
  // ONLY_EDGE: undefined,
  HIDDEN_EDGE: HiddenEdge,
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
            panOnScroll={true}
            deleteKeyCode={['Backspace', 'Delete']}
            zoomActivationKeyCode={['Ctrl', 'Meta', 'Alt', 'Control']}
            proOptions={{
              account: 'paid-sponsor',
              hideAttribution: true,
            }}
          >
            <PanelRoot />
          </ReactFlow>
          <Controls showInteractive={false} />
        </ReactFlowProvider>
      </div>
    </DndProvider>
  );
};
