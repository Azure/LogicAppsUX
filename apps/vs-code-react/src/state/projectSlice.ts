import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface ProjectState {
  initialized: boolean;
  project?: string;
  dataMapperVersion?: number;
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
    changeDataMapperVersion: (state, action: PayloadAction<number>) => {
      state.dataMapperVersion = action.payload;
    },
  },
});

export const { initialize, changeDataMapperVersion } = projectSlice.actions;

export default projectSlice.reducer;
