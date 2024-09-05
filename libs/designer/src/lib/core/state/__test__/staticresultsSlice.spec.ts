import { describe, expect, it } from 'vitest';
import { getMockedUndoRedoPartialRootState } from '../../../__test__/mock-root-state';
import { setStateAfterUndoRedo } from '../global';
import reducer, { initialState, StaticResultsState } from '../staticresultschema/staticresultsSlice';
describe('static results slice reducers', () => {
  it('should set static results state on undo redo', async () => {
    const undoRedoPartialRootState = getMockedUndoRedoPartialRootState();
    const staticResultsState: StaticResultsState = {
      ...undoRedoPartialRootState.staticResults,
      properties: {
        test: 'test',
      },
    };
    const state = reducer(
      initialState,
      setStateAfterUndoRedo({
        ...undoRedoPartialRootState,
        staticResults: staticResultsState,
      })
    );

    expect(state).toEqual(staticResultsState);
  });
});
