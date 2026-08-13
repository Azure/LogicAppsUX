import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
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

const { mockPostMessage } = vi.hoisted(() => {
  return { mockPostMessage: vi.fn() };
});

const { mockBJSWorkflowProvider } = vi.hoisted(() => {
  return { mockBJSWorkflowProvider: vi.fn() };
});

vi.mock('../../../webviewCommunication', async () => {
  const React = await import('react');
  return {
    VSCodeContext: React.createContext({ postMessage: mockPostMessage }),
  };
});

vi.mock('../servicesHelper', () => ({
  getDesignerServices: vi.fn(() => ({})),
}));

vi.mock('../utilities/workflow', () => ({
  convertConnectionsDataToReferences: vi.fn(() => ({})),
}));

vi.mock('../DesignerCommandBar/indexV2', () => ({
  DesignerCommandBar: () => <div data-testid="designer-command-bar" />,
}));

vi.mock('../CodeViewEditor', () => ({
  default: () => <div data-testid="code-view-editor" />,
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
        reducers: {},
      }).reducer,
    },
  });
};

describe('vs-code-react appV2 DesignerApp (Standard designer/monitoring host)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
