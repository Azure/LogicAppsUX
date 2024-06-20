import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import {
  closePanel,
  openCreateWorkflowPanelView,
  openQuickViewPanelView,
  panelSlice,
  selectPanelTab,
  TemplatePanelView,
} from '../panelSlice';

describe('panel slice reducers', () => {
  it('update state call tests', async () => {
    const initialState = {
      isOpen: false,
      selectedTabId: undefined,
    };

    const state1 = panelSlice.reducer(initialState, openQuickViewPanelView());
    expect(state1.isOpen).toBe(true);
    expect(state1.currentPanelView).toBe(TemplatePanelView.QuickView);
    expect(state1.selectedTabId).toBe(undefined);

    const state2 = panelSlice.reducer(initialState, openCreateWorkflowPanelView());
    expect(state2.isOpen).toBe(true);
    expect(state2.currentPanelView).toBe(TemplatePanelView.CreateWorkflow);
    expect(state2.selectedTabId).toBe(undefined);

    const state3 = panelSlice.reducer(initialState, selectPanelTab());
    expect(state3.selectedTabId).toBe(undefined);

    const state4 = panelSlice.reducer(initialState, selectPanelTab('one'));
    expect(state4.selectedTabId).toBe('one');

    const state5 = panelSlice.reducer(initialState, closePanel());
    expect(state5.isOpen).toBe(false);
    expect(state5.currentPanelView).toBe(undefined);
    expect(state5.selectedTabId).toBe(undefined);
  });
});
