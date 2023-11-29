import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface ProjectState {
  initialized: boolean;
  project?: string;
}

const initialState: ProjectState = {
  initialized: false,
};

export const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    initialize: (state: ProjectState, action: PayloadAction<string | undefined>) => {
      state.initialized = true;
      state.project = action.payload;
    },
  },
});

export const { initialize } = projectSlice.actions;

export default projectSlice.reducer;
