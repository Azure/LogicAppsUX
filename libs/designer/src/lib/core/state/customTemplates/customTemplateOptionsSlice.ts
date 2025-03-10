import { createSlice } from '@reduxjs/toolkit';
import { initializeCustomTemplateServices } from '../../actions/bjsworkflow/customTemplates';

export interface TemplateOptionsState {
  servicesInitialized: boolean;
}

const initialState: TemplateOptionsState = {
  servicesInitialized: false,
};

export const customTemplateOptionsSlice = createSlice({
  name: 'customTemplateOptions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(initializeCustomTemplateServices.fulfilled, (state, action) => {
      state.servicesInitialized = action.payload;
    });
  },
});

export default customTemplateOptionsSlice.reducer;
