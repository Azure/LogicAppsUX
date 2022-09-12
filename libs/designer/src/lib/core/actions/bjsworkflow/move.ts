import type { MoveNodePayload } from '../../parsers/moveNodeInWorkflow';
import { clearPanel } from '../../state/panel/panelSlice';
import { clearFocusNode, moveNode } from '../../state/workflow/workflowSlice';
import { createAsyncThunk } from '@reduxjs/toolkit';

export const moveOperation = createAsyncThunk('moveOperation', async (movePayload: MoveNodePayload, { dispatch }) => {
  dispatch(clearFocusNode());
  dispatch(clearPanel());

  dispatch(moveNode(movePayload));
  return;
});
