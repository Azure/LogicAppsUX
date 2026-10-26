import { describe, expect, it } from 'vitest';
import { resetWorkflowState } from '../../global';
import reducer, {
  changePanelNode,
  clearPanel,
  initialState,
  openPanel,
  setAlternateSelectedNode,
  setPinnedPanelActiveTab,
  setSelectedNodeId,
  setSelectedPanelActiveTab,
} from '../panelSlice';

const selectedAndPinned = () => {
  let state = reducer(initialState, changePanelNode('First'));
  state = reducer(state, setSelectedPanelActiveTab('SETTINGS'));
  state = reducer(state, setAlternateSelectedNode({ nodeId: 'Pinned', panelPersistence: 'pinned' }));
  return reducer(state, setPinnedPanelActiveTab('ABOUT'));
};

describe('panel tab preference (designer)', () => {
  it.each([
    { name: 'setSelectedNodeId', action: setSelectedNodeId('Second') },
    { name: 'openPanel with nodeId', action: openPanel({ panelMode: 'Operation', nodeId: 'Second' }) },
    { name: 'openPanel with nodeIds', action: openPanel({ panelMode: 'Operation', nodeIds: ['Second'] }) },
  ])('$name preserves the selected preference and separate pinned tab', ({ action }) => {
    const previous = selectedAndPinned();
    const state = reducer(previous, action);
    expect(state.operationContent.selectedNodeId).toBe('Second');
    expect(state.operationContent.selectedNodeActiveTabId).toBe('SETTINGS');
    expect(state.operationContent.alternateSelectedNode).toEqual(previous.operationContent.alternateSelectedNode);
    expect(previous.operationContent.selectedNodeId).toBe('First');
  });

  it('resets the selected tab on v1 mouse selection while preserving the pinned tab', () => {
    let state = reducer(selectedAndPinned(), changePanelNode('Second'));
    state = reducer(state, setSelectedPanelActiveTab('CODE_VIEW'));
    state = reducer(state, changePanelNode('Third'));
    state = reducer(state, changePanelNode('First'));
    expect(state.operationContent.selectedNodeId).toBe('First');
    expect(state.operationContent.selectedNodeActiveTabId).toBeUndefined();
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
});
