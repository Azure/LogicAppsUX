import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction, Slice } from '@reduxjs/toolkit';

export interface AppState {
  theme: ThemeType;
}

const initialState: AppState = {
  theme: ThemeType.Light,
};

export const appSlice: Slice<AppState> = createSlice({
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
