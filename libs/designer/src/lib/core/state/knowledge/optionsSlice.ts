import { createSlice } from '@reduxjs/toolkit';
import { initializeData } from '../../actions/bjsworkflow/knowledge';
import type { ServerNotificationData } from '../../../ui/mcp/servers/servers';

export interface OptionsState {
  servicesInitialized: boolean;
  isDarkMode?: boolean;
  notification?: ServerNotificationData;
}

const initialState: OptionsState = {
  servicesInitialized: false,
  isDarkMode: false,
  notification: undefined,
};

export const optionsSlice = createSlice({
  name: 'knowledgeHubOptions',
  initialState,
  reducers: {
    setDarkMode: (state, action) => {
      state.isDarkMode = action.payload;
    },
    setNotification: (state, action) => {
      state.notification = action.payload;
    },
    clearNotification: (state) => {
      state.notification = undefined;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(initializeData.fulfilled, (state, action) => {
      state.servicesInitialized = action.payload;
    });
  },
});

export const { setDarkMode, setNotification, clearNotification } = optionsSlice.actions;
export default optionsSlice.reducer;
