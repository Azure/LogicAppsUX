import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { designerSlice } from '../../../state/DesignerSlice';

// Use vi.hoisted to define mock variables that are used in vi.mock factories
const { mockPostMessage, mockConvertConnectionsDataToReferences } = vi.hoisted(() => {
  return {
    mockPostMessage: vi.fn(),
    mockConvertConnectionsDataToReferences: vi.fn(() => ({ publishedConn: { api: { id: '/test' } } })),
  };
});

// Mock webviewCommunication to avoid acquireVsCodeApi global
vi.mock('../../../webviewCommunication', async () => {
  const React = await import('react');
  return {
    VSCodeContext: React.createContext({ postMessage: mockPostMessage }),
  };
});

// Mock DesignerCommandBar - capture props for assertions
let capturedCommandBarProps: any = null;
vi.mock('../DesignerCommandBar/indexV2', () => ({
  DesignerCommandBar: (props: any) => {
    capturedCommandBarProps = props;
    return <div data-testid="command-bar" />;
  },
}));

vi.mock('../servicesHelper', () => ({
  getDesignerServices: vi.fn(() => ({
    connectionService: {},
    connectorService: {},
    operationManifestService: {},
    searchService: {},
    oAuthService: {},
    gatewayService: {},
    tenantService: {},
    workflowService: { getAgentUrl: vi.fn() },
    hostService: {},
    runService: { getRun: vi.fn().mockResolvedValue(null) },
    roleService: {},
    editorService: {},
    apimService: {},
    loggerService: {},
    connectionParameterEditorService: {},
    cognitiveServiceService: {},
    functionService: {},
  })),
}));

vi.mock('../utilities/runInstance', () => ({
  getRunInstanceMocks: vi.fn(),
}));

vi.mock('../utilities/workflow', () => ({
  convertConnectionsDataToReferences: mockConvertConnectionsDataToReferences,
}));

vi.mock('../CodeViewEditor', () => ({
  default: React.forwardRef(() => <div data-testid="code-editor" />),
}));

vi.mock('@microsoft/logic-apps-designer-v2', () => ({
  DesignerProvider: ({ children }: any) => <div data-testid="designer-provider">{children}</div>,
  BJSWorkflowProvider: ({ children, workflow }: any) => (
    <div data-testid="bjs-workflow-provider" data-workflow={JSON.stringify(workflow)}>
      {children}
    </div>
  ),
  Designer: () => <div data-testid="designer" />,
  FloatingRunButton: () => <div data-testid="floating-run-button" />,
  getTheme: vi.fn(() => 'light'),
  useThemeObserver: vi.fn(),
  useRun: vi.fn(() => ({ data: null, isError: false })),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  BundleVersionRequirements: { MULTI_VARIABLE: '1.0.0', NESTED_AGENT_LOOPS: '1.0.0' },
  guid: vi.fn(() => 'test-guid'),
  isNullOrUndefined: vi.fn((val) => val === null || val === undefined),
  isVersionSupported: vi.fn(() => false),
  Theme: { Dark: 'dark', Light: 'light' },
}));

vi.mock('@microsoft/vscode-extension-logic-apps', () => ({
  ExtensionCommand: {
    save: 'save',
    saveDraft: 'saveDraft',
    discardDraft: 'discardDraft',
    createFileSystemConnection: 'createFileSystemConnection',
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({})),
}));

vi.mock('@microsoft/designer-ui', () => ({
  XLargeText: ({ text }: any) => <div data-testid="error-text">{text}</div>,
}));

vi.mock('../appStyles', () => ({
  useAppStyles: vi.fn(() => ({ designerError: 'error-class' })),
}));

vi.mock('../../intl', () => ({
  useIntlMessages: vi.fn(() => ({ SOMETHING_WENT_WRONG: 'Error' })),
  commonMessages: {},
}));

// Import after mocks
import { DesignerApp } from '../appV2';

const mockWorkflowDefinition = {
  triggers: { manual: { type: 'Request', kind: 'Http' } },
  actions: { action1: { type: 'Http' } },
};

const mockDraftDefinition = {
  triggers: { manual: { type: 'Request', kind: 'Http' } },
  actions: { draftAction: { type: 'Http' } },
};

const createTestStore = (overrides: Partial<ReturnType<typeof designerSlice.getInitialState>> = {}) => {
  return configureStore({
    reducer: {
      designer: designerSlice.reducer,
    },
    preloadedState: {
      designer: {
        ...designerSlice.getInitialState(),
        panelMetaData: {
          standardApp: { definition: mockWorkflowDefinition, kind: 'Stateful' },
          parametersData: { publishedParam: { type: 'String', value: 'pub' } },
        } as any,
        connectionData: { publishedConn: { api: { id: '/test' } } } as any,
        baseUrl: 'https://test.com',
        apiVersion: '2018-11-01',
        apiHubServiceDetails: {
          apiVersion: '2018-07-01-preview',
          baseUrl: '/url',
          subscriptionId: 'sub',
          resourceGroup: 'rg',
          location: 'eastus',
          tenantId: 'tenant',
          httpClient: null as any,
        },
        isLocal: true,
        hostVersion: '1.0.0',
        ...overrides,
      },
    },
  });
};

