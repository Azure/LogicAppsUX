// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const mockDispatch = vi.fn();
let mockHasMultipleTriggers = false;

vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

vi.mock('../parsers/ParseReduxAction', () => ({
  initializeGraphState: vi.fn((payload: unknown) => ({ type: 'initializeGraphState', payload })),
}));

vi.mock('../state/customcode/customcodeSlice', () => ({
  initCustomCode: vi.fn((payload: unknown) => ({ type: 'initCustomCode', payload })),
}));

vi.mock('../state/designerOptions/designerOptionsSelectors', () => ({
  useAreDesignerOptionsInitialized: () => true,
  useAreServicesInitialized: () => true,
  useMonitoringView: () => false,
  useReadOnly: () => false,
}));

vi.mock('../state/designerOptions/designerOptionsSlice', () => ({
  initializeServices: vi.fn((payload: unknown) => ({ type: 'initializeServices', payload })),
}));

vi.mock('../state/workflow/workflowSlice', () => ({
  setWorkflowKind: vi.fn((payload: unknown) => ({ type: 'setWorkflowKind', payload })),
  setRunInstance: vi.fn((payload: unknown) => ({ type: 'setRunInstance', payload })),
  setHasUnsupportedMultipleTriggers: vi.fn((payload: unknown) => ({ type: 'setHasUnsupportedMultipleTriggers', payload })),
  initWorkflowSpec: vi.fn((payload: unknown) => ({ type: 'initWorkflowSpec', payload })),
}));

vi.mock('../state/global', () => ({
  resetWorkflowState: vi.fn(() => ({ type: 'resetWorkflowState' })),
}));

vi.mock('../utils/workflow', () => ({
  parseWorkflowKind: vi.fn((kind: unknown) => kind),
}));

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@microsoft/logic-apps-shared')>();
  return {
    ...actual,
    hasMultipleTriggers: () => mockHasMultipleTriggers,
  };
});

vi.mock('@react-hookz/web', () => ({
  useDeepCompareEffect: (effect: () => void, _deps: unknown[]) => {
    // Run synchronously so the effect body executes during render for test purposes.
    effect();
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null })),
}));

vi.mock('../state/panel/panelSlice', () => ({
  initRunInPanel: vi.fn((payload: unknown) => ({ type: 'initRunInPanel', payload })),
}));

vi.mock('../actions/bjsworkflow/initialize', () => ({
  initializeDiscoveryPanelFavoriteOperations: vi.fn(),
}));

vi.mock('../state/operation/operationMetadataSlice', () => ({
  clearAllErrors: vi.fn(() => ({ type: 'clearAllErrors' })),
}));

import { BJSWorkflowProvider } from '../BJSWorkflowProvider';
import { ProviderWrappedContext } from '../ProviderWrappedContext';
import { initializeGraphState } from '../parsers/ParseReduxAction';
import { setHasUnsupportedMultipleTriggers } from '../state/workflow/workflowSlice';

describe('BJSWorkflowProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasMultipleTriggers = false;
  });

  const renderProvider = (workflow: unknown) =>
    render(
      <ProviderWrappedContext.Provider value={{} as any}>
        <BJSWorkflowProvider workflow={workflow as any}>
          <div data-testid="shell-child" />
        </BJSWorkflowProvider>
      </ProviderWrappedContext.Provider>
    );

  it('dispatches initializeGraphState and does not flag multiple triggers for a normal (single-trigger) workflow', () => {
    mockHasMultipleTriggers = false;
    renderProvider({ definition: { triggers: { trigger1: {} } } });

    expect(setHasUnsupportedMultipleTriggers).toHaveBeenCalledWith(false);
    expect(initializeGraphState).toHaveBeenCalled();
  });

  it('does not dispatch resetWorkflowState for a normal (single-trigger) workflow', () => {
    mockHasMultipleTriggers = false;
    renderProvider({ definition: { triggers: { trigger1: {} } } });

    const dispatchedActionTypes = mockDispatch.mock.calls.map(([action]) => action.type);
    expect(dispatchedActionTypes).not.toContain('resetWorkflowState');
  });

  it('does not dispatch initializeGraphState for a multiple-trigger workflow, but still flags it and dispatches other shell state', () => {
    mockHasMultipleTriggers = true;
    renderProvider({ definition: { triggers: { trigger1: {}, trigger2: {} } } });

    expect(setHasUnsupportedMultipleTriggers).toHaveBeenCalledWith(true);
    expect(initializeGraphState).not.toHaveBeenCalled();

    // Other workflow-level state (kind, run instance, custom code, etc.) still dispatches normally
    // so the surrounding shell (run-history panel, side panels, etc.) has what it needs to render.
    const dispatchedActionTypes = mockDispatch.mock.calls.map(([action]) => action.type);
    expect(dispatchedActionTypes).toEqual(
      expect.arrayContaining([
        'resetWorkflowState',
        'clearAllErrors',
        'initWorkflowSpec',
        'setWorkflowKind',
        'setRunInstance',
        'initRunInPanel',
        'initCustomCode',
      ])
    );
  });

  it('clears stale graph/panel/operation state (resetWorkflowState) before re-establishing kind/run-instance when flagging a multi-trigger workflow', () => {
    mockHasMultipleTriggers = true;
    renderProvider({ definition: { triggers: { trigger1: {}, trigger2: {} } } });

    const dispatchedActionTypes = mockDispatch.mock.calls.map(([action]) => action.type);
    const resetIndex = dispatchedActionTypes.indexOf('resetWorkflowState');
    const setKindIndex = dispatchedActionTypes.indexOf('setWorkflowKind');
    const setFlagIndex = dispatchedActionTypes.indexOf('setHasUnsupportedMultipleTriggers');

    // resetWorkflowState must run first so that stale state from a prior workflow (e.g. a
    // previously-loaded graph, panel selection, or operation metadata still held by a
    // long-lived DesignerProvider instance) is cleared before we re-establish the essentials
    // (workflow kind, run instance) and flag the workflow as unsupported. Otherwise shell
    // components that remain mounted (PanelRoot, CanvasFinder, KindChangeDialog) could keep
    // referencing a previous, now-irrelevant workflow's state indefinitely, since
    // initializeGraphState -- which would normally overwrite it -- is never dispatched here.
    expect(resetIndex).toBeGreaterThanOrEqual(0);
    expect(resetIndex).toBeLessThan(setKindIndex);
    expect(resetIndex).toBeLessThan(setFlagIndex);
  });

  it('still renders children (the designer shell) regardless of the multiple-trigger check', () => {
    mockHasMultipleTriggers = true;
    const { getByTestId } = renderProvider({ definition: { triggers: { trigger1: {}, trigger2: {} } } });
    expect(getByTestId('shell-child')).toBeDefined();
  });
});
