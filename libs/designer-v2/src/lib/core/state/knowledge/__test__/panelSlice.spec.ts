import { describe, expect, it } from 'vitest';
import panelReducer, { closePanel, KnowledgePanelView, openPanelView, selectPanelTab, type PanelState } from '../panelSlice';

describe('knowledge panel slice', () => {
  it('returns the initial state', () => {
    expect(panelReducer(undefined, { type: 'unknown' })).toEqual({ isOpen: false });
  });

  it('opens a panel view and selects its tab', () => {
    expect(panelReducer(undefined, openPanelView({ panelView: KnowledgePanelView.CreateConnection, selectedTabId: 'connection' }))).toEqual(
      {
        isOpen: true,
        currentPanelView: KnowledgePanelView.CreateConnection,
        selectedTabId: 'connection',
      }
    );
  });

  it('opens a panel view without a selected tab', () => {
    expect(panelReducer(undefined, openPanelView({ panelView: KnowledgePanelView.AddFiles }))).toEqual({
      isOpen: true,
      currentPanelView: KnowledgePanelView.AddFiles,
      selectedTabId: undefined,
    });
  });

  it('updates and clears the selected tab', () => {
    const state: PanelState = { isOpen: true, currentPanelView: KnowledgePanelView.EditConnection };

    expect(panelReducer(state, selectPanelTab('details')).selectedTabId).toBe('details');
    expect(panelReducer({ ...state, selectedTabId: 'details' }, selectPanelTab(undefined)).selectedTabId).toBeUndefined();
  });

  it('closes the panel and clears its transient state', () => {
    const state: PanelState = {
      isOpen: true,
      currentPanelView: KnowledgePanelView.EditConnection,
      selectedTabId: 'details',
      autoOpenPanel: true,
    };

    expect(panelReducer(state, closePanel())).toEqual({
      isOpen: false,
      currentPanelView: undefined,
      selectedTabId: undefined,
      autoOpenPanel: true,
    });
  });
});
