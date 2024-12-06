import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction, Reducer } from '@reduxjs/toolkit';

export interface AppState {
  theme: ThemeType;
}

const initialState: AppState = {
  theme: ThemeType.Light,
};

type Reducers = {
  changeTheme: (state: AppState, action: PayloadAction<ThemeType>) => void;
};

export const appSlice = createSlice<AppState, Reducers, 'app', any>({
  name: 'app',
  initialState,
  reducers: {
    changeTheme: (state, action: PayloadAction<ThemeType>) => {
      state.theme = action.payload;
    },
  },
});

export const { changeTheme } = appSlice.actions;

const appReducer: Reducer<AppState> = appSlice.reducer;
export default appReducer;
