import type { Template } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { RootState } from './store';
import type { FilterObject } from '@microsoft/designer-ui';
import { loadManifestsFromPaths } from '../../actions/bjsworkflow/templates';

export const templatesCountPerPage = 25;
const initialPageNum = 0;

interface ContentInfo<T> {
  value: T;
  isEditable?: boolean;
}

export interface ViewTemplateDetails {
  id: string;
  basicsOverride?: Record<
    string,
    {
      name?: ContentInfo<string>;
      kind?: ContentInfo<string>;
    }
  >;
  parametersOverride?: Record<string, ContentInfo<any>>;
}

export interface ManifestState {
  availableTemplateNames?: ManifestName[];
  filteredTemplateNames?: ManifestName[];
  githubTemplateNames?: ManifestName[];
  customTemplateNames?: ManifestName[];
  availableTemplates?: Record<ManifestName, Template.Manifest>;
  filters: {
    pageNum: number;
    keyword?: string;
    sortKey: string;
    connectors: FilterObject[] | undefined;
    detailFilters: Record<string, FilterObject[]>;
  };
  viewTemplateDetails?: ViewTemplateDetails;
}

type ManifestName = string;

export const initialManifestState: ManifestState = {
  availableTemplateNames: undefined,
  filters: {
    pageNum: initialPageNum,
    sortKey: 'a-to-z',
    connectors: undefined,
    detailFilters: {},
  },
};

export const loadGithubManifestNames = createAsyncThunk('manifest/loadGithubManifestNames', async () => {
  const githubManifestNames = await loadManifestNamesFromGithub();
  return githubManifestNames ?? [];
});

export const loadGithubManifests = createAsyncThunk('manifest/loadGithubManifests', async (count: number, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  const manifestResourcePaths = currentState.manifest.availableTemplateNames ?? [];

  return loadManifestsFromPaths(manifestResourcePaths.slice(0, count));
});

export const lazyLoadGithubManifests = createAsyncThunk('manifest/lazyLoadGithubManifests', async (startIndex: number, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  const manifestResourcePaths = currentState.manifest.availableTemplateNames ?? [];

  return loadManifestsFromPaths(manifestResourcePaths.slice(startIndex));
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
    setCustomTemplates: (state, action: PayloadAction<Record<string, Template.Manifest> | undefined>) => {
      if (action.payload) {
        const customTemplateNames = Object.keys(action.payload);
        state.customTemplateNames = customTemplateNames;
        state.availableTemplateNames = [...(state.githubTemplateNames ?? []), ...customTemplateNames];
        state.availableTemplates = { ...(state.availableTemplates ?? {}), ...action.payload };
      }
    },
    setPageNum: (state, action: PayloadAction<number>) => {
      state.filters.pageNum = action.payload;
    },
    setKeywordFilter: (state, action: PayloadAction<string | undefined>) => {
      state.filters.keyword = action.payload;
      state.filters.pageNum = initialPageNum;
    },
    setSortKey: (state, action: PayloadAction<string>) => {
      state.filters.sortKey = action.payload;
    },
    setConnectorsFilters: (state, action: PayloadAction<FilterObject[] | undefined>) => {
      state.filters.connectors = action.payload;
      state.filters.pageNum = initialPageNum;
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
      state.filters.pageNum = initialPageNum;
    },
    setViewTemplateDetails: (state, action: PayloadAction<ViewTemplateDetails>) => {
      state.viewTemplateDetails = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadGithubManifestNames.fulfilled, (state, action) => {
      state.availableTemplateNames = [...action.payload, ...(state.customTemplateNames ?? [])];
      state.githubTemplateNames = action.payload;
    });

    builder.addCase(loadGithubManifestNames.rejected, (state) => {
      // TODO change to null for error handling case
      state.availableTemplateNames = state.customTemplateNames ?? [];
      state.githubTemplateNames = [];
    });

    builder.addCase(loadGithubManifests.fulfilled, (state, action) => {
      state.availableTemplates = { ...state.availableTemplates, ...(action.payload ?? {}) };
    });

    builder.addCase(loadGithubManifests.rejected, (state) => {
      // TODO some way of handling error
      state.availableTemplates = undefined;
    });

    builder.addCase(lazyLoadGithubManifests.fulfilled, (state, action) => {
      state.availableTemplates = { ...state.availableTemplates, ...(action.payload ?? {}) };
    });
  },
});

export const {
  setavailableTemplatesNames,
  setavailableTemplates,
  setFilteredTemplateNames,
  setCustomTemplates,
  setPageNum,
  setKeywordFilter,
  setSortKey,
  setConnectorsFilters,
  setDetailsFilters,
  setViewTemplateDetails,
} = manifestSlice.actions;
export default manifestSlice.reducer;

const loadManifestNamesFromGithub = async (): Promise<ManifestName[] | undefined> => {
  try {
    return (await import('./../../templates/templateFiles/manifest.json'))?.default as ManifestName[];
  } catch (ex) {
    console.error(ex);
    return undefined;
  }
};
