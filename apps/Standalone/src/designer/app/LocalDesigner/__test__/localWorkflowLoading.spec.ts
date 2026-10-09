// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import type { Workflow } from '@microsoft/logic-apps-designer-v2';
import workflowLoader, {
  loadWorkflow,
  setHostingPlan,
  setIsLocalSelected,
  setResourcePath,
  synchronizeAppliedLocalWorkflow,
  setReadOnly,
} from '../../../state/workflowLoadingSlice';
import { localWorkflowHref, localWorkflowRegistry, localWorkflowRegistryKey } from '../localWorkflowRegistry';
import fixture from '../../../../../../../__mocks__/workflows/ExtractSelection.json';

describe('offline registry workflow loading', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'locks', {
      configurable: true,
      value: {
        request: vi.fn(async (...args: unknown[]) => (args[args.length - 1] as () => Promise<unknown>)()),
      },
    });
    window.localStorage.clear();
    window.history.replaceState(null, '', '/v2?extraction=true&theme=dark');
  });

  const storeFor = (id: string) => {
    const store = configureStore({ reducer: { workflowLoader } });
    store.dispatch(setHostingPlan('standard'));
    store.dispatch(setIsLocalSelected(true));
    store.dispatch(setResourcePath(id));
    return store;
  };

  it('loads the extraction fixture through the existing import path', async () => {
    const store = storeFor('ExtractSelection.json');
    await store.dispatch(loadWorkflow(undefined));
    expect(store.getState().workflowLoader.workflowDefinition).toEqual(fixture.definition);
    expect(store.getState().workflowLoader.workflowLoadError).toBeUndefined();
  });

  it('synchronizes an applied source without reloading and keeps it when read-only changes', async () => {
    const store = storeFor('ExtractSelection.json');
    await store.dispatch(loadWorkflow(undefined));
    const source = { ...structuredClone(fixture), connectionReferences: {} };
    source.definition.actions.Read_customer.inputs = 'saved source marker';
    store.dispatch(synchronizeAppliedLocalWorkflow({ sourceId: 'ExtractSelection.json', workflow: source }));
    const state = store.getState().workflowLoader;
    expect(state.workflowDefinition).toBe(source.definition);
    expect(state.appliedWorkflow).toBe(source);
    store.dispatch(setReadOnly(true));
    expect(store.getState().workflowLoader.workflowDefinition).toBe(source.definition);
    await store.dispatch(loadWorkflow(undefined));
    expect(store.getState().workflowLoader.appliedWorkflow).toBeUndefined();
  });

  it('rejects synchronization for a source that is no longer loaded', () => {
    const store = storeFor('another.json');
    const before = store.getState();
    expect(() =>
      store.dispatch(
        synchronizeAppliedLocalWorkflow({
          sourceId: 'ExtractSelection.json',
          workflow: { ...fixture, connectionReferences: {} },
        })
      )
    ).toThrow('local workflow changed');
    expect(store.getState()).toBe(before);
  });

  it('reopens both a persisted source override and generated child through the loader', async () => {
    const child = { ...fixture, connectionReferences: {} };
    const source: Workflow = {
      ...structuredClone(child),
      definition: {
        ...structuredClone(child.definition),
        actions: {
          ...structuredClone(child.definition.actions),
          Read_customer: { ...structuredClone(child.definition.actions.Read_customer), inputs: 'persisted source marker' },
          Call_child: {
            type: 'Workflow',
            inputs: { host: { workflow: { id: 'ReloadableChild' } }, body: {} },
            runAfter: {},
          },
        },
      },
    };
    await localWorkflowRegistry.createService('ExtractSelection.json', 'ExtractSelection').commit({
      operationId: 'load-test',
      sourceFingerprint: 'before',
      plan: {
        source,
        child,
        childName: 'ReloadableChild',
        invocationId: 'Call_child',
        selectedIds: [],
        inputs: [],
        outputs: [],
      },
    });
    for (const [id, expected] of [
      ['ExtractSelection.json', source.definition],
      ['local:ReloadableChild', child.definition],
    ] as const) {
      const store = storeFor(id);
      await store.dispatch(loadWorkflow(undefined));
      expect(store.getState().workflowLoader.workflowDefinition).toEqual(expected);
      expect(store.getState().workflowLoader.workflowLoadError).toBeUndefined();
    }
    expect(localWorkflowHref('local:ReloadableChild')).toBe('/v2?extraction=true&theme=dark&local=local%3AReloadableChild');
  });

  it('surfaces malformed registry data rather than silently loading the original fixture', async () => {
    window.localStorage.setItem(localWorkflowRegistryKey, '{broken');
    const store = storeFor('ExtractSelection.json');
    await store.dispatch(loadWorkflow(undefined));
    expect(store.getState().workflowLoader.workflowDefinition).toBeNull();
    expect(store.getState().workflowLoader.workflowLoadError).toMatch('malformed');
  });

  it('surfaces a missing child rather than treating it as a bundled fixture', async () => {
    const store = storeFor('local:MissingChild');
    await store.dispatch(loadWorkflow(undefined));
    expect(store.getState().workflowLoader.workflowLoadError).toMatch('missing from this browser');
  });

  it('does not read the registry in the V1 designer', async () => {
    window.history.replaceState(null, '', '/?extraction=true');
    window.localStorage.setItem(localWorkflowRegistryKey, '{broken');
    const store = storeFor('ExtractSelection.json');
    await store.dispatch(loadWorkflow(undefined));
    expect(store.getState().workflowLoader.workflowDefinition).toEqual(fixture.definition);
    expect(store.getState().workflowLoader.workflowLoadError).toBeUndefined();
  });
});
