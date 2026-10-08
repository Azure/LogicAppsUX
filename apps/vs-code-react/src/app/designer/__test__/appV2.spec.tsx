import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';

// This test guards the VS Code (Standard) V2 designer host wiring: apps/vs-code-react's appV2.tsx
// is the only Standard designer/monitoring host in this repo that consumes the shared
// @microsoft/logic-apps-designer-v2 Designer/BJSWorkflowProvider (selected at runtime via the
// project.designerVersion === 2 flag in app.tsx). The multi-trigger unsupported-designer behavior
// itself (message + no Run Details button for Standard, shell preserved) is unit-tested against
// the shared Designer/BJSWorkflowProvider components directly in libs/designer-v2. This test only
// confirms the host correctly threads `workflow.kind` through to BJSWorkflowProvider -- the one
// piece of host wiring that Standard-detection (`isStandard = !!workflowKind`) depends on -- and
// that the surrounding shell (command bar) still renders alongside the designer.

const { mockGetState, mockPostMessage, mockSetState, mockVscodeState } = vi.hoisted(() => {
  const mockVscodeState: { value: unknown } = { value: undefined };
  return {
    mockGetState: vi.fn(() => mockVscodeState.value),
    mockPostMessage: vi.fn(),
    mockSetState: vi.fn((state: unknown) => {
      mockVscodeState.value = state;
      return state;
    }),
    mockVscodeState,
  };
});

const { mockBJSWorkflowProvider } = vi.hoisted(() => {
  return { mockBJSWorkflowProvider: vi.fn() };
});

const { mockGetCodeViewRequestOptionsValidationErrors } = vi.hoisted(() => {
  return { mockGetCodeViewRequestOptionsValidationErrors: vi.fn((): string[] => []) };
});

const { mockCodeValue, mockHasCodeChanges } = vi.hoisted(() => {
  return {
    mockCodeValue: { value: JSON.stringify({ definition: { actions: { Compose: { type: 'Compose' } } } }) as string | undefined },
    mockHasCodeChanges: { value: true },
  };
});

vi.mock('../../../webviewCommunication', async () => {
  const React = await import('react');
  return {
    VSCodeContext: React.createContext({ getState: mockGetState, postMessage: mockPostMessage, setState: mockSetState }),
  };
});

vi.mock('../servicesHelper', () => ({
  getDesignerServices: vi.fn(() => ({})),
}));

vi.mock('../utilities/workflow', () => ({
  convertConnectionsDataToReferences: vi.fn(() => ({})),
  getCodeViewRequestOptionsValidationErrors: mockGetCodeViewRequestOptionsValidationErrors,
}));

vi.mock('../DesignerCommandBar/indexV2', () => ({
  DesignerCommandBar: (props: any) => (
    <div data-testid="designer-command-bar">
      <button type="button" onClick={props.switchToCodeView}>
        Code
      </button>
      <button type="button" onClick={props.switchToDesignerView}>
        Workflow
      </button>
      <button type="button" onClick={() => props.saveWorkflowFromCode()}>
        Save code
      </button>
      <button
        type="button"
        onClick={() => props.saveWorkflow({ definition: { actions: {} }, parameters: {}, connectionReferences: {} }, undefined)}
      >
        Save workflow
      </button>
      <button type="button" onClick={props.discard}>
        Discard
      </button>
    </div>
  ),
}));

vi.mock('../CodeViewEditor', () => ({
  default: React.forwardRef((_props, ref) => {
    React.useImperativeHandle(ref, () => ({
      getValue: () => mockCodeValue.value,
      hasChanges: () => mockHasCodeChanges.value,
      resetChanges: () => {
        mockHasCodeChanges.value = false;
      },
    }));
    return <div data-testid="code-view-editor" />;
  }),
}));