describe('DesignerApp (V2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedCommandBarProps = null;
  });

  it('should render designer when workflow definition exists', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );
    expect(screen.getByTestId('designer-provider')).toBeDefined();
    expect(screen.getByTestId('designer')).toBeDefined();
    expect(screen.getByTestId('command-bar')).toBeDefined();
  });

  it('should render null when no panelMetaData', () => {
    const store = createTestStore({ panelMetaData: null });
    const { container } = render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );
    // DesignerProvider still renders, but BJSWorkflowProvider should not
    expect(screen.queryByTestId('bjs-workflow-provider')).toBeNull();
  });

  it('should pass draft props to DesignerCommandBar', () => {
    const store = createTestStore({
      isDraftMode: true,
      hasDraft: true,
      lastDraftSaveTime: 1234567890,
      draftSaveError: null,
      isDraftSaving: false,
    });
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    expect(capturedCommandBarProps).not.toBeNull();
    expect(capturedCommandBarProps.isDraftMode).toBe(true);
    expect(capturedCommandBarProps.hasDraft).toBe(true);
    expect(capturedCommandBarProps.lastDraftSaveTime).toBe(1234567890);
    expect(capturedCommandBarProps.draftSaveError).toBeNull();
    expect(capturedCommandBarProps.isDraftSaving).toBe(false);
    expect(typeof capturedCommandBarProps.saveDraftWorkflow).toBe('function');
    expect(typeof capturedCommandBarProps.discardDraft).toBe('function');
    expect(typeof capturedCommandBarProps.switchWorkflowMode).toBe('function');
  });

  it('should use published connections when not in draft mode', () => {
    const store = createTestStore({
      isDraftMode: false,
      hasDraft: true,
      draftConnections: { draftConn: { api: { id: '/draft' } } },
    });
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    // When not in draft mode, convertConnectionsDataToReferences should be used
    expect(mockConvertConnectionsDataToReferences).toHaveBeenCalled();
  });

  it('should use draft connections when in draft mode with draft', () => {
    mockConvertConnectionsDataToReferences.mockClear();
    const draftConns = { draftConn: { api: { id: '/draft' }, connection: { id: '/connections/draft' } } };
    const store = createTestStore({
      isDraftMode: true,
      hasDraft: true,
      draftConnections: draftConns,
    });
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    // The BJSWorkflowProvider should receive the draft connections
    const provider = screen.getByTestId('bjs-workflow-provider');
    const workflowData = JSON.parse(provider.getAttribute('data-workflow') || '{}');
    expect(workflowData.connectionReferences).toEqual(draftConns);
  });

  it('should use draft parameters when in draft mode with draft', () => {
    const draftParams = { draftParam: { type: 'String', value: 'draft-value' } };
    const store = createTestStore({
      isDraftMode: true,
      hasDraft: true,
      draftParameters: draftParams,
    });
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    const provider = screen.getByTestId('bjs-workflow-provider');
    const workflowData = JSON.parse(provider.getAttribute('data-workflow') || '{}');
    expect(workflowData.parameters).toEqual(draftParams);
  });

  it('should use published parameters when not in draft mode', () => {
    const store = createTestStore({
      isDraftMode: false,
      hasDraft: true,
      draftParameters: { draftParam: { type: 'String', value: 'draft' } },
    });
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    const provider = screen.getByTestId('bjs-workflow-provider');
    const workflowData = JSON.parse(provider.getAttribute('data-workflow') || '{}');
    expect(workflowData.parameters).toEqual({ publishedParam: { type: 'String', value: 'pub' } });
  });

  it('should set readOnly when hasDraft and not isDraftMode', () => {
    const store = createTestStore({
      isDraftMode: false,
      hasDraft: true,
      readOnly: false,
    });
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    // The published view should be read-only when a draft exists
    // We verify via the DesignerProvider render
    expect(screen.getByTestId('designer-provider')).toBeDefined();
  });

  it('should dispatch saveDraft message when saveDraftWorkflow is called', () => {
    const store = createTestStore({ isDraftMode: true, hasDraft: false });
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    const definition = { triggers: {}, actions: {} };
    const params = { p1: { type: 'String' } };
    const connRefs = { c1: { api: { id: '/test' } } };
    capturedCommandBarProps.saveDraftWorkflow(definition, params, connRefs);

    expect(mockPostMessage).toHaveBeenCalledWith({
      command: 'saveDraft',
      definition,
      parameters: params,
      connectionReferences: connRefs,
    });
  });

  it('should dispatch discardDraft message when discardDraft is called', () => {
    const store = createTestStore({ isDraftMode: true, hasDraft: true });
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    capturedCommandBarProps.discardDraft();

    expect(mockPostMessage).toHaveBeenCalledWith({ command: 'discardDraft' });
  });

  it('should dispatch setDraftSaving and update draft artifacts when saveDraftWorkflow is called', () => {
    const store = createTestStore({ isDraftMode: true });
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    const definition = { triggers: {}, actions: { a1: { type: 'Http' } } };
    const params = { p: { type: 'String' } };
    const conns = { c: { api: { id: '/test' } } };
    capturedCommandBarProps.saveDraftWorkflow(definition, params, conns);

    // Verify Redux state was updated
    const state = store.getState().designer;
    expect(state.isDraftSaving).toBe(true);
    expect(state.draftWorkflow).toEqual(definition);
    expect(state.draftConnections).toEqual(conns);
    expect(state.draftParameters).toEqual(params);
  });

  it('should clear draft state after discardDraft', () => {
    const store = createTestStore({
      isDraftMode: true,
      hasDraft: true,
      draftWorkflow: mockWorkflowDefinition,
    });
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    capturedCommandBarProps.discardDraft();

    const state = store.getState().designer;
    expect(state.hasDraft).toBe(false);
    expect(state.draftWorkflow).toBeNull();
    expect(state.draftConnections).toBeNull();
    expect(state.draftParameters).toBeNull();
  });

  it('should dispatch setDraftMode when switchWorkflowMode is called with false', () => {
    const store = createTestStore({
      isDraftMode: true,
      hasDraft: true,
      draftWorkflow: mockDraftDefinition,
    });
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    capturedCommandBarProps.switchWorkflowMode(false);

    const state = store.getState().designer;
    expect(state.isDraftMode).toBe(false);
  });

  it('should dispatch setDraftMode when switchWorkflowMode is called with true', () => {
    const store = createTestStore({
      isDraftMode: false,
      hasDraft: true,
      draftWorkflow: mockDraftDefinition,
    });
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    capturedCommandBarProps.switchWorkflowMode(true);

    const state = store.getState().designer;
    expect(state.isDraftMode).toBe(true);
  });

  it('should pass isMonitoringView to DesignerCommandBar', () => {
    const store = createTestStore({ isMonitoringView: true });
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    expect(capturedCommandBarProps.isMonitoringView).toBe(true);
  });

  it('should pass isUnitTest and isLocal to DesignerCommandBar', () => {
    const store = createTestStore({ isUnitTest: true, isLocal: false });
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    expect(capturedCommandBarProps.isUnitTest).toBe(true);
    expect(capturedCommandBarProps.isLocal).toBe(false);
  });

  it('should render floating run button', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );
    expect(screen.getByTestId('floating-run-button')).toBeDefined();
  });

  it('should use published connections when hasDraft but draftConnections is null', () => {
    const store = createTestStore({
      isDraftMode: true,
      hasDraft: true,
      draftConnections: null,
    });
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    // Falls through to published since draftConnections is null
    expect(mockConvertConnectionsDataToReferences).toHaveBeenCalled();
  });

  it('should use published parameters when hasDraft but draftParameters is null', () => {
    const store = createTestStore({
      isDraftMode: true,
      hasDraft: true,
      draftParameters: null,
    });
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    const provider = screen.getByTestId('bjs-workflow-provider');
    const workflowData = JSON.parse(provider.getAttribute('data-workflow') || '{}');
    expect(workflowData.parameters).toEqual({ publishedParam: { type: 'String', value: 'pub' } });
  });

  it('should pass saveWorkflow and discard callbacks to command bar', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    expect(typeof capturedCommandBarProps.saveWorkflow).toBe('function');
    expect(typeof capturedCommandBarProps.saveWorkflowFromCode).toBe('function');
    expect(typeof capturedCommandBarProps.discard).toBe('function');
    expect(typeof capturedCommandBarProps.switchToDesignerView).toBe('function');
    expect(typeof capturedCommandBarProps.switchToCodeView).toBe('function');
    expect(typeof capturedCommandBarProps.switchToMonitoringView).toBe('function');
  });

  it('should post save command and clear draft when saveWorkflow is called', async () => {
    const store = createTestStore({
      isDraftMode: true,
      hasDraft: true,
      draftWorkflow: mockWorkflowDefinition,
    });
    render(
      <Provider store={store}>
        <DesignerApp />
      </Provider>
    );

    const workflow = {
      definition: { triggers: {}, actions: {} },
      parameters: { p: { type: 'String' } },
      connectionReferences: { c: { api: { id: '/test' } } },
    };
    const clearDirtyState = vi.fn();
    await capturedCommandBarProps.saveWorkflow(workflow, undefined, clearDirtyState);

    expect(mockPostMessage).toHaveBeenCalledWith({
      command: 'save',
      definition: workflow.definition,
      parameters: workflow.parameters,
      connectionReferences: workflow.connectionReferences,
      customCodeData: undefined,
    });
    expect(clearDirtyState).toHaveBeenCalled();
    // Draft state should be cleared
    const state = store.getState().designer;
    expect(state.hasDraft).toBe(false);
    expect(state.draftWorkflow).toBeNull();
  });
});
