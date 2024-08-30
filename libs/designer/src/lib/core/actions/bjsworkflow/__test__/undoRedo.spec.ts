import { AnyAction } from '@reduxjs/toolkit';
import { ThunkDispatch } from 'redux-thunk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMockedInitialRootState } from '../../../../__test__/mock-root-state';
import * as globalReducers from '../../../state/global';
import * as undoRedoSlice from '../../../state/undoRedo/undoRedoSlice';
import { RootState } from '../../../store';
import {
  getCompressedStateFromRootState,
  getRootStateFromCompressedState,
  onRedoClick,
  onUndoClick,
  storeStateToUndoRedoHistory,
} from '../undoRedo';

describe('undo redo actions', () => {
  let dispatch: ThunkDispatch<unknown, unknown, AnyAction>;
  let mockedInitialRootState: RootState;

  beforeEach(() => {
    dispatch = vi.fn();
    mockedInitialRootState = getMockedInitialRootState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should store current state to undo redo history', async () => {
    const getState = vi.fn().mockReturnValue(mockedInitialRootState);
    const saveStateToHistoryMock = vi.spyOn(undoRedoSlice, 'saveStateToHistory');

    const action = storeStateToUndoRedoHistory();
    await action(dispatch, getState, undefined);
    expect(getState).toHaveBeenCalledOnce();
    expect(saveStateToHistoryMock).toHaveBeenCalledOnce();
  });

  it('should update state history and state on undo click if past states are present', async () => {
    // Past array is empty, it should not undo
    let getState = vi.fn().mockReturnValue(mockedInitialRootState);
    const updateStateHistoryOnUndoClickMock = vi.spyOn(undoRedoSlice, 'updateStateHistoryOnUndoClick');
    const setStateAfterUndoRedoMock = vi.spyOn(globalReducers, 'setStateAfterUndoRedo');

    const action = onUndoClick();
    await action(dispatch, getState, undefined);

    expect(setStateAfterUndoRedoMock).not.toHaveBeenCalled();
    expect(updateStateHistoryOnUndoClickMock).not.toHaveBeenCalled();

    // Past array has a compressed state, it should undo to the state
    const compressedState = getCompressedStateFromRootState(mockedInitialRootState);
    const decompressedState = getRootStateFromCompressedState(compressedState);

    mockedInitialRootState = {
      ...mockedInitialRootState,
      undoRedo: {
        past: [compressedState],
        future: [],
      },
    };

    getState = vi.fn().mockReturnValue(mockedInitialRootState);
    await action(dispatch, getState, undefined);

    expect(setStateAfterUndoRedoMock).toHaveBeenCalledWith(decompressedState);
    expect(updateStateHistoryOnUndoClickMock).toHaveBeenCalledWith(compressedState);
  });

  it('should update state history and state on redo click if future states are present', async () => {
    // Future array is empty, it should not redo
    let getState = vi.fn().mockReturnValue(mockedInitialRootState);
    const updateStateHistoryOnUndoClickMock = vi.spyOn(undoRedoSlice, 'updateStateHistoryOnRedoClick');
    const setStateAfterUndoRedoMock = vi.spyOn(globalReducers, 'setStateAfterUndoRedo');

    const action = onRedoClick();
    await action(dispatch, getState, undefined);

    expect(setStateAfterUndoRedoMock).not.toHaveBeenCalled();
    expect(updateStateHistoryOnUndoClickMock).not.toHaveBeenCalled();

    // Future array has a compressed state, it should redo to the state
    const compressedState = getCompressedStateFromRootState(mockedInitialRootState);
    const decompressedState = getRootStateFromCompressedState(compressedState);

    mockedInitialRootState = {
      ...mockedInitialRootState,
      undoRedo: {
        past: [],
        future: [compressedState],
      },
    };

    getState = vi.fn().mockReturnValue(mockedInitialRootState);
    await action(dispatch, getState, undefined);

    expect(setStateAfterUndoRedoMock).toHaveBeenCalledWith(decompressedState);
    expect(updateStateHistoryOnUndoClickMock).toHaveBeenCalledWith(compressedState);
  });
});
