import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { TemplatePayload } from '../../actions/bjsworkflow/templates';

export interface TemplateState extends TemplatePayload {
  templateName?: string;
}

const initialState: TemplateState = {
  manifest: undefined,
  workflows: {},
  parameterDefinitions: {},
  connections: {},
  errors: {
    parameters: {},
    connections: undefined,
  },
};

export const templateSlice = createSlice({
  name: 'template',
  initialState,
  reducers: {
    updateWorkflows: (state, action: PayloadAction<string>) => {
      state.templateName = action.payload;
    },
  },
});

export const { updateWorkflows } = templateSlice.actions;
export default templateSlice.reducer;
