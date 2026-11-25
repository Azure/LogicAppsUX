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

const { mockBJSWorkflowProvider, mockCodeViewEditor } = vi.hoisted(() => {
  return { mockBJSWorkflowProvider: vi.fn(), mockCodeViewEditor: vi.fn() };
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
  default: React.forwardRef((props, ref) => {
    mockCodeViewEditor(props);
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

  it.each(
    [
      [],
      [
        "The request options timeout parameter is not supported for action 'Compose' of type 'Compose'. Actions of type 'HTTP' are supported.",
      ],
      [
        "The request options timeout parameter is not supported for action 'Compose' of type 'Compose'. Actions of type 'HTTP' are supported.",
        "The request options timeout parameter is not supported for action 'Compose_2' of type 'Compose'. Actions of type 'HTTP' are supported.",
      ],
    ].map((errors) => ({ errors, count: errors.length }))
  )('renders $count visible validation alerts without exposing internal state in diagnostic markup', ({ errors }) => {
    mockGetCodeViewRequestOptionsValidationErrors.mockReturnValue(errors);
    const store = createTestStore({
      definition: { $schema: 'schema', triggers: { manual: {} }, actions: {} },
      kind: 'stateful',
    });

    const { container } = render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    expect(container.querySelector('[data-code-view-validation-errors]')).toBeNull();
    expect(container.firstElementChild).toHaveStyle({ height: '100vh' });
    expect(screen.getByTestId('designer-command-bar')).toBeVisible();
    expect(screen.getByTestId('designer-v2-inner')).toBeVisible();
    const alerts = screen.queryAllByRole('alert');
    expect(alerts.map((alert) => alert.textContent)).toEqual(errors);
    for (const alert of alerts) {
      expect(alert).toBeVisible();
    }
  });

  it('retains local Code errors during refresh but recomputes them from the file on remount', async () => {
    const expectedError =
      "The request options timeout parameter is not supported for action 'Compose' of type 'Compose'. Actions of type 'HTTP' are supported.";
    mockCodeValue.value = JSON.stringify({
      definition: {
        actions: {
          Compose: {
            type: 'Compose',
            runtimeConfiguration: { requestOptions: { timeout: 'PT24H' } },
          },
        },
      },
    });
    mockGetCodeViewRequestOptionsValidationErrors.mockImplementation((definition: any) =>
      definition?.actions?.Compose?.runtimeConfiguration?.requestOptions?.timeout ? [expectedError] : []
    );
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
    expect(mockCodeViewEditor.mock.lastCall?.[0].workflowFile.definition.actions).toEqual({});
    expect(mockPostMessage).toHaveBeenCalledWith({
      command: 'save',
      definition: {
        actions: {
          Compose: {
            type: 'Compose',
            runtimeConfiguration: { requestOptions: { timeout: 'PT24H' } },
          },
        },
      },
      parameters: undefined,
      connectionReferences: undefined,
    });

    act(() => {
      store.dispatch({ type: 'designer/updateAccessToken', payload: 'refreshed-token' });
    });
    expect(screen.getByRole('alert')).toHaveTextContent(expectedError);
    expect(mockBJSWorkflowProvider.mock.lastCall?.[0].workflow.definition.actions.Compose.runtimeConfiguration).toEqual({
      requestOptions: { timeout: 'PT24H' },
    });

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
    expect(mockGetState).not.toHaveBeenCalled();
    expect(mockSetState).not.toHaveBeenCalled();

    rendered.unmount();
    rendered = render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );
    expect(screen.queryByRole('alert')).toBeNull();

    mockCodeValue.value = JSON.stringify({ definition: { actions: { Compose: { type: 'Compose' } } } });
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

  it('clears local Code validation errors on Discard without persisting them', () => {
    const expectedError =
      "The request options timeout parameter is not supported for action 'Compose' of type 'Compose'. Actions of type 'HTTP' are supported.";
    mockCodeValue.value = JSON.stringify({
      definition: { actions: { Compose: { type: 'Compose', runtimeConfiguration: { requestOptions: { timeout: 'PT24H' } } } } },
    });
    mockGetCodeViewRequestOptionsValidationErrors.mockImplementation((definition: any) =>
      definition?.actions?.Compose?.runtimeConfiguration?.requestOptions?.timeout ? [expectedError] : []
    );
    const store = createTestStore({
      definition: { $schema: 'schema', triggers: { manual: {} }, actions: {} },
      kind: 'stateful',
    });

    const { unmount } = render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Code' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save code' }));
    expect(screen.getByRole('alert')).toHaveTextContent(expectedError);

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(mockSetState).not.toHaveBeenCalled();

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
    fireEvent.click(screen.getByRole('button', { name: 'Code' }));
    expect(mockCodeViewEditor.mock.lastCall?.[0].workflowFile.definition.actions.Compose).toEqual({ type: 'Compose' });
    expect(mockPostMessage).not.toHaveBeenCalledWith(expect.objectContaining({ command: 'save' }));
  });

  it('clears local Code validation errors after a valid workflow-view save', async () => {
    const expectedError =
      "The request options timeout parameter is not supported for action 'Compose' of type 'Compose'. Actions of type 'HTTP' are supported.";
    mockCodeValue.value = JSON.stringify({
      definition: { actions: { Compose: { type: 'Compose', runtimeConfiguration: { requestOptions: { timeout: 'PT24H' } } } } },
    });
    mockGetCodeViewRequestOptionsValidationErrors.mockImplementation((definition: any) =>
      definition?.actions?.Compose?.runtimeConfiguration?.requestOptions?.timeout ? [expectedError] : []
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
    fireEvent.click(screen.getByRole('button', { name: 'Save code' }));
    expect(screen.getByRole('alert')).toHaveTextContent(expectedError);

    fireEvent.click(screen.getByRole('button', { name: 'Save workflow' }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(mockSetState).not.toHaveBeenCalled();
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

  it('clears an invalid saved baseline after valid Code content is saved without reinitializing the mounted editor', () => {
    const expectedError =
      "The request options timeout parameter is not supported for action 'Compose' of type 'Compose'. Actions of type 'HTTP' are supported.";
    const invalidDefinition = {
      actions: {
        Compose: {
          type: 'Compose',
          runtimeConfiguration: { requestOptions: { timeout: 'PT24H' } },
        },
      },
    };
    mockCodeValue.value = JSON.stringify({ definition: { actions: { Compose: { type: 'Compose' } } } });
    mockGetCodeViewRequestOptionsValidationErrors.mockImplementation((definition: any) =>
      definition?.actions?.Compose?.runtimeConfiguration?.requestOptions?.timeout ? [expectedError] : []
    );
    const store = createTestStore({
      definition: invalidDefinition,
      kind: 'stateful',
    });

    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Code' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save code' }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(mockCodeViewEditor.mock.lastCall?.[0].workflowFile.definition).toEqual(invalidDefinition);
  });

  it('shows validation errors when a native workflow.json edit is loaded into a newly opened designer', () => {
    const expectedError =
      "The request options timeout parameter is not supported for action 'Compose' of type 'Compose'. Actions of type 'HTTP' are supported.";
    const invalidDefinition = {
      actions: {
        Compose: {
          type: 'Compose',
          runtimeConfiguration: { requestOptions: { timeout: 'PT24H' } },
        },
      },
    };
    mockGetCodeViewRequestOptionsValidationErrors.mockImplementation((definition: any) =>
      definition?.actions?.Compose?.runtimeConfiguration?.requestOptions?.timeout ? [expectedError] : []
    );
    const store = createTestStore({
      definition: invalidDefinition,
      kind: 'stateful',
    });

    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    expect(screen.getByRole('alert')).toHaveTextContent(expectedError);
    expect(mockVscodeState.value).toBeUndefined();

    act(() => {
      store.dispatch({
        type: 'designer/updateStandardApp',
        payload: {
          definition: { actions: { Compose: { type: 'Compose', inputs: 'test' } } },
          kind: 'stateful',
        },
      });
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('ignores legacy persisted errors for a valid loaded file without modifying other webview state', () => {
    const legacyState = {
      codeViewValidationErrors: ['Error from an older definition'],
      otherState: { selectedTab: 'workflow' },
    };
    mockVscodeState.value = legacyState;
    const store = createTestStore({
      definition: { actions: { Compose: { type: 'Compose', inputs: 'test' } } },
      kind: 'stateful',
    });

    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    expect(screen.queryByRole('alert')).toBeNull();
    expect(mockGetState).not.toHaveBeenCalled();
    expect(mockSetState).not.toHaveBeenCalled();
    expect(mockVscodeState.value).toBe(legacyState);
  });

  it('recomputes loaded errors after remount and clears them when the native file is repaired', () => {
    const expectedError =
      "The request options timeout parameter is not supported for action 'Compose' of type 'Compose'. Actions of type 'HTTP' are supported.";
    mockGetCodeViewRequestOptionsValidationErrors.mockImplementation((definition: any) =>
      definition?.actions?.Compose?.runtimeConfiguration?.requestOptions?.timeout ? [expectedError] : []
    );
    const store = createTestStore({
      definition: { actions: { Compose: { type: 'Compose', runtimeConfiguration: { requestOptions: { timeout: 'PT24H' } } } } },
      kind: 'stateful',
    });
    const mount = () =>
      render(
        <Provider store={store}>
          <DesignerApp />
        </Provider>
      );

    let rendered = mount();
    expect(screen.getByRole('alert')).toHaveTextContent(expectedError);
    rendered.unmount();
    rendered = mount();
    expect(screen.getByRole('alert')).toHaveTextContent(expectedError);
    act(() => {
      store.dispatch({
        type: 'designer/updateStandardApp',
        payload: { definition: { actions: { Compose: { type: 'Compose', inputs: 'test' } } }, kind: 'stateful' },
      });
    });
    expect(screen.queryByRole('alert')).toBeNull();
    rendered.unmount();
    mount();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(mockSetState).not.toHaveBeenCalled();
  });
});
