import { configureStore } from '@reduxjs/toolkit';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it } from 'vitest';
import { useShouldNodeFocus } from '../workflowSelectors';
import workflowReducer, { clearFocusNode, initialWorkflowState, setFocusNode } from '../workflowSlice';

const setup = (focusedCanvasNodeId?: string) => {
  const store = configureStore({
    reducer: { workflow: workflowReducer },
    preloadedState: { workflow: { ...initialWorkflowState, focusedCanvasNodeId } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  return { store, wrapper };
};

describe('useShouldNodeFocus (designer-v2)', () => {
  afterEach(cleanup);

  it.each([
    { focus: 'Scope', expected: true },
    { focus: 'Scope-#scope', expected: true },
    { focus: 'Other', expected: false },
    { focus: 'Other-#scope', expected: false },
    { focus: undefined, expected: false },
  ])('matches normalized or rendered scope ids for focus=$focus: $expected', ({ focus, expected }) => {
    const { wrapper } = setup(focus);
    const { result } = renderHook(() => useShouldNodeFocus('Scope', 'Scope-#scope'), { wrapper });
    expect(result.current).toBe(expected);
  });

  it.each([
    { focus: 'Operation', expected: true },
    { focus: 'Operation-#scope', expected: false },
    { focus: undefined, expected: false },
  ])('preserves single-id callers for focus=$focus: $expected', ({ focus, expected }) => {
    const { wrapper } = setup(focus);
    const { result } = renderHook(() => useShouldNodeFocus('Operation'), { wrapper });
    expect(result.current).toBe(expected);
  });

  it('tracks normalized, tagged, mismatched, and cleared focus without remounting', () => {
    const { store, wrapper } = setup();
    const { result } = renderHook(() => useShouldNodeFocus('Scope', 'Scope-#scope'), { wrapper });
    expect(result.current).toBe(false);
    act(() => store.dispatch(setFocusNode('Scope-#scope')));
    expect(result.current).toBe(true);
    act(() => store.dispatch(setFocusNode('Other-#scope')));
    expect(result.current).toBe(false);
    act(() => store.dispatch(setFocusNode('Scope')));
    expect(result.current).toBe(true);
    act(() => store.dispatch(clearFocusNode()));
    expect(result.current).toBe(false);
  });

  it('updates the rendered card id while the normalized action id stays the same', () => {
    const { wrapper } = setup('Scope-rendered-#scope');
    const { result, rerender } = renderHook(({ canvasNodeId }) => useShouldNodeFocus('Scope', canvasNodeId), {
      wrapper,
      initialProps: { canvasNodeId: 'Scope-#scope' },
    });
    expect(result.current).toBe(false);
    rerender({ canvasNodeId: 'Scope-rendered-#scope' });
    expect(result.current).toBe(true);
    rerender({ canvasNodeId: 'Scope-#scope' });
    expect(result.current).toBe(false);
  });

  it('updates the normalized action id while the rendered card id stays the same', () => {
    const { wrapper } = setup('RenamedScope');
    const { result, rerender } = renderHook(({ id }) => useShouldNodeFocus(id, 'Scope-#scope'), {
      wrapper,
      initialProps: { id: 'Scope' },
    });
    expect(result.current).toBe(false);
    rerender({ id: 'RenamedScope' });
    expect(result.current).toBe(true);
  });
});
