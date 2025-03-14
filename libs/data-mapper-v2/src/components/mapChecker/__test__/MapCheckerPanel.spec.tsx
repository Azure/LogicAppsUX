import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import { renderWithRedux } from '../../../__test__/redux-test-helper-dm';
import { MapCheckerPanel } from '../MapCheckerPanel';
import { MapCheckPanelState, initialState as PanelInitialState } from '../../../core/state/PanelSlice';
import React from 'react';
import { PanelState } from '../../../core/state/PanelSlice';

describe('MapCheckerPanel', () => {
  it('loads map checker panel open', () => {
    const mapCheckerPanel: MapCheckPanelState = { isOpen: true, selectedTab: 'error' };
    const initialState: PanelState = { ...PanelInitialState };
    initialState.mapCheckerPanel = mapCheckerPanel;
    const panel = renderWithRedux(<MapCheckerPanel />, { preloadedState: { panel: initialState } });
    expect(panel.getByText('Issues')).toBeTruthy();
  });
});
