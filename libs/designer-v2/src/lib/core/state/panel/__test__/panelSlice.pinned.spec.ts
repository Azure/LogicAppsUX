import { describe, test, expect } from 'vitest';
import reducer, { clearPanel, initialState, setAlternateSelectedNode } from '../panelSlice';
import type { PanelState } from '../panelTypes';

// State representing the dual pinned view: a selected (non-pinned) node on the left
// and a pinned node on the right.
const stateWithSelectedAndPinned = (): PanelState => ({
  ...initialState,
  isCollapsed: false,
  operationContent: {
    ...initialState.operationContent,
    selectedNodeId: 'B',
    alternateSelectedNode: { nodeId: 'A', activeTabId: undefined, persistence: 'pinned' },
  },
});

// State representing a pinned node showing on its own (the selected node was closed).
const stateWithOnlyPinned = (): PanelState => ({
  ...initialState,
  isCollapsed: false,
  operationContent: {
    ...initialState.operationContent,
    selectedNodeId: undefined,
    alternateSelectedNode: { nodeId: 'A', activeTabId: undefined, persistence: 'pinned' },
  },
});

const stateWithSelectedOnly = (): PanelState => ({
  ...initialState,
  isCollapsed: false,
  operationContent: {
    ...initialState.operationContent,
    selectedNodeId: 'B',
  },
});

describe('panelSlice - pinned action close behavior (issue #9304)', () => {
  describe('closing the non-pinned (selected) action via clearPanel', () => {
    test('keeps the pinned action open and clears the selected action', () => {
      const state = reducer(stateWithSelectedAndPinned(), clearPanel());

      expect(state.operationContent.selectedNodeId).toBeUndefined();
      expect(state.operationContent.alternateSelectedNode?.nodeId).toBe('A');
      expect(state.operationContent.alternateSelectedNode?.persistence).toBe('pinned');
      expect(state.isCollapsed).toBe(false);
    });

    test('collapses the panel when there is no pinned action', () => {
      const state = reducer(stateWithSelectedOnly(), clearPanel());

      expect(state.operationContent.selectedNodeId).toBeUndefined();
      expect(state.isCollapsed).toBe(true);
    });

    test('clears the pinned action too when clearPinnedState is set', () => {
      const state = reducer(stateWithSelectedAndPinned(), clearPanel({ clearPinnedState: true }));

      expect(state.operationContent.selectedNodeId).toBeUndefined();
      expect(state.operationContent.alternateSelectedNode?.nodeId).toBeUndefined();
      expect(state.isCollapsed).toBe(true);
    });
  });

  describe('closing the pinned action via setAlternateSelectedNode', () => {
    test('keeps the selected action open when one remains', () => {
      const state = reducer(stateWithSelectedAndPinned(), setAlternateSelectedNode({ nodeId: '', updatePanelOpenState: true }));

      expect(state.operationContent.alternateSelectedNode?.nodeId).toBe('');
      expect(state.operationContent.selectedNodeId).toBe('B');
      expect(state.isCollapsed).toBe(false);
    });

    test('collapses the panel when the pinned action was the only one left', () => {
      const state = reducer(stateWithOnlyPinned(), setAlternateSelectedNode({ nodeId: '', updatePanelOpenState: true }));

      expect(state.operationContent.alternateSelectedNode?.nodeId).toBe('');
      expect(state.isCollapsed).toBe(true);
    });
  });
});
