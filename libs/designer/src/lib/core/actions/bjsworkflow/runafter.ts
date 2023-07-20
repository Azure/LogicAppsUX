import { addEdgeFromRunAfter, removeEdgeFromRunAfter } from '../../state/workflow/workflowSlice';
import type { RootState } from '../../store';
import { updateAllUpstreamNodes } from './initialize';
import { createAsyncThunk } from '@reduxjs/toolkit';

export interface EdgeRunAfterPayload {
  parentOperationId: string;
  childOperationId: string;
}

export const addEdgeFromRunAfterOperation = createAsyncThunk(
  'addEdgeFromRunAfter',
  async (edgePayload: EdgeRunAfterPayload, { dispatch, getState }) => {
    const { parentOperationId, childOperationId } = edgePayload;
    dispatch(
      addEdgeFromRunAfter({
        parentOperationId,
        childOperationId,
      })
    );
    updateAllUpstreamNodes(getState() as RootState, dispatch);

    return;
  }
);

export const removeEdgeFromRunAfterOperation = createAsyncThunk(
  'removeEdgeFromRunAfter',
  async (edgePayload: EdgeRunAfterPayload, { dispatch, getState }) => {
    const { parentOperationId, childOperationId } = edgePayload;
    dispatch(
      removeEdgeFromRunAfter({
        parentOperationId,
        childOperationId,
      })
    );
    updateAllUpstreamNodes(getState() as RootState, dispatch);

    return;
  }
);
