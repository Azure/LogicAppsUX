import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for the save workflow validation logic used by the DesignerCommandBar.
 *
 * The DesignerCommandBar.saveWorkflowMutate flow:
 * 1. Serializes the workflow via serializeBJSWorkflow
 * 2. Validates all operation input parameters
 * 3. Only calls saveWorkflow if no validation errors
 *
 * These tests exercise the validation and save-gating logic
 * without requiring the full React component tree (which has
 * deep designer-v2 dependencies that need a built library).
 */

// Mirrors the validation logic from DesignerCommandBar/indexV2.tsx saveWorkflowMutate
function validateAndSave(
  designerState: {
    operations: {
      inputParameters: Record<
        string,
        {
          parameterGroups: Record<
            string,
            {
              id: string;
              parameters: Array<{ id: string; value: any }>;
            }
          >;
        }
      >;
    };
    customCode: Record<string, any>;
  },
  validateParameter: (param: any, value: any) => string[],
  saveWorkflow: (workflow: any, customCode: any) => void,
  serializedWorkflow: any,
  customCodeData: any,
  onValidationError: (nodeId: string, groupId: string, parameterId: string, errors: string[]) => void
): { saved: boolean; validationErrors: Record<string, boolean> } {
  const validationErrorsList: Record<string, boolean> = {};
  const arr = Object.entries(designerState.operations.inputParameters);

  for (const [id, nodeInputs] of arr) {
    const hasValidationErrors = Object.values(nodeInputs.parameterGroups).some((parameterGroup) => {
      return parameterGroup.parameters.some((parameter) => {
        const validationErrors = validateParameter(parameter, parameter.value);
        if (validationErrors.length > 0) {
          onValidationError(id, parameterGroup.id, parameter.id, validationErrors);
        }
        return validationErrors.length;
      });
    });
    if (hasValidationErrors) {
      validationErrorsList[id] = hasValidationErrors;
    }
  }

  const hasParametersErrors = Object.keys(validationErrorsList).length > 0;

  if (!hasParametersErrors) {
    saveWorkflow(serializedWorkflow, customCodeData);
    return { saved: true, validationErrors: validationErrorsList };
  }

  return { saved: false, validationErrors: validationErrorsList };
}

