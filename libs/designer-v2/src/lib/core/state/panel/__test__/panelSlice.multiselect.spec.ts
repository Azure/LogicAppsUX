import { describe, test, expect } from 'vitest';
import reducer, { initialState, setNodeSelection, toggleNodeSelection } from '../panelSlice';
import type { PanelState } from '../panelTypes';

const baseState = (): PanelState => ({ ...initialState });

describe('panelSlice - multi-selection reducers', () => {
  describe('setNodeSelection', () => {
    test('clears selection and collapses the panel for an empty array', () => {
      const state = reducer(baseState(), setNodeSelection([]));
      expect(state.operationContent.selectedNodeIds).toEqual([]);
      expect(state.operationContent.selectedNodeId).toBeUndefined();
      expect(state.isCollapsed).toBe(true);
    });

    test('sets selectedNodeId for a single selection (no alternate)', () => {
      const state = reducer(baseState(), setNodeSelection(['A']));
      expect(state.operationContent.selectedNodeIds).toEqual(['A']);
      expect(state.operationContent.selectedNodeId).toBe('A');
      expect(state.operationContent.alternateSelectedNode).toEqual({});
      expect(state.isCollapsed).toBe(false);
    });

    test('sets primary + alternate (side-by-side) for two selected nodes', () => {
      const state = reducer(baseState(), setNodeSelection(['A', 'B']));
      expect(state.operationContent.selectedNodeIds).toEqual(['A', 'B']);
      expect(state.operationContent.selectedNodeId).toBe('A');
      expect(state.operationContent.alternateSelectedNode).toEqual({
        nodeId: 'B',
        activeTabId: undefined,
        persistence: 'selected',
      });
    });

    test('keeps the full set but drops the alternate for more than two nodes', () => {
      const state = reducer(baseState(), setNodeSelection(['A', 'B', 'C']));
      expect(state.operationContent.selectedNodeIds).toEqual(['A', 'B', 'C']);
      expect(state.operationContent.selectedNodeId).toBe('A');
      expect(state.operationContent.alternateSelectedNode).toEqual({});
    });

    test('de-duplicates the incoming selection', () => {
      const state = reducer(baseState(), setNodeSelection(['A', 'A', 'B']));
      expect(state.operationContent.selectedNodeIds).toEqual(['A', 'B']);
    });
  });

  describe('toggleNodeSelection', () => {
    test('adds a node that is not yet selected', () => {
      let state = reducer(baseState(), setNodeSelection(['A']));
      state = reducer(state, toggleNodeSelection('B'));
      expect(state.operationContent.selectedNodeIds).toEqual(['A', 'B']);
    });

    test('removes a node that is already selected', () => {
      let state = reducer(baseState(), setNodeSelection(['A', 'B']));
      state = reducer(state, toggleNodeSelection('A'));
      expect(state.operationContent.selectedNodeIds).toEqual(['B']);
      expect(state.operationContent.selectedNodeId).toBe('B');
    });

    test('toggling the last node clears and collapses', () => {
      let state = reducer(baseState(), setNodeSelection(['A']));
      state = reducer(state, toggleNodeSelection('A'));
      expect(state.operationContent.selectedNodeIds).toEqual([]);
      expect(state.isCollapsed).toBe(true);
    });
  });
});
