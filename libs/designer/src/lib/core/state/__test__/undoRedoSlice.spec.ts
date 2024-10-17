import { describe, expect, it } from 'vitest';
import reducer, { saveStateToHistory, updateStateHistoryOnRedoClick, updateStateHistoryOnUndoClick } from '../undoRedo/undoRedoSlice';
import { StateHistory, StateHistoryItem } from '../undoRedo/undoRedoTypes';
import constants from '../../../common/constants';

describe('undo redo slice reducers', () => {
  const mockCompressedState1 = { compressedState: new Uint8Array([140, 27]) };
  const mockCompressedState2 = {
    compressedState: new Uint8Array([120, 59]),
    editedPanelTab: constants.PANEL_TAB_NAMES.PARAMETERS,
    editedPanelNode: 'Initialize_Variable',
  };
  const mockCompressedState3 = { compressedState: new Uint8Array([12, 1]) };
  const mockCompressedState4 = { compressedState: new Uint8Array([63, 150]) };
  const mockCompressedState5 = { compressedState: new Uint8Array([32, 47]) };

  it('should save state to history based on limit', () => {
    let mockInitialState: StateHistory = {
      past: [],
      future: [],
      undoRedoClickToggle: 0,
    };

    const getMockPayload = (mockState: StateHistoryItem) => {
      return {
        stateHistoryItem: mockState,
        limit: 2,
      };
    };

    // Adds the first state to past array
    let state = reducer(mockInitialState, saveStateToHistory(getMockPayload(mockCompressedState1)));
    expect(state.past).toEqual([mockCompressedState1]);
    expect(state.future).toEqual([]);

    // Appends second state to past array
    state = reducer(state, saveStateToHistory(getMockPayload(mockCompressedState2)));
    expect(state.past).toEqual([mockCompressedState1, mockCompressedState2]);
    expect(state.future).toEqual([]);

    // Removes first state (oldest) and adds third state to past array
    state = reducer(state, saveStateToHistory(getMockPayload(mockCompressedState3)));
    expect(state.past).toEqual([mockCompressedState2, mockCompressedState3]);
    expect(state.future).toEqual([]);

    // Future array should go back to empty when a new state is saved
    mockInitialState = {
      past: [mockCompressedState2, mockCompressedState3],
      future: [mockCompressedState4],
      undoRedoClickToggle: 2,
    };
    state = reducer(mockInitialState, saveStateToHistory(getMockPayload(mockCompressedState5)));
    expect(state.past).toEqual([mockCompressedState3, mockCompressedState5]);
    expect(state.future).toEqual([]);
  });

  it('should update state history on undo click', () => {
    const mockInitialState = {
      past: [mockCompressedState1, mockCompressedState2],
      future: [mockCompressedState3],
      undoRedoClickToggle: 0,
    };

    // Current state gets put into future and latest past state gets removed to be used for current state
    let state = reducer(mockInitialState, updateStateHistoryOnUndoClick({ compressedState: mockCompressedState4.compressedState }));
    expect(state.past).toEqual([mockCompressedState1]);
    expect(state.future).toEqual([mockCompressedState4, mockCompressedState3]);
    expect(state.undoRedoClickToggle).toEqual(1);
    expect(state.currentEditedPanelNode).toEqual('Initialize_Variable');
    expect(state.currentEditedPanelTab).toEqual(constants.PANEL_TAB_NAMES.PARAMETERS);

    // On second undo click, state2 should be saved in future array with current panel details
    state = reducer(state, updateStateHistoryOnUndoClick({ compressedState: mockCompressedState2.compressedState }));
    expect(state.past).toEqual([]);
    expect(state.future).toEqual([mockCompressedState2, mockCompressedState4, mockCompressedState3]);
    expect(state.undoRedoClickToggle).toEqual(0);
    expect(state.currentEditedPanelNode).toEqual(undefined);
    expect(state.currentEditedPanelTab).toEqual(undefined);
  });

  it('should update state history on redo click', () => {
    const mockInitialState = {
      past: [mockCompressedState1],
      future: [mockCompressedState2, mockCompressedState3],
      undoRedoClickToggle: 0,
    };

    // Current state gets put into past and first future state gets removed to be used for current state
    let state = reducer(mockInitialState, updateStateHistoryOnRedoClick({ compressedState: mockCompressedState4.compressedState }));
    expect(state.past).toEqual([mockCompressedState1, mockCompressedState4]);
    expect(state.future).toEqual([mockCompressedState3]);
    expect(state.undoRedoClickToggle).toEqual(1);
    expect(state.currentEditedPanelNode).toEqual('Initialize_Variable');
    expect(state.currentEditedPanelTab).toEqual(constants.PANEL_TAB_NAMES.PARAMETERS);

    // On second redo click, state2 should be saved in past array with current panel details
    state = reducer(state, updateStateHistoryOnRedoClick({ compressedState: mockCompressedState2.compressedState }));
    expect(state.past).toEqual([mockCompressedState1, mockCompressedState4, mockCompressedState2]);
    expect(state.future).toEqual([]);
    expect(state.undoRedoClickToggle).toEqual(0);
    expect(state.currentEditedPanelNode).toEqual(undefined);
    expect(state.currentEditedPanelTab).toEqual(undefined);
  });
});
