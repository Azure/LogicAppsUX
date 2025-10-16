import type { PayloadAction, Slice } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface ProjectState {
  initialized: boolean;
  project?: string;
  route?: string;
  dataMapperVersion?: number;
}

const initialState: ProjectState = {
  initialized: false,
};

export interface InitializePayload {
  project: string;
  route?: string;
}

export const projectSlice: Slice<ProjectState> = createSlice({
  name: 'project',
  initialState,
  reducers: {
    initialize: (state: ProjectState, action: PayloadAction<InitializePayload>) => {
      const { project, route } = action.payload;
      state.initialized = true;
      state.project = project;
      state.route = route;
    },
    changeDataMapperVersion: (state, action: PayloadAction<number>) => {
      state.dataMapperVersion = action.payload;
    },
  },
});

export const { initialize, changeDataMapperVersion } = projectSlice.actions;

export default projectSlice.reducer;
