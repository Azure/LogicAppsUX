import type { Template } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { templatesPathFromState, type RootState } from './store';
import type { FilterObject } from '@microsoft/designer-ui';

export interface ManifestState {
  availableTemplateNames?: ManifestName[];
  filteredTemplateNames?: ManifestName[];
  availableTemplates?: Record<ManifestName, Template.Manifest>;
  filters: {
    keyword?: string;
    connectors: FilterObject[] | undefined;
    detailFilters: Record<string, FilterObject[]>;
  };
}

type ManifestName = string;

export const initialManifestState: ManifestState = {
  availableTemplateNames: undefined,
  filters: {
    connectors: undefined,
    detailFilters: {},
  },
};

export const loadManifestNames = createAsyncThunk('manifest/loadManifestNames', async () => {
  return loadManifestNamesFromGithub();
});

export const loadManifests = createAsyncThunk('manifest/loadManifests', async (_: unknown, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  const manifestResourcePaths = currentState.manifest.availableTemplateNames ?? [];

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
    setavailableTemplatesNames: (state, action: PayloadAction<ManifestName[] | undefined>) => {
      if (action.payload) {
        state.availableTemplateNames = action.payload;
      }
    },
    setavailableTemplates: (state, action: PayloadAction<Record<ManifestName, Template.Manifest> | undefined>) => {
      if (action.payload) {
        state.availableTemplates = action.payload;
      }
    },
    setFilteredTemplateNames: (state, action: PayloadAction<ManifestName[] | undefined>) => {
      if (action.payload) {
        state.filteredTemplateNames = action.payload;
      }
    },
    setKeywordFilter: (state, action: PayloadAction<string | undefined>) => {
      state.filters.keyword = action.payload;
    },
    setConnectorsFilters: (state, action: PayloadAction<FilterObject[] | undefined>) => {
      state.filters.connectors = action.payload;
    },
    setDetailsFilters: (
      state,
      action: PayloadAction<{
        filterName: string;
        filters: FilterObject[] | undefined;
      }>
    ) => {
      const currentDetailFilters = { ...state.filters.detailFilters };
      if (action.payload.filters) {
        currentDetailFilters[action.payload.filterName] = action.payload.filters;
      } else {
        delete currentDetailFilters[action.payload.filterName];
      }
      state.filters.detailFilters = currentDetailFilters;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadManifestNames.fulfilled, (state, action) => {
      state.availableTemplateNames = action.payload ?? [];
    });

    builder.addCase(loadManifestNames.rejected, (state) => {
      // TODO change to null for error handling case
      state.availableTemplateNames = [];
    });

    builder.addCase(loadManifests.fulfilled, (state, action) => {
      state.availableTemplates = action.payload ?? [];
    });

    builder.addCase(loadManifests.rejected, (state) => {
      // TODO some way of handling error
      state.availableTemplates = undefined;
    });
  },
});

export const {
  setavailableTemplatesNames,
  setavailableTemplates,
  setFilteredTemplateNames,
  setKeywordFilter,
  setConnectorsFilters,
  setDetailsFilters,
} = manifestSlice.actions;
export default manifestSlice.reducer;

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
