import { describe, expect, it } from 'vitest';
import { getMockedUndoRedoPartialRootState } from '../../../__test__/mock-root-state';
import { setStateAfterUndoRedo } from '../global';
import reducer, { initialState } from '../panel/panelSlice';
import { PanelState } from '../panel/panelTypes';

describe('panel slice reducers', () => {
  it('should set panel state on undo redo', async () => {
    const undoRedoPartialRootState = getMockedUndoRedoPartialRootState();
    const panelState: PanelState = {
      ...undoRedoPartialRootState.panel,
      isCollapsed: false,
      connectionContent: {
        selectedNodeIds: ['test'],
        isCreatingConnection: true,
        panelMode: 'Connection',
      },
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
