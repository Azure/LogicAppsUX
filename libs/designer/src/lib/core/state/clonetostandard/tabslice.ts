import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface TabState {
  selectedTabId: string | undefined;
}

const initialState: TabState = {
  selectedTabId: undefined,
};

export const tabSlice = createSlice({
  name: 'tab',
  initialState,
  reducers: {
    selectWizardTab: (state, action: PayloadAction<string>) => {
      state.selectedTabId = action.payload;
    },
  },
});

export const { selectWizardTab } = tabSlice.actions;
export default tabSlice.reducer;
