/* eslint-disable @typescript-eslint/no-empty-function */
import { convertActionIDToTitleCase } from '../common/utilities/Utils';
import { RootState } from '../core/store';
import { useCallback, useEffect } from 'react';
import ReactFlow, { ReactFlowProvider, useNodes, useReactFlow, useStore, Node, Edge, useNodesState } from 'react-flow-renderer';
import { useDispatch, useSelector } from 'react-redux';
import CustomTestNode from './CustomNodes/CustomTestNode';
import { setShouldZoomToNode, triggerLayout, updateNodeSizes } from '../core/state/workflowSlice';
import { processGraphLayout } from '../core/parsers/ProcessLayoutReduxAction';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { CustomEdge } from './connections/edge';
import { DndProvider, createTransition } from 'react-dnd-multi-backend';
import KeyboardBackend, { isKeyboardDragTrigger } from 'react-dnd-accessible-backend';

export interface DesignerProps {
  graphId?: string;
}

const nodeTypes = {
  testNode: CustomTestNode,
};

const edgeTypes = {
  buttonedge: CustomEdge,
};

const ZoomNode = () => {
  const nodes = useNodes();
  const [_, __, zoom] = useStore((store) => store.transform);
  const shouldLayout = useSelector((state: RootState) => state.workflow.shouldLayout);
  const shouldFocusNode = useSelector((state: RootState) => state.workflow.shouldZoomToNode);
  const dispatch = useDispatch();
  const { setCenter } = useReactFlow();

  useEffect(() => {
    if (nodes.length && shouldLayout) {
      dispatch(updateNodeSizes(nodes));
      (dispatch(processGraphLayout()) as any).then(() => {
        if (shouldFocusNode) {
          if (shouldFocusNode) {
            const node = nodes.find((x) => x.id === shouldFocusNode);

            dispatch(setShouldZoomToNode(null));
            if (node) {
              const x = node.position.x + (node.width ?? 0) / 2;
              const y = node.position.y + (node.height ?? 0) / 2;

              setCenter(x, y, { zoom });
            }
          }
        }
      });
    }
  }, [dispatch, nodes, setCenter, shouldFocusNode, shouldLayout, zoom]);
  useEffect(() => {
    dispatch(triggerLayout());
  }, [dispatch, nodes.length]);

  return null;
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

export const Designer = ({ graphId = 'root' }: DesignerProps) => {
  const [nodes, edges]: [Node[], Edge[]] = useSelector((state: RootState) => {
    const retNodes: Node[] = [];
    const retEdges: Edge[] = [];
    //TODO: Key off current graph rather than going through all nodes
    state.workflow.graphs[graphId]?.nodes.forEach((id) => {
      const node = state.workflow.nodes[id];
      retNodes.push({
        id: node.id,
        type: 'testNode',
        data: {
          label: convertActionIDToTitleCase(node.id),
          children: node.childrenNodes,
        },
        position: node.position,
      });
      for (const child of node.childrenNodes) {
        retEdges.push({
          id: `entry-${node.id}-${child}`,
          source: node.id,
          target: child,
          data: { parent: node.id, child: child },
          type: 'buttonedge',
          animated: false,
        });
      }
    });
    return [retNodes, retEdges];
  });

  const dispatch = useDispatch();
  const nodesChanged = useCallback(() => {
    dispatch(triggerLayout());
  }, [dispatch]);
  return (
    <DndProvider options={DND_OPTIONS as any}>
      <div className="msla-designer-canvas msla-panel-mode">
        <ReactFlowProvider>
          <ReactFlow
            nodeTypes={nodeTypes}
            nodes={nodes}
            onNodesChange={nodesChanged}
            edges={edges}
            onConnect={() => {}}
            minZoom={0}
            nodesDraggable={false}
            edgeTypes={edgeTypes}
            proOptions={{
              account: 'paid-subscription',
              hideAttribution: true,
            }}
          ></ReactFlow>
          <ZoomNode></ZoomNode>
        </ReactFlowProvider>
      </div>
    </DndProvider>
  );
};
