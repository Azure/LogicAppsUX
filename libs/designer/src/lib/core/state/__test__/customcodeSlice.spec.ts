import { describe, expect, it } from 'vitest';
import { getMockedUndoRedoPartialRootState } from '../../../__test__/mock-root-state';
import { CustomCodeState } from '../customcode/customcodeInterfaces';
import reducer, { initialState } from '../customcode/customcodeSlice';
import { setStateAfterUndoRedo } from '../global';

describe('customcode slice reducers', () => {
  it('should set custom code state on undo redo', async () => {
    const customCodeState: CustomCodeState = {
      files: {},
      fileData: { test: 'test' },
    };

    const undoRedoPartialRootState = getMockedUndoRedoPartialRootState();
    const state = reducer(
      initialState,
      setStateAfterUndoRedo({
        ...undoRedoPartialRootState,
        customCode: customCodeState,
      })
    );

    expect(state).toEqual(customCodeState);
  });
});
