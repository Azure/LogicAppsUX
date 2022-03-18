import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface AddServicePayload {
  serviceName: string;
  service: any;
}

const initialState: Record<string, any> = {
  services: {},
};

export const servicesSlice = createSlice({
  name: 'services',
  initialState,
  reducers: {
    registerAllServices: (state, action: PayloadAction<Record<string, any>>) => {
      state.services = { ...action.payload };
    },
    registerService: (state, action: PayloadAction<AddServicePayload>) => {
      const { serviceName, service } = action.payload;
      state.services[serviceName] = service;
    },
  },
});

// Action creators are generated for each case reducer function
export const { registerAllServices, registerService } = servicesSlice.actions;

export default servicesSlice.reducer;
