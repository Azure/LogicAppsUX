import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { PanelLocation } from '@microsoft/designer-ui';
import { IntlProvider } from 'react-intl';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';
import { getMonitoringTabError } from '../../../../common/utilities/error';
import { initializeInputsOutputsBinding } from '../../../../core/actions/bjsworkflow/monitoring';
import { initializeGraphState } from '../../../../core/parsers/ParseReduxAction';
import { Deserialize } from '../../../../core/parsers/BJSWorkflow/BJSDeserializer';
import { runsQueriesKeys } from '../../../../core/queries/runs';
import { changePanelNode, collapsePanel, setAlternateSelectedNode } from '../../../../core/state/panel/panelSlice';
import { useRootWorkflowGraphForLayout, useRunData, useSelectedLoopRepetition } from '../../../../core/state/workflow/workflowSelectors';
import {
  initialWorkflowState,
  setRepetitionRunData,
  setRunIndex,
  toggleCollapsedGraphId,
} from '../../../../core/state/workflow/workflowSlice';
import { createDesignerStore, designerReducer } from '../../../../core/store';
import { getNode } from '../../../../core/utils/graph';
import { NodeRunDataSync } from '../../../CustomNodes/OperationCardNode';
import { NodeDetailsPanel } from '../nodeDetailsPanel';
import { useRawInputsOutputs } from '../useRawInputsOutputs';

const service = vi.hoisted(() => ({ getActionLinks: vi.fn(), getRepetition: vi.fn() }));
vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@microsoft/logic-apps-shared')>()),
  RunService: () => service,
  OperationManifestService: () => ({ isSupported: () => false }),
}));

const innerActions: LogicAppsV2.WorkflowDefinition['actions'] = {
  Condition: {
    type: 'If',
    expression: '@equals(1,1)',
    actions: { Scope: { type: 'Scope', actions: { Inner: { type: 'Compose', inputs: 'inside' } } } },
    else: { actions: { Else_action: { type: 'Compose', inputs: 'outside' } } },
  },
};

const getExecution = (status: 'Failed' | 'Succeeded', uri: string): LogicAppsV2.WorkflowRunAction => ({
  status,
  code: status === 'Failed' ? 'ActionFailed' : 'OK',
  ...(status === 'Failed' && { error: { code: 'LoopError', message: 'Failure in the first item' } }),
  startTime: '2026-01-01T00:00:00Z',
  endTime: '2026-01-01T00:00:01Z',
  correlation: { actionTrackingId: 'same-id', clientTrackingId: 'client' },
  inputsLink: { uri, contentSize: 10 },
  outputsLink: { contentSize: 0 },
  retryHistory: [],
});

function setup(shared: boolean, loop: boolean, nestedLoop = false, workflowKind?: 'agent') {
  service.getRepetition.mockReset();
  service.getActionLinks.mockReset().mockImplementation(async (metadata) => ({
    inputs: { item: metadata?.inputsLink?.uri },
    outputs: {},
  }));
  const actions = nestedLoop ? { Nested: { type: 'Foreach' as const, foreach: '@createArray(1,2)', actions: innerActions } } : innerActions;
  const definition = {
    ...initialWorkflowState.originalDefinition,
    actions: loop ? { Loop: { type: 'Foreach' as const, foreach: '@createArray(1,2)', actions } } : innerActions,
  };
  const parsed = Deserialize(definition, null);
  const state = designerReducer(undefined, { type: '@@init' });
  const oldExecution = getExecution('Failed', 'first-item');
  const store = createDesignerStore({
    ...state,
    designerOptions: { ...state.designerOptions, isMonitoringView: true, useSharedNodeUi: shared },
    workflow: {
      ...initialWorkflowState,
      workflowKind,
      graph: parsed.graph,
      operations: parsed.actionData,
      nodesMetadata: {
        ...parsed.nodesMetadata,
        ...(!loop && { Inner: { ...parsed.nodesMetadata.Inner, runData: oldExecution } }),
      },
      runInstance: { id: 'run' } as LogicAppsV2.RunInstanceDefinition,
    },
  });
  // Match the designer's fresh-cache behavior when an observer changes query keys.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 60_000, staleTime: 60_000, refetchOnMount: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </Provider>
  );
  return { store, wrapper, oldExecution, definition, client };
}

const useDetails = () => {
  const metadata = useRunData('Inner');
  const { data } = useRawInputsOutputs('Inner');
  return {
    error: getMonitoringTabError(metadata?.error, metadata?.status, metadata?.code),
    rawLink: metadata?.inputsLink?.uri,
    input: data?.inputs.item,
  };
};

