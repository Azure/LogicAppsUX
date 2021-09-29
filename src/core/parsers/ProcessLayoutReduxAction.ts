/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';

import ELK, { ElkNode } from 'elkjs';
import { WorkflowNode } from './models/workflowNode';

const elk = new ELK();

export const processGraphLayout = createAsyncThunk('parser/processlayout', async (_: any, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  console.log(currentState.workflow.nodes);
  const elkD: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.direction': 'DOWN',
    },
    children: [],
    edges: [],
  };
  const retNodes: WorkflowNode[] = [];
  for (const node of currentState.workflow.nodes) {
    elkD.children?.push({
      id: node.id,
      width: node.size.width,
      height: node.size.height,
    });
    for (const child of node.childrenNodes) {
      elkD.edges?.push({
        id: `${node.id}-${child}`,
        sources: [node.id],
        targets: [child],
      });
    }
  }
  const layout = await elk.layout(elkD, {
    layoutOptions: {
      algorithm: 'layered',
      'elk.direction': 'RIGHT',
      'nodePlacement.bk.fixedAlignment': 'BALANCED',
      alignment: 'TOP',
      considerModelOrder: 'NODES_AND_EDGES',
      // edgeRouting: 'SPLINE',
      'spacing.edgeNode': '30',
      'spacing.baseValue': '100',
      'spacing.edgeEdgeBetweenLayers': '0',
    },
  });

  console.log('layout');
  console.log(layout);
  const nodeMap = new Map<string, WorkflowNode>();
  currentState.workflow.nodes.forEach((x) => {
    nodeMap.set(x.id, x);
  });
  for (const node of layout.children!) {
    const n = nodeMap.get(node.id)!;
    retNodes.push({
      ...n,
      position: {
        x: node.x ?? 0,
        y: node.y ?? 0,
      },
    });
  }
  return retNodes;
});
