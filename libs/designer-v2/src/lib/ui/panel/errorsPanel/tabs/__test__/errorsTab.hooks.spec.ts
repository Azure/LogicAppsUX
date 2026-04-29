import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MessageLevel } from '@microsoft/designer-ui';

// Use vi.hoisted so mock fns are available in vi.mock factory closures
const { mockAllConnectionErrors, mockAllSettingsValidationErrors, mockWorkflowParameterValidationErrors, mockFlowErrors, mockState } =
  vi.hoisted(() => ({
    mockAllConnectionErrors: vi.fn().mockReturnValue({}),
    mockAllSettingsValidationErrors: vi.fn().mockReturnValue({}),
    mockWorkflowParameterValidationErrors: vi.fn().mockReturnValue({}),
    mockFlowErrors: vi.fn().mockReturnValue({}),
    mockState: {
      current: {
        operations: { inputParameters: {} },
        workflow: {
          hostData: { errorMessages: {} },
          nodesMetadata: {},
        },
      },
    },
  }));

vi.mock('../../../../../core/state/operation/operationSelector', () => ({
  useAllConnectionErrors: () => mockAllConnectionErrors(),
}));

vi.mock('../../../../../core/state/setting/settingSelector', () => ({
  useAllSettingsValidationErrors: () => mockAllSettingsValidationErrors(),
}));

vi.mock('../../../../../core/state/workflowparameters/workflowparametersselector', () => ({
  useWorkflowParameterValidationErrors: () => mockWorkflowParameterValidationErrors(),
}));

vi.mock('../../../../../core/state/workflow/workflowSelectors', () => ({
  useFlowErrors: () => mockFlowErrors(),
}));

vi.mock('react-redux', () => ({
  useSelector: (selector: any) => selector(mockState.current),
}));

import {
  useAllInputErrors,
  useAllSettingErrors,
  useNumWorkflowParameterErrors,
  useNumFlowErrors,
  useHostCheckerErrors,
  useNumOperationErrors,
  useTotalNumErrors,
} from '../errorsTab.hooks';

beforeEach(() => {
  vi.clearAllMocks();
  mockState.current = {
    operations: { inputParameters: {} },
    workflow: {
      hostData: { errorMessages: {} },
      nodesMetadata: {},
    },
  };
  mockAllConnectionErrors.mockReturnValue({});
  mockAllSettingsValidationErrors.mockReturnValue({});
  mockWorkflowParameterValidationErrors.mockReturnValue({});
  mockFlowErrors.mockReturnValue({});
});

describe('useAllInputErrors', () => {
  it('should return empty object when no input parameters exist', () => {
    const { result } = renderHook(() => useAllInputErrors());
    expect(result.current).toEqual({});
  });

  it('should return empty object when parameters have no validation errors', () => {
    mockState.current.operations.inputParameters = {
      node1: {
        parameterGroups: {
          default: {
            parameters: {
              param1: { validationErrors: [] },
            },
          },
        },
      },
    };
    const { result } = renderHook(() => useAllInputErrors());
    expect(result.current).toEqual({});
  });

  it('should collect validation errors per node', () => {
    mockState.current.operations.inputParameters = {
      node1: {
        parameterGroups: {
          default: {
            parameters: {
              param1: { validationErrors: ['Required field'] },
              param2: { validationErrors: ['Invalid format'] },
            },
          },
        },
      },
      node2: {
        parameterGroups: {
          default: {
            parameters: {
              param1: { validationErrors: [] },
            },
          },
        },
      },
    };
    const { result } = renderHook(() => useAllInputErrors());
    expect(result.current).toEqual({
      node1: ['Required field', 'Invalid format'],
    });
  });

  it('should collect errors across multiple parameter groups', () => {
    mockState.current.operations.inputParameters = {
      node1: {
        parameterGroups: {
          group1: {
            parameters: {
              param1: { validationErrors: ['Error A'] },
            },
          },
          group2: {
            parameters: {
              param2: { validationErrors: ['Error B'] },
            },
          },
        },
      },
    };
    const { result } = renderHook(() => useAllInputErrors());
    expect(result.current).toEqual({
      node1: ['Error A', 'Error B'],
    });
  });
});

describe('useAllSettingErrors', () => {
  it('should return empty object when no setting errors exist', () => {
    const { result } = renderHook(() => useAllSettingErrors());
    expect(result.current).toEqual({});
  });

  it('should map setting validation errors to string arrays', () => {
    mockAllSettingsValidationErrors.mockReturnValue({
      node1: [{ message: 'Setting A is invalid' }, { message: 'Setting B is required' }],
      node2: [{ message: undefined }],
    });
    const { result } = renderHook(() => useAllSettingErrors());
    expect(result.current).toEqual({
      node1: ['Setting A is invalid', 'Setting B is required'],
      node2: [''],
    });
  });

  it('should skip nodes with empty error arrays', () => {
    mockAllSettingsValidationErrors.mockReturnValue({
      node1: [],
      node2: [{ message: 'Error' }],
    });
    const { result } = renderHook(() => useAllSettingErrors());
    expect(result.current).toEqual({
      node2: ['Error'],
    });
  });
});