vi.mock('@microsoft/logic-apps-designer-v2', () => ({
  DesignerProvider: ({ children }: any) => <div data-testid="designer-provider">{children}</div>,
  BJSWorkflowProvider: (props: any) => {
    mockBJSWorkflowProvider(props);
    return <div data-testid="bjs-workflow-provider">{props.children}</div>;
  },
  Designer: () => <div data-testid="designer-v2-inner" />,
  getTheme: vi.fn(() => 'light'),
  useThemeObserver: vi.fn(),
  FloatingRunButton: () => <div data-testid="floating-run-button" />,
  useRun: vi.fn(() => ({ data: undefined, isError: false })),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  BundleVersionRequirements: { MULTI_VARIABLE: '1.0.0', NESTED_AGENT_LOOPS: '1.0.0' },
  guid: vi.fn(() => 'test-guid'),
  isEmptyString: vi.fn(() => true),
  isVersionSupported: vi.fn(() => false),
  Theme: { Dark: 'dark', Light: 'light' },
}));

vi.mock('@microsoft/vscode-extension-logic-apps', () => ({
  ExtensionCommand: {
    createFileSystemConnection: 'createFileSystemConnection',
    save: 'save',
    getDesignerVersion: 'getDesignerVersion',
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({})),
}));

vi.mock('@microsoft/designer-ui', () => ({
  XLargeText: ({ text }: any) => <div>{text}</div>,
}));

vi.mock('@fluentui/react-components', () => ({
  MessageBar: ({ children, role }: any) => <div role={role}>{children}</div>,
  MessageBarBody: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../../../intl', () => ({
  useIntlMessages: vi.fn(() => ({ SOMETHING_WENT_WRONG: 'Error', RUNTIME_NOT_AVAILABLE: 'Runtime not available' })),
  commonMessages: {},
}));

vi.mock('../appStyles', () => ({
  useAppStyles: vi.fn(() => ({})),
}));

// Import after mocks
import { DesignerApp } from '../appV2';

const createTestStore = (standardApp: Record<string, unknown>) => {
  return configureStore({
    reducer: {
      designer: createSlice({
        name: 'designer',
        initialState: {
          panelMetaData: {
            standardApp,
            customCodeData: {},
            parametersData: {},
            localSettings: {},
            extensionBundleVersion: '1.0.0',
            workflowName: 'workflow',
          },
          connectionData: {},
          baseUrl: '/url',
          workflowRuntimeBaseUrl: '',
          apiVersion: '2018-11-01',
          apiHubServiceDetails: {},
          readOnly: false,
          isLocal: true,
          apiVersion2: undefined,
          isMonitoringView: false,
          runId: '',
          hostVersion: '',
          oauthRedirectUrl: '',
        },
        reducers: {
          updateAccessToken: (state, action) => {
            state.panelMetaData = { ...state.panelMetaData, accessToken: action.payload };
          },
          updateStandardApp: (state, action) => {
            state.panelMetaData = { ...state.panelMetaData, standardApp: action.payload };
          },
        },
      }).reducer,
    },
  });
};

