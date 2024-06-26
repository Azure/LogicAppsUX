import { describe, beforeAll, expect, it, beforeEach } from 'vitest';
import type { AppStore } from '../../../../core/state/templates/store';
import { setupStore } from '../../../../core/state/templates/store';
import { renderWithProviders } from '../../../../__test__/template-test-utils';
import { screen } from '@testing-library/react';
import { TemplatePanelView } from '../../../../core/state/templates/panelSlice';
import constants from '../../../../common/constants';
import { NameStatePanel } from '../createWorkflowPanel/tabs/nameStateTab';
import { QueryClientProvider } from '@tanstack/react-query';
import { getReactQueryClient } from '../../../../core';
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from 'react';

describe('panel/templatePanel/createWorkflowPanel/nameStateTab', () => {
  let store: AppStore;

  beforeAll(() => {
    const templateSliceData = {
      workflowName: 'workflowName 1',
      kind: undefined,
      templateName: 'title',
      manifest: undefined,
      workflowDefinition: undefined,
      parameters: {
        definitions: {},
        validationErrors: {},
      },
      connections: {},
      servicesInitialized: false,
    };
    const minimalStoreData = {
      template: templateSliceData,
      panel: {
        isOpen: true,
        currentPanelView: TemplatePanelView.CreateWorkflow,
        selectedTabId: constants.TEMPLATE_PANEL_TAB_NAMES.NAME_AND_STATE,
      },
    };
    store = setupStore(minimalStoreData);
  });

  beforeEach(() => {
    const queryClient = getReactQueryClient();

    renderWithProviders(
      <QueryClientProvider client={queryClient}>
        <NameStatePanel />
      </QueryClientProvider>,

      { store }
    );
  });

  it('Shows Name and State Tab values displayed', async () => {
    expect(store.getState().panel.selectedTabId).toBe(constants.TEMPLATE_PANEL_TAB_NAMES.NAME_AND_STATE);
    expect(screen.getAllByText('Workflow Name')).toBeDefined();
    expect(screen.getAllByDisplayValue(store.getState().template.workflowName ?? 'n/a')).toBeDefined;
    expect(screen.getAllByText('State Type')).toBeDefined();
    expect(screen.getAllByText('Stateful')).toBeDefined();
    expect(screen.getAllByText('Optimized for high reliability')).toBeDefined();
    expect(screen.getAllByText('Ideal for process business transitional data')).toBeDefined();
    expect(screen.getAllByText('Stateless')).toBeDefined();
    expect(screen.getAllByText('Optimized for low latency')).toBeDefined();
    expect(screen.getAllByText('Ideal for request-response and processing IoT events')).toBeDefined();
  });
});
