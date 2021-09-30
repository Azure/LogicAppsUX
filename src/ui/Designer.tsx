/* eslint-disable @typescript-eslint/no-empty-function */
import { convertActionIDToTitleCase } from '../common/utilities/Utils';
import { RootState } from '../core/store';
import React, { useEffect } from 'react';
import ReactFlow, { ArrowHeadType, Elements, ReactFlowProvider, useStore, useStoreState, useZoomPanHelper } from 'react-flow-renderer';
import { useDispatch, useSelector } from 'react-redux';
import CustomTestNode from './CustomNodes/CustomTestNode';
import ButtonEdge from './CustomNodes/ButtonEdge';
import { setShouldZoomToNode, triggerLayout, updateNodeSizes } from '../core/state/workflowSlice';
import { processGraphLayout } from '../core/parsers/ProcessLayoutReduxAction';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const nodeTypes = {
  testNode: CustomTestNode,
};

const edgeTypes = {
  buttonedge: ButtonEdge,
};

const ZoomNode = () => {
  const nodes = useStoreState((store) => store.nodes);
  const transform = useStoreState((store) => store.transform);
  const shouldLayout = useSelector((state: RootState) => state.workflow.shouldLayout);
  const shouldFocusNode = useSelector((state: RootState) => state.workflow.shouldZoomToNode);
  const dispatch = useDispatch();
  const { setCenter } = useZoomPanHelper();
  useEffect(() => {
    if (nodes.length && shouldLayout) {
      dispatch(updateNodeSizes(nodes));
      (dispatch(processGraphLayout()) as any).then(() => {
        if (shouldFocusNode) {
          if (shouldFocusNode) {
            const node = nodes.find((x) => x.id === shouldFocusNode);

            dispatch(setShouldZoomToNode(null));
            if (node) {
              const x = node.__rf.position.x + node.__rf.width / 2;
              const y = node.__rf.position.y + node.__rf.height / 2;

              setCenter(x, y, transform[2]);
            }
          }
        }
      });
    }
  }, [dispatch, nodes, setCenter, shouldFocusNode, shouldLayout, transform]);
  useEffect(() => {
    dispatch(triggerLayout());
  }, [dispatch, nodes.length]);

  return <></>;
};
export const Designer = () => {
  const nodes = useSelector((state: RootState) => {
    const retNodes: Elements = [];
    state.workflow.nodes.forEach((node) => {
      retNodes.push({
        id: node.id,
        type: 'testNode',
        data: { label: convertActionIDToTitleCase(node.id), children: node.childrenNodes },
        position: node.position,
      });
      for (const child of node.childrenNodes) {
        retNodes.push({
          id: `entry-${node.id}-${child}`,
          source: node.id,
          target: child,
          data: { parent: node.id, child: child },
          type: 'buttonedge',
          animated: false,
          arrowHeadType: ArrowHeadType.Arrow,
        });
      }
    });
    return retNodes;
  });

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ width: '100vw', height: '100vh' }}>
        <ReactFlowProvider>
          <ReactFlow
            nodeTypes={nodeTypes}
            elements={nodes}
            onConnect={() => {}}
            minZoom={0}
            nodesDraggable={false}
            edgeTypes={edgeTypes}
            onElementsRemove={() => {}}></ReactFlow>
          <ZoomNode></ZoomNode>
        </ReactFlowProvider>
      </div>
    </DndProvider>
  );
};
