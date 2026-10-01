import type {
  InitializeProjectOverviewPayload,
  ProjectOverviewSnapshot,
  ProjectOverviewVisibilityPayload,
  UpdateProjectOverviewPayload,
} from '@microsoft/vscode-extension-logic-apps';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface ProjectOverviewState {
  initialized: boolean;
  snapshot?: ProjectOverviewSnapshot;
  visible: boolean;
}

export const initialProjectOverviewState: ProjectOverviewState = {
  initialized: false,
  visible: true,
};

export const projectOverviewSlice = createSlice({
  name: 'projectOverview',
  initialState: initialProjectOverviewState,
  reducers: {
    initializeProjectOverview: (state, action: PayloadAction<InitializeProjectOverviewPayload>) => {
      state.initialized = true;
      state.snapshot = action.payload.snapshot;
      state.visible = action.payload.visible;
    },
    updateProjectOverview: (state, action: PayloadAction<UpdateProjectOverviewPayload>) => {
      const nextSnapshot = action.payload.snapshot;
      const currentSnapshot = state.snapshot;

      if (
        currentSnapshot &&
        (currentSnapshot.projectId !== nextSnapshot.projectId || nextSnapshot.generation < currentSnapshot.generation)
      ) {
        return;
      }

      state.initialized = true;
      state.snapshot = nextSnapshot;
    },
    updateProjectOverviewVisibility: (state, action: PayloadAction<ProjectOverviewVisibilityPayload>) => {
      if (!state.snapshot || state.snapshot.projectId === action.payload.projectId) {
        state.visible = action.payload.visible;
      }
    },
  },
});

export const { initializeProjectOverview, updateProjectOverview, updateProjectOverviewVisibility } = projectOverviewSlice.actions;

export default projectOverviewSlice.reducer;
