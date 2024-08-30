import { describe, expect, it } from 'vitest';
import { getMockedUndoRedoPartialRootState } from '../../../__test__/mock-root-state';
import { setStateAfterUndoRedo } from '../global';
import { PanelState } from '../panel/panelInterfaces';
import reducer, { initialState } from '../panel/panelSlice';

describe('panel slice reducers', () => {
  it('should set panel state on undo redo', async () => {
    const undoRedoPartialRootState = getMockedUndoRedoPartialRootState();
    const panelState: PanelState = {
      ...undoRedoPartialRootState.panel,
      selectedNodes: ['testNode'],
      collapsed: false,
      selectedOperationId: 'testNode',
      selectedTabId: 'Parameters',
    };
    const state = reducer(
      initialState,
      setStateAfterUndoRedo({
        ...undoRedoPartialRootState,
        panel: panelState,
      })
    );

    expect(state).toEqual(panelState);
  });
});
