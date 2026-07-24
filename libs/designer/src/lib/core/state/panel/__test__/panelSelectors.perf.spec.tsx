/**
 * @vitest-environment jsdom
 *
 * Regression coverage for the panel selector referential-stability fix (designer v1).
 * See the designer-v2 counterpart for the full rationale.
 */
import { describe, expect, it } from 'vitest';
import { render, act } from '@testing-library/react';
import { Provider, useSelector } from 'react-redux';
import { configureStore, createSelector } from '@reduxjs/toolkit';
import panelReducer, { initialState, setIsPanelLoading } from '../panelSlice';
import { useOperationAlternateSelectedNode } from '../panelSelectors';

const makeStoreWithUndefinedSelection = () =>
  configureStore({
    reducer: { panel: panelReducer },
    preloadedState: {
      panel: {
        ...initialState,
        operationContent: {
          ...initialState.operationContent,
          alternateSelectedNode: undefined,
        },
      },
    } as any,
  });

// Faithful reproduction of the previous (buggy) implementation.
const getPanelState = (state: any) => state.panel;
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
