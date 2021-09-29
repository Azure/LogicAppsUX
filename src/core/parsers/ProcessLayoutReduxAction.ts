/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import dagre from 'dagre';

export const processGraphLayout = createAsyncThunk('parser/processlayout', async (_: void, thunkAPI) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  const currentState: RootState = thunkAPI.getState() as RootState;

  dagreGraph.setGraph({ rankdir: 'TB', ranksep: 100 });

  currentState.workflow.nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: node.size.width, height: node.size.height });
    node.childrenNodes.forEach((child) => {
      dagreGraph.setEdge(node.id, child);
    });
  });

  dagre.layout(dagreGraph);
  return currentState.workflow.nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: { x: nodeWithPosition.x - node.size.width / 2, y: nodeWithPosition.y },
    };
  });
});
