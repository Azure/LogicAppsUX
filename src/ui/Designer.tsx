/* eslint-disable @typescript-eslint/no-empty-function */
import { convertActionIDToTitleCase } from '../common/utilities/Utils';
import { RootState } from '../core/store';
import React from 'react';
import ReactFlow, { ArrowHeadType, ConnectionLineType, Elements } from 'react-flow-renderer';
import { useSelector } from 'react-redux';

export const Designer = () => {
  const nodes = useSelector((state: RootState) => {
    const retNodes: Elements = [];
    state.workflow.nodes.forEach((node) => {
      retNodes.push({
        id: node.id,
        data: { label: convertActionIDToTitleCase(node.id) },
        position: node.position,
      });
      for (const child of node.childrenNodes) {
        retNodes.push({
          id: `entry-${node.id}-${child}`,
          source: node.id,
          target: child,
          type: ConnectionLineType.SmoothStep,
          animated: false,
          arrowHeadType: ArrowHeadType.Arrow,
        });
      }
    });
    return retNodes;
  });

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow elements={nodes} onConnect={() => {}} minZoom={0} nodesDraggable={false} onElementsRemove={() => {}}></ReactFlow>
    </div>
  );
};
