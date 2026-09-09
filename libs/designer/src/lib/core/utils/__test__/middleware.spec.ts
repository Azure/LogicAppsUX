import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { storeStateHistoryMiddleware } from '../middleware';
import * as undoRedo from '../../actions/bjsworkflow/undoRedo';
import { undoableActionTypes } from '../../state/undoRedo/undoRedoTypes';

describe('middleware utils', () => {
  let store;
  let next;
  let invoke;

  beforeEach(() => {
    store = {
      getState: vi.fn(() => ({})),
      dispatch: vi.fn(),
    };
    next = vi.fn();
    invoke = (action) => storeStateHistoryMiddleware(store)(next)(action);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not save state to history on non-undoable actions', () => {
    const storeStateToUndoRedoHistoryMock = vi.spyOn(undoRedo, 'storeStateToUndoRedoHistory');
    const action = { type: 'TEST' };
    invoke(action);
    expect(storeStateToUndoRedoHistoryMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(action);
  });

  it.each<string>(undoableActionTypes)('saves state to history on undoable actions', (undoableActionType) => {
    const storeStateToUndoRedoHistoryMock = vi.spyOn(undoRedo, 'storeStateToUndoRedoHistory');
    const action = { type: undoableActionType };
    invoke(action);
    expect(storeStateToUndoRedoHistoryMock).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(action);
  });
});
