/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { ReactNode } from 'react';
import workflowReducer, { initialWorkflowState } from '../workflow/workflowSlice';
import workflowParametersReducer, { initialState as initialWorkflowParametersState } from '../workflowparameters/workflowparametersSlice';
import notesReducer from '../notes/notesSlice';
import { useIsDesignerDirty } from '../global';

const createTestStore = (overrides?: { workflowDirty?: boolean; parametersDirty?: boolean; notesDirty?: boolean }) => {
  return configureStore({
    reducer: {
      workflow: workflowReducer,
      workflowParameters: workflowParametersReducer,
      notes: notesReducer,
    },
    preloadedState: {
      workflow: {
        ...initialWorkflowState,
        isDirty: overrides?.workflowDirty ?? false,
      },
      workflowParameters: {
        ...initialWorkflowParametersState,
        isDirty: overrides?.parametersDirty ?? false,
      },
      notes: {
        notes: {},
        isDirty: overrides?.notesDirty ?? false,
        changeCount: 0,
      },
    },
  });
};

const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
};

describe('useIsDesignerDirty', () => {
  it('should return false when nothing is dirty', () => {
    const store = createTestStore();
    const { result } = renderHook(() => useIsDesignerDirty(), { wrapper: createWrapper(store) });
    expect(result.current).toBe(false);
  });

  it('should return true when workflow is dirty', () => {
    const store = createTestStore({ workflowDirty: true });
    const { result } = renderHook(() => useIsDesignerDirty(), { wrapper: createWrapper(store) });
    expect(result.current).toBe(true);
  });

  it('should return true when workflow parameters are dirty', () => {
    const store = createTestStore({ parametersDirty: true });
    const { result } = renderHook(() => useIsDesignerDirty(), { wrapper: createWrapper(store) });
    expect(result.current).toBe(true);
  });

  it('should return true when notes are dirty', () => {
    const store = createTestStore({ notesDirty: true });
    const { result } = renderHook(() => useIsDesignerDirty(), { wrapper: createWrapper(store) });
    expect(result.current).toBe(true);
  });

  it('should return true when multiple sources are dirty', () => {
    const store = createTestStore({ workflowDirty: true, parametersDirty: true, notesDirty: true });
    const { result } = renderHook(() => useIsDesignerDirty(), { wrapper: createWrapper(store) });
    expect(result.current).toBe(true);
  });

  it('should return true when only workflow and notes are dirty', () => {
    const store = createTestStore({ workflowDirty: true, notesDirty: true });
    const { result } = renderHook(() => useIsDesignerDirty(), { wrapper: createWrapper(store) });
    expect(result.current).toBe(true);
  });
});
