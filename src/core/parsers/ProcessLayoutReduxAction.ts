/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';

import ELK, { ElkEdge, ElkNode } from 'elkjs';
import { WorkflowNode } from './models/workflowNode';

const elk = new ELK();

export const processGraphLayout = createAsyncThunk('parser/processlayout', async (_: any, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  const elkD: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.direction': 'DOWN',
    },
    children: [],
    edges: [],
  };

  const retNodes: WorkflowNode[] = [];
  console.log(currentState);
  for (const node of currentState.workflow.nodes) {
    elkD.children?.push({
      id: node.id,
      width: 172,
      height: 38,
    });
    for (const child of node.childrenNodes) {
      elkD.edges?.push({
        id: `${node.id}-${child}`,
        sources: [node.id],
        targets: [child],
      } as ElkEdge);
    }
  }
  const layout = await elk.layout(elkD, {
    layoutOptions: {
      algorithm: 'layered',
      'elk.direction': 'DOWN',
      'nodePlacement.bk.fixedAlignment': 'NONE',
      considerModelOrder: 'NONE',
      edgeRouting: 'UNDEFINED',
      'spacing.baseValue': '100',
      'spacing.edgeEdgeBetweenLayers': '0',
    },
  });

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
