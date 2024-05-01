import type { Template } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { templatesPathFromState, type RootState } from './store';

export interface ManifestState {
  availableManifestNames?: ManifestName[];
  availableManifests?: Record<ManifestName, Template.Manifest>;
}

type ManifestName = string;

export const initialManifestState: ManifestState = {
  availableManifestNames: undefined,
};

export const loadManifestNames = createAsyncThunk('manifest/loadManifestNames', async () => {
  return loadManifestNamesFromGithub();
});

export const loadManifests = createAsyncThunk('manifest/loadManifests', async (_: unknown, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  const manifestResourcePaths = currentState.manifest.availableManifestNames ?? [];

  try {
    const manifestPromises = manifestResourcePaths.map((resourcePath) =>
      loadManifestsFromGithub(resourcePath).then((response) => [resourcePath, response])
    );
    const manifestsArray = await Promise.all(manifestPromises);
    return Object.fromEntries(manifestsArray);
  } catch (ex) {
    console.error(ex);
    return undefined;
  }
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
    setAvailableManifests: (state, action: PayloadAction<Record<ManifestName, Template.Manifest> | undefined>) => {
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

    builder.addCase(loadManifests.fulfilled, (state, action) => {
      state.availableManifests = action.payload ?? [];
    });

    builder.addCase(loadManifests.rejected, (state) => {
      // TODO some way of handling error
      state.availableManifests = undefined;
    });
  },
});

const loadManifestNamesFromGithub = async (): Promise<ManifestName[] | undefined> => {
  try {
    const manifestNames: ManifestName[] = await import(`${templatesPathFromState}/manifest.json`);
    return (manifestNames as any)?.default ?? manifestNames;
  } catch (ex) {
    console.error(ex);
    return undefined;
  }
};

const loadManifestsFromGithub = async (resourcePath: string): Promise<Template.Manifest> => {
  const manifestDetail: ManifestName[] = await import(`${templatesPathFromState}/${resourcePath}/manifest.json`);
  return (manifestDetail as any)?.default ?? manifestDetail;
};
