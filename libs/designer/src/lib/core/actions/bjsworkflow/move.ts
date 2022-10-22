import type { MoveNodePayload } from '../../parsers/moveNodeInWorkflow';
import { clearPanel } from '../../state/panel/panelSlice';
import { clearFocusNode, moveNode } from '../../state/workflow/workflowSlice';
import type { RootState } from '../../store';
import { updateAllUpstreamNodes } from './initialize';
import { createAsyncThunk } from '@reduxjs/toolkit';

export const moveOperation = createAsyncThunk('moveOperation', async (movePayload: MoveNodePayload, { dispatch, getState }) => {
  dispatch(clearFocusNode());
  dispatch(clearPanel());

  dispatch(moveNode(movePayload));
  updateAllUpstreamNodes(getState() as RootState, dispatch);

  // Update settings for children + parents

  return;
});
