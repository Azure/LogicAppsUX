import { describe, expect, it } from 'vitest';
import { setDarkMode } from '../optionsSlice';
import { KnowledgePanelView, openPanelView } from '../panelSlice';
import { setupStore } from '../store';

describe('knowledge store', () => {
  it('combines the knowledge editor reducers', () => {
    const state = setupStore().getState();

    expect(Object.keys(state)).toEqual(['resource', 'connection', 'options', 'knowledgeHubPanel']);
    expect(state.options.servicesInitialized).toBe(false);
    expect(state.knowledgeHubPanel).toEqual({ isOpen: false });
  });

  it('accepts partial preloaded state', () => {
    const store = setupStore({
      options: {
        servicesInitialized: true,
        isDarkMode: true,
        notification: { title: 'Ready', content: 'Services initialized.' },
      },
    });

    expect(store.getState().options).toEqual({
      servicesInitialized: true,
      isDarkMode: true,
      notification: { title: 'Ready', content: 'Services initialized.' },
    });
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
