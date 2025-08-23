import type { MoveNodePayload } from '../../parsers/moveNodeInWorkflow';
import { moveNode } from '../../state/workflow/workflowSlice';
import type { RootState } from '../../store';
import { updateAllUpstreamNodes } from './initialize';
import { createAsyncThunk } from '@reduxjs/toolkit';

export const moveOperation = createAsyncThunk('moveOperation', async (movePayload: MoveNodePayload, { dispatch, getState }) => {
  dispatch(moveNode(movePayload));
  updateAllUpstreamNodes(getState() as RootState, dispatch);

  // Update settings for children + parents

  return;
});
