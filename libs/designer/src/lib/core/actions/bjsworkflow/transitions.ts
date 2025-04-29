import { addEdgeToTransitions as addEdge, removeEdgeFromTransitions as removeEdge } from '../../state/workflow/workflowSlice';
import type { RootState } from '../../store';
import { updateAllUpstreamNodes } from './initialize';
import { createAsyncThunk } from '@reduxjs/toolkit';

export interface EdgeTransitionPayload {
  sourceId: string;
  targetId: string;
}

export const addEdgeToTransitions = createAsyncThunk(
  'addEdgeToTransitions',
  async (edgePayload: EdgeTransitionPayload, { dispatch, getState }) => {
    const { sourceId, targetId } = edgePayload;
    dispatch(
      addEdge({
        sourceId,
        targetId,
      })
    );
    updateAllUpstreamNodes(getState() as RootState, dispatch);
  }
);

export const removeEdgeFromTransitions = createAsyncThunk(
  'removeEdgeFromTransitions',
  async (edgePayload: EdgeTransitionPayload, { dispatch, getState }) => {
    const { sourceId, targetId } = edgePayload;
    dispatch(
      removeEdge({
        sourceId,
        targetId,
      })
    );
    updateAllUpstreamNodes(getState() as RootState, dispatch);
  }
);
