import { setWorkflowExtractionBusy } from '../state/designerView/designerViewSlice';
import { setIsWorkflowDirty } from '../state/workflow/workflowSlice';
import { createDesignerStore } from '../store';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('designer store', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    delete (window as any).DesignerStoreV2;
    delete window.__REDUX_ACTION_LOG__;
  });

  it('creates an isolated store from preloaded state', async () => {
    const source = createDesignerStore();
    source.dispatch(setIsWorkflowDirty(true));

    const isolated = createDesignerStore(source.getState());

    expect(isolated).not.toBe(source);
    expect(isolated.getState()).toEqual(source.getState());
    isolated.dispatch(setIsWorkflowDirty(false));
    expect(isolated.getState().workflow.isDirty).toBe(false);
    expect(source.getState().workflow.isDirty).toBe(true);
  });

  it('blocks ordinary mutations while extraction is busy but permits extraction and lock actions', async () => {
    const store = createDesignerStore();
    store.dispatch(setWorkflowExtractionBusy(true));

    const blockedAction = setIsWorkflowDirty(true);
    expect(store.dispatch(blockedAction)).toBe(blockedAction);
    expect(store.getState().workflow.isDirty).toBe(false);

    store.dispatch({ ...setIsWorkflowDirty(true), meta: { workflowExtraction: true } });
    expect(store.getState().workflow.isDirty).toBe(true);

    store.dispatch(setWorkflowExtractionBusy(false));
    store.dispatch(setIsWorkflowDirty(false));
    expect(store.getState().designerView.workflowExtractionBusy).toBe(false);
    expect(store.getState().workflow.isDirty).toBe(false);
  });

  it('exposes the development store and records dispatched action types', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    const { store } = await import('../store');
    store.dispatch(setIsWorkflowDirty(true));

    expect((window as any).DesignerStoreV2).toBe(store);
    expect(window.__REDUX_ACTION_LOG__).toEqual(['workflow/setIsWorkflowDirty']);
  }, 15_000);
});
