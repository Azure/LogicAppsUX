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
    const action = { type: undoableActionType, meta: { arg: { nodeId: 'node1' } } };
    if (undoableActionType === 'updateNodeConnection/pending') {
      store.getState.mockReturnValue({
        connections: { connectionsMapping: { node1: { kind: 'expression', expression: '@triggerBody()' } } },
      });
    }
    invoke(action);
    expect(storeStateToUndoRedoHistoryMock).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(action);
  });

  it.each(['Sql', null, undefined])('does not save history for a concrete connection update when the prior mapping is %s', (mapping) => {
    const saveHistory = vi.spyOn(undoRedo, 'storeStateToUndoRedoHistory');
    store.getState.mockReturnValue({
      connections: {
        connectionsMapping: {
          node1: mapping,
          otherNode: { kind: 'expression', expression: '@triggerBody()' },
        },
      },
    });
    const action = { type: 'updateNodeConnection/pending', meta: { arg: { nodeId: 'node1' } } };
    next.mockReturnValue('forwarded');

    expect(invoke(action)).toBe('forwarded');
    expect(next).toHaveBeenCalledWith(action);
    expect(saveHistory).not.toHaveBeenCalled();
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('saves history before replacing an expression with a concrete connection', () => {
    const saveHistory = vi.spyOn(undoRedo, 'storeStateToUndoRedoHistory');
    store.getState.mockReturnValue({
      connections: { connectionsMapping: { node1: { kind: 'expression', expression: '@triggerBody()' } } },
    });
    const action = { type: 'updateNodeConnection/pending', meta: { arg: { nodeId: 'node1' } } };
    next.mockImplementation(() => {
      store.getState.mockReturnValue({ connections: { connectionsMapping: { node1: 'Sql' } } });
    });

    invoke(action);

    expect(saveHistory).toHaveBeenCalledExactlyOnceWith(action);
    expect(store.dispatch).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledExactlyOnceWith(action);
    expect(saveHistory.mock.invocationCallOrder[0]).toBeLessThan(next.mock.invocationCallOrder[0]);
  });
});
