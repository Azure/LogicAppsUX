import { createSlice } from '@reduxjs/toolkit';
import { initializeData } from '../../actions/bjsworkflow/knowledge';

export interface OptionsState {
  servicesInitialized: boolean;
  isDarkMode?: boolean;
}

const initialState: OptionsState = {
  servicesInitialized: false,
  isDarkMode: false,
};

export const optionsSlice = createSlice({
  name: 'knowledgeHubOptions',
  initialState,
  reducers: {
    setDarkMode: (state, action) => {
      state.isDarkMode = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(initializeData.fulfilled, (state, action) => {
      state.servicesInitialized = action.payload;
    });
  },
});

export const { setDarkMode } = optionsSlice.actions;
export default optionsSlice.reducer;
