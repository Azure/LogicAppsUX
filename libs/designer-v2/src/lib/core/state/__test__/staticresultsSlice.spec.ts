import { describe, expect, it } from 'vitest';
import { getMockedUndoRedoPartialRootState } from '../../../__test__/mock-root-state';
import { setStateAfterUndoRedo } from '../global';
import reducer, { initialState } from '../operation/operationMetadataSlice';

describe('static results in operation metadata slice', () => {
  it('should restore static result schemas and properties on undo redo', () => {
    const undoRedoPartialRootState = getMockedUndoRedoPartialRootState();
    const operationsState = {
      ...undoRedoPartialRootState.operations,
      staticResultSchemas: { 'connector-op': { type: 'object' } },
      staticResultProperties: { test: 'test' },
    };
    const state = reducer(
      initialState,
      setStateAfterUndoRedo({
        ...undoRedoPartialRootState,
        operations: operationsState,
      })
    );

    expect(state.staticResultSchemas).toEqual({ 'connector-op': { type: 'object' } });
    expect(state.staticResultProperties).toEqual({ test: 'test' });
  });
});
