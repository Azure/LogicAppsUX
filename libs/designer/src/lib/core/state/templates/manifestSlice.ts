import type { Manifest } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface ManifestState {
  availableManifestNames: ManifestName[];
  availableManifests?: Record<ManifestName, Manifest>;
}

type ManifestName = string;

export const initialManifestState: ManifestState = {
  availableManifestNames: [],
};

export const loadManifestNames = createAsyncThunk('manifest/loadManifestNames', async () => {
  return loadManifestsFromGithub();
});

export const manifestSlice = createSlice({
  name: 'manifest',
  initialState: initialManifestState,
  reducers: {
    setAvailableManifestsNames: (state, action: PayloadAction<ManifestName[] | undefined>) => {
      if (action.payload) {
        state.availableManifestNames = action.payload;
      }
    },
    setAvailableManifests: (state, action: PayloadAction<Record<ManifestName, Manifest> | undefined>) => {
      if (action.payload) {
        state.availableManifests = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadManifestNames.fulfilled, (state, action) => {
      state.availableManifestNames = action.payload ?? [];
    });

    builder.addCase(loadManifestNames.rejected, (state) => {
      // TODO change to null for error handling case
      state.availableManifestNames = [];
    });
  },
});

const loadManifestsFromGithub = async (): Promise<ManifestName[] | undefined> => {
  try {
    const manifestNames: ManifestName[] = await import('../../templates/samples/manifest.json');
    return (manifestNames as any)?.default ?? manifestNames;
  } catch (ex) {
    console.error(ex);
    return undefined;
  }
};
