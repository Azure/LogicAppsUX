import { AnyAction } from '@reduxjs/toolkit';
import { ThunkDispatch } from 'redux-thunk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMockedInitialRootState } from '../../../../__test__/mock-root-state';
import * as globalReducers from '../../../state/global';
import * as panelSlice from '../../../state/panel/panelSlice';
import * as undoRedoSlice from '../../../state/undoRedo/undoRedoSlice';
import { addNode } from '../../../state/workflow/workflowSlice';
import { RootState } from '../../../store';
import * as undoRedoUtils from '../../../utils/undoredo';
import { getCompressedStateFromRootState, getRootStateFromCompressedState } from '../../../utils/undoredo';
import { onRedoClick, onUndoClick, storeStateToUndoRedoHistory } from '../undoRedo';

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
    vi.spyOn(undoRedoUtils, 'shouldSkipSavingStateToHistory').mockReturnValue(false);
    vi.spyOn(undoRedoUtils, 'getEditedPanelTab').mockReturnValue('PARAMETERS');
    vi.spyOn(undoRedoUtils, 'getEditedPanelNode').mockReturnValue('Initialize_Variable');

    const compressedState = getCompressedStateFromRootState(mockedInitialRootState);

    const action = storeStateToUndoRedoHistory({ type: addNode.type });
    await action(dispatch, getState, undefined);
    expect(getState).toHaveBeenCalled();
    expect(saveStateToHistoryMock).toHaveBeenCalledWith({
      stateHistoryItem: { compressedState, editedPanelTab: 'PARAMETERS', editedPanelNode: 'Initialize_Variable' },
      limit: mockedInitialRootState.designerOptions.hostOptions.maxStateHistorySize,
    });

    vi.spyOn(undoRedoUtils, 'getEditedPanelTab').mockReturnValue(undefined);
    vi.spyOn(undoRedoUtils, 'getEditedPanelNode').mockReturnValue(undefined);

    await action(dispatch, getState, undefined);
    expect(getState).toHaveBeenCalled();
    expect(saveStateToHistoryMock).toHaveBeenCalledWith({
      stateHistoryItem: { compressedState, editedPanelTab: undefined, editedPanelNode: undefined },
      limit: mockedInitialRootState.designerOptions.hostOptions.maxStateHistorySize,
    });
  });

  it('should skip storing state to undo redo history if shouldSkipSavingStateToHistory is true', async () => {
    const getState = vi.fn().mockReturnValue(mockedInitialRootState);
    const saveStateToHistoryMock = vi.spyOn(undoRedoSlice, 'saveStateToHistory');
    vi.spyOn(undoRedoUtils, 'shouldSkipSavingStateToHistory').mockReturnValue(true);
    const getEditedPanelTab = vi.spyOn(undoRedoUtils, 'getEditedPanelTab');
    const getEditedPanelNode = vi.spyOn(undoRedoUtils, 'getEditedPanelNode');

    const action = storeStateToUndoRedoHistory({ type: addNode.type });
    await action(dispatch, getState, undefined);
    expect(getState).toHaveBeenCalledOnce();
    expect(getEditedPanelTab).not.toHaveBeenCalled();
    expect(getEditedPanelNode).not.toHaveBeenCalled();
    expect(saveStateToHistoryMock).not.toHaveBeenCalled();
  });

  it('should update state history and state on undo click if past states are present', async () => {
    // Past array is empty, it should not undo
    let getState = vi.fn().mockReturnValue(mockedInitialRootState);
    const updateStateHistoryOnUndoClickMock = vi.spyOn(undoRedoSlice, 'updateStateHistoryOnUndoClick');
    const setStateAfterUndoRedoMock = vi.spyOn(globalReducers, 'setStateAfterUndoRedo');
    const changePanelNode = vi.spyOn(panelSlice, 'changePanelNode');
    const setSelectedPanelActiveTab = vi.spyOn(panelSlice, 'setSelectedPanelActiveTab');

    const action = onUndoClick();
    await action(dispatch, getState, undefined);

    expect(setStateAfterUndoRedoMock).not.toHaveBeenCalled();
    expect(updateStateHistoryOnUndoClickMock).not.toHaveBeenCalled();
    expect(changePanelNode).not.toHaveBeenCalled();
    expect(setSelectedPanelActiveTab).not.toHaveBeenCalled();

    // Past array has a compressed state, it should undo to the state
    const compressedState = getCompressedStateFromRootState(mockedInitialRootState);
    const decompressedState = getRootStateFromCompressedState(compressedState);

    mockedInitialRootState = {
      ...mockedInitialRootState,
      undoRedo: {
        past: [{ compressedState }],
        future: [],
        stateHistoryItemIndex: -1,
      },
    };

    getState = vi.fn().mockReturnValue(mockedInitialRootState);
    await action(dispatch, getState, undefined);

    expect(setStateAfterUndoRedoMock).toHaveBeenCalledWith(decompressedState);
    expect(updateStateHistoryOnUndoClickMock).toHaveBeenCalledWith({ compressedState });
    expect(changePanelNode).not.toHaveBeenCalled();
    expect(setSelectedPanelActiveTab).not.toHaveBeenCalled();

    // Past array has a compressed state and panel details, it should undo to the state and set panel node and tab
    mockedInitialRootState = {
      ...mockedInitialRootState,
      undoRedo: {
        past: [{ compressedState, editedPanelTab: 'PARAMETERS', editedPanelNode: 'Initialize_Variable' }],
        future: [],
        stateHistoryItemIndex: -1,
      },
    };

    getState = vi.fn().mockReturnValue(mockedInitialRootState);
    await action(dispatch, getState, undefined);

    expect(setStateAfterUndoRedoMock).toHaveBeenCalledWith(decompressedState);
    expect(updateStateHistoryOnUndoClickMock).toHaveBeenCalledWith({ compressedState });
    expect(changePanelNode).toHaveBeenCalledWith('Initialize_Variable');
    expect(setSelectedPanelActiveTab).toHaveBeenCalledWith('PARAMETERS');
  });

  it('should update state history and state on redo click if future states are present', async () => {
    // Future array is empty, it should not redo
    let getState = vi.fn().mockReturnValue(mockedInitialRootState);
    const updateStateHistoryOnUndoClickMock = vi.spyOn(undoRedoSlice, 'updateStateHistoryOnRedoClick');
    const setStateAfterUndoRedoMock = vi.spyOn(globalReducers, 'setStateAfterUndoRedo');
    const changePanelNode = vi.spyOn(panelSlice, 'changePanelNode');
    const setSelectedPanelActiveTab = vi.spyOn(panelSlice, 'setSelectedPanelActiveTab');

    const action = onRedoClick();
    await action(dispatch, getState, undefined);

    expect(setStateAfterUndoRedoMock).not.toHaveBeenCalled();
    expect(updateStateHistoryOnUndoClickMock).not.toHaveBeenCalled();
    expect(changePanelNode).not.toHaveBeenCalled();
    expect(setSelectedPanelActiveTab).not.toHaveBeenCalled();

    // Future array has a compressed state, it should redo to the state
    const compressedState = getCompressedStateFromRootState(mockedInitialRootState);
    const decompressedState = getRootStateFromCompressedState(compressedState);

    mockedInitialRootState = {
      ...mockedInitialRootState,
      undoRedo: {
        past: [],
        future: [{ compressedState }],
        stateHistoryItemIndex: -1,
      },
    };

    getState = vi.fn().mockReturnValue(mockedInitialRootState);
    await action(dispatch, getState, undefined);

    expect(setStateAfterUndoRedoMock).toHaveBeenCalledWith(decompressedState);
    expect(updateStateHistoryOnUndoClickMock).toHaveBeenCalledWith({ compressedState });
    expect(changePanelNode).not.toHaveBeenCalled();
    expect(setSelectedPanelActiveTab).not.toHaveBeenCalled();

    // Future array has a compressed state and panel details, it should redo to the state and panel node/tab
    mockedInitialRootState = {
      ...mockedInitialRootState,
      undoRedo: {
        past: [],
        future: [{ compressedState }],
        stateHistoryItemIndex: -1,
        currentEditedPanelNode: 'Initialize_Variable',
        currentEditedPanelTab: 'PARAMETERS',
      },
    };

    getState = vi.fn().mockReturnValue(mockedInitialRootState);
    await action(dispatch, getState, undefined);

    expect(setStateAfterUndoRedoMock).toHaveBeenCalledWith(decompressedState);
    expect(updateStateHistoryOnUndoClickMock).toHaveBeenCalledWith({ compressedState });
    expect(changePanelNode).toHaveBeenCalledWith('Initialize_Variable');
    expect(setSelectedPanelActiveTab).toHaveBeenCalledWith('PARAMETERS');
  });
});
