import { describe, expect, it } from 'vitest';
import { getMockedUndoRedoPartialRootState } from '../../../__test__/mock-root-state';
import { setStateAfterUndoRedo } from '../global';
import reducer, { initialState } from '../panelV2/panelSlice';
import { PanelState } from '../panelV2/panelTypes';

describe('panel slice reducers', () => {
  it('should set panel state on undo redo', async () => {
    const undoRedoPartialRootState = getMockedUndoRedoPartialRootState();
    const panelState: PanelState = {
      ...undoRedoPartialRootState.panelV2,
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
        panelV2: panelState,
      })
    );

    expect(state).toEqual(panelState);
  });
});
