import { describe, expect, it } from 'vitest';
import reducer, { saveStateToHistory, updateStateHistoryOnRedoClick, updateStateHistoryOnUndoClick } from '../undoRedo/undoRedoSlice';
import { StateHistory } from '../undoRedo/undoRedoTypes';

describe('undo redo slice reducers', () => {
  const mockCompressedState1 = new Uint8Array([140, 27]);
  const mockCompressedState2 = new Uint8Array([120, 59]);
  const mockCompressedState3 = new Uint8Array([12, 1]);
  const mockCompressedState4 = new Uint8Array([63, 150]);
  const mockCompressedState5 = new Uint8Array([32, 47]);

  it('should save state to history based on limit', () => {
    let mockInitialState: StateHistory = {
      past: [],
      future: [],
    };

    const getMockPayload = (mockState: Uint8Array) => {
      return {
        compressedState: mockState,
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
    };
    state = reducer(mockInitialState, saveStateToHistory(getMockPayload(mockCompressedState5)));
    expect(state.past).toEqual([mockCompressedState3, mockCompressedState5]);
    expect(state.future).toEqual([]);
  });

  it('should update state history on undo click', () => {
    const mockInitialState = {
      past: [mockCompressedState1, mockCompressedState2],
      future: [mockCompressedState3],
    };

    // Current state gets put into future and latest past state gets removed to be used for current state
    let state = reducer(mockInitialState, updateStateHistoryOnUndoClick(mockCompressedState4));
    expect(state.past).toEqual([mockCompressedState1]);
    expect(state.future).toEqual([mockCompressedState4, mockCompressedState3]);
  });

  it('should update state history on redo click', () => {
    const mockInitialState = {
      past: [mockCompressedState1, mockCompressedState2],
      future: [mockCompressedState3],
    };

    // Current state gets put into past and first future state gets removed to be used for current state
    let state = reducer(mockInitialState, updateStateHistoryOnRedoClick(mockCompressedState4));
    expect(state.past).toEqual([mockCompressedState1, mockCompressedState2, mockCompressedState4]);
    expect(state.future).toEqual([]);
  });
});
