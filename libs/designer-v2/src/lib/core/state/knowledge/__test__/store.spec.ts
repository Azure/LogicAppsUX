import { describe, expect, it } from 'vitest';
import { setDarkMode } from '../optionsSlice';
import { KnowledgePanelView, openPanelView } from '../panelSlice';
import { knowledgeStore, setupStore } from '../store';

describe('knowledge store', () => {
  it('combines the knowledge editor reducers', () => {
    const state = setupStore().getState();

    expect(Object.keys(state)).toEqual(['resource', 'connection', 'options', 'knowledgeHubPanel']);
    expect(state.resource).toEqual({ subscriptionId: '', resourceGroup: '', location: '' });
    expect(state.options).toMatchObject({ servicesInitialized: false, isDarkMode: false });
    expect(state.knowledgeHubPanel).toEqual({ isOpen: false });
  });

  it('creates the exported store with the default state', () => {
    expect(knowledgeStore.getState().knowledgeHubPanel.isOpen).toBe(false);
  });

  it('accepts partial preloaded state', () => {
    const store = setupStore({
      options: { servicesInitialized: true, isDarkMode: true },
      knowledgeHubPanel: { isOpen: true, currentPanelView: KnowledgePanelView.AddFiles },
    });

    expect(store.getState().options).toMatchObject({ servicesInitialized: true, isDarkMode: true });
    expect(store.getState().knowledgeHubPanel.currentPanelView).toBe(KnowledgePanelView.AddFiles);
    expect(store.getState().resource.subscriptionId).toBe('');
  });

  it('dispatches actions to the composed reducers', () => {
    const store = setupStore();

    store.dispatch(setDarkMode(true));
    store.dispatch(openPanelView({ panelView: KnowledgePanelView.AddFiles, selectedTabId: 'files' }));

    expect(store.getState().options.isDarkMode).toBe(true);
    expect(store.getState().knowledgeHubPanel).toEqual({
      isOpen: true,
      currentPanelView: KnowledgePanelView.AddFiles,
      selectedTabId: 'files',
    });
  });
});
