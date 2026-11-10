import { describe, expect, it } from 'vitest';
import { resetWorkflowState } from '../../global';
import reducer, {
  changePanelNode,
  clearPanel,
  initialState,
  openPanel,
  setAlternateSelectedNode,
  setNodeSelection,
  setPinnedPanelActiveTab,
  setSelectedNodeId,
  setSelectedPanelActiveTab,
  toggleNodeSelection,
} from '../panelSlice';

const selectedAndPinned = () => {
  let state = reducer(initialState, changePanelNode('First'));
  state = reducer(state, setSelectedPanelActiveTab('SETTINGS'));
  state = reducer(state, setAlternateSelectedNode({ nodeId: 'Pinned', panelPersistence: 'pinned' }));
  return reducer(state, setPinnedPanelActiveTab('ABOUT'));
};

describe('panel tab preference (designer-v2)', () => {
  it.each([
    { name: 'changePanelNode', action: changePanelNode('Second') },
    { name: 'setSelectedNodeId', action: setSelectedNodeId('Second') },
    { name: 'openPanel with nodeId', action: openPanel({ panelMode: 'Operation', nodeId: 'Second' }) },
    { name: 'openPanel with nodeIds', action: openPanel({ panelMode: 'Operation', nodeIds: ['Second'] }) },
  ])('$name preserves the selected preference and separate pinned tab', ({ action }) => {
    const previous = selectedAndPinned();
    const state = reducer(previous, action);
    expect(state.operationContent.selectedNodeId).toBe('Second');
    expect(state.operationContent.selectedNodeIds).toEqual(['Second']);
    expect(state.operationContent.selectedNodeActiveTabId).toBe('SETTINGS');
    expect(state.operationContent.alternateSelectedNode).toEqual(previous.operationContent.alternateSelectedNode);
    expect(previous.operationContent.selectedNodeId).toBe('First');
  });

  it('uses the latest preference through repeated node changes', () => {
    let state = reducer(selectedAndPinned(), changePanelNode('Second'));
    state = reducer(state, setSelectedPanelActiveTab('CODE_VIEW'));
    state = reducer(state, changePanelNode('Third'));
    state = reducer(state, changePanelNode('First'));
    expect(state.operationContent.selectedNodeId).toBe('First');
    expect(state.operationContent.selectedNodeActiveTabId).toBe('CODE_VIEW');
    expect(state.operationContent.alternateSelectedNode?.activeTabId).toBe('ABOUT');
  });

  it('keeps an explicitly cleared preference unset when selecting another node', () => {
    const cleared = reducer(selectedAndPinned(), setSelectedPanelActiveTab(undefined));
    const state = reducer(cleared, changePanelNode('Second'));
    expect(state.operationContent.selectedNodeActiveTabId).toBeUndefined();
    expect(state.operationContent.alternateSelectedNode?.activeTabId).toBe('ABOUT');
  });

  it('changing the pinned tab does not change the selected preference', () => {
    const state = reducer(selectedAndPinned(), setPinnedPanelActiveTab('CODE_VIEW'));
    expect(state.operationContent.selectedNodeActiveTabId).toBe('SETTINGS');
    expect(state.operationContent.alternateSelectedNode).toEqual({
      nodeId: 'Pinned',
      persistence: 'pinned',
      activeTabId: 'CODE_VIEW',
    });
  });

  it('clearPanel resets the selected preference while preserving the pinned tab', () => {
    const previous = selectedAndPinned();
    const state = reducer(previous, clearPanel());
    expect(state.operationContent.selectedNodeId).toBeUndefined();
    expect(state.operationContent.selectedNodeIds).toEqual([]);
    expect(state.operationContent.selectedNodeActiveTabId).toBeUndefined();
    expect(state.operationContent.alternateSelectedNode).toEqual(previous.operationContent.alternateSelectedNode);
    expect(state.isCollapsed).toBe(false);
    expect(reducer(state, changePanelNode('Second')).operationContent.selectedNodeActiveTabId).toBeUndefined();
  });

  it('clearPanel with clearPinnedState resets both tab preferences', () => {
    const state = reducer(selectedAndPinned(), clearPanel({ clearPinnedState: true }));
    expect(state.operationContent).toEqual(initialState.operationContent);
    expect(state.isCollapsed).toBe(true);
  });

  it('resetWorkflowState clears both preferences and selections', () => {
    const state = reducer(selectedAndPinned(), resetWorkflowState());
    expect(state).toEqual(initialState);
    expect(reducer(state, changePanelNode('NextWorkflowNode')).operationContent.selectedNodeActiveTabId).toBeUndefined();
  });

  it.each([
    { ids: [] },
    { ids: ['First'] },
    { ids: ['First', 'Second'] },
    { ids: ['First', 'Second', 'Third'] },
    { ids: ['Second', 'Second'] },
  ])('setNodeSelection($ids) retains the primary preference during reconciliation', ({ ids }) => {
    const previous = reducer(reducer(initialState, changePanelNode('First')), setSelectedPanelActiveTab('SETTINGS'));
    const state = reducer(previous, setNodeSelection(ids));
    expect(state.operationContent.selectedNodeIds).toEqual([...new Set(ids)]);
    expect(state.operationContent.selectedNodeId).toBe(ids[0]);
    expect(state.operationContent.selectedNodeActiveTabId).toBe('SETTINGS');
    expect(state.isCollapsed).toBe(ids.length === 0);
  });

  it('toggleNodeSelection preserves the preference through single, dual, multiple, and empty selections', () => {
    let state = reducer(reducer(initialState, changePanelNode('First')), setSelectedPanelActiveTab('SETTINGS'));
    for (const { id, expected } of [
      { id: 'Second', expected: ['First', 'Second'] },
      { id: 'Third', expected: ['First', 'Second', 'Third'] },
      { id: 'First', expected: ['Second', 'Third'] },
      { id: 'Second', expected: ['Third'] },
      { id: 'Third', expected: [] },
      { id: 'Last', expected: ['Last'] },
    ]) {
      state = reducer(state, toggleNodeSelection(id));
      expect(state.operationContent.selectedNodeIds).toEqual(expected);
      expect(state.operationContent.selectedNodeId).toBe(expected[0]);
      expect(state.operationContent.selectedNodeActiveTabId).toBe('SETTINGS');
      expect(state.isCollapsed).toBe(expected.length === 0);
    }
  });

  it('does not copy an alternate tab into the primary preference when the primary selection changes', () => {
    let state = reducer(reducer(initialState, changePanelNode('First')), setSelectedPanelActiveTab('SETTINGS'));
    state = reducer(state, setNodeSelection(['First', 'Second']));
    expect(state.operationContent.alternateSelectedNode?.activeTabId).toBeUndefined();
    state = reducer(state, setPinnedPanelActiveTab('ABOUT'));
    state = reducer(state, toggleNodeSelection('First'));
    expect(state.operationContent.selectedNodeId).toBe('Second');
    expect(state.operationContent.selectedNodeActiveTabId).toBe('SETTINGS');
    expect(state.operationContent.alternateSelectedNode).toEqual({});
  });
});
