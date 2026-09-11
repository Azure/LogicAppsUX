import { describe, expect, it } from 'vitest';
import panelReducer, { closePanel, KnowledgePanelView, openPanelView, selectPanelTab, type PanelState } from '../panelSlice';

describe('knowledge panel slice', () => {
  it('returns the initial state', () => {
    expect(panelReducer(undefined, { type: 'unknown' })).toEqual({ isOpen: false });
  });

  it('opens a panel view with an optional selected tab', () => {
    expect(
      panelReducer(undefined, openPanelView({ panelView: KnowledgePanelView.CreateConnection, selectedTabId: 'connection-tab' }))
    ).toEqual({
      isOpen: true,
      currentPanelView: KnowledgePanelView.CreateConnection,
      selectedTabId: 'connection-tab',
    });

    expect(panelReducer(undefined, openPanelView({ panelView: KnowledgePanelView.AddFiles }))).toEqual({
      isOpen: true,
      currentPanelView: KnowledgePanelView.AddFiles,
      selectedTabId: undefined,
    });
  });

  it('selects and clears the current tab', () => {
    const openState: PanelState = {
      isOpen: true,
      currentPanelView: KnowledgePanelView.EditConnection,
      selectedTabId: 'details',
    };

    expect(panelReducer(openState, selectPanelTab('files')).selectedTabId).toBe('files');
    expect(panelReducer(openState, selectPanelTab(undefined)).selectedTabId).toBeUndefined();
  });

  it('closes the panel and clears its view and selected tab', () => {
    const openState: PanelState = {
      isOpen: true,
      currentPanelView: KnowledgePanelView.EditConnection,
      selectedTabId: 'details',
      autoOpenPanel: true,
    };

    expect(panelReducer(openState, closePanel())).toEqual({
      isOpen: false,
      currentPanelView: undefined,
      selectedTabId: undefined,
      autoOpenPanel: true,
    });
  });
});
