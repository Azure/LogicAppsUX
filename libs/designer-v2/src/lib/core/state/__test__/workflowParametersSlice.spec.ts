import { describe, expect, it } from 'vitest';
import { getMockedUndoRedoPartialRootState } from '../../../__test__/mock-root-state';
import { setStateAfterUndoRedo } from '../global';
import reducer, { initialState, WorkflowParametersState } from '../workflowparameters/workflowparametersSlice';
describe('workflow parameters slice reducers', () => {
  it('should set workflow parameters state on undo redo', async () => {
    const undoRedoPartialRootState = getMockedUndoRedoPartialRootState();
    const workflowParametersState: WorkflowParametersState = {
      ...undoRedoPartialRootState.workflowParameters,
      isDirty: true,
      definitions: {
        test: {
          name: 'test',
          isEditable: false,
          type: 'test',
        },
      },
    };
    const state = reducer(
      initialState,
      setStateAfterUndoRedo({
        ...undoRedoPartialRootState,
        workflowParameters: workflowParametersState,
      })
    );

    expect(state).toEqual(workflowParametersState);
  });
});
