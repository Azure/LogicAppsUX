import { addRunAfter, removeRunAfter } from '../../state/workflow/workflowSlice';
import type { RootState } from '../../store';
import { updateAllUpstreamNodes } from './initialize';
import { createAsyncThunk } from '@reduxjs/toolkit';

export interface EdgeRunAfterPayload {
  parentOperationId: string;
  childOperationId: string;
}

export const addOperationRunAfter = createAsyncThunk(
  'addOperationRunAfter',
  async (edgePayload: EdgeRunAfterPayload, { dispatch, getState }) => {
    const { parentOperationId, childOperationId } = edgePayload;
    dispatch(
      addRunAfter({
        parentOperationId,
        childOperationId,
      })
    );
    updateAllUpstreamNodes(getState() as RootState, dispatch);
    return;
  }
);

export const removeOperationRunAfter = createAsyncThunk(
  'removeOperationRunAfter',
  async (edgePayload: EdgeRunAfterPayload, { dispatch, getState }) => {
    const { parentOperationId, childOperationId } = edgePayload;
    dispatch(
      removeRunAfter({
        parentOperationId,
        childOperationId,
      })
    );
    updateAllUpstreamNodes(getState() as RootState, dispatch);
    return;
  }
);
