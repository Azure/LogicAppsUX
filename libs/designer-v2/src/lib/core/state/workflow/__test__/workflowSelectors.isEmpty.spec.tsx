/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { ReactNode } from 'react';
import commonConstants from '../../../../common/constants';
import workflowReducer, { initialWorkflowState } from '../workflowSlice';
import type { Operations } from '../workflowInterfaces';
import { useIsWorkflowEmpty } from '../workflowSelectors';

const placeholderTriggerId = commonConstants.NODE.TYPE.PLACEHOLDER_TRIGGER;

const createTestStore = (operations: Record<string, unknown>) => {
  return configureStore({
    reducer: {
      workflow: workflowReducer,
    },
    preloadedState: {
      // Spread the real initial state so the slice shape stays consistent; the selector
      // only inspects operation ids, so the operation values are intentionally minimal.
      workflow: { ...initialWorkflowState, operations: operations as Operations },
    },
  });
};

const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
};

describe('workflowSelectors - useIsWorkflowEmpty', () => {
  it('returns true when there are no operations at all', () => {
    const store = createTestStore({});
    const { result } = renderHook(() => useIsWorkflowEmpty(), { wrapper: createWrapper(store) });
    expect(result.current).toBe(true);
  });

  it('returns true when the only operation is the placeholder trigger', () => {
    const store = createTestStore({ [placeholderTriggerId]: { type: 'placeholder' } });
    const { result } = renderHook(() => useIsWorkflowEmpty(), { wrapper: createWrapper(store) });
    expect(result.current).toBe(true);
  });

  it('returns false when a real trigger exists', () => {
    const store = createTestStore({ manual: { type: 'Request', kind: 'Http' } });
    const { result } = renderHook(() => useIsWorkflowEmpty(), { wrapper: createWrapper(store) });
    expect(result.current).toBe(false);
  });

  it('returns false when an action exists alongside the placeholder trigger', () => {
    const store = createTestStore({
      [placeholderTriggerId]: { type: 'placeholder' },
      Compose: { type: 'Compose' },
    });
    const { result } = renderHook(() => useIsWorkflowEmpty(), { wrapper: createWrapper(store) });
    expect(result.current).toBe(false);
  });

  it('returns false when both a real trigger and actions exist', () => {
    const store = createTestStore({
      manual: { type: 'Request', kind: 'Http' },
      Response: { type: 'Response' },
    });
    const { result } = renderHook(() => useIsWorkflowEmpty(), { wrapper: createWrapper(store) });
    expect(result.current).toBe(false);
  });
});
