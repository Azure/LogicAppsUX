/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import dagre from 'dagre';
import { WorkflowNode } from './models/workflowNode';

export const processGraphLayout = createAsyncThunk('parser/processlayout', async (_: void, thunkAPI) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  const currentState: RootState = thunkAPI.getState() as RootState;
  const nodeArray = Array.from(Object.values(currentState.workflow.nodes));
  const tallestNode = Math.max(...nodeArray.map((x) => x.size.height));
  dagreGraph.setGraph({ rankdir: 'TB', ranksep: tallestNode });

  nodeArray.forEach((node) => {
    dagreGraph.setNode(node.id, { width: node.size.width, height: node.size.height });
    node.childrenNodes.forEach((child) => {
      dagreGraph.setEdge(node.id, child);
    });
  });

  dagre.layout(dagreGraph);
  return nodeArray.reduce((acc, node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    acc[node.id] = {
      ...node,
      position: { x: nodeWithPosition.x - node.size.width / 2, y: nodeWithPosition.y },
    };
    return acc;
  }, {} as Record<string, WorkflowNode>);
});