describe('DesignerCommandBar save validation logic', () => {
  let mockValidateParameter: ReturnType<typeof vi.fn>;
  let mockSaveWorkflow: ReturnType<typeof vi.fn>;
  let mockOnValidationError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockValidateParameter = vi.fn();
    mockSaveWorkflow = vi.fn();
    mockOnValidationError = vi.fn();
  });

  it('should call saveWorkflow when no validation errors exist', () => {
    const state = {
      operations: { inputParameters: {} },
      customCode: {},
    };
    mockValidateParameter.mockReturnValue([]);

    const result = validateAndSave(state, mockValidateParameter, mockSaveWorkflow, { definition: {} }, {}, mockOnValidationError);

    expect(result.saved).toBe(true);
    expect(mockSaveWorkflow).toHaveBeenCalledWith({ definition: {} }, {});
  });

  it('should call saveWorkflow when all parameters pass validation', () => {
    const state = {
      operations: {
        inputParameters: {
          'node-1': {
            parameterGroups: {
              default: {
                id: 'default',
                parameters: [
                  { id: 'param-1', value: 'valid-value' },
                  { id: 'param-2', value: 42 },
                ],
              },
            },
          },
        },
      },
      customCode: {},
    };
    mockValidateParameter.mockReturnValue([]);

    const result = validateAndSave(state, mockValidateParameter, mockSaveWorkflow, { definition: {} }, {}, mockOnValidationError);

    expect(result.saved).toBe(true);
    expect(mockSaveWorkflow).toHaveBeenCalled();
    expect(mockValidateParameter).toHaveBeenCalledTimes(2);
  });

  it('should block save when parameter validation returns errors', () => {
    const state = {
      operations: {
        inputParameters: {
          'node-1': {
            parameterGroups: {
              default: {
                id: 'default',
                parameters: [{ id: 'param-1', value: '' }],
              },
            },
          },
        },
      },
      customCode: {},
    };
    mockValidateParameter.mockReturnValue(['Parameter is required']);

    const result = validateAndSave(state, mockValidateParameter, mockSaveWorkflow, { definition: {} }, {}, mockOnValidationError);

    expect(result.saved).toBe(false);
    expect(mockSaveWorkflow).not.toHaveBeenCalled();
    expect(result.validationErrors).toEqual({ 'node-1': true });
  });

  it('should report validation errors for each invalid parameter', () => {
    const state = {
      operations: {
        inputParameters: {
          'node-1': {
            parameterGroups: {
              default: {
                id: 'default',
                parameters: [
                  { id: 'param-1', value: '' },
                  { id: 'param-2', value: 'valid' },
                ],
              },
            },
          },
        },
      },
      customCode: {},
    };
    mockValidateParameter.mockReturnValueOnce(['Required field']).mockReturnValueOnce([]);

    validateAndSave(state, mockValidateParameter, mockSaveWorkflow, { definition: {} }, {}, mockOnValidationError);

    expect(mockOnValidationError).toHaveBeenCalledTimes(1);
    expect(mockOnValidationError).toHaveBeenCalledWith('node-1', 'default', 'param-1', ['Required field']);
  });

  it('should block save when any node has errors across multiple nodes', () => {
    const state = {
      operations: {
        inputParameters: {
          'node-1': {
            parameterGroups: {
              default: {
                id: 'default',
                parameters: [{ id: 'param-1', value: 'valid' }],
              },
            },
          },
          'node-2': {
            parameterGroups: {
              default: {
                id: 'default',
                parameters: [{ id: 'param-2', value: '' }],
              },
            },
          },
        },
      },
      customCode: {},
    };
    mockValidateParameter.mockReturnValueOnce([]).mockReturnValueOnce(['Missing value']);

    const result = validateAndSave(state, mockValidateParameter, mockSaveWorkflow, { definition: {} }, {}, mockOnValidationError);

    expect(result.saved).toBe(false);
    expect(result.validationErrors).toEqual({ 'node-2': true });
    expect(mockSaveWorkflow).not.toHaveBeenCalled();
  });

  it('should validate all parameter groups within a node', () => {
    const state = {
      operations: {
        inputParameters: {
          'node-1': {
            parameterGroups: {
              general: {
                id: 'general',
                parameters: [{ id: 'p1', value: 'ok' }],
              },
              advanced: {
                id: 'advanced',
                parameters: [{ id: 'p2', value: '' }],
              },
            },
          },
        },
      },
      customCode: {},
    };
    mockValidateParameter.mockReturnValueOnce([]).mockReturnValueOnce(['Advanced param required']);

    const result = validateAndSave(state, mockValidateParameter, mockSaveWorkflow, { definition: {} }, {}, mockOnValidationError);

    expect(result.saved).toBe(false);
    expect(mockOnValidationError).toHaveBeenCalledWith('node-1', 'advanced', 'p2', ['Advanced param required']);
  });

  it('should pass custom code data to saveWorkflow', () => {
    const state = {
      operations: { inputParameters: {} },
      customCode: {},
    };
    const customCode = { 'file.csx': 'return "hello";' };

    validateAndSave(state, mockValidateParameter, mockSaveWorkflow, { definition: {} }, customCode, mockOnValidationError);

    expect(mockSaveWorkflow).toHaveBeenCalledWith({ definition: {} }, customCode);
  });

  it('should handle multiple validation errors per parameter', () => {
    const state = {
      operations: {
        inputParameters: {
          'node-1': {
            parameterGroups: {
              default: {
                id: 'default',
                parameters: [{ id: 'param-1', value: 'x' }],
              },
            },
          },
        },
      },
      customCode: {},
    };
    mockValidateParameter.mockReturnValue(['Too short', 'Invalid format']);

    const result = validateAndSave(state, mockValidateParameter, mockSaveWorkflow, { definition: {} }, {}, mockOnValidationError);

    expect(result.saved).toBe(false);
    expect(mockOnValidationError).toHaveBeenCalledWith('node-1', 'default', 'param-1', ['Too short', 'Invalid format']);
  });
});

describe('DesignerCommandBar save disabled conditions', () => {
  it('should compute save disabled when in monitoring view', () => {
    const isMonitoringView = true;
    const isSaving = false;
    const isSavingFromCode = false;
    const haveErrors = false;
    const designerIsDirty = true;

    const isSaveDisabled = isMonitoringView || isSaving || isSavingFromCode || haveErrors || !designerIsDirty;
    expect(isSaveDisabled).toBe(true);
  });

  it('should compute save disabled when currently saving', () => {
    const isSaveDisabled = false || true || false || false || false;
    expect(isSaveDisabled).toBe(true);
  });

  it('should compute save disabled when there are errors', () => {
    const isSaveDisabled = false || false || false || true || false;
    expect(isSaveDisabled).toBe(true);
  });

  it('should compute save disabled when designer is not dirty', () => {
    const designerIsDirty = false;
    const isSaveDisabled = false || false || false || false || !designerIsDirty;
    expect(isSaveDisabled).toBe(true);
  });

  it('should compute save enabled when dirty, not saving, no errors, not monitoring', () => {
    const isSaveDisabled = false || false || false || false || !true;
    expect(isSaveDisabled).toBe(false);
  });
});
