/**
 * @vitest-environment jsdom
 *
 * Regression coverage for the panel selector referential-stability fix.
 *
 * The previous implementation wrapped every panel hook in a per-render `createSelector`
 * and fell back to freshly-allocated `[]` / `{}` values. On any state where the underlying
 * value was `undefined` (a path the selectors explicitly guard with `?.` / `??`), each
 * store update produced a brand new reference, so react-redux's default `===` comparison
 * failed and consumers re-rendered on every unrelated dispatch.
 *
 * These tests capture both the "before" behavior (reproduced inline) and the "after"
 * behavior of the shipped selectors so the improvement is measurable and protected.
 */
import { describe, expect, it } from 'vitest';
import { render, act } from '@testing-library/react';
import { Provider, useSelector } from 'react-redux';
import { configureStore, createSelector } from '@reduxjs/toolkit';
import panelReducer, { initialState, setIsPanelLoading } from '../panel/panelSlice';
import { useOperationAlternateSelectedNode, useOperationPanelSelectedNodeIds } from '../panel/panelSelectors';

// Store whose operationContent selection fields are `undefined`, exercising the fallback
// branches of the selectors. This mirrors host-provided / rehydrated panel state where
// these optional fields are absent (hence the `?.` / `??` guards in the selectors).
const makeStoreWithUndefinedSelection = () =>
  configureStore({
    reducer: { panel: panelReducer },
    preloadedState: {
      panel: {
        ...initialState,
        operationContent: {
          ...initialState.operationContent,
          selectedNodeIds: undefined,
          alternateSelectedNode: undefined,
        },
      },
    } as any,
  });

// Faithful reproduction of the previous (buggy) implementation, used purely to document
// the "before" behavior in a runnable form.
const getPanelState = (state: any) => state.panel;
const oldUseOperationPanelSelectedNodeIds = () =>
  useSelector(createSelector(getPanelState, (state: any) => state.operationContent?.selectedNodeIds ?? []));
const oldUseOperationAlternateSelectedNode = () =>
  useSelector(createSelector(getPanelState, (state: any) => state.operationContent.alternateSelectedNode ?? {}));

const mountConsumer = (useHook: () => unknown) => {
  const stats = { renders: 0, value: undefined as unknown };
  const Consumer = () => {
    stats.value = useHook();
    stats.renders += 1;
    return null;
  };
  const store = makeStoreWithUndefinedSelection();
  render(
    <Provider store={store}>
      <Consumer />
    </Provider>
  );
  return { store, stats };
};

describe('panelSelectors referential stability (perf regression)', () => {
  describe('useOperationPanelSelectedNodeIds', () => {
    it('BEFORE: createSelector-in-hook returned a new [] and forced a re-render on an unrelated dispatch', () => {
      const { store, stats } = mountConsumer(oldUseOperationPanelSelectedNodeIds);
      const firstRenders = stats.renders;
      const firstValue = stats.value;

      act(() => {
        store.dispatch(setIsPanelLoading(true));
      });

      expect(stats.renders).toBeGreaterThan(firstRenders); // spurious re-render
      expect(stats.value).not.toBe(firstValue); // fresh [] reference each dispatch
    });

    it('AFTER: keeps a stable [] reference and does not re-render on an unrelated dispatch', () => {
      const { store, stats } = mountConsumer(useOperationPanelSelectedNodeIds);
      const firstRenders = stats.renders;
      const firstValue = stats.value;
      expect(firstValue).toEqual([]);

      act(() => {
        store.dispatch(setIsPanelLoading(true));
      });

      expect(stats.renders).toBe(firstRenders); // no spurious re-render
      expect(stats.value).toBe(firstValue); // stable reference
    });
  });

  describe('useOperationAlternateSelectedNode', () => {
    it('BEFORE: createSelector-in-hook returned a new {} and forced a re-render on an unrelated dispatch', () => {
      const { store, stats } = mountConsumer(oldUseOperationAlternateSelectedNode);
      const firstRenders = stats.renders;
      const firstValue = stats.value;

      act(() => {
        store.dispatch(setIsPanelLoading(true));
      });

      expect(stats.renders).toBeGreaterThan(firstRenders);
      expect(stats.value).not.toBe(firstValue);
    });

    it('AFTER: keeps a stable {} reference and does not re-render on an unrelated dispatch', () => {
      const { store, stats } = mountConsumer(useOperationAlternateSelectedNode);
      const firstRenders = stats.renders;
      const firstValue = stats.value;

      act(() => {
        store.dispatch(setIsPanelLoading(true));
      });

      expect(stats.renders).toBe(firstRenders);
      expect(stats.value).toBe(firstValue);
    });
  });
});
