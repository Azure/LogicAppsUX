import React, { PropsWithChildren } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { Provider as ReduxProvider } from 'react-redux';
import type { AppStore, RootState } from '../core/state/templates/store';
import { setupStore } from '../core/state/templates/store';
import { TemplatesWrappedContext } from '../core/templates/TemplatesDesignerContext';
import { TemplatesDataProvider } from '../core/templates/TemplatesDataProvider';

// As a basic setup, import your same slice reducers

// This type interface extends the default options for render from RTL, as well
// as allows the user to specify other things such as initialState, templateStore.
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: Partial<RootState>;
  store?: AppStore;
}

export function renderWithProviders(ui: React.ReactElement, extendedRenderOptions: ExtendedRenderOptions = {}) {
  const {
    preloadedState = {},
    // Automatically create a templateStore instance if no templateStore was passed in
    store = setupStore(preloadedState),
    ...renderOptions
  } = extendedRenderOptions;

  const Wrapper = ({ children }: PropsWithChildren) => <ReduxProvider store={store}>{children}</ReduxProvider>;

  // Return an object with the templateStore and all of RTL's query functions
  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}
