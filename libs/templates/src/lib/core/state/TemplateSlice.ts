import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface TemplateState {
  skuType?: 'Standard' | 'Consumption'; //TODO: change to pre-defined enum
}

const initialState: TemplateState = {};

export const templateSlice = createSlice({
  name: 'template',
  initialState,
  reducers: {
    changeSkuType: (state, action: PayloadAction<'Standard' | 'Consumption'>) => {
      state.skuType = action.payload;
    },
  },
});

export const { changeSkuType } = templateSlice.actions;

export default templateSlice.reducer;