describe('vs-code-react appV2 DesignerApp (Standard designer/monitoring host)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVscodeState.value = undefined;
    mockCodeValue.value = JSON.stringify({ definition: { actions: { Compose: { type: 'Compose' } } } });
    mockHasCodeChanges.value = true;
    mockGetCodeViewRequestOptionsValidationErrors.mockReturnValue([]);
  });

  it('threads the Standard workflow kind through to BJSWorkflowProvider so isStandard detection works', () => {
    const store = createTestStore({
      definition: { $schema: 'schema', triggers: { manual: {} }, actions: {} },
      kind: 'stateful',
    });

    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    expect(mockBJSWorkflowProvider).toHaveBeenCalled();
    const propsPassed = mockBJSWorkflowProvider.mock.calls[0][0];
    expect(propsPassed.workflow.kind).toBe('stateful');
  });

  it('still renders the command bar (shell) alongside the designer for Standard workflows', () => {
    const store = createTestStore({
      definition: { $schema: 'schema', triggers: { manual: {} }, actions: {} },
      kind: 'stateful',
    });

    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    expect(screen.getByTestId('designer-command-bar')).toBeDefined();
    expect(screen.getByTestId('designer-v2-inner')).toBeDefined();
  });

  it('shows exact code-view validation errors while still posting the invalid workflow for persistence', async () => {
    const expectedError =
      "The request options timeout parameter is not supported for action 'Compose' of type 'Compose'. Actions of type 'HTTP' are supported.";
    mockGetCodeViewRequestOptionsValidationErrors.mockReturnValue([expectedError]);
    const store = createTestStore({
      definition: { $schema: 'schema', triggers: { manual: {} }, actions: {} },
      kind: 'stateful',
    });

    let rendered = render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Code' }));
    expect(screen.getByTestId('code-view-editor')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Save code' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(expectedError);
    expect(mockPostMessage).toHaveBeenCalledWith({
      command: 'save',
      definition: { actions: { Compose: { type: 'Compose' } } },
      parameters: undefined,
      connectionReferences: undefined,
    });

    act(() => {
      store.dispatch({ type: 'designer/updateAccessToken', payload: 'refreshed-token' });
    });
    expect(screen.getByRole('alert')).toHaveTextContent(expectedError);

    act(() => {
      store.dispatch({
        type: 'designer/updateStandardApp',
        payload: {
          definition: { actions: { Compose: { type: 'Compose', inputs: 'test' } } },
          kind: 'stateful',
        },
      });
    });
    expect(screen.getByRole('alert')).toHaveTextContent(expectedError);

    rendered.unmount();
    rendered = render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );
    expect(screen.getByRole('alert')).toHaveTextContent(expectedError);

    mockGetCodeViewRequestOptionsValidationErrors.mockReturnValue([]);
    mockHasCodeChanges.value = true;
    fireEvent.click(screen.getByRole('button', { name: 'Code' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save code' }));
    expect(screen.queryByRole('alert')).toBeNull();

    rendered.unmount();
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('clears persisted code-view validation errors when changes are discarded', () => {
    const expectedError =
      "The request options timeout parameter is not supported for action 'Compose' of type 'Compose'. Actions of type 'HTTP' are supported.";
    mockVscodeState.value = { codeViewValidationErrors: [expectedError] };
    const store = createTestStore({
      definition: { $schema: 'schema', triggers: { manual: {} }, actions: {} },
      kind: 'stateful',
    });

    const { unmount } = render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );
    expect(screen.getByRole('alert')).toHaveTextContent(expectedError);

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.queryByRole('alert')).toBeNull();

    unmount();
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('recomputes code-view validation when switching views after dirty state was reset', async () => {
    const expectedError =
      "The request options timeout parameter is not supported for action 'Compose' of type 'Compose'. Actions of type 'HTTP' are supported.";
    mockHasCodeChanges.value = false;
    mockGetCodeViewRequestOptionsValidationErrors.mockImplementation((definition: any) =>
      definition?.actions?.Compose ? [expectedError] : []
    );
    const store = createTestStore({
      definition: { $schema: 'schema', triggers: { manual: {} }, actions: {} },
      kind: 'stateful',
    });

    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Code' }));
    fireEvent.click(screen.getByRole('button', { name: 'Workflow' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(expectedError);
    expect(mockPostMessage).not.toHaveBeenCalledWith(expect.objectContaining({ command: 'save' }));
  });

  it('clears persisted validation errors after a valid workflow-view save', async () => {
    const expectedError =
      "The request options timeout parameter is not supported for action 'Compose' of type 'Compose'. Actions of type 'HTTP' are supported.";
    mockVscodeState.value = { codeViewValidationErrors: [expectedError] };
    mockGetCodeViewRequestOptionsValidationErrors.mockReturnValue([]);
    const store = createTestStore({
      definition: { $schema: 'schema', triggers: { manual: {} }, actions: {} },
      kind: 'stateful',
    });

    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );
    expect(screen.getByRole('alert')).toHaveTextContent(expectedError);

    fireEvent.click(screen.getByRole('button', { name: 'Save workflow' }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(mockVscodeState.value).toEqual({ codeViewValidationErrors: [] });
  });

  it('uses the saved baseline when Code view has not initialized its editor value', () => {
    mockCodeValue.value = undefined;
    mockHasCodeChanges.value = false;
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const store = createTestStore({
      definition: { $schema: 'schema', triggers: { manual: {} }, actions: {} },
      kind: 'stateful',
    });

    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Code' }));
    fireEvent.click(screen.getByRole('button', { name: 'Workflow' }));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
