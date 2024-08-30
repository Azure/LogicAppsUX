import { describe, expect, it } from 'vitest';
import reducer, { saveStateToHistory, updateStateHistoryOnRedoClick, updateStateHistoryOnUndoClick } from '../undoRedo/undoRedoSlice';
import { StateHistory } from '../undoRedo/undoRedoTypes';

describe('undo redo slice reducers', () => {
  it('should save state to history based on limit', () => {
    let mockInitialState: StateHistory = {
      past: [],
      future: [],
    };

    const getMockPayload = (mockState: string) => {
      return {
        compressedState: mockState,
        limit: 2,
      };
    };

    // Adds the first state to past array
    let state = reducer(mockInitialState, saveStateToHistory(getMockPayload('state1')));
    expect(state.past).toEqual(['state1']);
    expect(state.future).toEqual([]);

    // Appends second state to past array
    state = reducer(state, saveStateToHistory(getMockPayload('state2')));
    expect(state.past).toEqual(['state1', 'state2']);
    expect(state.future).toEqual([]);

    // Removes first state (oldest) and adds third state to past array
    state = reducer(state, saveStateToHistory(getMockPayload('state3')));
    expect(state.past).toEqual(['state2', 'state3']);
    expect(state.future).toEqual([]);

    // Future array should go back to empty when a new state is saved
    mockInitialState = {
      past: ['state2', 'state3'],
      future: ['state4'],
    };
    state = reducer(mockInitialState, saveStateToHistory(getMockPayload('state5')));
    expect(state.past).toEqual(['state3', 'state5']);
    expect(state.future).toEqual([]);
  });

  it('should update state history on undo click', () => {
    const mockInitialState = {
      past: ['state1', 'state2'],
      future: ['state3'],
    };

    // Current state gets put into future and latest past state gets removed to be used for current state
    let state = reducer(mockInitialState, updateStateHistoryOnUndoClick('currentState'));
    expect(state.past).toEqual(['state1']);
    expect(state.future).toEqual(['currentState', 'state3']);
  });

  it('should update state history on redo click', () => {
    const mockInitialState = {
      past: ['state1', 'state2'],
      future: ['state3'],
    };

    // Current state gets put into past and first future state gets removed to be used for current state
    let state = reducer(mockInitialState, updateStateHistoryOnRedoClick('currentState'));
    expect(state.past).toEqual(['state1', 'state2', 'currentState']);
    expect(state.future).toEqual([]);
  });
});
