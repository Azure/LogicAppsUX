import { describe, beforeAll, expect, it, beforeEach, vi } from 'vitest';
import type { AppStore } from '../../../../core/state/templates/store';
import { setupStore } from '../../../../core/state/templates/store';
import { renderWithProviders } from '../../../../__test__/template-test-utils';
import { screen } from '@testing-library/react';
import { TemplatePanelView } from '../../../../core/state/templates/panelSlice';
import constants from '../../../../common/constants';
import { ReviewCreatePanel } from '../createWorkflowPanel/tabs/reviewCreateTab';

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
      connections: [],
    };
    const minimalStoreData = {
      template: templateSliceData,
      panel: {
        isOpen: true,
        currentPanelView: TemplatePanelView.CreateWorkflow,
        selectedTabId: constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE,
      },
    };
    store = setupStore(minimalStoreData);
  });

  beforeEach(() => {
    renderWithProviders(<ReviewCreatePanel onCreateClick={vi.fn()} />, { store });
  });

  it('Shows Name and State Tab values displayed', async () => {
    expect(store.getState().panel.selectedTabId).toBe(constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE);
    expect(store.getState().panel.selectedTabId).toBe('REVIEW_AND_CREATE');
    expect(screen.getByTestId('create-workflow-button')).toBeDefined();
  });
});
