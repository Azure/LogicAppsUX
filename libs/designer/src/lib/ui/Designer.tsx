import { useLayout } from '../core/graphlayout';
import type { WorkflowNodeType } from '../core/parsers/models/workflowNode';
import { useAllOperations, useAllConnectors } from '../core/queries/browse';
import { buildEdgeIdsBySource, clearFocusNode, updateNodeSizes } from '../core/state/workflow/workflowSlice';
import type { AppDispatch, RootState } from '../core/store';
import Controls from './Controls';
import GraphNode from './CustomNodes/GraphContainerNode';
import HiddenNode from './CustomNodes/HiddenNode';
import OperationNode from './CustomNodes/OperationCardNode';
import ScopeCardNode from './CustomNodes/ScopeCardNode';
import SubgraphCardNode from './CustomNodes/SubgraphCardNode';
import Minimap from './Minimap';
import { ButtonEdge } from './connections/edge';
import { HiddenEdge } from './connections/hiddenEdge';
import { PanelRoot } from './panel/panelroot';
import { useThrottledEffect } from '@microsoft-logic-apps/utils';
import { useCallback, useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ReactFlow, { ReactFlowProvider, useNodes, useReactFlow, useStore } from 'react-flow-renderer';
import type { NodeChange } from 'react-flow-renderer';
import { useDispatch, useSelector } from 'react-redux';

export interface DesignerProps {
  graphId?: string;
}

type NodeTypesObj = {
  [key in WorkflowNodeType]: React.ComponentType<any>;
};
const nodeTypes: NodeTypesObj = {
  OPERATION_NODE: OperationNode,
  GRAPH_NODE: GraphNode,
  SUBGRAPH_NODE: GraphNode,
  SCOPE_CARD_NODE: ScopeCardNode,
  SUBGRAPH_CARD_NODE: SubgraphCardNode,
  HIDDEN_NODE: HiddenNode,
};

const edgeTypes = {
  BUTTON_EDGE: ButtonEdge,
  HEADING_EDGE: ButtonEdge, // This is functionally the same as a button edge
  // ONLY_EDGE: undefined,
  HIDDEN_EDGE: HiddenEdge,
};
export const CanvasFinder = () => {
  const focusNode = useSelector((state: RootState) => state.workflow.focusedCanvasNodeId);
  const [nodes] = useLayout();
  const { setCenter, getZoom } = useReactFlow();
  const { height } = useStore();
  const [firstLoad, setFirstLoad] = useState(true);
  const nodeData = useNodes().find((x) => x.id === focusNode);
  const dispatch = useDispatch<AppDispatch>();
  const handleTransform = useCallback(() => {
    if (!focusNode) {
      return;
    }
    const node = nodes.find((x) => x.id === focusNode);
    if ((!node?.position?.x && !node?.position?.y) || !nodeData?.width) {
      return;
    }
    if (firstLoad) {
      setCenter((node.position?.x ?? 0) + nodeData.width / 2, height / 2 - 50, { zoom: 1 });
      setFirstLoad(false);
    } else {
      setCenter((node.position?.x ?? 0) + nodeData.width, node.position?.y ?? 0, {
        zoom: getZoom(),
      });
    }
    dispatch(clearFocusNode());
  }, [dispatch, firstLoad, focusNode, getZoom, height, nodeData?.width, nodes, setCenter]);

  useEffect(() => {
    handleTransform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, focusNode]);
  return null;
};

export const Designer = () => {
  const [nodes, edges] = useLayout();
  const dispatch = useDispatch();
  useAllOperations();
  useAllConnectors();

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      dispatch(updateNodeSizes(changes));
    },
    [dispatch]
  );

  const graph = useSelector((state: RootState) => state.workflow.graph);
  useThrottledEffect(() => dispatch(buildEdgeIdsBySource()), [graph], 200);
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
          <div className="msla-designer-tools">
            <Minimap />
            <Controls />
          </div>
          <CanvasFinder />
        </ReactFlowProvider>
      </div>
    </DndProvider>
  );
};
