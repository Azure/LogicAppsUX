import type { ThemeType } from '../DataMapperDesignerProvider';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface AppState {
  theme: ThemeType;
}

const initialState: AppState = {
  theme: 'light',
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    changeTheme: (state, action: PayloadAction<ThemeType>) => {
      state.theme = action.payload;
    },
  },
});

export const { changeTheme } = appSlice.actions;

export default appSlice.reducer;
