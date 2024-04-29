import type { Template } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface TemplateState {
  // skuType?: 'Standard' | 'Consumption'; //TODO: change to pre-defined enum
  template?: Template;
}

const initialState: TemplateState = {};

export const templateSlice = createSlice({
  name: 'template',
  initialState,
  reducers: {
    // // TODO: below might not be used.
    // changeSkuType: (state, action: PayloadAction<'Standard' | 'Consumption'>) => {
    //   state.skuType = action.payload;
    // },
    setInitialTemplate: (state, action: PayloadAction<Template>) => {
      state.template = action.payload;
    },
  },
});

export const {
  // changeSkuType,
  setInitialTemplate,
} = templateSlice.actions;

export default templateSlice.reducer;
