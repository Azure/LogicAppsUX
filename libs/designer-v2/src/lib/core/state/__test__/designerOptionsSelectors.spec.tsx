import { act, renderHook, waitFor } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as selectors from '../designerOptions/designerOptionsSelectors';
import reducer, { initDesignerOptions, initialDesignerOptionsState } from '../designerOptions/designerOptionsSlice';

const controls = vi.hoisted(() => ({ agentic: false, type: '', channels: vi.fn() }));
vi.mock('../designerView/designerViewSelectors', () => ({ useIsAgenticWorkflow: () => controls.agentic }));
vi.mock('../selectors/actionMetadataSelector', () => ({ useOperationInfo: () => ({ type: controls.type }) }));
vi.mock('../../utils/agent', () => ({ getSupportedChannels: (...args: unknown[]) => controls.channels(...args) }));

const createWrapper = () => {
  const store = configureStore({
    reducer: { designerOptions: reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActionPaths: ['payload.nodeSelectAdditionalCallback'],
          ignoredPaths: ['designerOptions.nodeSelectAdditionalCallback'],
        },
      }),
  });
  return {
    store,
    wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>,
  };
};
const useHostConfiguration = () => ({
  readOnly: selectors.useReadOnly(),
  shared: selectors.useSharedNodeUi(),
  monitoring: selectors.useMonitoringView(),
  draft: selectors.useIsDraft(),
  legacyParameters: selectors.useLegacyWorkflowParameters(),
  host: selectors.useHostOptions(),
  xrm: selectors.useIsXrmConnectionReferenceMode(),
  dark: selectors.useIsDarkMode(),
  vscode: selectors.useIsVSCode(),
  suppressSelect: selectors.useSuppressDefaultNodeSelectFunctionality(),
  selectCallback: selectors.useNodeSelectAdditionalCallback(),
  hiddenTabs: selectors.usePanelTabHideKeys(),
  performance: selectors.useShowPerformanceDebug(),
  firstLoad: selectors.useIsFirstDesignerV2Load(),
  nestedLoops: selectors.useEnableNestedAgentLoops(),
  disableMcp: selectors.useDisableMcpClientTools(),
  disableNativeMcp: selectors.useDisableNativeMcpClientTools(),
  editableCode: selectors.useEditableCodeViewEnabled(),
  optionsReady: selectors.useAreDesignerOptionsInitialized(),
  servicesReady: selectors.useAreServicesInitialized(),
});

beforeEach(() => {
  controls.agentic = false;
  controls.type = '';
  controls.channels.mockReset().mockResolvedValue(['chat']);
});

describe('host option selector lifecycle', () => {
  it('defaults the shared opt-in and optional behavior flags off, then observes the real initialization action', () => {
    const { store, wrapper } = createWrapper();
    const { result } = renderHook(useHostConfiguration, { wrapper });
    expect(result.current).toMatchObject({
      readOnly: false,
      shared: false,
      monitoring: false,
      draft: false,
      legacyParameters: false,
      xrm: false,
      dark: false,
      vscode: false,
      hiddenTabs: [],
      performance: false,
      firstLoad: false,
      nestedLoops: false,
      disableMcp: false,
      disableNativeMcp: false,
      editableCode: false,
      optionsReady: false,
      servicesReady: false,
    });
    const callback = vi.fn();
    act(() =>
      store.dispatch(
        initDesignerOptions({
          ...initialDesignerOptionsState,
          readOnly: true,
          useSharedNodeUi: true,
          isMonitoringView: true,
          isDraft: true,
          isDarkMode: true,
          isVSCode: true,
          useLegacyWorkflowParameters: true,
          isXrmConnectionReferenceMode: true,
          suppressDefaultNodeSelectFunctionality: true,
          nodeSelectAdditionalCallback: callback,
          panelTabHideKeys: ['SETTINGS'],
          showPerformanceDebug: true,
          isFirstDesignerV2Load: true,
          hostOptions: {
            displayRuntimeInfo: false,
            enableNestedAgentLoops: true,
            disableMcpClientTools: true,
            disableNativeMcpClientTools: true,
            enableEditableCodeView: true,
          },
        })
      )
    );
    expect(result.current).toMatchObject({
      readOnly: true,
      shared: true,
      monitoring: true,
      draft: true,
      legacyParameters: true,
      xrm: true,
      dark: true,
      vscode: true,
      suppressSelect: true,
      selectCallback: callback,
      hiddenTabs: ['SETTINGS'],
      performance: true,
      firstLoad: true,
      nestedLoops: true,
      disableMcp: true,
      disableNativeMcp: true,
      editableCode: true,
      optionsReady: true,
      host: { displayRuntimeInfo: false, maxStateHistorySize: initialDesignerOptionsState.hostOptions.maxStateHistorySize },
    });
    act(() => store.dispatch(initDesignerOptions({ hostOptions: { displayRuntimeInfo: true } })));
    expect(result.current).toMatchObject({ shared: false, vscode: false, hiddenTabs: [], performance: false, firstLoad: false });
  });

  it('loads supported channels only for an agent in an agentic workflow and refreshes when the operation changes', async () => {
    const { wrapper } = createWrapper();
    const { result, rerender } = renderHook(() => selectors.useSupportedChannels('agent'), { wrapper });
    expect(result.current).toEqual([]);
    expect(controls.channels).not.toHaveBeenCalled();
    controls.agentic = true;
    controls.type = 'Agent';
    rerender();
    await waitFor(() => expect(result.current).toEqual(['chat']));
    expect(controls.channels).toHaveBeenCalledWith('agent', { type: 'Agent' });
    controls.channels.mockResolvedValue(['voice']);
    controls.type = 'agent';
    rerender();
    await waitFor(() => expect(result.current).toEqual(['voice']));
  });
});
