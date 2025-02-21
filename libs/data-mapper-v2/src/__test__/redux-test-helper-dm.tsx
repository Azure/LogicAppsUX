import React from 'react';
import { Provider } from 'react-redux';
import ReactTestRenderer from 'react-test-renderer';
import schemaReducer from '../core/state/SchemaSlice';
import functionReducer from '../core/state/FunctionSlice';
import panelReducer from '../core/state/PanelSlice';
import modalReducer from '../core/state/ModalSlice';
import errorsReducer from '../core/state/ErrorsSlice';
import appReducer from '../core/state/AppSlice';
import dataMapReducer from '../core/state/DataMapSlice';
import { configureStore } from '@reduxjs/toolkit';
import { AppStore, includedActions, RootState } from '../core/state/Store';
import { render, RenderOptions } from '@testing-library/react';
import undoable, { includeAction } from 'redux-undo';

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
        schema: schemaReducer,
        function: functionReducer,
        panel: panelReducer,
        modal: modalReducer,
        errors: errorsReducer,
        dataMap: undoable(dataMapReducer, {
          filter: includeAction(includedActions),
        }),
        app: appReducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false,
        }),
      preloadedState,
    }),
  }: ExtendedRenderOptions = {}
) {
  const component = render(<Provider store={store}>{ui}</Provider>);
  return component;
}