describe('useHostCheckerErrors', () => {
  it('should return empty object when no error messages exist', () => {
    const { result } = renderHook(() => useHostCheckerErrors());
    expect(result.current).toEqual({});
  });

  it('should group error messages by nodeId and subtitle', () => {
    const errorMessage1 = { nodeId: 'node1', subtitle: 'Connection', message: 'Connection failed' };
    const errorMessage2 = { nodeId: 'node1', subtitle: 'Connection', message: 'Timeout' };
    const errorMessage3 = { nodeId: 'node1', subtitle: 'Auth', message: 'Unauthorized' };

    mockState.current.workflow.hostData.errorMessages = {
      [MessageLevel.Error]: [errorMessage1, errorMessage2, errorMessage3],
    };
    mockState.current.workflow.nodesMetadata = { node1: {} };

    const { result } = renderHook(() => useHostCheckerErrors());
    expect(result.current).toEqual({
      node1: {
        Connection: [errorMessage1, errorMessage2],
        Auth: [errorMessage3],
      },
    });
  });

  it('should skip messages for non-existent nodes', () => {
    const errorMessage = { nodeId: 'missingNode', subtitle: 'Error', message: 'Not found' };
    mockState.current.workflow.hostData.errorMessages = {
      [MessageLevel.Error]: [errorMessage],
    };
    mockState.current.workflow.nodesMetadata = { node1: {} };

    const { result } = renderHook(() => useHostCheckerErrors());
    expect(result.current).toEqual({});
  });

  it('should handle messages across multiple nodes', () => {
    const msg1 = { nodeId: 'node1', subtitle: 'Type A', message: 'Error 1' };
    const msg2 = { nodeId: 'node2', subtitle: 'Type B', message: 'Error 2' };

    mockState.current.workflow.hostData.errorMessages = {
      [MessageLevel.Error]: [msg1, msg2],
    };
    mockState.current.workflow.nodesMetadata = { node1: {}, node2: {} };

    const { result } = renderHook(() => useHostCheckerErrors());
    expect(result.current).toEqual({
      node1: { 'Type A': [msg1] },
      node2: { 'Type B': [msg2] },
    });
  });
});

describe('useNumWorkflowParameterErrors', () => {
  it('should return 0 when no workflow parameter errors exist', () => {
    const { result } = renderHook(() => useNumWorkflowParameterErrors());
    expect(result.current).toBe(0);
  });

  it('should count total workflow parameter errors', () => {
    mockWorkflowParameterValidationErrors.mockReturnValue({
      param1: { error1: 'msg', error2: 'msg' },
      param2: { error3: 'msg' },
    });
    const { result } = renderHook(() => useNumWorkflowParameterErrors());
    expect(result.current).toBe(3);
  });
});

describe('useNumFlowErrors', () => {
  it('should return 0 when no flow errors exist', () => {
    const { result } = renderHook(() => useNumFlowErrors());
    expect(result.current).toBe(0);
  });

  it('should count total flow errors across nodes', () => {
    mockFlowErrors.mockReturnValue({
      node1: ['unreachable', 'disconnected'],
      node2: ['missing'],
    });
    const { result } = renderHook(() => useNumFlowErrors());
    expect(result.current).toBe(3);
  });
});

describe('useNumOperationErrors', () => {
  it('should return 0 when no errors of any kind exist', () => {
    const { result } = renderHook(() => useNumOperationErrors());
    expect(result.current).toBe(0);
  });

  it('should sum errors from all sources', () => {
    // 2 input errors
    mockState.current.operations.inputParameters = {
      node1: {
        parameterGroups: {
          default: { parameters: { p1: { validationErrors: ['err1', 'err2'] } } },
        },
      },
    };
    // 1 setting error
    mockAllSettingsValidationErrors.mockReturnValue({
      node1: [{ message: 'setting err' }],
    });
    // 1 connection error
    mockAllConnectionErrors.mockReturnValue({ node2: 'Connection missing' });
    // 1 flow error
    mockFlowErrors.mockReturnValue({ node1: ['unreachable'] });
    // 1 host checker error
    mockState.current.workflow.hostData.errorMessages = {
      [MessageLevel.Error]: [{ nodeId: 'node1', subtitle: 'Check', message: 'Failed' }],
    };
    mockState.current.workflow.nodesMetadata = { node1: {} };

    const { result } = renderHook(() => useNumOperationErrors());
    expect(result.current).toBe(6);
  });
});

describe('useTotalNumErrors', () => {
  it('should return 0 when no errors exist', () => {
    const { result } = renderHook(() => useTotalNumErrors());
    expect(result.current).toBe(0);
  });

  it('should sum operation errors and workflow parameter errors', () => {
    // 1 input error
    mockState.current.operations.inputParameters = {
      node1: {
        parameterGroups: {
          default: { parameters: { p1: { validationErrors: ['err'] } } },
        },
      },
    };
    // 2 workflow parameter errors
    mockWorkflowParameterValidationErrors.mockReturnValue({
      param1: { e1: 'msg', e2: 'msg' },
    });

    const { result } = renderHook(() => useTotalNumErrors());
    expect(result.current).toBe(3);
  });
});
