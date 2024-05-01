import type { Manifest } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface ManifestState {
  availableManifests?: Record<ManifestName, Manifest>;
}

type ManifestName = string;

export const initialManifestState: ManifestState = {};

export const manifestSlice = createSlice({
  name: 'manifest',
  initialState: initialManifestState,
  reducers: {
    setAvailableManifests: (state, action: PayloadAction<Record<ManifestName, Manifest> | undefined>) => {
      if (action.payload) {
        state.availableManifests = action.payload;
      }
    },
  },
});

export const { setAvailableManifests } = manifestSlice.actions;

export default manifestSlice.reducer;
