import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

type AppContext = 'vscode' | 'web';
export interface AppState {
  theme: ThemeType;
  context: AppContext;
}

const initialState: AppState = {
  theme: ThemeType.Light,
  context: 'web',
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    changeTheme: (state, action: PayloadAction<ThemeType>) => {
      state.theme = action.payload;
    },
    setContext: (state, action: PayloadAction<AppContext | undefined>) => {
      state.context = action.payload ?? 'web';
    },
  },
});

export const { changeTheme, setContext } = appSlice.actions;

export default appSlice.reducer;