const ignoreFetching = () => undefined;
const DetailsPanel = () => (
  <IntlProvider locale="en">
    <FluentProvider theme={webLightTheme}>
      <NodeDetailsPanel isCollapsed={false} toggleCollapse={ignoreFetching} panelLocation={PanelLocation.Right} />
    </FluentProvider>
  </IntlProvider>
);
const RepetitionCard = () => (
  <NodeRunDataSync id="Inner" graphId="Scope" parentNodeId="Scope" isMcpClientSubgraph={false} onFetchingChange={ignoreFetching} />
);

const withRepetitionCard =
  (wrapper: ({ children }: { children: ReactNode }) => JSX.Element) =>
  ({ children }: { children: ReactNode }) =>
    wrapper({
      children: (
        <>
          <RepetitionCard />
          {children}
        </>
      ),
    });

const VisibleRepetitionCard = () => {
  const graph = useRootWorkflowGraphForLayout();
  return graph && getNode('Inner', graph) ? <RepetitionCard /> : null;
};

describe('Monitoring details for nested actions', () => {
  it('re-admits stable cached data after same-run graph initialization and still accepts a fresh response for that key', async () => {
    const { store, wrapper, oldExecution, definition, client } = setup(true, true);
    service.getRepetition.mockResolvedValue({ properties: oldExecution });
    const view = renderHook(() => useRawInputsOutputs('Inner'), { wrapper: withRepetitionCard(wrapper) });
    await waitFor(() => expect(view.result.current.data?.inputs.item).toBe('first-item'));
    const revision = view.result.current.data?.loopPayloadRevision;

    act(() =>
      store.dispatch(
        initializeGraphState.fulfilled(
          { deserializedWorkflow: Deserialize(definition, null), originalDefinition: definition },
          'same-run',
          { workflowDefinition: { kind: 'Stateful', definition, connectionReferences: {}, parameters: {} }, runInstance: null }
        )
      )
    );
    await waitFor(() => expect(view.result.current.data?.inputs.item).toBe('first-item'));
    expect(view.result.current.data?.loopPayloadRevision).toBe(revision);
    expect(service.getRepetition).toHaveBeenCalledTimes(1);
    expect(service.getActionLinks).toHaveBeenCalledTimes(1);

    act(() => client.setQueriesData([runsQueriesKeys.useNodeRepetition], { properties: getExecution('Succeeded', 'refreshed-item') }));
    await waitFor(() => expect(view.result.current.data?.inputs.item).toBe('refreshed-item'));
    expect(view.result.current.data?.loopPayloadRevision).not.toBe(revision);
    expect(service.getActionLinks).toHaveBeenCalledTimes(2);
  });

  it('reuses raw payload and its revision when returning to an unchanged cached iteration', async () => {
    const { store, wrapper, oldExecution, client } = setup(true, true);
    service.getRepetition
      .mockResolvedValueOnce({ properties: oldExecution })
      .mockResolvedValueOnce({ properties: getExecution('Succeeded', 'second-item') });
    const { result } = renderHook(() => useRawInputsOutputs('Inner'), {
      wrapper: withRepetitionCard(wrapper),
    });

    await waitFor(() => expect(result.current.data?.inputs.item).toBe('first-item'));
    const firstRevision = result.current.data?.loopPayloadRevision;
    act(() => store.dispatch(setRunIndex({ nodeId: 'Loop', page: 1 })));
    await waitFor(() => expect(result.current.data?.inputs.item).toBe('second-item'));
    expect(result.current.data?.loopPayloadRevision).not.toBe(firstRevision);

    act(() => store.dispatch(setRunIndex({ nodeId: 'Loop', page: 0 })));
    await waitFor(() => expect(result.current.data?.inputs.item).toBe('first-item'));
    expect(result.current.data?.loopPayloadRevision).toBe(firstRevision);
    expect(service.getRepetition).toHaveBeenCalledTimes(2);
    expect(service.getActionLinks).toHaveBeenCalledTimes(2);
    expect(
      client
        .getQueryCache()
        .findAll(['actionInputsOutputs'])
        .filter(({ state }) => !!state.data)
    ).toHaveLength(2);
  });

  it('loads a pinned descendant after its Scope collapses and reuses the query when its card remounts', async () => {
    const { store, wrapper, oldExecution } = setup(true, true);
    let resolveNext!: (value: { properties: LogicAppsV2.WorkflowRunAction }) => void;
    service.getRepetition.mockResolvedValueOnce({ properties: oldExecution }).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveNext = resolve;
        })
    );
    store.dispatch(setAlternateSelectedNode({ nodeId: 'Inner', updatePanelOpenState: true }));
    const view = renderHook(useDetails, {
      wrapper: ({ children }) =>
        wrapper({
          children: (
            <>
              <VisibleRepetitionCard />
              <DetailsPanel />
              {children}
            </>
          ),
        }),
    });
    await waitFor(() => expect(view.result.current.input).toBe('first-item'));
    expect(service.getRepetition).toHaveBeenCalledTimes(1);

    act(() => store.dispatch(toggleCollapsedGraphId({ id: 'Scope' })));
    expect(view.result.current.input).toBe('first-item');
    expect(service.getRepetition).toHaveBeenCalledTimes(1);
    act(() => {
      store.dispatch(setRunIndex({ nodeId: 'Loop', page: 1 }));
    });
    expect(view.result.current).toEqual({ error: undefined, rawLink: undefined, input: undefined });
    expect(store.getState().panel.operationContent.alternateSelectedNode).toMatchObject({ nodeId: 'Inner', persistence: 'pinned' });
    await waitFor(() => expect(service.getRepetition).toHaveBeenLastCalledWith({ nodeId: 'Inner', runId: 'run' }, '000001'));
    await act(async () => resolveNext({ properties: getExecution('Succeeded', 'second-item') }));
    await waitFor(() => expect(view.result.current.input).toBe('second-item'));

    act(() => store.dispatch(toggleCollapsedGraphId({ id: 'Scope' })));
    expect(view.result.current.input).toBe('second-item');
    expect(service.getRepetition).toHaveBeenCalledTimes(2);
    expect(service.getActionLinks).toHaveBeenCalledTimes(2);
  });

  it('observes both distinct rendered panes and reuses the same query when their selections converge', async () => {
    const { store, wrapper, client, oldExecution } = setup(true, true);
    service.getRepetition.mockResolvedValue({ properties: oldExecution });
    store.dispatch(changePanelNode('Inner'));
    store.dispatch(setAlternateSelectedNode({ nodeId: 'Else_action', panelPersistence: 'selected', updatePanelOpenState: true }));
    const { container } = render(<DetailsPanel />, { wrapper });
    expect(container.querySelectorAll('.msla-panel-layout')).toHaveLength(2);
    await waitFor(() => expect(service.getRepetition.mock.calls.map(([action]) => action.nodeId).sort()).toEqual(['Else_action', 'Inner']));
    act(() => store.dispatch(setAlternateSelectedNode({ nodeId: 'Inner', panelPersistence: 'selected', updatePanelOpenState: true })));
    expect(container.querySelectorAll('.msla-panel-layout')).toHaveLength(1);
    const query = client.getQueryCache().find([runsQueriesKeys.useNodeRepetition, { nodeId: 'Inner' }], { exact: false });
    expect(query?.getObserversCount()).toBe(1);
    expect(service.getRepetition).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['flag off', false, undefined],
    ['Agent workflow', true, 'agent'],
  ] as const)('does not observe the ordinary loop query from a rendered pane with %s', (_label, shared, workflowKind) => {
    const { store, wrapper, client } = setup(shared, true, false, workflowKind);
    store.dispatch(changePanelNode('Inner'));
    const { container } = render(<DetailsPanel />, { wrapper });
    expect(container.querySelector('.msla-panel-layout')).toBeInTheDocument();
    expect(client.getQueryCache().findAll([runsQueriesKeys.useNodeRepetition])).toHaveLength(0);
    expect(service.getRepetition).not.toHaveBeenCalled();
  });

  it.each(['primary', 'alternate'] as const)(
    'loads the open %s pane when the node is in the graph but its card is not mounted',
    async (pane) => {
      const { store, wrapper: Wrapper, oldExecution } = setup(true, true);
      service.getRepetition.mockResolvedValue({ properties: oldExecution });
      store.dispatch(
        pane === 'primary'
          ? changePanelNode('Inner')
          : setAlternateSelectedNode({ nodeId: 'Inner', panelPersistence: 'selected', updatePanelOpenState: true })
      );
      expect(getNode('Inner', store.getState().workflow.graph!)).toBeDefined();
      const { container } = render(<DetailsPanel />, { wrapper: Wrapper });
      expect(container.querySelector('.msla-panel-layout')).toBeInTheDocument();
      await waitFor(() => expect(store.getState().workflow.nodesMetadata.Inner.runData?.inputsLink?.uri).toBe('first-item'));
      expect(service.getRepetition).toHaveBeenCalledTimes(1);
      act(() => store.dispatch(collapsePanel()));
      expect(container.querySelector('.msla-panel-layout')).not.toBeInTheDocument();
      act(() => store.dispatch(setRunIndex({ nodeId: 'Loop', page: 1 })));
      expect(service.getRepetition).toHaveBeenCalledTimes(1);
    }
  );

  it('keeps bound inputs on a same-link status refresh without issuing a new payload request', async () => {
    const { store, wrapper, oldExecution, client } = setup(true, true);
    const repetition = { runId: 'run', name: '000000' };
    const bound = { item: { displayName: 'Item', value: 'first-item' } };
    const boundOutputs = { result: { displayName: 'Result', value: 'first-output' } };
    service.getRepetition.mockResolvedValue({ properties: oldExecution });
    const { result } = renderHook(() => useRawInputsOutputs('Inner'), { wrapper: withRepetitionCard(wrapper) });
    await waitFor(() => expect(result.current.data?.inputs.item).toBe('first-item'));
    const revision = result.current.data?.loopPayloadRevision;
    const applyBound = () =>
      initializeInputsOutputsBinding.fulfilled({ nodeId: 'Inner', inputs: bound, outputs: boundOutputs }, 'binding', {
        nodeId: 'Inner',
        inputsOutputs: { nodeId: 'Inner', inputs: bound, outputs: boundOutputs },
        loopRepetition: repetition,
        loopPayloadRevision: result.current.data?.loopPayloadRevision,
      });
    act(() => store.dispatch(applyBound()));
    expect(store.getState().workflow.nodesMetadata.Inner.runData?.inputs).toEqual(bound);
    act(() =>
      client.setQueriesData([runsQueriesKeys.useNodeRepetition], { properties: { ...oldExecution, status: 'Succeeded', code: 'OK' } })
    );
    await waitFor(() =>
      expect(store.getState().workflow.nodesMetadata.Inner.runData).toMatchObject({
        status: 'Succeeded',
        inputs: bound,
        outputs: boundOutputs,
      })
    );
    expect(result.current.data?.loopPayloadRevision).toBe(revision);
    expect(result.current.data?.inputs.item).toBe('first-item');
    expect(service.getActionLinks).toHaveBeenCalledTimes(1);
  });

  it('isolates changed links, same-URI security metadata, removals, and late bindings within one repetition', async () => {
    const { store, wrapper, oldExecution, client } = setup(true, true);
    const repetition = { runId: 'run', name: '000000' };
    const refresh = (runData: LogicAppsV2.WorkflowRunAction) =>
      client.setQueriesData([runsQueriesKeys.useNodeRepetition], { properties: runData });
    let resolveChanged!: (value: { inputs: { item: string } }) => void;
    service.getActionLinks
      .mockResolvedValueOnce({ inputs: { item: 'first-item' } })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveChanged = resolve;
          })
      )
      .mockResolvedValueOnce({ inputs: { item: '[redacted]' } })
      .mockResolvedValueOnce({ inputs: {} });
    service.getRepetition.mockResolvedValue({ properties: oldExecution });
    const { result } = renderHook(() => useRawInputsOutputs('Inner'), { wrapper: withRepetitionCard(wrapper) });
    await waitFor(() => expect(result.current.data?.inputs.item).toBe('first-item'));
    const lateInputs = { item: { displayName: 'Item', value: 'first-item' } };
    const lateBinding = initializeInputsOutputsBinding.fulfilled({ nodeId: 'Inner', inputs: lateInputs, outputs: {} }, 'old-payload', {
      nodeId: 'Inner',
      inputsOutputs: { nodeId: 'Inner', inputs: lateInputs, outputs: {} },
      loopRepetition: repetition,
      loopPayloadRevision: result.current.data?.loopPayloadRevision,
    });
    const newLink = { ...oldExecution.inputsLink!, uri: 'https://example.invalid/inputs?sig=test-only' };
    act(() => refresh({ ...oldExecution, inputsLink: newLink }));
    await waitFor(() => expect(result.current.data?.inputs.item).toBeUndefined());
    await waitFor(() => expect(service.getActionLinks).toHaveBeenCalledTimes(2));
    act(() => refresh({ ...oldExecution, inputsLink: { ...newLink, secureData: { properties: ['item'] } } }));
    await waitFor(() => expect(result.current.data?.inputs.item).toBe('[redacted]'));
    await act(async () => {
      resolveChanged({ inputs: { item: 'late result' } });
      store.dispatch(lateBinding);
    });
    expect(result.current.data?.inputs.item).toBe('[redacted]');
    expect(store.getState().workflow.nodesMetadata.Inner.runData?.inputs).toBeUndefined();
    const redactedInputs = { item: { displayName: 'Item', value: '[redacted]' } };
    act(() =>
      store.dispatch(
        initializeInputsOutputsBinding.fulfilled({ nodeId: 'Inner', inputs: redactedInputs, outputs: {} }, 'redacted-payload', {
          nodeId: 'Inner',
          inputsOutputs: { nodeId: 'Inner', inputs: redactedInputs, outputs: {} },
          loopRepetition: repetition,
          loopPayloadRevision: result.current.data?.loopPayloadRevision,
        })
      )
    );
    expect(store.getState().workflow.nodesMetadata.Inner.runData?.inputs).toEqual(redactedInputs);
    act(() => refresh({ ...oldExecution, inputsLink: undefined }));
    await waitFor(() => expect(service.getActionLinks).toHaveBeenCalledTimes(4));
    expect(result.current.data?.inputs.item).toBeUndefined();
    expect(store.getState().workflow.nodesMetadata.Inner.runData?.inputs).toBeUndefined();
    expect(
      JSON.stringify(
        client
          .getQueryCache()
          .getAll()
          .map(({ queryKey }) => queryKey)
      )
    ).not.toContain('sig=test-only');
  });

  it('does not expose the previous loop error, link, or content while the selected repetition loads', async () => {
    const { store, wrapper, oldExecution } = setup(true, true);
    const first = { runId: 'run', name: '000000' };
    const second = { runId: 'run', name: '000001' };
    const firstResult = setRepetitionRunData({
      nodeId: 'Inner',
      runData: oldExecution,
      loopRepetition: first,
      loopPayloadRevision: 'first',
    });
    store.dispatch(firstResult);
    const { result } = renderHook(useDetails, { wrapper });
    await waitFor(() => expect(result.current.input).toBe('first-item'));
    expect(result.current.error).toMatchObject({ message: 'Failure in the first item' });

    act(() => store.dispatch(setRunIndex({ nodeId: 'Loop', page: 1 })));
    expect(result.current).toEqual({ error: undefined, rawLink: undefined, input: undefined });
    expect(service.getActionLinks).toHaveBeenCalledTimes(1);

    act(() => store.dispatch(firstResult));
    expect(result.current).toEqual({ error: undefined, rawLink: undefined, input: undefined });

    act(() =>
      store.dispatch(
        setRepetitionRunData({
          nodeId: 'Inner',
          runData: getExecution('Succeeded', 'second-item'),
          loopRepetition: second,
          loopPayloadRevision: 'second',
        })
      )
    );
    await waitFor(() => expect(result.current.input).toBe('second-item'));
    expect(result.current).toEqual({ error: undefined, rawLink: 'second-item', input: 'second-item' });

    const lateInputs = { item: { displayName: 'Item', value: 'first-item' } };
    act(() =>
      store.dispatch(
        initializeInputsOutputsBinding.fulfilled({ nodeId: 'Inner', inputs: lateInputs, outputs: {} }, 'late', {
          nodeId: 'Inner',
          inputsOutputs: { nodeId: 'Inner', inputs: lateInputs, outputs: {} },
          loopRepetition: first,
          loopPayloadRevision: 'first',
        })
      )
    );
    expect(store.getState().workflow.nodesMetadata.Inner.runData?.inputs).toBeUndefined();
  });

  it('leaves the existing flag-off selection behavior unchanged', async () => {
    const { store, wrapper, oldExecution } = setup(false, true);
    store.dispatch(setRepetitionRunData({ nodeId: 'Inner', runData: oldExecution }));
    const { result } = renderHook(useDetails, { wrapper });
    await waitFor(() => expect(result.current.input).toBe('first-item'));
    act(() => store.dispatch(setRunIndex({ nodeId: 'Loop', page: 1 })));
    expect(result.current).toMatchObject({ rawLink: 'first-item', input: 'first-item' });
  });

  it('keeps a late input payload out of the selected nested iteration after its input request fails', async () => {
    const { store, wrapper, oldExecution } = setup(true, true, true);
    let resolveOldInputs!: (data: { inputs: { item: string } }) => void;
    service.getActionLinks
      .mockImplementationOnce(() => new Promise((resolve) => (resolveOldInputs = resolve)))
      .mockRejectedValueOnce(new Error('Input link unavailable'));

    store.dispatch(setRunIndex({ nodeId: 'Nested', page: 1 }));
    store.dispatch(
      setRepetitionRunData({
        nodeId: 'Inner',
        runData: oldExecution,
        loopRepetition: { runId: 'run', name: '000000-000001' },
        loopPayloadRevision: 'first',
      })
    );
    const { result } = renderHook(() => useRawInputsOutputs('Inner'), { wrapper });
    await waitFor(() => expect(service.getActionLinks).toHaveBeenCalledTimes(1));

    act(() => {
      store.dispatch(setRunIndex({ nodeId: 'Loop', page: 1 }));
      store.dispatch(
        setRepetitionRunData({
          nodeId: 'Inner',
          runData: getExecution('Succeeded', 'second-item'),
          loopRepetition: { runId: 'run', name: '000001-000000' },
          loopPayloadRevision: 'second',
        })
      );
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(service.getActionLinks).toHaveBeenLastCalledWith(
      expect.objectContaining({ inputsLink: { uri: 'second-item', contentSize: 10 } }),
      'Inner'
    );
    await act(async () => resolveOldInputs({ inputs: { item: 'first-item' } }));
    expect(result.current.isError).toBe(true);
    expect(result.current.data?.inputs.item).toBeUndefined();
  });

  it('resets nested loop index on outer page change and suppresses child data when an inner loop has zero iterations', () => {
    const { store, oldExecution } = setup(true, true, true);
    store.dispatch(setRunIndex({ nodeId: 'Nested', page: 3 }));
    store.dispatch(
      setRepetitionRunData({
        nodeId: 'Inner',
        runData: oldExecution,
        loopRepetition: { runId: 'run', name: '000000-000003' },
        loopPayloadRevision: 'first',
      })
    );
    expect(store.getState().workflow.nodesMetadata.Nested.runIndex).toBe(3);

    // Moving the outer loop resets descendant loop indices synchronously.
    store.dispatch(setRunIndex({ nodeId: 'Loop', page: 1 }));
    expect(store.getState().workflow.nodesMetadata.Nested.runIndex).toBe(0);

    // Admitting an inner loop repetition with zero iterations marks descendants empty and hides stale runData.
    store.dispatch(
      setRepetitionRunData({
        nodeId: 'Nested',
        runData: {
          status: 'Succeeded',
          inputsLink: { uri: 'nested-empty', contentSize: 10, metadata: { foreachItemsCount: 0 } },
        } as any,
        loopRepetition: { runId: 'run', name: '000001' },
        loopPayloadRevision: 'nested-empty',
      })
    );
    const { result } = renderHook(
      () => ({
        repetition: useSelectedLoopRepetition('Inner'),
        runData: useRunData('Inner'),
      }),
      { wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider> }
    );
    expect(result.current.repetition).toEqual({ runId: 'run', name: '', isEmpty: true });
    expect(result.current.runData).toBeUndefined();
  });

  it('preserves inline repetition outputs when getActionLinks returns {} for unlinked sides', async () => {
    const { store, wrapper } = setup(true, true);
    service.getActionLinks.mockResolvedValue({ inputs: { fromLink: 'yes' }, outputs: {} });

    store.dispatch(
      setRepetitionRunData({
        nodeId: 'Inner',
        runData: {
          status: 'Succeeded',
          inputsLink: { uri: 'linked-inputs', contentSize: 10 },
          outputs: { inlineValue: 42 },
        } as any,
        loopRepetition: { runId: 'run', name: '000000' },
        loopPayloadRevision: 'mixed',
      })
    );

    const { result } = renderHook(() => useRawInputsOutputs('Inner'), { wrapper });
    await waitFor(() => expect(result.current.data?.inputs).toEqual({ fromLink: 'yes' }));
    expect(result.current.data?.outputs).toEqual({ inlineValue: 42 });
  });

  it('uses the action ID to load error and raw content from an If/Scope outside loops', async () => {
    const { wrapper } = setup(true, false);
    const { result } = renderHook(useDetails, { wrapper });
    await waitFor(() => expect(result.current.input).toBe('first-item'));
    expect(result.current.error).toMatchObject({ message: 'Failure in the first item' });
    expect(service.getActionLinks).toHaveBeenCalledWith(expect.objectContaining({ status: 'Failed' }), 'Inner');
  });
});
