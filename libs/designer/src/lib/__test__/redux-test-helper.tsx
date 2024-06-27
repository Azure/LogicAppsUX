import connectionsReducer from '../core/state/connection/connectionSlice';
import designerOptionsReducer from '../core/state/designerOptions/designerOptionsSlice';
import designerViewReducer from '../core/state/designerView/designerViewSlice';
import operationMetadataReducer from '../core/state/operation/operationMetadataSlice';
import panelReducer from '../core/state/panel/panelSlice';
import settingsReducer from '../core/state/setting/settingSlice';
import staticResultsSchemasReducer from '../core/state/staticresultschema/staticresultsSlice';
import tokens from '../core/state/tokens/tokensSlice';
import workflowReducer from '../core/state/workflow/workflowSlice';
import workflowParametersReducer from '../core/state/workflowparameters/workflowparametersSlice';
import type { AppStore, RootState } from '../core/store';
import { configureStore } from '@reduxjs/toolkit';
import { type RenderOptions } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import ReactTestRenderer from 'react-test-renderer';

// This type interface extends the default options for render from RTL, as well
// as allows the user to specify other things such as initialState, store.
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: Partial<RootState>;
  store?: AppStore;
}

export function renderWithRedux(
  ui: React.ReactElement,
  {
    preloadedState = {},
    // Automatically create a store instance if no store was passed in
    store = configureStore({
      reducer: {
        workflow: workflowReducer,
        operations: operationMetadataReducer,
        panel: panelReducer,
        connections: connectionsReducer,
        settings: settingsReducer,
        designerOptions: designerOptionsReducer,
        designerView: designerViewReducer,
        tokens: tokens,
        workflowParameters: workflowParametersReducer,
        staticResults: staticResultsSchemasReducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false,
        }),
      preloadedState,
    }),
  }: ExtendedRenderOptions = {}
) {
  const component = ReactTestRenderer.create(<Provider store={store}>{ui}</Provider>);
  return component;
}
