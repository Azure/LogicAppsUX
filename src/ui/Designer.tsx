/* eslint-disable @typescript-eslint/no-empty-function */
import { convertActionIDToTitleCase } from '../common/utilities/Utils';
import { RootState } from '../core/store';
import React, { useEffect } from 'react';
import ReactFlow, { ArrowHeadType, Elements, ReactFlowProvider, useStore } from 'react-flow-renderer';
import { useDispatch, useSelector } from 'react-redux';
import CustomTestNode from './CustomNodes/CustomTestNode';
import ButtonEdge from './CustomNodes/ButtonEdge';
import { triggerLayout, updateNodeSizes } from '../core/state/workflowSlice';
import { processGraphLayout } from '../core/parsers/ProcessLayoutReduxAction';

const nodeTypes = {
  testNode: CustomTestNode,
};

const edgeTypes = {
  buttonedge: ButtonEdge,
};

const ZoomNode = () => {
  const store = useStore();
  const { nodes } = store.getState();

  const shouldLayout = useSelector((state: RootState) => state.workflow.shouldLayout);
  const dispatch = useDispatch();
  useEffect(() => {
    if (nodes.length && shouldLayout) {
      console.log(nodes);
      dispatch(updateNodeSizes(nodes));
      dispatch(processGraphLayout(null));
    }
  }, [dispatch, nodes, shouldLayout]);
  useEffect(() => {
    dispatch(triggerLayout());
  }, [dispatch, nodes.length]);
  return <></>;
};
export const Designer = () => {
  const nodes = useSelector((state: RootState) => {
    const retNodes: Elements = [];
    console.log('DESIGNER');
    console.log(state.workflow.nodes);
    state.workflow.nodes.forEach((node) => {
      retNodes.push({
        id: node.id,
        type: 'testNode',
        data: { label: convertActionIDToTitleCase(node.id) },
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
  );
};
