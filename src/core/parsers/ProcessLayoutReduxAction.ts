/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';

import ELK, { ElkEdge, ElkNode } from 'elkjs/lib/elk-api';
import { Worker } from 'elkjs/lib/elk-worker';

import { WorkflowNode } from './models/workflowNode';

const elk = new ELK({
  workerFactory: function (url) {
    // the value of 'url' is irrelevant here
    return new Worker(url);
  },
});

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
      'elk.direction': 'RIGHT',
      'nodePlacement.bk.fixedAlignment': 'BALANCED',
      considerModelOrder: 'NODES_AND_EDGES',
      edgeRouting: 'SPLINES',
      nodeSpacing: '30',
      'spacing.baseValue': '30',
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
