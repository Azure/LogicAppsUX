/* eslint-disable @typescript-eslint/no-empty-function */
import { convertActionIDToTitleCase } from '../common/utilities/Utils';
import { RootState } from '../core/store';
import React, { useEffect } from 'react';
import ReactFlow, { ArrowHeadType, Elements, ReactFlowProvider, useStore, useZoomPanHelper } from 'react-flow-renderer';
import { useSelector } from 'react-redux';
import CustomTestNode from './CustomNodes/CustomTestNode';
import ButtonEdge from './CustomNodes/ButtonEdge';

const nodeTypes = {
  testNode: CustomTestNode,
};

const edgeTypes = {
  buttonedge: ButtonEdge,
};

const ZoomNode = () => {
  const store = useStore();
  const { setCenter } = useZoomPanHelper();
  const { nodes } = store.getState();

  useEffect(() => {
    if (nodes.length) {
      const node = nodes[0];

      const x = node.__rf.position.x + node.__rf.width / 2;
      const y = node.__rf.position.y + node.__rf.height / 2;
      const zoom = 1.3;

      setCenter(x, y, zoom);
    }
  }, [nodes, setCenter]);
  return <></>;
};
export const Designer = () => {
  const nodes = useSelector((state: RootState) => {
    const retNodes: Elements = [];

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
        <ZoomNode></ZoomNode>
        <ReactFlow
          nodeTypes={nodeTypes}
          elements={nodes}
          onConnect={() => {}}
          minZoom={0}
          nodesDraggable={false}
          edgeTypes={edgeTypes}
          onElementsRemove={() => {}}></ReactFlow>
      </ReactFlowProvider>
    </div>
  );
};
