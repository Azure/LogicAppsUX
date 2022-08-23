import type { RootState } from "../../../core";
import type { Settings } from "../../../core/actions/bjsworkflow/settings";
import type { ValidationError } from "../../../core/state/settingSlice";
import  { ValidationErrorKeys } from "../../../core/state/settingSlice";

export type ValidationType = keyof(RootState);
 
export const validateAndSetState = (proposedState: RootState, validationType: ValidationType, nodeId: string): RootState | Record<string, ValidationError[]> => {
  switch (validationType) {
    case 'settings': {
      const errors = validateOperationSettings(proposedState.operations.settings[nodeId]);
      return errors.length ? { [nodeId]: errors } : proposedState;
    }
    default:
      return proposedState;
  }
};

const validateOperationSettings = (settings: Settings): ValidationError[]=> {
  const errors: ValidationError[] = [];
  // all setting validation logic based on settings goes here
  errors.push({
    key: ValidationErrorKeys.PAGING_COUNT,
    message: `Paging count invalid : ${settings.paging ?? 'dummy paging val'}`
  }); // forced push for testing
  return errors;
};
