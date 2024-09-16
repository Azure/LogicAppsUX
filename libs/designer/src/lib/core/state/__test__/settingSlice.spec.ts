import { describe, expect, it } from 'vitest';
import { getMockedUndoRedoPartialRootState } from '../../../__test__/mock-root-state';
import { ValidationErrorKeys, ValidationErrorType } from '../../../ui/settings/validation/validation';
import { setStateAfterUndoRedo } from '../global';
import { SettingsState } from '../setting/settingInterface';
import reducer, { initialState } from '../setting/settingSlice';

describe('setting slice reducers', () => {
  it('should set settings state on undo redo', async () => {
    const undoRedoPartialRootState = getMockedUndoRedoPartialRootState();
    const settingsState: SettingsState = {
      ...undoRedoPartialRootState.settings,
      validationErrors: {
        testParam: [
          {
            errorType: ValidationErrorType.ERROR,
            key: ValidationErrorKeys.TIMEOUT_VALUE_INVALID,
            message: 'timeout value is invalid',
          },
        ],
      },
    };
    const state = reducer(
      initialState,
      setStateAfterUndoRedo({
        ...undoRedoPartialRootState,
        settings: settingsState,
      })
    );

    expect(state).toEqual(settingsState);
  });
});
